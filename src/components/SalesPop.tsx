'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// Sales Pop Data Arrays
const FIRST_NAMES = [
  // Male names (80%)
  'Aaron', 'Adam', 'Adrian', 'Alan', 'Albert', 'Alex', 'Alexander', 'Andrew', 'Anthony', 'Antonio',
  'Arthur', 'Austin', 'Benjamin', 'Bernard', 'Bobby', 'Bradley', 'Brandon', 'Brian', 'Bruce', 'Bryan',
  'Carl', 'Carlos', 'Charles', 'Christopher', 'Craig', 'Daniel', 'David', 'Dennis', 'Donald', 'Douglas',
  'Edward', 'Eric', 'Eugene', 'Frank', 'Gary', 'George', 'Gerald', 'Gregory', 'Harold', 'Harry',
  'Henry', 'Howard', 'Jack', 'Jacob', 'James', 'Jason', 'Jeffrey', 'Jeremy', 'Jesse', 'John',
  'Jonathan', 'Jordan', 'Jose', 'Joseph', 'Joshua', 'Juan', 'Justin', 'Keith', 'Kenneth', 'Kevin',
  'Kyle', 'Larry', 'Lawrence', 'Louis', 'Mark', 'Martin', 'Matthew', 'Michael', 'Nathan', 'Nicholas',
  'Noah', 'Oscar', 'Patrick', 'Paul', 'Peter', 'Philip', 'Ralph', 'Raymond', 'Richard', 'Robert',
  'Roger', 'Ronald', 'Roy', 'Russell', 'Ryan', 'Samuel', 'Scott', 'Sean', 'Stephen', 'Steven',
  'Terry', 'Thomas', 'Timothy', 'Tyler', 'Victor', 'Vincent', 'Walter', 'Wayne', 'William', 'Willie',
  'Aaron', 'Albert', 'Alexander', 'Andre', 'Angelo', 'Arthur', 'Bernard', 'Bobby', 'Bradley', 'Brian',
  'Bruce', 'Calvin', 'Carl', 'Charles', 'Christian', 'Christopher', 'Craig', 'Curtis', 'Dale', 'Daniel',
  'David', 'Dennis', 'Derrick', 'Donald', 'Douglas', 'Earl', 'Edgar', 'Edward', 'Edwin', 'Eric',
  'Ernest', 'Eugene', 'Felix', 'Floyd', 'Francis', 'Frank', 'Frederick', 'Gary', 'George', 'Gerald',
  'Glenn', 'Gregory', 'Harold', 'Harry', 'Henry', 'Herbert', 'Howard', 'Hugh', 'Isaac', 'Jack',
  'Jacob', 'James', 'Jason', 'Jeffrey', 'Jeremy', 'Jerome', 'Jesse', 'Jesus', 'John', 'Johnny',
  'Jonathan', 'Jordan', 'Jose', 'Joseph', 'Joshua', 'Juan', 'Julian', 'Justin', 'Keith', 'Kenneth',
  'Kevin', 'Kyle', 'Lance', 'Larry', 'Lawrence', 'Leo', 'Leonard', 'Lewis', 'Louis', 'Lucas',
  'Luis', 'Luke', 'Manuel', 'Marcus', 'Mario', 'Mark', 'Martin', 'Matthew', 'Maurice', 'Max',
  'Michael', 'Miguel', 'Nathan', 'Nathaniel', 'Nicholas', 'Noah', 'Norman', 'Oliver', 'Oscar', 'Owen',
  // Female names (20%)
  'Abigail', 'Alice', 'Amanda', 'Amy', 'Andrea', 'Angela', 'Anna', 'Ashley', 'Barbara', 'Betty',
  'Brenda', 'Carol', 'Catherine', 'Charlotte', 'Christina', 'Christine', 'Cynthia', 'Deborah', 'Diana', 'Donna',
  'Dorothy', 'Elizabeth', 'Emily', 'Emma', 'Evelyn', 'Frances', 'Helen', 'Janet', 'Jennifer', 'Jessica',
  'Joan', 'Joyce', 'Julia', 'Julie', 'Karen', 'Katherine', 'Kathleen', 'Kelly', 'Laura', 'Linda',
  'Lisa', 'Margaret', 'Maria', 'Marie', 'Martha', 'Mary', 'Michelle', 'Nancy', 'Nicole', 'Olivia'
];

