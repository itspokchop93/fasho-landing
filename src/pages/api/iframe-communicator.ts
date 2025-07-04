import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader(
    'Content-Security-Policy',
    "script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );
  res.setHeader('Content-Type', 'text/html');
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset=\"utf-8\">
    <title>Payment Communicator</title>
</head>
<body>
    <script type=\"text/javascript\">
        console.log('Communicator loaded!');
        (function() {
            function parseQueryString(str) {
                var vars = [];
                var arr = str.split('&');
                var pair;
                for (var i = 0; i < arr.length; i++) {
                    pair = arr[i].split('=');
                    vars.push(pair[0]);
                    vars[pair[0]] = decodeURIComponent(pair[1]);
                }
                return vars;
            }

            function receiveMessage(event) {
                console.log('Iframe communicator received message:', event);
                console.log('Event origin:', event.origin);
                console.log('Event data:', event.data);
                
                // Verify origin for security
                if (event.origin !== \"https://test.authorize.net\" && event.origin !== \"https://accept.authorize.net\") {
                    console.log('Origin not allowed:', event.origin);
                    return;
                }

                var params = parseQueryString(event.data);
                console.log('Parsed params:', params);
                
                switch (params[\"action\"]) {
                    case \"successfulSave\":
                        console.log('Payment profile saved successfully');
                        if (window.parent && window.parent.postMessage) {
                            console.log('Sending PAYMENT_SUCCESS message to parent');
                            window.parent.postMessage({
                                type: 'PAYMENT_SUCCESS',
                                action: 'successfulSave'
                            }, 'https://fasho-landing.vercel.app');
                        }
                        break;
                    
                    case \"cancel\":
                        console.log('Payment was cancelled by user');
                        if (window.parent && window.parent.postMessage) {
                            console.log('Sending PAYMENT_CANCELLED message to parent');
                            window.parent.postMessage({
                                type: 'PAYMENT_CANCELLED',
                                action: 'cancel'
                            }, 'https://fasho-landing.vercel.app');
                        }
                        break;
                    
                    case \"transactResponse\":
                        // Transaction completed
                        console.log('Transaction response received:', params[\"response\"]);
                        var response = JSON.parse(params[\"response\"]);
                        console.log('Parsed transaction response:', response);
                        
                        if (window.parent && window.parent.postMessage) {
                            console.log('🚀 IFRAME: Sending PAYMENT_COMPLETE message to parent');
                            var messageToSend = {
                                type: 'PAYMENT_COMPLETE',
                                action: 'transactResponse',
                                response: response
                            };
                            window.parent.postMessage(messageToSend, 'https://fasho-landing.vercel.app');
                            console.log('🚀 IFRAME: Message sent successfully to https://fasho-landing.vercel.app');
                        }
                        break;
                    
                    case \"resizeWindow\":
                        // Resize iframe
                        var w = parseInt(params[\"width\"]);
                        var h = parseInt(params[\"height\"]);
                        console.log('Resize request:', w, 'x', h);
                        if (window.parent && window.parent.postMessage) {
                            window.parent.postMessage({
                                type: 'RESIZE_IFRAME',
                                action: 'resizeWindow',
                                width: w,
                                height: h
                            }, 'https://fasho-landing.vercel.app');
                        }
                        break;
                    
                    default:
                        console.log('Unknown action received:', params[\"action\"]);
                        console.log('All params:', params);
                        break;
                }
            }

            // Listen for messages from Authorize.net
            if (window.addEventListener) {
                window.addEventListener(\"message\", receiveMessage, false);
            } else if (window.attachEvent) {
                window.attachEvent(\"onmessage\", receiveMessage);
            }
        })();
    <\/script>
</body>
</html>
  `);
} 