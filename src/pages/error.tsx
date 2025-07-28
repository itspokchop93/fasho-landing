import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function ErrorPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleGoHome = () => {
    router.push('/');
  };

  if (!isClient) {
    return null; // Prevent hydration mismatch
  }

  return (
    <>
      <Head>
        <title>Page Not Found - FASHO</title>
        <meta name="description" content="The page you're looking for doesn't exist." />
        <link rel="icon" href="/fasho_ico/favicon.ico" />
      </Head>
      
      <div className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden" style={{ zIndex: 1 }}>
        {/* Background gradient effect */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{ 
            background: 'radial-gradient(circle at 20% 50%, #59e3a5 0%, transparent 50%), radial-gradient(circle at 80% 50%, #14c0ff 0%, transparent 50%)',
            zIndex: 1
          }}
        />
        
        {/* Content container */}
        <div className="relative z-10 text-center max-w-2xl mx-auto" style={{ zIndex: 10 }}>
          {/* 404 Number with gradient */}
          <div className="mb-8">
            <h1 className="text-8xl md:text-9xl font-black bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] bg-clip-text text-transparent mb-4">
              404
            </h1>
          </div>
          
          {/* Error message */}
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Page Not Found
            </h2>
            <p className="text-lg text-gray-300 mb-2">
              Sorry, the page you're looking for doesn't exist.
            </p>
            <p className="text-gray-400">
              It might have been moved, deleted, or you entered the wrong URL.
            </p>
          </div>
          
          {/* Action buttons */}
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <button
              onClick={handleGoHome}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] text-white font-bold rounded-xl hover:shadow-lg hover:shadow-[#14c0ff]/30 transition-all duration-300 transform hover:scale-105"
              style={{ zIndex: 20 }}
            >
              Go to Homepage
            </button>
            
            <button
              onClick={() => window.history.back()}
              className="w-full sm:w-auto px-8 py-4 bg-gray-800 text-white font-semibold rounded-xl border border-gray-600 hover:bg-gray-700 hover:border-gray-500 transition-all duration-300"
              style={{ zIndex: 20 }}
            >
              Go Back
            </button>
          </div>
          
          {/* Additional help text */}
          <div className="mt-12 pt-8 border-t border-gray-800">
            <p className="text-gray-500 text-sm mb-4">
              Need help? Contact our support team
            </p>
            <button
              onClick={() => router.push('/contact')}
              className="text-[#14c0ff] hover:text-[#59e3a5] transition-colors duration-300 font-medium"
              style={{ zIndex: 20 }}
            >
              Contact Support
            </button>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full opacity-10 blur-xl" style={{ zIndex: 2 }} />
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-gradient-to-r from-[#14c0ff] to-[#8b5cf6] rounded-full opacity-10 blur-xl" style={{ zIndex: 2 }} />
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-gradient-to-r from-[#8b5cf6] to-[#59e3a5] rounded-full opacity-5 blur-lg" style={{ zIndex: 2 }} />
      </div>
    </>
  );
} 