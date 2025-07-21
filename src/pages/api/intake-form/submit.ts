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

      // Get all user's orders to calculate total spent
      const { data: allOrders, error: allOrdersError } = await supabase
        .from('orders')
        .select('total')
        .eq('user_id', user.id);

      // Calculate total amount spent by user
      let totalSpent = 0;
      if (allOrders && !allOrdersError) {
        totalSpent = allOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      }
      console.log('💰 INTAKE-FORM-SUBMIT: User total spent calculated:', formatCurrency(totalSpent));

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

      // Convert responses object to formatted intake form data for webhook
      const intakeFormData: Record<string, string> = {};
      
      // Map question IDs to simplified property names for Zapier
      const questionMap: Record<string, string> = {
        'music_experience': 'How Long Creating Music',
        'primary_genre': 'Primary Music Genre',
        'age_range': 'Age Range',
        'spotify_releases': 'Spotify Releases',
        'promotion_platform': 'Promotion Platform',
        'online_activity_time': 'Online Activity Time'
      };
      
      // Format each question/answer as a property name/value pair
      Object.entries(responses).forEach(([questionId, answer]) => {
        const propertyName = questionMap[questionId] || questionId;
        intakeFormData[propertyName] = String(answer);
      });
      
      // Add total spent to intake form data
      intakeFormData['Total Spent'] = formatCurrency(totalSpent);

      // Get phone number from latest order billing info if available
      let phoneNumber: string | undefined;
      if (latestOrder && latestOrder.billing_info) {
        const billingInfo = latestOrder.billing_info;
        if (billingInfo.countryCode && billingInfo.phoneNumber) {
          phoneNumber = `${billingInfo.countryCode}${billingInfo.phoneNumber}`;
        }
      }

      // Send single webhook with all intake form data
      const webhookPayload = {
        event_type: eventType,
        timestamp: new Date().toISOString(),
        customer_data: {
          first_name,
          last_name,
          email: user.email,
          phone: phoneNumber
        },
        ...(orderData && { order_data: orderData }),
        intake_form_data: intakeFormData
      };

      const webhookSent = await sendZapierWebhookServer(webhookPayload, supabase);
      
      if (webhookSent) {
        console.log('🔗 INTAKE-FORM-SUBMIT: ✅ Zapier webhook sent successfully for intake form submission');
      } else {
        console.log('🔗 INTAKE-FORM-SUBMIT: ❌ Zapier webhook failed for intake form submission');
      }

    } catch (webhookError) {
      console.error('🔗 INTAKE-FORM-SUBMIT: ❌ Error sending Zapier webhook:', webhookError);
      // Don't fail the entire form submission if webhook fails
    }

    // Send AirTable record for intake form submission
    try {
      console.log('📊 INTAKE-FORM-SUBMIT: Sending AirTable record for intake form submission...');
      
      const AirTableService = await import('../../../utils/airtable/airtableService');
      const { formatCustomerName } = await import('../../../utils/zapier/webhookService');
      
      // Get user's profile data
      const { data: profile } = await supabase.auth.getUser();
      const userMetadata = profile.user?.user_metadata || {};
      const customerName = userMetadata.full_name || user.email;
      
      // Format customer name
      const { first_name, last_name } = formatCustomerName(customerName);
      
      // Extract phone from responses if available
      const phoneResponse = responses['phone-number'] || responses['phone'] || responses['phoneNumber'];
      
      // Create or update AirTable record with intake form data
      const airtableResult = await AirTableService.default.createIntakeFormRecord(
        first_name,
        last_name,
        user.email,
        phoneResponse || undefined,
        responses  // Pass the actual intake form responses
      );

      if (airtableResult) {
        console.log('📊 INTAKE-FORM-SUBMIT: ✅ AirTable record created successfully');
      } else {
        console.log('📊 INTAKE-FORM-SUBMIT: ❌ AirTable record creation failed');
      }

    } catch (airtableError) {
      console.error('📊 INTAKE-FORM-SUBMIT: ❌ Error creating AirTable record:', airtableError);
      // Don't fail the entire form submission if AirTable fails
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