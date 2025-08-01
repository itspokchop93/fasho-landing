import { Html, Head, Main, NextScript } from 'next/document';
import { DocumentContext } from 'next/document';

export default function Document() {
  const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />

        
        {/* SEO Meta Tags */}
        <meta name="description" content="Amplify your reach with FASHO.co. We connect artists, podcasters & labels to top playlists, grow real audiences, and help create your career." />
        <meta name="keywords" content="music promotion, playlist placement, artist promotion, podcast promotion, label services, Spotify promotion, music marketing" />
        <meta name="author" content="FASHO.co" />
        <meta name="robots" content="index, follow" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="FASHO.co – Promotion for Artists, Labels & Podcasters" />
        <meta property="og:description" content="Amplify your reach with FASHO.co. We connect artists, podcasters & labels to top playlists, grow real audiences, and help create your career." />
        <meta property="og:image" content="/fasho-logo-wide.png" />
        <meta property="og:url" content="https://fasho.co" />
        <meta property="og:site_name" content="FASHO.co" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="FASHO.co – Promotion for Artists, Labels & Podcasters" />
        <meta name="twitter:description" content="Amplify your reach with FASHO.co. We connect artists, podcasters & labels to top playlists, grow real audiences, and help create your career." />
        <meta name="twitter:image" content="/fasho-logo-wide.png" />
        
        {/* Favicon and App Icons */}
        <link rel="apple-touch-icon" sizes="180x180" href="/fasho_ico/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/fasho_ico/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/fasho_ico/favicon-16x16.png" />
        <link rel="manifest" href="/fasho_ico/site.webmanifest" />
        <link rel="icon" href="/fasho_ico/favicon.ico" />
        
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

        {/* Microsoft Bing Ads UET Tag */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Check if current path should exclude Bing Ads tracking
                var path = window.location.pathname;
                var excludePaths = ['/dashboard', '/admin'];
                var shouldExclude = excludePaths.some(function(excludePath) {
                  return path.startsWith(excludePath);
                });
                
                if (!shouldExclude) {
                  (function(w,d,t,r,u){var f,n,i;w[u]=w[u]||[],f=function(){var o={ti:"97199307", enableAutoSpaTracking: true};o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad")},n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&s!=="loaded"&&s!=="complete"||(f(),n.onload=n.onreadystatechange=null)},i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)})(window,document,"script","//bat.bing.com/bat.js","uetq");
                }
              })();
            `,
          }}
        />

        {/* LuckyOrange Heatmap Tracking */}
        <script async defer src="https://tools.luckyorange.com/core/lo.js?site-id=93a580b2"></script>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
} 