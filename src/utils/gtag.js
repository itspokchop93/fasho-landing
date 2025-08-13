// Google Analytics 4 & Google Ads gtag utility functions
// CRITICAL: Never send "Spotify" data - only use FASHO company and package names

// Google Analytics 4
export const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

// Google Ads
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
export const CONVERSION_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID;
export const CONVERSION_LABEL = process.env.NEXT_PUBLIC_GOOGLE_CONVERSION_LABEL;

// Initialize Checkout Conversion (Secondary)
export const CHECKOUT_INIT_CONVERSION_ID = process.env.NEXT_PUBLIC_GOOGLE_CHECKOUT_INIT_CONVERSION_ID;
export const CHECKOUT_INIT_LABEL = process.env.NEXT_PUBLIC_GOOGLE_CHECKOUT_INIT_LABEL;

// Enhanced pageview tracking for SPA navigation
export const pageview = (url) => {
  if (typeof window !== 'undefined' && window.gtag) {
    console.log('🎯 GTAG: Tracking pageview for:', url);
    
    // Track pageview in Google Analytics 4
    if (GA4_MEASUREMENT_ID) {
      window.gtag('config', GA4_MEASUREMENT_ID, {
        page_path: url,
        // Ensure proper attribution context
        cookie_flags: 'SameSite=None;Secure',
      });
    }
    
    // Track pageview in Google Ads with enhanced attribution
    if (GA_TRACKING_ID) {
      window.gtag('config', GA_TRACKING_ID, {
        page_path: url,
        // Maintain conversion attribution context
        cookie_flags: 'SameSite=None;Secure',
        // Preserve click attribution for SPA navigation
        send_page_view: true,
      });
    }
    
    // CRITICAL: Re-configure Conversion Linker after each navigation
    // This ensures ad click attribution is maintained across SPA routes
    window.gtag('config', 'CONVERSION_LINKER', {
      cookie_flags: 'SameSite=None;Secure',
    });
  }
};

// Track checkout initiation
export const trackBeginCheckout = (checkoutData) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'begin_checkout', {
      currency: 'USD',
      value: checkoutData.totalAmount,
      items: checkoutData.items.map(item => ({
        item_id: item.id,
        item_name: `FASHO ${item.packageName}`, // Use FASHO + package name only
        category: 'FASHO Music Promotion',
        quantity: item.quantity || 1,
        price: item.price
      }))
    });
  }
};

// Track purchase conversion with enhanced attribution
export const trackPurchase = (orderData) => {
  if (typeof window !== 'undefined' && window.gtag) {
    console.log('🎯 GTAG: Tracking purchase conversion:', {
      orderId: orderData.orderId,
      value: orderData.totalAmount,
      itemCount: orderData.items?.length
    });

    // Enhanced ecommerce purchase event
    window.gtag('event', 'purchase', {
      transaction_id: orderData.orderId,
      value: orderData.totalAmount,
      currency: 'USD',
      items: orderData.items.map(item => ({
        item_id: item.id,
        item_name: `FASHO ${item.packageName}`, // Use FASHO + package name only
        category: 'FASHO Music Promotion',
        quantity: item.quantity || 1,
        price: item.price
      }))
    });

    // Google Ads conversion tracking with GCLID injection
    const conversionData = {
      send_to: `${CONVERSION_ID}/${CONVERSION_LABEL}`,
      value: orderData.totalAmount,
      currency: 'USD',
      transaction_id: orderData.orderId
    };

    // Send the conversion event
    window.gtag('event', 'conversion', conversionData);
    console.log('🎯 GTAG: Conversion event sent with data:', conversionData);
  }
};

// Track custom events
export const trackEvent = (eventName, parameters = {}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, parameters);
  }
};

// Track package selection
export const trackPackageSelect = (packageData) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'select_item', {
      item_list_name: 'FASHO Packages',
      items: [{
        item_id: packageData.id,
        item_name: `FASHO ${packageData.name}`, // Use FASHO + package name only
        category: 'FASHO Music Promotion',
        price: packageData.price
      }]
    });
  }
};

// Track initialize checkout conversion (SECONDARY)
export const trackInitializeCheckout = () => {
  if (typeof window !== 'undefined' && window.gtag && CHECKOUT_INIT_CONVERSION_ID && CHECKOUT_INIT_LABEL) {
    window.gtag('event', 'conversion', {
      send_to: `${CHECKOUT_INIT_CONVERSION_ID}/${CHECKOUT_INIT_LABEL}`,
      value: 1.0,
      currency: 'USD'
    });
    
    console.log('🎯 GOOGLE ADS: Initialize Checkout conversion tracked');
  }
};

// Google Analytics 4 specific events
export const trackGA4Event = (eventName, parameters = {}) => {
  if (typeof window !== 'undefined' && window.gtag && GA4_MEASUREMENT_ID) {
    window.gtag('event', eventName, {
      ...parameters,
      // Ensure we're sending to GA4
      send_to: GA4_MEASUREMENT_ID
    });
    
    console.log('📊 GA4: Event tracked:', eventName, parameters);
  }
};

// Track user signup for GA4
export const trackGA4Signup = (method = 'email') => {
  trackGA4Event('sign_up', {
    method: method
  });
};

// Track form submission for GA4
export const trackGA4FormSubmit = (formName) => {
  trackGA4Event('form_submit', {
    form_name: formName
  });
};

// Track button clicks for GA4
export const trackGA4ButtonClick = (buttonName, location) => {
  trackGA4Event('button_click', {
    button_name: buttonName,
    location: location
  });
}; 