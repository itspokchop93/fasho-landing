import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Google Analytics 4 & Google Ads - Combined gtag.js */}
        {(GA4_MEASUREMENT_ID || GA_TRACKING_ID) && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID || GA_TRACKING_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  
                  ${GA4_MEASUREMENT_ID ? `gtag('config', '${GA4_MEASUREMENT_ID}');` : ''}
                  ${GA_TRACKING_ID ? `gtag('config', '${GA_TRACKING_ID}');` : ''}
                `,
              }}
            />
          </>
        )}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
} 