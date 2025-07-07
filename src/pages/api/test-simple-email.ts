import { NextApiRequest, NextApiResponse } from 'next';
import { sendElasticEmail } from '@/utils/email/elasticEmailService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { testEmail } = req.body;
    if (!testEmail) {
      return res.status(400).json({ error: 'Test email address required' });
    }

    const subject = 'ElasticEmail Test Email - Order Status Notification System';
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4F46E5;">ElasticEmail Test Email</h2>
        <p>This is a test email to verify the ElasticEmail API configuration.</p>
        <p><strong>Test Details:</strong></p>
        <ul>
          <li>To: ${testEmail}</li>
          <li>Timestamp: ${new Date().toISOString()}</li>
        </ul>
        <p>If you receive this email, the ElasticEmail integration is working correctly!</p>
        <p>Best regards,<br>The FASHO Team</p>
      </div>
    `;

    const result = await sendElasticEmail({
      to: testEmail,
      subject,
      htmlBody
    });

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    return res.status(200).json({ success: true, message: 'Test email sent successfully', details: result.result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
} 