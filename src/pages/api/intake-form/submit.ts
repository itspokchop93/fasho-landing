import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../../utils/supabase/server';
import { sendZapierWebhookServer, formatCustomerName, formatCurrency } from '../../../utils/zapier/webhookService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 INTAKE-FORM-SUBMIT: Submitting intake form...');
    
    const supabase = createClient(req, res);
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('❌ INTAKE-FORM-SUBMIT: User not authenticated:', userError);
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { responses } = req.body;

    if (!responses || typeof responses !== 'object') {
      console.log('❌ INTAKE-FORM-SUBMIT: Invalid responses data');
      return res.status(400).json({ error: 'Invalid responses data' });
    }

    console.log('🔍 INTAKE-FORM-SUBMIT: Processing for user:', user.email);
    console.log('🔍 INTAKE-FORM-SUBMIT: Responses:', responses);

    // Ensure we have a valid email
    if (!user.email) {
      console.log('❌ INTAKE-FORM-SUBMIT: User email not available');
      return res.status(400).json({ error: 'User email not available' });
    }

    // Store the responses in the database
    const { data: responseData, error: responseError } = await supabase
      .from('intake_form_responses')
      .insert([
        {
          user_id: user.id,
          responses: responses
        }
      ])
      .select()
      .single();

    if (responseError) {
      console.error('❌ INTAKE-FORM-SUBMIT: Failed to store responses:', responseError);
      return res.status(500).json({ error: 'Failed to store responses' });
    }

    console.log('✅ INTAKE-FORM-SUBMIT: Responses stored:', responseData.id);

    // Mark intake form as completed
    const { data: markCompleteData, error: markCompleteError } = await supabase.rpc('mark_intake_form_completed', {
      user_id: user.id
    });

    if (markCompleteError) {
      console.error('❌ INTAKE-FORM-SUBMIT: Failed to mark as completed:', markCompleteError);
      return res.status(500).json({ error: 'Failed to mark form as completed' });
    }

    console.log('✅ INTAKE-FORM-SUBMIT: Form marked as completed for user:', user.email);

    // Send Zapier webhook for intake form submission
    try {
      console.log('🔗 INTAKE-FORM-SUBMIT: Sending Zapier webhook for intake form submission...');
      
      // Get user's profile data
      const { data: profile } = await supabase.auth.getUser();
      const userMetadata = profile.user?.user_metadata || {};
      const customerName = userMetadata.full_name || user.email;
      
      // Format customer name
      const { first_name, last_name } = formatCustomerName(customerName);
      
      // Get user's latest order to determine context and include order data
      const { data: latestOrder, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            track_title,
            track_artist,
            package_name,
            package_plays
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let eventType: 'intake_form_thank_you' | 'intake_form_dashboard' = 'intake_form_dashboard';
      let orderData = undefined;

      // If user has a recent order (within last 24 hours), consider this a thank-you page submission
      if (latestOrder && !orderError) {
        const orderDate = new Date(latestOrder.created_at);
        const now = new Date();
        const hoursSinceOrder = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceOrder <= 24) {
          eventType = 'intake_form_thank_you';
          
          // Prepare order data
          const packagesOrdered = latestOrder.order_items?.map((item: any) => 
            item.package_name
          ) || [];
          
          orderData = {
            packages_ordered: packagesOrdered,
            order_date: latestOrder.created_at,
            order_total: formatCurrency(latestOrder.total),
            order_number: latestOrder.order_number
          };
        }
      }

      // Convert responses object to question/answer pairs for webhook
      const formattedResponses = Object.entries(responses).map(([questionId, answer]) => {
        // Find the question text based on the ID
        const questionMap: Record<string, string> = {
          'music_experience': 'How long have you been creating music/podcasts?',
          'primary_genre': 'What\'s your primary music genre?',
          'age_range': 'What\'s your age range?',
          'spotify_releases': 'How many songs have you released on Spotify?',
          'promotion_platform': 'Where do you primarily promote your music?',
          'online_activity_time': 'What time of day are you most active online?'
        };
        
        const question = questionMap[questionId] || questionId;
        return { question, answer: String(answer) };
      });

      // Send a webhook for each question/answer pair
      for (const response of formattedResponses) {
        const webhookPayload = {
          event_type: eventType,
          timestamp: new Date().toISOString(),
          customer_data: {
            first_name,
            last_name,
            email: user.email
          },
          ...(orderData && { order_data: orderData }),
          intake_form_data: {
            question: response.question,
            answer: response.answer
          }
        };

        const webhookSent = await sendZapierWebhookServer(webhookPayload, supabase);
        
        if (webhookSent) {
          console.log(`🔗 INTAKE-FORM-SUBMIT: ✅ Zapier webhook sent successfully for question: ${response.question}`);
        } else {
          console.log(`🔗 INTAKE-FORM-SUBMIT: ❌ Zapier webhook failed for question: ${response.question}`);
        }
      }

    } catch (webhookError) {
      console.error('🔗 INTAKE-FORM-SUBMIT: ❌ Error sending Zapier webhook:', webhookError);
      // Don't fail the entire form submission if webhook fails
    }

    return res.status(200).json({
      success: true,
      message: 'Intake form submitted successfully',
      responseId: responseData.id
    });

  } catch (error) {
    console.error('❌ INTAKE-FORM-SUBMIT: Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 