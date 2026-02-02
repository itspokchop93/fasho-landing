'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createClient } from '../utils/supabase/client';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * PRODUCTION MODE - Tour shows only once per user, after survey completion (if applicable)
 * 
 * The tour will:
 * 1. Wait for the dashboard to be ready
 * 2. Wait for any onboarding survey modal to be completed/closed
 * 3. Check if the user has already seen the tour (database flag)
 * 4. If not seen, show the tour and mark as seen when completed
 * 
 * For testing, set NEXT_PUBLIC_INTRO_TEST_MODE=true in .env.local
 */
const INTRO_TEST_MODE = process.env.NEXT_PUBLIC_INTRO_TEST_MODE === 'true';

// Maximum wait time (ms) for elements to appear before skipping
const ELEMENT_WAIT_TIMEOUT = 5000;

// Polling interval (ms) when waiting for elements
const ELEMENT_POLL_INTERVAL = 100;

// Delay before starting tour after conditions are met (allows UI to stabilize)
const TOUR_START_DELAY = 800;

// ============================================================================
// TOUR STEP DEFINITIONS
// ============================================================================

interface TourStep {
  id: string;
  tab: string; // Which tab this step belongs to
  element: string; // data-tour attribute selector
  title: string;
  content: string;
  position?: 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'left-start' | 'left-end' | 'right' | 'right-start' | 'right-end' | 'auto';
  beforeStep?: () => Promise<void> | void; // Action before showing step (e.g., expand accordion)
  skipIfMissing?: boolean; // If true, skip this step if element not found
  // Mobile-specific overrides
  mobileElement?: string; // Different element selector for mobile
  mobilePosition?: 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'left-start' | 'left-end' | 'right' | 'right-start' | 'right-end' | 'auto';
  mobileScrollToElement?: boolean; // Whether to scroll to the element on mobile
}

const tourSteps: TourStep[] = [
  {
    id: 'artist-profile',
    tab: 'dashboard',
    element: '[data-tour="artist-profile"]',
    title: 'Welcome to Your Dashboard',
    content: 'You made it! This is your new home base. Everything you need to track your campaign, grow your music, and reach new heights lives right here.',
    position: 'left', // Modal on LEFT of Artist Profile, arrow points RIGHT
    skipIfMissing: false,
    // Mobile: Point to Dashboard nav item in bottom menu
    mobileElement: '[data-tour="mobile-nav-dashboard"]',
    mobilePosition: 'top', // Modal ABOVE the mobile nav, arrow points DOWN
  },
  {
    id: 'all-campaigns',
    tab: 'campaigns',
    element: '[data-tour="first-campaign"]',
    title: 'Your Campaigns',
    content: 'Here\'s where you\'ll find every campaign you\'ve run with us. Click into one to see the details of the campaign and watch the progress.',
    position: 'left', // We'll override with CSS to force right side of viewport
    skipIfMissing: true, // Skip if no campaigns
  },
  {
    id: 'campaign-progress',
    tab: 'campaigns',
    element: '[data-tour="campaign-progress"]',
    title: 'Campaign Progress',
    content: 'This is your campaign\'s current progress. You\'ll always know exactly where your campaign stands and what\'s happening behind the scenes.',
    position: 'bottom', // Modal BELOW progress bar, arrow points UP
    skipIfMissing: true, // Skip if user has no campaigns
    // Mobile: Use the mobile-specific progress bar element (desktop one is hidden on mobile)
    mobileElement: '[data-tour="campaign-progress-mobile"]',
    mobileScrollToElement: true,
    mobilePosition: 'bottom', // Modal BELOW progress bar on mobile too
  },
  {
    id: 'curator-table',
    tab: 'curator-connect',
    element: '[data-tour="curator-table"]',
    title: 'Curator Connect+',
    content: 'This is your secret weapon. Curator Connect+ gives you direct access to hundreds of real playlist curators so you can pitch your music yourself and stack even more placements on top of your campaign.',
    position: 'top', // Modal on TOP, arrow points DOWN
    skipIfMissing: false,
    // Mobile: Point to Curators nav item in bottom menu
    mobileElement: '[data-tour="mobile-nav-curators"]',
    mobilePosition: 'top', // Modal ABOVE the mobile nav, arrow points DOWN
  },
  {
    id: 'curator-contact-button',
    tab: 'curator-connect',
    element: '[data-tour="curator-contact-button"]',
    title: 'Contact Curators',
    content: 'Just hit this "Contact" button and your email will open with a pre-written pitch ready to go. Simply fill in your details, drop your song link, and hit send.',
    position: 'left', // Modal on LEFT, arrow points RIGHT
    skipIfMissing: true, // Skip if no curators loaded
    // Mobile: Use mobile-specific element (desktop one is hidden on mobile)
    mobileElement: '[data-tour="curator-contact-button-mobile"]',
    mobileScrollToElement: true,
    mobilePosition: 'left', // Modal on LEFT of button, arrow points RIGHT (same as desktop)
  },
  {
    id: 'power-tools-grid',
    tab: 'power-tools',
    element: '[data-tour="power-tools-grid"]',
    title: 'Power Tools',
    content: 'Playlists are just one piece of the puzzle. Power Tools gives you access to the platforms and resources you need to grow your career from every angle.',
    position: 'top-start', // Modal on TOP-LEFT, arrow points DOWN
    skipIfMissing: false,
  },
  {
    id: 'packages',
    tab: 'packages',
    element: '[data-tour="packages"]',
    title: 'Packages',
    content: 'When you\'re ready to drop your next track, this is your launchpad. Pick a package and get your campaign rolling in just a few clicks.',
    position: 'top-start', // Modal on TOP-LEFT, arrow points DOWN
    skipIfMissing: false,
  },
  {
    id: 'contact-form',
    tab: 'contact',
    element: '[data-tour="contact-form"]',
    title: 'Contact Support',
    content: 'Got questions? Our team is here for you 24/7. Hit this tab anytime and our knowledgeable support staff will get back to you fast.',
    position: 'right', // Modal on RIGHT of form, arrow points LEFT
    skipIfMissing: false,
  },
];

