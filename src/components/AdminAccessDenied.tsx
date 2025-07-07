import React from 'react';
import { useRouter } from 'next/router';

interface AdminAccessDeniedProps {
  title?: string;
  message?: string;
  showLoginButton?: boolean;
}

export default function AdminAccessDenied({ 
  title = "Oops… you went to the wrong page",
  message = "This area is restricted to authorized administrators only. If you believe you should have access, please contact your system administrator.",
  showLoginButton = true
}: AdminAccessDeniedProps) {
  const router = useRouter();

  const handleGoHome = () => {
    router.push('/');
  };

  const handleAdminLogin = () => {
    router.push('/a-login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
      <div className="text-center max-w-md mx-auto">
        {/* Error Icon */}
        <div className="mb-8">
          <div className="mx-auto w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
            <svg 
              className="w-12 h-12 text-red-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-4">
          {title}
        </h1>

        {/* Message */}
        <p className="text-white/70 text-lg mb-8 leading-relaxed">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="space-y-4">
          {showLoginButton && (
            <button
              onClick={handleAdminLogin}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-purple-400/50"
            >
              Admin Login
            </button>
          )}
          
          <button
            onClick={handleGoHome}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-lg border border-white/20 transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            Go to Homepage
          </button>
        </div>

        {/* Security Notice */}
        <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-left">
              <p className="text-yellow-400 text-sm font-medium">Security Notice</p>
              <p className="text-yellow-400/80 text-xs mt-1">
                Unauthorized access attempts are monitored and logged for security purposes.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8">
          <p className="text-white/50 text-sm">
            © 2025 Fasho. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
} 