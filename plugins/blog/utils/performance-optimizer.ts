// Core Web Vitals & Performance Optimization Utilities
// Implements advanced performance optimizations for blog SEO ranking

export class PerformanceOptimizer {
  
  // Lazy Loading for Images with Intersection Observer
  static initializeLazyLoading(): void {
    if (typeof window === 'undefined') return;

    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;
          const srcSet = img.dataset.srcset;
          
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
          }
          
          if (srcSet) {
            img.srcset = srcSet;
            img.removeAttribute('data-srcset');
          }
          
          img.classList.remove('lazy');
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01
    });

    // Observe all lazy images
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }

  // Preload Critical Resources
  static preloadCriticalResources(): void {
    if (typeof window === 'undefined') return;

    // Preload critical fonts
    const fontPreloads = [
      '/fonts/inter-var.woff2',
      '/fonts/inter-bold.woff2'
    ];

    fontPreloads.forEach(font => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = font;
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });

    // Preload critical CSS
    const criticalCSS = document.createElement('link');
    criticalCSS.rel = 'preload';
    criticalCSS.href = '/css/critical.css';
    criticalCSS.as = 'style';
    criticalCSS.onload = () => {
      criticalCSS.rel = 'stylesheet';
    };
    document.head.appendChild(criticalCSS);
  }

  // Optimize Images for Core Web Vitals
  static generateResponsiveImageProps(
    src: string, 
    alt: string, 
    sizes: string = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
  ): object {
    const baseUrl = src.split('.').slice(0, -1).join('.');
    const extension = src.split('.').pop();

    return {
      src,
      alt,
      sizes,
      srcSet: `
        ${baseUrl}-400w.${extension} 400w,
        ${baseUrl}-800w.${extension} 800w,
        ${baseUrl}-1200w.${extension} 1200w,
        ${baseUrl}-1600w.${extension} 1600w
      `,
      loading: 'lazy' as const,
      decoding: 'async' as const,
      style: {
        aspectRatio: '16/9',
        objectFit: 'cover' as const,
        width: '100%',
        height: 'auto'
      }
    };
  }

  // Critical Resource Hints for Head (returns HTML strings, not React elements)
  static generateCriticalResourceHints(): string[] {
    if (typeof window === 'undefined') return [];

    return [
      // DNS Prefetch
      '<link rel="dns-prefetch" href="//fonts.googleapis.com" />',
      '<link rel="dns-prefetch" href="//fonts.gstatic.com" />',
      '<link rel="dns-prefetch" href="//www.google-analytics.com" />',
      
      // Preconnect
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />',
      
      // Preload Critical Fonts
      '<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />',
      
      // Early Hints for Navigation
      '<link rel="prefetch" href="/blog" />',
      '<link rel="prefetch" href="/" />',
    ];
  }

  // Cumulative Layout Shift (CLS) Prevention
  static preventLayoutShift(): void {
    if (typeof window === 'undefined') return;

    // Add aspect ratio containers for images
    const images = document.querySelectorAll('img:not([style*="aspect-ratio"])');
    images.forEach(img => {
      const imageElement = img as HTMLImageElement;
      const aspectRatio = imageElement.naturalWidth / imageElement.naturalHeight || 16/9;
      imageElement.style.aspectRatio = aspectRatio.toString();
    });

    // Reserve space for dynamic content
    const dynamicContainers = document.querySelectorAll('[data-dynamic-height]');
    dynamicContainers.forEach(container => {
      const minHeight = container.getAttribute('data-dynamic-height') || '200px';
      (container as HTMLElement).style.minHeight = minHeight;
    });
  }

  // First Input Delay (FID) Optimization
  static optimizeFirstInputDelay(): void {
    if (typeof window === 'undefined') return;

    // Defer non-critical JavaScript
    const scripts = document.querySelectorAll('script:not([async]):not([defer])');
    scripts.forEach(script => {
      if (!script.src.includes('critical')) {
        script.defer = true;
      }
    });

    // Break up long tasks
    const breakLongTasks = (callback: Function) => {
      const channel = new MessageChannel();
      channel.port2.onmessage = () => callback();
      channel.port1.postMessage(null);
    };

    // Use scheduler.postTask if available (Chrome 94+)
    if ('scheduler' in window && 'postTask' in (window as any).scheduler) {
      (window as any).scheduler.postTask(() => {
        // Non-critical tasks
        this.initializeLazyLoading();
        this.preloadCriticalResources();
      }, { priority: 'background' });
    } else {
      // Fallback for older browsers
      setTimeout(() => {
        this.initializeLazyLoading();
        this.preloadCriticalResources();
      }, 0);
    }
  }

  // Largest Contentful Paint (LCP) Optimization
  static optimizeLargestContentfulPaint(): void {
    if (typeof window === 'undefined') return;

    // Preload hero images
    const heroImages = document.querySelectorAll('img[data-hero], .hero img, .featured-image img');
    heroImages.forEach(img => {
      if (img instanceof HTMLImageElement && img.src) {
        const preloadLink = document.createElement('link');
        preloadLink.rel = 'preload';
        preloadLink.href = img.src;
        preloadLink.as = 'image';
        document.head.appendChild(preloadLink);
      }
    });

    // Remove render-blocking resources
    const nonCriticalCSS = document.querySelectorAll('link[rel="stylesheet"]:not([data-critical])');
    nonCriticalCSS.forEach(link => {
      link.setAttribute('media', 'print');
      link.addEventListener('load', () => {
        link.setAttribute('media', 'all');
      });
    });
  }

  // Service Worker for Caching (Progressive Web App features)
  static registerServiceWorker(): void {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registered: ', registration);
        })
        .catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }

  // Critical CSS Inlining
  static inlineCriticalCSS(): string {
    return `
      <style>
        /* Critical CSS for above-the-fold content */
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          margin: 0;
          padding: 0;
          line-height: 1.6;
        }
        .hero, .featured-image { 
          aspect-ratio: 16/9;
          background-color: #f3f4f6;
        }
        .container { 
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
        }
        h1, h2, h3 { 
          font-weight: 700;
          line-height: 1.2;
          margin: 0 0 1rem 0;
        }
        img { 
          max-width: 100%;
          height: auto;
          display: block;
        }
        .lazy {
          opacity: 0;
          transition: opacity 0.3s;
        }
        .lazy.loaded {
          opacity: 1;
        }
      </style>
    `;
  }

  // Initialize all performance optimizations
  static initializeAll(): void {
    if (typeof window === 'undefined') return;

    // DOM loaded optimizations
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.preventLayoutShift();
        this.optimizeLargestContentfulPaint();
        this.optimizeFirstInputDelay();
      });
    } else {
      this.preventLayoutShift();
      this.optimizeLargestContentfulPaint();
      this.optimizeFirstInputDelay();
    }

    // Window loaded optimizations
    window.addEventListener('load', () => {
      this.registerServiceWorker();
    });
  }
}

