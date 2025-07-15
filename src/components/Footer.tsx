import React, { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';

const Footer = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, []);

  return (
    <footer className="bg-gradient-to-b from-[#0a0a13] to-[#000000] border-t border-white/10 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Logo and Company Info */}
          <div className="md:col-span-1">
            <div className="flex items-center mb-4">
              <img 
                src="/fasho-logo-wide.png" 
                alt="FASHO.co" 
                className="h-8 w-auto"
              />
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              The fastest way to get your music heard by millions. Real playlists, real results, real growth.
            </p>
          </div>

          {/* Services */}
          <div className="md:col-span-1">
            <h4 className="text-white font-semibold mb-4">Services</h4>
            <ul className="space-y-2">
              <li>
                <a href="/pricing" className="text-gray-400 hover:text-[#59e3a5] transition-colors duration-200 text-sm">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-[#59e3a5] transition-colors duration-200 text-sm">
                  Authenticity Guarantee
                </a>
              </li>
              <li>
                <a 
                  href="/#faq" 
                  onClick={(e) => {
                    e.preventDefault();
                    const faqSection = document.querySelector('#faq');
                    if (faqSection) {
                      faqSection.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      // If not on homepage, navigate to homepage with anchor
                      window.location.href = '/#faq';
                    }
                  }}
                  className="text-gray-400 hover:text-[#59e3a5] transition-colors duration-200 text-sm"
                >
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="md:col-span-1">
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <a href="/about" className="text-gray-400 hover:text-[#59e3a5] transition-colors duration-200 text-sm">
                  About
                </a>
              </li>
              <li>
                <a href="/api/contact-support" className="text-gray-400 hover:text-[#59e3a5] transition-colors duration-200 text-sm">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & Account */}
          <div className="md:col-span-1">
            <h4 className="text-white font-semibold mb-4">Legal & Account</h4>
            <ul className="space-y-2">
              <li>
                <a 
                  href={currentUser ? "/dashboard" : "/signup"} 
                  className="text-gray-400 hover:text-[#59e3a5] transition-colors duration-200 text-sm"
                >
                  {currentUser ? "Dashboard" : "Sign Up"}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-[#59e3a5] transition-colors duration-200 text-sm">
                  Terms & Conditions
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-[#59e3a5] transition-colors duration-200 text-sm">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-8 pt-6 text-center">
          <p className="text-gray-500 text-sm">
            © 2025 FASHO.co. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 