// ============================================================================
// TYPES
// ============================================================================

interface DashboardTourProps {
  /** Current active tab in dashboard */
  activeTab: string;
  /** Function to change the active tab */
  onTabChange: (tab: string) => void;
  /** Whether the survey modal is currently open/blocking */
  isSurveyModalOpen: boolean;
  /** Whether dashboard has finished initial load */
  isDashboardReady: boolean;
  /** Function to expand first campaign accordion (if exists) */
  onExpandFirstCampaign?: () => void;
  /** Whether user has any campaigns */
  hasCampaigns: boolean;
  /** User ID for persistence */
  userId?: string;
  /** Callback to expose the startTour function to parent component */
  onTourReady?: (triggerTour: () => void) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

const DashboardTour: React.FC<DashboardTourProps> = ({
  activeTab,
  onTabChange,
  isSurveyModalOpen,
  isDashboardReady,
  onExpandFirstCampaign,
  hasCampaigns,
  userId,
  onTourReady,
}) => {
  const tourInstance = useRef<any>(null);
  const [tourStarted, setTourStarted] = useState(false);
  const hasInitialized = useRef(false);
  const tourCompletedRef = useRef(false);
  const supabase = createClient();
  
  // Track activeTab in a ref to avoid stale closures in callbacks
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);
  
  // Initialize on mount
  useEffect(() => {
    console.log('[DashboardTour] Component mounted');
    console.log('[DashboardTour] Mode:', INTRO_TEST_MODE ? 'TEST' : 'PRODUCTION');
    
    // Reset refs on mount
    hasInitialized.current = false;
    tourCompletedRef.current = false;
    setTourStarted(false);
    
    // Cleanup on unmount
    return () => {
      console.log('[DashboardTour] Component unmounting');
      if (tourInstance.current) {
        try {
          tourInstance.current.cancel();
        } catch (e) {
          // Ignore errors on cleanup
        }
        tourInstance.current = null;
      }
    };
  }, []);