// Web Vitals Measurement
export class WebVitalsTracker {
  static trackCoreWebVitals(): void {
    if (typeof window === 'undefined') return;

    // Track LCP
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('LCP:', lastEntry.startTime);
        
        // Send to analytics
        if ((window as any).gtag) {
          (window as any).gtag('event', 'web_vitals', {
            name: 'LCP',
            value: Math.round(lastEntry.startTime),
            event_category: 'Web Vitals'
          });
        }
      });

      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Track FID
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          console.log('FID:', entry.processingStart - entry.startTime);
          
          if ((window as any).gtag) {
            (window as any).gtag('event', 'web_vitals', {
              name: 'FID',
              value: Math.round(entry.processingStart - entry.startTime),
              event_category: 'Web Vitals'
            });
          }
        });
      });

      fidObserver.observe({ entryTypes: ['first-input'] });

      // Track CLS
      let clsScore = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (!(entry as any).hadRecentInput) {
            clsScore += (entry as any).value;
          }
        });
        
        console.log('CLS:', clsScore);
        
        if ((window as any).gtag) {
          (window as any).gtag('event', 'web_vitals', {
            name: 'CLS',
            value: Math.round(clsScore * 1000),
            event_category: 'Web Vitals'
          });
        }
      });

      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }
  }
}

export default PerformanceOptimizer;
