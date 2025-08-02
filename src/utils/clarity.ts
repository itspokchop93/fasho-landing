// Microsoft Clarity integration utility
// Using the traditional script injection method for reliability

declare global {
  interface Window {
    clarity: (action: string, ...args: any[]) => void;
  }
}

class ClarityService {
  private projectId: string = 'songm24xjn';
  private isInitialized: boolean = false;

  // Initialize Clarity with script injection
  init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject('Clarity can only be initialized in browser environment');
        return;
      }

      if (this.isInitialized || document.getElementById('clarity-script')) {
        resolve();
        return;
      }

      try {
        // Microsoft Clarity script injection
        (function (c: any, l: Document, a: string, r: string, i: string) {
          c[a] = c[a] || function () {
            (c[a].q = c[a].q || []).push(arguments);
          };
          var t = l.createElement(r) as HTMLScriptElement;
          t.async = true;
          t.src = "https://www.clarity.ms/tag/" + i + "?ref=custom";
          t.id = "clarity-script";
          t.onload = () => {
            console.log('Microsoft Clarity loaded successfully');
            resolve();
          };
          t.onerror = () => {
            reject('Failed to load Microsoft Clarity script');
          };
          (l.getElementsByTagName(r)[0] || l.body).parentNode?.insertBefore(t, l.getElementsByTagName(r)[0] || l.body);
        })(window, document, "clarity", "script", process.env.NEXT_PUBLIC_CLARITY_ID!);

        this.isInitialized = true;
      } catch (error) {
        reject(error);
      }
    });
  }

  // Set custom tags
  setTag(key: string, value: string | string[]): void {
    if (typeof window !== 'undefined' && window.clarity) {
      window.clarity('set', key, value);
    }
  }

  // Identify users
  identify(customerId: string, customSessionId?: string, customPageId?: string, friendlyName?: string): void {
    if (typeof window !== 'undefined' && window.clarity) {
      window.clarity('identify', customerId, customSessionId, customPageId, friendlyName);
    }
  }

  // Set consent
  consent(hasConsent: boolean = true): void {
    if (typeof window !== 'undefined' && window.clarity) {
      window.clarity('consent', hasConsent);
    }
  }

  // Upgrade session
  upgrade(reason: string): void {
    if (typeof window !== 'undefined' && window.clarity) {
      window.clarity('upgrade', reason);
    }
  }

  // Track custom events
  event(eventName: string): void {
    if (typeof window !== 'undefined' && window.clarity) {
      window.clarity('event', eventName);
    }
  }
}

// Export singleton instance
export const clarityService = new ClarityService();
export default clarityService;