  // ============================================================================
  // PERSISTENCE HELPERS (Supabase-based)
  // ============================================================================

  /**
   * Fetch tour status from database
   */
  const fetchTourStatus = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.log('[DashboardTour] No session, defaulting to not seen');
        return false;
      }

      const response = await fetch('/api/dashboard-tour/status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn('[DashboardTour] Failed to fetch tour status, defaulting to not seen');
        return false;
      }

      const data = await response.json();
      return data.hasSeenTour ?? false;
    } catch (error) {
      console.error('[DashboardTour] Error fetching tour status:', error);
      return false;
    }
  }, [supabase]);

  /**
   * Mark tour as seen in database
   */
  const markTourAsSeen = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.warn('[DashboardTour] No session, cannot persist tour completion');
        return;
      }

      const response = await fetch('/api/dashboard-tour/status', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn('[DashboardTour] Failed to mark tour as seen');
      } else {
        console.log('[DashboardTour] Tour marked as seen in database');
      }
    } catch (error) {
      console.error('[DashboardTour] Error marking tour as seen:', error);
    }
  }, [supabase]);

  // ============================================================================
  // ELEMENT HELPERS
  // ============================================================================

  /**
   * Wait for an element to appear in DOM
   * Returns the element or null if timeout
   */
  const waitForElement = useCallback(async (selector: string): Promise<Element | null> => {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const checkElement = () => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }
        
        if (Date.now() - startTime > ELEMENT_WAIT_TIMEOUT) {
          console.warn(`[DashboardTour] Element not found after timeout: ${selector}`);
          resolve(null);
          return;
        }
        
        setTimeout(checkElement, ELEMENT_POLL_INTERVAL);
      };
      
      checkElement();
    });
  }, []);

  /**
   * Navigate to a tab and wait for its content to render
   * This function is robust and waits for actual tab change confirmation
   */
  const navigateToTab = useCallback(async (targetTab: string): Promise<boolean> => {
    // If already on the correct tab, verify and return
    if (activeTabRef.current === targetTab) {
      // Double-check URL matches
      const currentUrl = typeof window !== 'undefined' ? window.location.search : '';
      const expectedParam = targetTab === 'dashboard' ? '' : `?t=${targetTab}`;
      if (currentUrl === expectedParam || (targetTab === 'dashboard' && !currentUrl.includes('t='))) {
        await new Promise(resolve => setTimeout(resolve, 200));
        return true;
      }
    }
    
    console.log(`[DashboardTour] Navigating from "${activeTabRef.current}" to "${targetTab}"`);
    
    // Change tab
    onTabChange(targetTab);
    
    // Wait for URL to update and state to sync
    const startTime = Date.now();
    const maxWaitTime = 2000; // Maximum 2 seconds
    
    while (Date.now() - startTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if URL updated
      const currentUrl = typeof window !== 'undefined' ? window.location.search : '';
      const expectedParam = targetTab === 'dashboard' ? '' : `?t=${targetTab}`;
      const urlMatches = currentUrl === expectedParam || (targetTab === 'dashboard' && !currentUrl.includes('t='));
      
      // Check if activeTab state updated
      const stateMatches = activeTabRef.current === targetTab;
      
      if (urlMatches && stateMatches) {
        console.log(`[DashboardTour] Tab navigation confirmed: URL and state match "${targetTab}"`);
        // Extra wait for DOM to render
        await new Promise(resolve => setTimeout(resolve, 300));
        return true;
      }
    }
    
    // If we get here, navigation might have failed, but log and continue
    console.warn(`[DashboardTour] Tab navigation timeout - continuing anyway. Current: "${activeTabRef.current}", Target: "${targetTab}"`);
    await new Promise(resolve => setTimeout(resolve, 500));
    return false;
  }, [onTabChange]);

  // ============================================================================
  // TOUR LOGIC
  // ============================================================================

  /**
   * Start the tour using Shepherd.js
   */
  const startTour = useCallback(async () => {
    if (typeof window === 'undefined') return; // SSR guard
    
    // In test mode, allow restart even if tourStarted is true
    if (!INTRO_TEST_MODE && (tourStarted || tourCompletedRef.current)) {
      console.log('[DashboardTour] Tour already started or completed, skipping');
      return;
    }
    
    console.log('[DashboardTour] Starting tour...', {
      tourStarted,
      tourCompleted: tourCompletedRef.current,
      INTRO_TEST_MODE,
    });
    setTourStarted(true);
    
    try {
      // Dynamically import Shepherd.js (client-side only)
      console.log('[DashboardTour] Importing Shepherd.js...');
      const Shepherd = (await import('shepherd.js')).default;
      
      if (!Shepherd || !Shepherd.Tour) {
        console.error('[DashboardTour] Shepherd.Tour not available');
        throw new Error('Shepherd.Tour class not available');
      }
      console.log('[DashboardTour] Shepherd.js imported successfully');
      
      // Build steps array, filtering out steps for missing elements
      const shepherdSteps: any[] = [];
      
      // Detect if we're on mobile (matches the lg:hidden breakpoint used in dashboard)
      const isMobile = window.innerWidth < 1024;
      console.log(`[DashboardTour] Device detection - isMobile: ${isMobile}, width: ${window.innerWidth}`);
      
      // First, determine total valid steps for progress calculation
      const validStepConfigs = tourSteps.filter(step => {
        if (!hasCampaigns && step.id === 'campaign-progress') return false;
        return true;
      });
      const totalSteps = validStepConfigs.length;
      let stepIndex = 0;
      
      for (const stepConfig of tourSteps) {
        // Check if we should skip campaign-related steps when no campaigns
        if (!hasCampaigns && stepConfig.id === 'campaign-progress') {
          console.log(`[DashboardTour] Skipping step "${stepConfig.id}" - no campaigns`);
          continue;
        }
        
        stepIndex++;
        const currentStep = stepIndex;
        const progressPercent = (currentStep / totalSteps) * 100;
        
        // Use mobile-specific element/position if available and on mobile
        const elementSelector = (isMobile && stepConfig.mobileElement) ? stepConfig.mobileElement : stepConfig.element;
        const stepPosition = (isMobile && stepConfig.mobilePosition) ? stepConfig.mobilePosition : stepConfig.position;
        const shouldScrollOnMobile = isMobile && stepConfig.mobileScrollToElement;
        
        console.log(`[DashboardTour] Building step "${stepConfig.id}" - element: ${elementSelector}, position: ${stepPosition}, mobileScroll: ${shouldScrollOnMobile}`);
        
        // Create step with beforeShowPromise to handle tab navigation and element waiting
        shepherdSteps.push({
          id: stepConfig.id,
          text: stepConfig.content,
          // Add progress indicator to title
          title: `<div class="shepherd-progress-wrapper"><div class="shepherd-progress-ring" style="--progress: ${progressPercent}%;"></div><span class="shepherd-title-text">${stepConfig.title}</span></div>`,
          attachTo: {
            element: elementSelector,
            on: stepPosition || 'auto',
          },
          beforeShowPromise: async () => {
            try {
              // Navigate to the correct tab first
              const targetTab = stepConfig.tab;
              console.log(`[DashboardTour] beforeShowPromise: step "${stepConfig.id}", target tab: ${targetTab}, current tab: ${activeTabRef.current}`);
              
              // Always navigate (even if we think we're on the right tab) to ensure consistency
              console.log(`[DashboardTour] Navigating to tab: ${targetTab}`);
              const navSuccess = await navigateToTab(targetTab);
              
              if (!navSuccess) {
                console.warn(`[DashboardTour] Navigation may have failed, but continuing...`);
              }
              
              // Verify we're on the correct tab before proceeding
              let retries = 0;
              const maxRetries = 5;
              while (activeTabRef.current !== targetTab && retries < maxRetries) {
                console.log(`[DashboardTour] Waiting for tab to change... (attempt ${retries + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 200));
                retries++;
              }
              
              if (activeTabRef.current !== targetTab) {
                console.error(`[DashboardTour] Failed to navigate to tab "${targetTab}" after ${maxRetries} attempts. Current tab: "${activeTabRef.current}"`);
                // Still try to continue, but log the error
              }
              
              // Scroll to top of page after tab navigation - ensures consistent positioning
              // But for mobile scroll-to-element steps, we'll scroll to the element instead
              if (!shouldScrollOnMobile) {
                window.scrollTo({ top: 0, behavior: 'instant' });
              }
              
              // Special handling: expand first campaign accordion
              if (stepConfig.id === 'campaign-progress' && onExpandFirstCampaign) {
                console.log('[DashboardTour] Expanding first campaign accordion');
                onExpandFirstCampaign();
                // Wait for accordion to expand
                await new Promise(resolve => setTimeout(resolve, 400));
              }
              
              // Extra wait for DOM to fully render after tab change
              await new Promise(resolve => setTimeout(resolve, 300));
              
              // Wait for element to appear - with retry logic (use the correct selector for mobile/desktop)
              let element = await waitForElement(elementSelector);
              
              // If element not found and we're on the wrong tab, try navigating again
              if (!element && activeTabRef.current !== targetTab) {
                console.log(`[DashboardTour] Element not found and wrong tab detected. Retrying navigation...`);
                await navigateToTab(targetTab);
                await new Promise(resolve => setTimeout(resolve, 500));
                element = await waitForElement(elementSelector);
              }
              
              if (!element) {
                if (stepConfig.skipIfMissing) {
                  console.log(`[DashboardTour] Element not found, skipping step "${stepConfig.id}"`);
                  // Return null to skip this step
                  return null;
                } else {
                  console.error(`[DashboardTour] Required element not found: ${elementSelector} on tab "${activeTabRef.current}" (expected "${targetTab}")`);
                  // Still return null to skip, but log error
                  return null;
                }
              }
              
              // Mobile: Scroll to element if configured
              if (shouldScrollOnMobile && element) {
                console.log(`[DashboardTour] Mobile: Scrolling to element for step "${stepConfig.id}"`);
                
                // Get the element's position and dimensions
                const elementRect = element.getBoundingClientRect();
                const elementTop = window.scrollY + elementRect.top;
                const elementHeight = elementRect.height;
                const viewportHeight = window.innerHeight;
                
                // Calculate scroll position to CENTER the element in the viewport
                // Formula: scroll to position where element's center aligns with viewport center
                // But offset slightly higher to account for the tour modal that will appear
                const elementCenter = elementTop + (elementHeight / 2);
                const viewportCenter = viewportHeight / 2;
                const scrollTarget = elementCenter - viewportCenter;
                
                console.log(`[DashboardTour] Mobile scroll: elementTop=${elementTop}, elementCenter=${elementCenter}, viewportCenter=${viewportCenter}, scrollTarget=${scrollTarget}`);
                
                // Single smooth scroll directly to the centered position
                window.scrollTo({
                  top: Math.max(0, scrollTarget),
                  behavior: 'smooth'
                });
                
                // Wait for scroll animation to complete
                await new Promise(resolve => setTimeout(resolve, 600));
                
                // Verify element position
                const newRect = element.getBoundingClientRect();
                console.log(`[DashboardTour] Mobile: Element position after scroll - top: ${newRect.top}, center: ${newRect.top + newRect.height/2}, viewport center: ${viewportHeight/2}`);
              }
              
              console.log(`[DashboardTour] ✅ Element found for step "${stepConfig.id}" on tab "${activeTabRef.current}"`);
              // Return undefined to proceed with the step (Shepherd.js will use the selector from attachTo)
              return;
            } catch (error: any) {
              // Handle AbortError gracefully - this can happen when React cancels async operations
              if (error?.name === 'AbortError' || error?.message?.includes('abort')) {
                console.warn(`[DashboardTour] Step "${stepConfig.id}" was aborted (likely due to navigation), continuing...`);
                return; // Allow the step to continue
              }
              console.error(`[DashboardTour] Error in beforeShowPromise for step "${stepConfig.id}":`, error);
              throw error; // Re-throw other errors
            }
          },
          // Add scroll-to-center-modal behavior for specific steps only
          when: {
            show: function() {
              // Special handling for Step 2 - force to right side of viewport
              if (stepConfig.id === 'all-campaigns') {
                setTimeout(() => {
                  const modal = document.querySelector('.shepherd-element');
                  if (modal) {
                    // Inject a style tag with highest specificity
                    let styleTag = document.getElementById('shepherd-step2-override');
                    if (!styleTag) {
                      styleTag = document.createElement('style');
                      styleTag.id = 'shepherd-step2-override';
                      styleTag.textContent = `
                        .shepherd-element.shepherd-step-all-campaigns,
                        .shepherd-element[data-shepherd-step="all-campaigns"] {
                          position: fixed !important;
                          right: 24px !important;
                          left: auto !important;
                          top: 50% !important;
                          transform: translateY(-50%) !important;
                          margin: 0 !important;
                        }
                        .shepherd-element.shepherd-step-all-campaigns .shepherd-arrow,
                        .shepherd-element[data-shepherd-step="all-campaigns"] .shepherd-arrow {
                          left: -10px !important;
                          right: auto !important;
                          top: 50% !important;
                          transform: translateY(-50%) !important;
                        }
                      `;
                      document.head.appendChild(styleTag);
                    }
                    
                    console.log(`[DashboardTour] Forced Step 2 modal to right side`);
                  }
                }, 150);
              }
              
              // Only auto-scroll to center modal for specific steps (DESKTOP ONLY)
              // Skip this for mobile steps that already handle their own scrolling via mobileScrollToElement
              const stepsNeedingCenteredModal = ['artist-profile', 'curator-contact-button'];
              const needsCentering = stepsNeedingCenteredModal.includes(stepConfig.id);
              
              // Don't do modal centering scroll on mobile if we already scrolled to the element
              const skipCenteringOnMobile = shouldScrollOnMobile;
              
              console.log(`[DashboardTour] Step shown: "${stepConfig.id}", needs centering: ${needsCentering}, skip on mobile: ${skipCenteringOnMobile}`);
              
              if (needsCentering && !skipCenteringOnMobile) {
                // Wait for modal to be fully positioned, then scroll to center it
                setTimeout(() => {
                  const modal = document.querySelector('.shepherd-element');
                  console.log(`[DashboardTour] Modal found:`, !!modal);
                  if (modal) {
                    const modalRect = modal.getBoundingClientRect();
                    const modalCenter = modalRect.top + modalRect.height / 2;
                    const viewportCenter = window.innerHeight / 2;
                    const scrollAdjustment = modalCenter - viewportCenter;
                    
                    console.log(`[DashboardTour] Centering modal for "${stepConfig.id}" - modal center: ${modalCenter}, viewport center: ${viewportCenter}, adjustment: ${scrollAdjustment}px`);
                    
                    // Only scroll if modal is not already centered (with some tolerance)
                    if (Math.abs(scrollAdjustment) > 30) {
                      window.scrollBy({
                        top: scrollAdjustment,
                        behavior: 'smooth'
                      });
                    }
                  }
                }, 250); // Delay for reliable positioning
              }
            }
          },
          // Add step-specific class for CSS targeting
          classes: `fasho-tour-step shepherd-step-${stepConfig.id}`,
          buttons: [
            {
              text: '← Back',
              action: function(this: any) {
                return this.back();
              },
              classes: 'shepherd-button-secondary',
            },
            {
              text: 'Next →',
              action: function(this: any) {
                return this.next();
              },
              classes: 'shepherd-button-primary',
            },
          ],
          cancelIcon: {
            enabled: true,
          },
        });
      }
      
      // Filter out null steps (skipped steps)
      const validSteps = shepherdSteps.filter(step => step !== null);
      
      if (validSteps.length === 0) {
        console.warn('[DashboardTour] No valid steps found, cannot start tour');
        setTourStarted(false);
        return;
      }
      
      // Update last step to have "Done" button instead of "Next"
      if (validSteps.length > 0) {
        const lastStep = validSteps[validSteps.length - 1];
        lastStep.buttons = [
          {
            text: '← Back',
            action: function(this: any) {
              return this.back();
            },
            classes: 'shepherd-button-secondary',
          },
          {
            text: 'Got it!',
            action: function(this: any) {
              return this.complete();
            },
            classes: 'shepherd-button-primary',
          },
        ];
      }
      
      // Create tour instance with rounded corners and padding on the highlight cutout
      const tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          cancelIcon: {
            enabled: true,
          },
          classes: 'fasho-tour-step',
          scrollTo: false, // Disable auto-scroll by default - only enable on specific steps
          modalOverlayOpeningRadius: 16, // Rounded corners on the highlight cutout
          modalOverlayOpeningPadding: 8, // Padding around the highlighted element
        },
      });
      
      // Add steps to tour
      validSteps.forEach(step => {
        tour.addStep(step);
      });
      
      // Handle tour completion
      tour.on('complete', () => {
        console.log('[DashboardTour] Tour completed');
        // Only mark as completed in production mode
        if (!INTRO_TEST_MODE) {
          tourCompletedRef.current = true;
          markTourAsSeen();
        }
        setTourStarted(false);
        hasInitialized.current = false; // Allow restart
        tourInstance.current = null;
      });
      
      // Handle tour cancellation
      tour.on('cancel', () => {
        console.log('[DashboardTour] Tour cancelled');
        // Only mark as completed in production mode
        if (!INTRO_TEST_MODE) {
          tourCompletedRef.current = true;
          markTourAsSeen();
        }
        setTourStarted(false);
        hasInitialized.current = false; // Allow restart
        tourInstance.current = null;
      });
      
      // Store tour instance
      tourInstance.current = tour;
      
      // Navigate to first step's tab before starting
      const firstStep = tourSteps[0];
      if (firstStep) {
        await navigateToTab(firstStep.tab);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Start the tour
      console.log('[DashboardTour] Starting Shepherd tour...');
      tour.start();
      console.log('[DashboardTour] Tour started successfully');
      
    } catch (error) {
      console.error('[DashboardTour] Error starting tour:', error);
      setTourStarted(false);
      hasInitialized.current = false; // Allow retry
    }
  }, [navigateToTab, onTabChange, onExpandFirstCampaign, waitForElement, markTourAsSeen, hasCampaigns]);

  // ============================================================================
  // EXPOSE startTour TO PARENT COMPONENT
  // ============================================================================
  
  // Create a manual trigger function that resets state and starts the tour
  const triggerTourManually = useCallback(() => {
    console.log('[DashboardTour] Manual trigger requested');
    // Reset the initialization state to allow restart
    hasInitialized.current = false;
    tourCompletedRef.current = false;
    setTourStarted(false);
    // Start the tour after a brief delay
    setTimeout(() => {
      startTour();
    }, 100);
  }, [startTour]);
  
  // Expose the trigger function to parent component
  useEffect(() => {
    if (onTourReady) {
      onTourReady(triggerTourManually);
    }
  }, [onTourReady, triggerTourManually]);

  // ============================================================================
  // TEST MODE: Auto-start for development/testing (env flag required)
  // ============================================================================

  useEffect(() => {
    // Only for TEST MODE (requires NEXT_PUBLIC_INTRO_TEST_MODE=true)
    if (!INTRO_TEST_MODE) return;
    
    console.log('[DashboardTour] TEST MODE: Checking conditions...', {
      isDashboardReady,
      isSurveyModalOpen,
      hasInitialized: hasInitialized.current,
    });
    
    // Wait for dashboard to be ready
    if (!isDashboardReady) return;
    
    // Wait for survey modal to close (even in test mode)
    if (isSurveyModalOpen) return;
    
    // Don't re-initialize
    if (hasInitialized.current) return;
    
    console.log('[DashboardTour] TEST MODE: Starting tour (bypasses database check)...');
    hasInitialized.current = true;
    
    const timer = setTimeout(() => {
      startTour();
    }, TOUR_START_DELAY);
    
    return () => clearTimeout(timer);
  }, [isDashboardReady, isSurveyModalOpen, startTour]);

  // ============================================================================
  // PRODUCTION MODE: Robust tour initialization with survey modal handling
  // ============================================================================

  useEffect(() => {
    // Only for PRODUCTION MODE
    if (INTRO_TEST_MODE) return;
    
    let isMounted = true;

    const initProductionTour = async () => {
      console.log('[DashboardTour] PRODUCTION: Checking tour conditions...', {
        isDashboardReady,
        isSurveyModalOpen,
        hasInitialized: hasInitialized.current,
        tourCompleted: tourCompletedRef.current,
      });
      
      // Guard: Don't proceed if component unmounted
      if (!isMounted) {
        console.log('[DashboardTour] PRODUCTION: Component unmounted, aborting');
        return;
      }
      
      // Guard: Dashboard must be ready (data loaded, UI rendered)
      if (!isDashboardReady) {
        console.log('[DashboardTour] PRODUCTION: Waiting for dashboard to be ready...');
        return;
      }
      
      // Guard: Wait for survey modal to be closed/completed
      // This handles the case where user signed up via login page and sees survey on dashboard
      if (isSurveyModalOpen) {
        console.log('[DashboardTour] PRODUCTION: Survey modal is open, waiting for completion...');
        return;
      }
      
      // Guard: Don't re-initialize if already done
      if (hasInitialized.current) {
        console.log('[DashboardTour] PRODUCTION: Already initialized');
        return;
      }
      
      // Guard: Don't restart if tour was completed this session
      if (tourCompletedRef.current) {
        console.log('[DashboardTour] PRODUCTION: Tour already completed this session');
        return;
      }
      
      // Fetch tour status from database
      console.log('[DashboardTour] PRODUCTION: Checking database for tour status...');
      const hasSeen = await fetchTourStatus();
      
      // Guard: Check mount status again after async call
      if (!isMounted) {
        console.log('[DashboardTour] PRODUCTION: Component unmounted during fetch, aborting');
        return;
      }
      
      // Guard: User has already seen the tour
      if (hasSeen) {
        console.log('[DashboardTour] PRODUCTION: User has already seen tour (database flag)');
        hasInitialized.current = true; // Prevent future attempts
        return;
      }
      
      // All conditions met - start the tour!
      console.log('[DashboardTour] PRODUCTION: All conditions met! Starting tour for first-time user...');
      hasInitialized.current = true;
      
      // Small delay to ensure UI is fully stable
      setTimeout(() => {
        if (isMounted && !tourCompletedRef.current) {
          console.log('[DashboardTour] PRODUCTION: Triggering startTour()');
          startTour();
        }
      }, TOUR_START_DELAY);
    };

    // Initial attempt
    initProductionTour();

    return () => {
      isMounted = false;
    };
  }, [isDashboardReady, isSurveyModalOpen, fetchTourStatus, startTour]);
  
  // ============================================================================
  // PRODUCTION MODE: Re-check when survey modal closes
  // ============================================================================
  
  // This effect specifically handles the case where the survey modal was open
  // and then gets closed - we need to re-trigger the tour initialization
  const prevSurveyModalOpen = useRef(isSurveyModalOpen);
  
  useEffect(() => {
    if (INTRO_TEST_MODE) return;
    
    // Detect when survey modal transitions from open to closed
    if (prevSurveyModalOpen.current && !isSurveyModalOpen) {
      console.log('[DashboardTour] PRODUCTION: Survey modal just closed, checking if tour should start...');
      
      // If tour hasn't been initialized yet, the main effect will handle it
      // But we add a small delay to ensure the modal is fully gone
      if (!hasInitialized.current && !tourCompletedRef.current && isDashboardReady) {
        console.log('[DashboardTour] PRODUCTION: Conditions look good after survey close');
      }
    }
    
    prevSurveyModalOpen.current = isSurveyModalOpen;
  }, [isSurveyModalOpen, isDashboardReady]);

  // ============================================================================
  // RENDER
  // ============================================================================
  
  // This component doesn't render any visible UI - it only manages the tour
  // The tour UI is rendered by Shepherd.js directly into the DOM
  return null;
};

export default DashboardTour;
