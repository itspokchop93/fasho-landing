import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '../utils/supabase/client';
import { User } from '@supabase/supabase-js';
import Header from '../components/Header';
import Footer from '../components/Footer';

const PricingPage = () => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, []);

  const packages = [
    {
      name: "LEGENDARY",
      price: 479,
      streams: "125,000 - 150,000 Streams",
      pitches: "375 - 400 Playlist Pitches",
      features: [
        "Campaign starts within only 24 hours",
        "All streams achieved in only 7-10 days",
        "Established playlist curators",
        "All genres supported",
        "Spotify-safe guarantee",
        "Dashboard tracking included"
      ]
    },
    {
      name: "UNSTOPPABLE",
      price: 259,
      streams: "45,000 - 50,000 Streams",
      pitches: "150 - 170 Playlist Pitches",
      features: [
        "Campaign starts within only 24 hours",
        "All streams achieved in only 7-10 days",
        "Established playlist curators",
        "All genres supported",
        "Spotify-safe guarantee",
        "Dashboard tracking included"
      ]
    },
    {
      name: "DOMINATE",
      price: 149,
      streams: "18,000 - 20,000 Streams",
      pitches: "60 - 70 Playlist Pitches",
      popular: true,
      features: [
        "Campaign starts within only 24 hours",
        "All streams achieved in only 7-10 days",
        "Established playlist curators",
        "All genres supported",
        "Spotify-safe guarantee",
        "Dashboard tracking included"
      ]
    },
    {
      name: "MOMENTUM",
      price: 79,
      streams: "7,500 - 8,500 Streams",
      pitches: "25 - 30 Playlist Pitches",
      features: [
        "Campaign starts within only 24 hours",
        "All streams achieved in only 7-10 days",
        "Established playlist curators",
        "All genres supported",
        "Spotify-safe guarantee",
        "Dashboard tracking included"
      ]
    },
    {
      name: "BREAKTHROUGH",
      price: 39,
      streams: "3,000 - 3,500 Streams",
      pitches: "10-12 Playlist Pitches",
      features: [
        "Campaign starts within only 24 hours",
        "All streams achieved in only 7-10 days",
        "Established playlist curators",
        "All genres supported",
        "Spotify-safe guarantee",
        "Dashboard tracking included"
      ]
    }
  ];

  // SEPARATE COMPARISON TABLE DATA - COMPLETELY INDEPENDENT FROM PRICING CARDS
  const comparisonPackages = [
    {
      name: "LEGENDARY",
      price: 479,
      features: [
        "Campaign starts within only 24 hours",
        "All streams achieved in only 7-10 days",
        "Established playlist curators",
        "All genres supported",
        "Spotify-safe guarantee",
        "Dashboard tracking included",
        "Priority curator outreach",
        "Major playlist targeting",
        "Industry influencer reach",
        "VIP curator network access",
        "Dedicated account manager"
      ]
    },
    {
      name: "UNSTOPPABLE",
      price: 259,
      features: [
        "Campaign starts within only 24 hours",
        "All streams achieved in only 7-10 days",
        "Established playlist curators",
        "All genres supported",
        "Spotify-safe guarantee",
        "Dashboard tracking included",
        "Priority curator outreach",
        "Major playlist targeting",
        "Industry influencer reach"
      ]
    },
    {
      name: "DOMINATE",
      price: 149,
      features: [
        "Campaign starts within only 24 hours",
        "All streams achieved in only 7-10 days",
        "Established playlist curators",
        "All genres supported",
        "Spotify-safe guarantee",
        "Dashboard tracking included",
        "Priority curator outreach"
      ]
    },
    {
      name: "MOMENTUM",
      price: 79,
      features: [
        "Campaign starts within only 24 hours",
        "All streams achieved in only 7-10 days",
        "Established playlist curators",
        "All genres supported",
        "Spotify-safe guarantee",
        "Dashboard tracking included"
      ]
    },
    {
      name: "BREAKTHROUGH",
      price: 39,
      features: [
        "Campaign starts within only 24 hours",
        "All streams achieved in only 7-10 days",
        "Established playlist curators",
        "All genres supported",
        "Spotify-safe guarantee",
        "Dashboard tracking included"
      ]
    }
  ];

  const allFeatures = [
    "Campaign starts within only 24 hours",
    "All streams achieved in only 7-10 days",
    "Established playlist curators",
    "All genres supported",
    "Spotify-safe guarantee",
    "Dashboard tracking included",
    "Priority curator outreach",
    "Major playlist targeting",
    "Industry influencer reach",
    "VIP curator network access",
    "Dedicated account manager"
  ];

  const handleGetStarted = (packageName: string) => {
    router.push('/#start-campaign');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#18192a] to-[#0a0a13]">
      <Header />
      
      <div className="pt-32 pb-16">
        {/* Hero Section */}
        <div className="text-center mb-8 px-4 py-12">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent leading-tight px-4 py-2">
            Pricing Plans
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-2" style={{ marginBottom: '-40px' }}>
            Choose the perfect plan to launch your music career to the next level
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-7xl mx-auto px-4 mb-20">
          {/* First Row - 3 Cards */}
          <div className="flex flex-wrap justify-center gap-6 mb-6">
            {packages.slice(0, 3).map((pkg, index) => (
              <div
                key={index}
                className={`relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl border p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-[#14c0ff]/20 w-full sm:w-80 flex flex-col ${
                  pkg.popular 
                    ? 'border-[#59e3a5] shadow-2xl shadow-[#59e3a5]/20' 
                    : 'border-white/20 hover:border-[#14c0ff]/50'
                }`}
                style={{ minHeight: '520px' }}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-white px-4 py-1 rounded-full text-sm font-bold">
                      POPULAR
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold mb-4 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">{pkg.name}</h3>
                  <div className="mb-6 py-4">
                    <span className="text-5xl font-black text-white">${pkg.price}</span>
                    <span className="text-gray-400 text-sm">/campaign</span>
                  </div>
                  <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/90 backdrop-blur-sm rounded-xl border border-white/20 p-4 space-y-2">
                    <p className="text-base font-bold bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">{pkg.streams}</p>
                    <p className="text-base font-bold bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">{pkg.pitches}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-8 flex-grow">
                  {pkg.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-5 h-5 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-gray-300 text-sm leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleGetStarted(pkg.name)}
                  className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 mt-auto ${
                    pkg.popular
                      ? 'bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-white hover:shadow-lg hover:shadow-[#14c0ff]/30'
                      : 'bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-[#14c0ff]/50'
                  }`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
          
          {/* Second Row - 2 Cards */}
          <div className="flex flex-wrap justify-center gap-6">
            {packages.slice(3, 5).map((pkg, index) => (
              <div
                key={index + 3}
                className={`relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl border p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-[#14c0ff]/20 w-full sm:w-80 flex flex-col ${
                  pkg.popular 
                    ? 'border-[#59e3a5] shadow-2xl shadow-[#59e3a5]/20' 
                    : 'border-white/20 hover:border-[#14c0ff]/50'
                }`}
                style={{ minHeight: '520px' }}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-white px-4 py-1 rounded-full text-sm font-bold">
                      POPULAR
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold mb-4 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">{pkg.name}</h3>
                  <div className="mb-6 py-4">
                    <span className="text-5xl font-black text-white">${pkg.price}</span>
                    <span className="text-gray-400 text-sm">/campaign</span>
                  </div>
                  <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/90 backdrop-blur-sm rounded-xl border border-white/20 p-4 space-y-2">
                    <p className="text-base font-bold bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">{pkg.streams}</p>
                    <p className="text-base font-bold bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">{pkg.pitches}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-8 flex-grow">
                  {pkg.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-5 h-5 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-gray-300 text-sm leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleGetStarted(pkg.name)}
                  className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 mt-auto ${
                    pkg.popular
                      ? 'bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-white hover:shadow-lg hover:shadow-[#14c0ff]/30'
                      : 'bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-[#14c0ff]/50'
                  }`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Campaign Comparison Table */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-2 py-1">
            <h2 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent leading-tight px-4 py-2">
              Campaign Comparison
            </h2>
            <p className="text-xl text-gray-300" style={{ marginBottom: '20px' }}>
              Compare all features across our packages
            </p>
            
            {/* Mobile Swipe Indicator */}
            <div className="md:hidden flex justify-end pr-4 mb-1">
              <div className="flex items-center space-x-2 text-gray-400 text-sm" style={{ fontFamily: 'Comic Sans MS, cursive, sans-serif' }}>
                <div className="animate-pulse" style={{ animation: 'bounceLeft 1.5s infinite' }}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span>Swipe Left</span>
              </div>
            </div>
            
            <style jsx>{`
              @keyframes bounceLeft {
                0%, 20%, 50%, 80%, 100% {
                  transform: translateX(0);
                }
                40% {
                  transform: translateX(-4px);
                }
                60% {
                  transform: translateX(-2px);
                }
              }
            `}</style>
          </div>

          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left p-6 text-white font-semibold">Features</th>
                    {comparisonPackages.slice().reverse().map((pkg, index) => (
                      <th key={index} className="text-center p-6 text-white font-semibold min-w-[150px]">
                        <div className="mb-2">{pkg.name}</div>
                        <div className="text-2xl font-black bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">
                          ${pkg.price}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allFeatures.map((feature, featureIndex) => (
                    <tr key={featureIndex} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                      <td className="p-6 text-gray-300 font-medium">{feature}</td>
                      {comparisonPackages.slice().reverse().map((pkg, pkgIndex) => (
                        <td key={pkgIndex} className="p-6 text-center">
                          {pkg.features.includes(feature) ? (
                            <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          ) : (
                            <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center mx-auto">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-20 px-4 mb-32">
          <h3 className="text-3xl md:text-4xl font-black mb-6 text-white">
            Ready to <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">Go Viral?</span>
          </h3>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of artists who've already gone from unknown to unstoppable with FASHO. Your career changing moment is waiting - let's make it happen.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-12 py-4 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] text-white font-bold rounded-2xl hover:shadow-2xl hover:shadow-[#14c0ff]/30 transition-all duration-300 transform hover:scale-105 text-lg"
          >
            Start Your Campaign
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PricingPage; 