const LAST_INITIALS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
];

const PACKAGES = [
  'Breakthrough',
  'Momentum', 
  'Dominate',
  'Unstoppable',
  'Legendary'
];

const EMOJIS = [
  '🔥', '⚡️', '🚀', '💪', '😎', '🤩', '🥳', '🙌', '🤘', '👑', '⭐️', '🎤', '🎶', '🎵', '🎹'
];

interface SalesPopData {
  firstName: string;
  lastInitial: string;
  package: string;
  emoji: string;
  minutesAgo: number;
}

const SalesPop: React.FC = () => {
  const [showPop, setShowPop] = useState(false);
  const [popData, setPopData] = useState<SalesPopData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isMasterInstance, setIsMasterInstance] = useState(false);

  // Check if this popup should be visible on the current page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const allowedPages = ['/', '/add', '/pricing', '/about', '/contact', '/packages'];
      setIsVisible(allowedPages.includes(pathname));
    }
  }, []);

  // Handle mobile viewport height changes for sales pop positioning (MOBILE ONLY FIX)
  useEffect(() => {
    const updateSalesPopPosition = () => {
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)') || '0');
        
        // Calculate the bottom position to keep sales pop flush with bottom
        const bottomPosition = Math.max(3, safeAreaBottom);
        
        // Set CSS custom property for sales pop positioning
        document.documentElement.style.setProperty('--sales-pop-bottom', `${bottomPosition}px`);
      }
    };

    // Update on mount
    updateSalesPopPosition();

    // Update on resize and orientation change
    window.addEventListener('resize', updateSalesPopPosition);
    window.addEventListener('orientationchange', () => {
      // Delay to account for browser UI changes
      setTimeout(updateSalesPopPosition, 100);
    });

    // Update on scroll (for URL bar show/hide detection) - THROTTLED to prevent re-renders
    let ticking = false;
    let lastScrollTime = 0;
    const handleScroll = () => {
      const now = Date.now();
      // Only update every 100ms to prevent excessive re-renders
      if (now - lastScrollTime < 100) return;
      
      if (!ticking) {
        requestAnimationFrame(() => {
          updateSalesPopPosition();
          ticking = false;
          lastScrollTime = now;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', updateSalesPopPosition);
      window.removeEventListener('orientationchange', updateSalesPopPosition);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Master instance coordination - only one tab controls the timer
  useEffect(() => {
    if (!isVisible) return;

    const instanceId = Math.random().toString(36).substring(7);
    const MASTER_KEY = 'sales_pop_master';
    const HEARTBEAT_KEY = 'sales_pop_heartbeat';
    const POP_DATA_KEY = 'sales_pop_data';
    const SHOW_STATE_KEY = 'sales_pop_show';

    let heartbeatInterval: NodeJS.Timeout;
    let checkMasterInterval: NodeJS.Timeout;

    const becomeMaster = () => {
      localStorage.setItem(MASTER_KEY, instanceId);
      localStorage.setItem(HEARTBEAT_KEY, Date.now().toString());
      setIsMasterInstance(true);
      
      // Send heartbeat every 2 seconds
      heartbeatInterval = setInterval(() => {
        if (localStorage.getItem(MASTER_KEY) === instanceId) {
          localStorage.setItem(HEARTBEAT_KEY, Date.now().toString());
        }
      }, 2000);
    };

    const checkMasterStatus = () => {
      const currentMaster = localStorage.getItem(MASTER_KEY);
      const lastHeartbeat = parseInt(localStorage.getItem(HEARTBEAT_KEY) || '0');
      const now = Date.now();

      // If no master or master is dead (no heartbeat for 5 seconds), become master
      if (!currentMaster || now - lastHeartbeat > 5000) {
        becomeMaster();
      } else if (currentMaster === instanceId) {
        setIsMasterInstance(true);
      } else {
        setIsMasterInstance(false);
      }
    };

    // Listen for pop data changes from master instance
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === POP_DATA_KEY && e.newValue) {
        const data = JSON.parse(e.newValue);
        setPopData(data);
      }
      if (e.key === SHOW_STATE_KEY) {
        setShowPop(e.newValue === 'true');
      }
    };

    // Initial master check
    checkMasterStatus();
    
    // Check master status every 3 seconds
    checkMasterInterval = setInterval(checkMasterStatus, 3000);
    
    // Listen for storage changes
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(checkMasterInterval);
      window.removeEventListener('storage', handleStorageChange);
      
      // Clean up if this was the master
      if (localStorage.getItem(MASTER_KEY) === instanceId) {
        localStorage.removeItem(MASTER_KEY);
        localStorage.removeItem(HEARTBEAT_KEY);
      }
    };
  }, [isVisible]);

  // Generate random sales pop data
  const generatePopData = useCallback(() => {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastInitial = LAST_INITIALS[Math.floor(Math.random() * LAST_INITIALS.length)];
    const packageName = PACKAGES[Math.floor(Math.random() * PACKAGES.length)];
    const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    const minutesAgo = Math.floor(Math.random() * 60) + 1; // 1-60 minutes ago

    return {
      firstName,
      lastInitial,
      package: packageName,
      emoji,
      minutesAgo
    };
  }, []);

  // Master instance timer logic - only master controls the popup cycle
  useEffect(() => {
    if (!isMasterInstance || !isVisible) return;

    let currentTimer: NodeJS.Timeout;
    let hideTimer: NodeJS.Timeout;

    const POP_DATA_KEY = 'sales_pop_data';
    const SHOW_STATE_KEY = 'sales_pop_show';

    const broadcastPopData = (data: SalesPopData) => {
      localStorage.setItem(POP_DATA_KEY, JSON.stringify(data));
      setPopData(data);
    };

    const broadcastShowState = (show: boolean) => {
      localStorage.setItem(SHOW_STATE_KEY, show.toString());
      setShowPop(show);
    };

    const startPopCycle = (isFirstPop = false) => {
      // First popup shows immediately, subsequent popups have random delay
      const randomDelay = isFirstPop ? 0 : Math.floor(Math.random() * 8000) + 12000;
      
      currentTimer = setTimeout(() => {
        // Generate new pop data
        const newPopData = generatePopData();
        broadcastPopData(newPopData);
        broadcastShowState(true);

        // Hide after exactly 9 seconds
        hideTimer = setTimeout(() => {
          broadcastShowState(false);
          
          // Start next cycle after hide animation completes (500ms)
          setTimeout(() => startPopCycle(false), 500);
        }, 9000);
      }, randomDelay);
    };

    // Start first popup after exactly 10 seconds
    const initialTimer = setTimeout(() => startPopCycle(true), 10000);

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(currentTimer);
      clearTimeout(hideTimer);
    };
  }, [isMasterInstance, isVisible, generatePopData]);

  // Don't render if not visible or no data
  if (!isVisible || !popData) return null;

  return (
    <div
      className={`sales-pop-container ${showPop ? 'sales-pop-visible' : 'sales-pop-hidden'}`}
      style={{ zIndex: 9999 }}
    >
      <div className="sales-pop-content">
        {/* Emoji Icon */}
        <div className="sales-pop-emoji">
          {popData.emoji}
        </div>
        
        {/* Main Message */}
        <div className="sales-pop-message">
          <div className="sales-pop-text">
            <span className="sales-pop-name">
              {popData.firstName} {popData.lastInitial}.
            </span>{' '}
            just purchased a{' '}
            <Link href="/#start-campaign" className="sales-pop-package hover:opacity-80 transition-opacity cursor-pointer">
              {popData.package}
            </Link>{' '}
            campaign!
          </div>
        </div>

        {/* Timestamp and Verification */}
        <div className="sales-pop-footer">
          <div className="sales-pop-timestamp">
            {popData.minutesAgo} minutes ago
          </div>
          <div className="sales-pop-verification">
            <span className="sales-pop-checkmark">✓</span>
            Verified by Nudgify
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesPop;