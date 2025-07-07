import fetch from 'node-fetch';

interface ElasticEmailSendParams {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

export async function sendElasticEmail({
  to,
  subject,
  htmlBody,
  textBody,
}: ElasticEmailSendParams): Promise<{ success: boolean; result?: any; error?: any }> {
  const apiKey = process.env.ELASTICEMAIL_API_KEY;
  const fromEmail = process.env.ELASTICEMAIL_FROM_EMAIL || 'support@fasho.pro';
  const fromName = process.env.ELASTICEMAIL_FROM_NAME || 'FASHO';

  if (!apiKey) {
    return { success: false, error: 'ElasticEmail API key not set' };
  }

  const payload = {
    Recipients: [to],
    Content: {
      From: fromEmail,
      FromName: fromName,
      Subject: subject,
      Body: [
        {
          ContentType: 'HTML',
          Content: htmlBody,
        },
        ...(textBody
          ? [
              {
                ContentType: 'PlainText',
                Content: textBody,
              },
            ]
          : []),
      ],
    },
  };

  try {
    const response = await fetch('https://api.elasticemail.com/v4/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ElasticEmail-ApiKey': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (response.ok) {
      return { success: true, result };
    } else {
      return { success: false, error: result };
    }
  } catch (error) {
    return { success: false, error };
  }
} 