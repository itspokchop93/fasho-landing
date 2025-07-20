import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { createClient } from '../utils/supabase/client';
import Header from '../components/Header';
import VerticalShapeDivider from '../components/VerticalShapeDivider';
import * as gtag from '../utils/gtag';

export default function SignUpPage() {
  const [isLogin, setIsLogin] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showResendLink, setShowResendLink] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [emailStatus, setEmailStatus] = useState<'checking' | 'available' | 'exists' | 'invalid' | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const router = useRouter();
  const supabase = createClient();

  const images = [
    '/auto1.jpg',
    '/auto2.jpg',
    '/auto3.jpg'
  ];

  // Auto-rotate images every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [images.length]);

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      try {
        console.log('🔐 SIGNUP: Checking if user is logged in...');
        
        // Start with getUser (most reliable for checking actual auth status)
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('🔐 SIGNUP: getUser() response:', { user: user?.email || null, error: userError });
        
        if (user && !userError) {
          console.log('🔐 SIGNUP: Valid user found, redirecting to dashboard...');
          router.push('/dashboard');
          return;
        }
        
        // If getUser fails, try to get session
        console.log('🔐 SIGNUP: No user from getUser, trying session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('🔐 SIGNUP: Session check:', { session: session?.user?.email || 'No session', error: sessionError });
        
        if (session?.user && !sessionError) {
          console.log('🔐 SIGNUP: Valid session found, redirecting to dashboard...');
          router.push('/dashboard');
          return;
        }
        
        // If session fails, try to refresh
        if (sessionError || !session) {
          console.log('🔐 SIGNUP: No valid session, trying to refresh...');
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
          console.log('🔐 SIGNUP: Refresh result:', { session: refreshedSession?.user?.email || 'No session', error: refreshError });
          
          if (refreshedSession?.user && !refreshError) {
            console.log('🔐 SIGNUP: Refreshed session found, redirecting to dashboard...');
            router.push('/dashboard');
            return;
          }
        }
        
        console.log('🔐 SIGNUP: No user found through any method, staying on signup page');
      } catch (err) {
        console.error('🔐 SIGNUP: Error checking user:', err);
      }
    };
    
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 SIGNUP: Auth state changed:', event, session?.user?.email || 'No user');
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🔐 SIGNUP: User signed in, redirecting to dashboard...');
        router.push('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase.auth]);

  // Check for confirmation and verification messages
  useEffect(() => {
    if (router.query.message === 'confirmation_failed') {
      setMessage('Email confirmation failed or expired. Please try signing up again.');
      // Clean up the URL parameter
      router.replace('/signup', undefined, { shallow: true });
    } else if (router.query.message === 'email_verified') {
      setMessage('🎉 Success! Your email has been verified successfully. Please login below.');
      setIsLogin(true); // Switch to login form
      // Clean up the URL parameter
      router.replace('/signup', undefined, { shallow: true });
    }
  }, [router]);

  // Password validation function
  const validatePassword = (password: string) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);
    const hasMinLength = password.length >= 8;
    
    return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar && hasMinLength;
  };

  // Get password requirements status
  const getPasswordRequirements = (password: string) => {
    return {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasSpecialChar: /[@$!%*?&]/.test(password),
    };
  };

  // Email validation function
  const validateEmail = (email: string) => {
    if (!email || email.trim() === '') {
      return { isValid: false, reason: 'empty' };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, reason: 'invalid' };
    }
    
    return { isValid: true, reason: 'valid' };
  };

  // Check if email exists function
  const checkEmailExists = async (email: string) => {
    // Reset status first
    setEmailStatus(null);
    
    // Validate email format
    const validation = validateEmail(email);
    
    if (!validation.isValid) {
      if (validation.reason === 'empty') {
        // Don't show any status for empty email
        return;
      } else if (validation.reason === 'invalid') {
        setEmailStatus('invalid');
        return;
      }
    }
    
    setIsCheckingEmail(true);
    setFieldErrors(prev => ({ ...prev, email: '' }));
    
    try {
      const response = await fetch('/api/check-user-exists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (data.exists) {
          setEmailStatus('exists');
        } else {
          setEmailStatus('available');
        }
      } else {
        setEmailStatus('invalid');
      }
    } catch (error) {
      setEmailStatus('invalid');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Resend verification email function
  const handleResendVerification = async () => {
    if (!formData.email) {
      setMessage('Please enter your email address to resend verification.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email,
      });

      if (error) {
        setMessage(`Failed to resend verification: ${error.message}`);
      } else {
        setMessage('Verification email resent! Please check your inbox.');
        setShowResendLink(false);
      }
    } catch (error) {
      setMessage('Failed to resend verification. Please try again.');
    }
    setIsLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Clear email status when user is typing in email field
    if (name === 'email' && !isLogin) {
      setEmailStatus(null);
    }
  };

  // Handle field validation on blur
  const handleFieldBlur = (field: string, value: string) => {
    let error = '';
    
    if (field === 'email' && !isLogin) {
      if (!value || value.trim() === '') {
        // Clear email status when field is empty
        setEmailStatus(null);
      } else {
        // Check email exists only if it's not empty
        checkEmailExists(value);
      }
    }
    
    if (field === 'password' && value && !isLogin) {
      if (value.length < 8) {
        error = 'Password must be at least 8 characters long';
      } else if (!validatePassword(value)) {
        error = 'Password must include uppercase, lowercase, number, and special character (@$!%*?&)';
      }
      setShowPasswordRequirements(false);
    }
    
    if (field === 'confirmPassword' && value && formData.password && !isLogin) {
      if (value !== formData.password) {
        error = 'Passwords do not match';
      }
    }
    
    setFieldErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setShowResendLink(false);

    // Prevent submission if there are field errors or email issues
    if (!isLogin) {
      // Validate email format first
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) {
        if (emailValidation.reason === 'empty') {
          setMessage('Please enter your email address.');
        } else {
          setMessage('Please enter a valid email address.');
        }
        setIsLoading(false);
        return;
      }

      // Check for field errors
      const hasFieldErrors = Object.values(fieldErrors).some(error => error !== '');
      if (hasFieldErrors) {
        setMessage('Please fix the highlighted errors before continuing.');
        setIsLoading(false);
        return;
      }

      // Check email status
      if (emailStatus === 'exists') {
        setMessage('This email already has an account. Please use the login form instead.');
        setIsLoading(false);
        return;
      }

      if (emailStatus === 'invalid') {
        setMessage('Please enter a valid email address.');
        setIsLoading(false);
        return;
      }

      if (emailStatus !== 'available') {
        setMessage('Please wait for email validation to complete.');
        setIsLoading(false);
        return;
      }
    }

    try {
      if (isLogin) {
        // Handle login
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          // Check if it's an unconfirmed email error
          if (error.message.includes('Email not confirmed') || error.message.includes('not confirmed')) {
            setMessage('Uh-Oh! You need to confirm your email. Please check your inbox for our verification email!');
            setShowResendLink(true);
          } else {
            setMessage(`Login failed: ${error.message}`);
          }
        } else {
          // Track for Google Analytics 4
          gtag.trackGA4Event('login', {
            method: 'email'
          });
          
          setMessage('Login successful! Redirecting...');
          router.push('/dashboard');
        }
      } else {
        // Handle signup
        if (formData.password !== formData.confirmPassword) {
          setMessage('Passwords do not match');
          setIsLoading(false);
          return;
        }

        if (formData.password.length < 8) {
          setMessage('Password must be at least 8 characters long');
          setIsLoading(false);
          return;
        }

        if (!validatePassword(formData.password)) {
          setMessage('Password must include uppercase, lowercase, number, and special character (@$!%*?&)');
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
            },
          },
        });

        if (error) {
          setMessage(`Signup failed: ${error.message}`);
        } else {
          setMessage('Please check your email for a verification link before signing in.');
          
          // Track signup conversion for Google Ads
          gtag.trackEvent('sign_up', {
            method: 'email',
            event_category: 'engagement',
            event_label: 'User Registration'
          });

          // Track for Google Analytics 4
          gtag.trackGA4Signup('email');

          console.log('🎯 GOOGLE ADS: User signup tracked');
          
          // Send Zapier webhook for user signup
          try {
            console.log('🔗 SIGNUP: Sending Zapier webhook for user signup...');
            
            const { sendZapierWebhook, formatCustomerName } = await import('../utils/zapier/webhookService');
            
            // Format customer name
            const { first_name, last_name } = formatCustomerName(formData.fullName);
            
            // Prepare webhook payload
            const webhookPayload = {
              event_type: 'user_signup' as const,
              timestamp: new Date().toISOString(),
              customer_data: {
                first_name,
                last_name,
                email: formData.email
              }
            };

            const webhookSent = await sendZapierWebhook(webhookPayload);
            
            if (webhookSent) {
              console.log('🔗 SIGNUP: ✅ Zapier webhook sent successfully');
            } else {
              console.log('🔗 SIGNUP: ❌ Zapier webhook failed or was not sent');
            }

          } catch (webhookError) {
            console.error('🔗 SIGNUP: ❌ Error sending Zapier webhook:', webhookError);
            // Don't affect the signup flow if webhook fails
          }
        }
      }
    } catch (error) {
      setMessage('An unexpected error occurred. Please try again.');
      console.error('Auth error:', error);
    }

    setIsLoading(false);
  };

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setMessage('');
    setShowResendLink(false);
    setFieldErrors({});
    setEmailStatus(null);
    setShowPasswordRequirements(false);
    setFormData({
      fullName: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
  };

  return (
    <>
      <Head>
        <title>{isLogin ? 'Login' : 'Sign Up'} – Fasho.co</title>
      </Head>
      <Header transparent hideSignUp />
      
      <main className="min-h-screen relative bg-black text-white">
        {/* Desktop Layout */}
        <div className="hidden md:flex min-h-screen relative">
          {/* Left side - Form */}
          <div className="w-1/2 relative flex items-center justify-center p-8 lg:p-16">
            {/* Marble background for form side */}
            <div className="absolute inset-0 bg-black z-0"></div>
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-35 z-10"
              style={{ backgroundImage: 'url(/marble-bg.jpg)' }}
            ></div>

            <div className="w-full max-w-md relative z-20">
              <div className="mb-8">
                <h1 className="text-4xl lg:text-5xl font-extrabold mb-4">
                  welcome to
                </h1>
                <h2 className="text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">
                  fasho.co
                </h2>
              </div>

              {/* Message display */}
              {message && (
                <div className={`mb-6 p-4 rounded-md ${
                  message.includes('successful') || message.includes('check your email') || message.includes('resent')
                    ? 'bg-green-900/50 border border-green-500 text-green-200'
                    : 'bg-red-900/50 border border-red-500 text-red-200'
                }`}>
                  {message}
                  {showResendLink && (
                    <span>
                      {' '}
                      <button
                        onClick={handleResendVerification}
                        disabled={isLoading}
                        className="underline text-[#59e3a5] hover:text-[#14c0ff] transition-colors font-semibold disabled:opacity-50"
                      >
                        Resend Verification
                      </button>
                    </span>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {!isLogin && (
                  <div>
                    <input
                      type="text"
                      name="fullName"
                      placeholder="full name"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      autoComplete="name"
                      className="w-full bg-transparent border-b-2 border-white/30 pb-3 text-white placeholder-white/60 focus:border-[#59e3a5] focus:outline-none transition-colors text-lg autofill-override"
                      style={{
                        WebkitTextFillColor: 'white !important',
                        WebkitBoxShadow: '0 0 0 30px transparent inset !important',
                        backgroundColor: 'transparent !important',
                        backgroundImage: 'none !important',
                        caretColor: 'white !important',
                        transition: 'background-color 5000s ease-in-out 0s !important'
                      }}
                      required
                    />
                  </div>
                )}
                
                                <div>
                  <input
                    type="email"
                    name="email"
                    placeholder="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={(e) => !isLogin && handleFieldBlur('email', e.target.value)}
                    autoComplete="email"
                    className={`w-full bg-transparent border-b-2 pb-3 text-white placeholder-white/60 focus:outline-none transition-colors text-lg autofill-override ${
                      emailStatus === 'available' ? 'border-green-500' :
                      emailStatus === 'exists' || emailStatus === 'invalid' ? 'border-red-500' :
                      'border-white/30 focus:border-[#59e3a5]'
                    }`}
                    style={{
                      WebkitTextFillColor: 'white !important',
                      WebkitBoxShadow: '0 0 0 30px transparent inset !important',
                      backgroundColor: 'transparent !important',
                      backgroundImage: 'none !important',
                      caretColor: 'white !important',
                      transition: 'background-color 5000s ease-in-out 0s !important'
                    }}
                    required
                  />
                  
                  {/* Email validation feedback */}
                  {!isLogin && (
                    <div className="mt-2">
                      {isCheckingEmail && (
                        <div className="flex items-center text-white/60 text-sm">
                          <div className="animate-spin rounded-full h-3 w-3 border border-white/30 border-t-[#59e3a5] mr-2"></div>
                          Checking email...
                        </div>
                      )}
                      
                      {emailStatus === 'available' && (
                        <div className="flex items-center text-green-400 text-sm">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                          Email is available
                        </div>
                      )}
                      
                      {emailStatus === 'exists' && (
                        <div className="text-red-400 text-sm">
                          This email already has an account. Please{' '}
                          <button
                            type="button"
                            onClick={() => setIsLogin(true)}
                            className="text-[#59e3a5] hover:text-[#14c0ff] underline transition-colors"
                          >
                            login instead
                          </button>
                        </div>
                      )}
                      
                      {emailStatus === 'invalid' && (
                        <div className="text-red-400 text-sm">
                          Please enter a valid email address
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <input
                    type="password"
                    name="password"
                    placeholder={isLogin ? "password" : "create password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    onFocus={() => !isLogin && setShowPasswordRequirements(true)}
                    onBlur={(e) => handleFieldBlur('password', e.target.value)}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    className={`w-full bg-transparent border-b-2 pb-3 text-white placeholder-white/60 focus:outline-none transition-colors text-lg autofill-override ${
                      fieldErrors.password 
                        ? 'border-red-500 focus:border-red-500' 
                        : 'border-white/30 focus:border-[#59e3a5]'
                    }`}
                    style={{
                      WebkitTextFillColor: 'white !important',
                      WebkitBoxShadow: '0 0 0 30px transparent inset !important',
                      backgroundColor: 'transparent !important',
                      backgroundImage: 'none !important',
                      caretColor: 'white !important',
                      transition: 'background-color 5000s ease-in-out 0s !important'
                    }}
                    required
                  />
                  
                  {/* Password requirements checklist */}
                  {!isLogin && showPasswordRequirements && (
                    <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-white/80 text-sm mb-2 font-medium">Password requirements:</p>
                      {(() => {
                        const requirements = getPasswordRequirements(formData.password);
                        return (
                          <div className="space-y-1">
                            <div className={`flex items-center text-sm ${requirements.minLength ? 'text-green-400' : 'text-white/60'}`}>
                              <svg className={`w-3 h-3 mr-2 ${requirements.minLength ? 'text-green-400' : 'text-white/40'}`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                              </svg>
                              Minimum 8 characters
                            </div>
                            <div className={`flex items-center text-sm ${requirements.hasSpecialChar ? 'text-green-400' : 'text-white/60'}`}>
                              <svg className={`w-3 h-3 mr-2 ${requirements.hasSpecialChar ? 'text-green-400' : 'text-white/40'}`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                              </svg>
                              At least 1 special character (@, $, !, %)
                            </div>
                            <div className={`flex items-center text-sm ${requirements.hasUpperCase ? 'text-green-400' : 'text-white/60'}`}>
                              <svg className={`w-3 h-3 mr-2 ${requirements.hasUpperCase ? 'text-green-400' : 'text-white/40'}`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                              </svg>
                              At least 1 uppercase letter
                            </div>
                            <div className={`flex items-center text-sm ${requirements.hasLowerCase ? 'text-green-400' : 'text-white/60'}`}>
                              <svg className={`w-3 h-3 mr-2 ${requirements.hasLowerCase ? 'text-green-400' : 'text-white/40'}`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                              </svg>
                              At least 1 lowercase letter
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  
                  {fieldErrors.password && (
                    <p className="text-red-400 text-sm mt-1">{fieldErrors.password}</p>
                  )}
                </div>

                {!isLogin && (
                  <div>
                    <input
                      type="password"
                      name="confirmPassword"
                      placeholder="confirm password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      onBlur={(e) => handleFieldBlur('confirmPassword', e.target.value)}
                      autoComplete="new-password"
                      className={`w-full bg-transparent border-b-2 pb-3 text-white placeholder-white/60 focus:outline-none transition-colors text-lg autofill-override ${
                        fieldErrors.confirmPassword 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-white/30 focus:border-[#59e3a5]'
                      }`}
                      style={{
                        WebkitTextFillColor: 'white !important',
                        WebkitBoxShadow: '0 0 0 30px transparent inset !important',
                        backgroundColor: 'transparent !important',
                        backgroundImage: 'none !important',
                        caretColor: 'white !important',
                        transition: 'background-color 5000s ease-in-out 0s !important'
                      }}
                      required
                    />
                    {fieldErrors.confirmPassword && (
                      <p className="text-red-400 text-sm mt-1">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-bold py-4 px-6 rounded-md hover:opacity-90 transition-opacity text-lg mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (isLogin ? 'logging in...' : 'signing up...') : (isLogin ? 'log in' : 'sign up')}
                </button>
              </form>

              <div className="mt-6 text-center">
                <span className="text-white/70">
                  {isLogin ? "don't have an account? " : "already have an account? "}
                </span>
                <button
                  onClick={toggleForm}
                  className="text-[#59e3a5] hover:text-[#14c0ff] transition-colors font-semibold"
                >
                  {isLogin ? 'sign up now' : 'log in instead'}
                </button>
              </div>
            </div>
          </div>

          {/* Middle gradient column to blend form with images */}
          <div className="absolute top-0 w-48 h-full z-50" style={{
            left: 'calc(50% - 185px)',
            background: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.05) 8%, rgba(0,0,0,0.1) 16%, rgba(0,0,0,0.2) 25%, rgba(0,0,0,0.3) 33%, rgba(0,0,0,0.4) 41%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.6) 58%, rgba(0,0,0,0.7) 66%, rgba(0,0,0,0.8) 75%, rgba(0,0,0,0.9) 83%, rgba(0,0,0,0.95) 91%, #000000 100%)',
            pointerEvents: 'none'
          }}></div>

          {/* Right side - Images */}
          <div className="w-1/2 relative overflow-hidden">
            {/* Vertical shape divider positioned at center split */}
            <VerticalShapeDivider />
            {/* Background gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-black/20 to-black/60 z-10"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 z-10"></div>
            
            {/* Images */}
            {images.map((src, index) => (
              <div
                key={src}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <Image
                  src={src}
                  alt={`Artist ${index + 1}`}
                  fill
                  className="object-cover"
                  priority={index === 0}
                />
              </div>
            ))}

            {/* Artist info overlay */}
            <div className="absolute bottom-8 right-8 z-20">
              <div className="text-white text-right">
                <h3 className="text-2xl font-bold">Rising Artist</h3>
                <p className="text-white/80">100k monthly listeners</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden min-h-screen relative">
          {/* Marble background for mobile */}
          <div className="absolute inset-0 bg-black z-0"></div>
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-35 z-10"
            style={{ backgroundImage: 'url(/marble-bg.jpg)' }}
          ></div>

          {/* Form content */}
          <div className="relative z-20 min-h-screen flex items-center justify-center p-6 pt-28">
            <div className="w-full max-w-sm">
              <div className="mb-8 text-center">
                <h1 className="text-3xl font-extrabold mb-2">
                  welcome to
                </h1>
                <h2 className="text-3xl font-extrabold bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">
                  fasho.co
                </h2>
              </div>

              {/* Message display for mobile */}
              {message && (
                <div className={`mb-6 p-4 rounded-md text-sm ${
                  message.includes('successful') || message.includes('check your email') || message.includes('resent')
                    ? 'bg-green-900/50 border border-green-500 text-green-200'
                    : 'bg-red-900/50 border border-red-500 text-red-200'
                }`}>
                  {message}
                  {showResendLink && (
                    <span>
                      {' '}
                      <button
                        onClick={handleResendVerification}
                        disabled={isLoading}
                        className="underline text-[#59e3a5] hover:text-[#14c0ff] transition-colors font-semibold disabled:opacity-50"
                      >
                        Resend Verification
                      </button>
                    </span>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {!isLogin && (
                  <div>
                    <input
                      type="text"
                      name="fullName"
                      placeholder="full name"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full bg-transparent border-b-2 border-white/30 pb-3 text-white placeholder-white/60 focus:border-[#59e3a5] focus:outline-none transition-colors autofill-override"
                      style={{
                        WebkitTextFillColor: 'white',
                        WebkitBoxShadow: '0 0 0 1000px transparent inset',
                        transition: 'background-color 5000s ease-in-out 0s'
                      }}
                      required
                    />
                  </div>
                )}
                
                <div>
                  <input
                    type="email"
                    name="email"
                    placeholder="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={(e) => !isLogin && handleFieldBlur('email', e.target.value)}
                    className={`w-full bg-transparent border-b-2 pb-3 text-white placeholder-white/60 focus:outline-none transition-colors autofill-override ${
                      emailStatus === 'available' ? 'border-green-500' :
                      emailStatus === 'exists' || emailStatus === 'invalid' ? 'border-red-500' :
                      'border-white/30 focus:border-[#59e3a5]'
                    }`}
                    style={{
                      WebkitTextFillColor: 'white',
                      WebkitBoxShadow: '0 0 0 1000px transparent inset',
                      transition: 'background-color 5000s ease-in-out 0s'
                    }}
                    required
                  />
                  
                  {/* Email validation feedback for mobile */}
                  {!isLogin && (
                    <div className="mt-2">
                      {isCheckingEmail && (
                        <div className="flex items-center text-white/60 text-sm">
                          <div className="animate-spin rounded-full h-3 w-3 border border-white/30 border-t-[#59e3a5] mr-2"></div>
                          Checking email...
                        </div>
                      )}
                      
                      {emailStatus === 'available' && (
                        <div className="flex items-center text-green-400 text-sm">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                          Email is available
                        </div>
                      )}
                      
                      {emailStatus === 'exists' && (
                        <div className="text-red-400 text-sm">
                          This email already has an account. Please{' '}
                          <button
                            type="button"
                            onClick={() => setIsLogin(true)}
                            className="text-[#59e3a5] hover:text-[#14c0ff] underline transition-colors"
                          >
                            login instead
                          </button>
                        </div>
                      )}
                      
                      {emailStatus === 'invalid' && (
                        <div className="text-red-400 text-sm">
                          Please enter a valid email address
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <input
                    type="password"
                    name="password"
                    placeholder={isLogin ? "password" : "create password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    onFocus={() => !isLogin && setShowPasswordRequirements(true)}
                    onBlur={(e) => handleFieldBlur('password', e.target.value)}
                    className={`w-full bg-transparent border-b-2 pb-3 text-white placeholder-white/60 focus:outline-none transition-colors autofill-override ${
                      fieldErrors.password 
                        ? 'border-red-500 focus:border-red-500' 
                        : 'border-white/30 focus:border-[#59e3a5]'
                    }`}
                    style={{
                      WebkitTextFillColor: 'white',
                      WebkitBoxShadow: '0 0 0 1000px transparent inset',
                      transition: 'background-color 5000s ease-in-out 0s'
                    }}
                    required
                  />
                  
                  {/* Password requirements checklist for mobile */}
                  {!isLogin && showPasswordRequirements && (
                    <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-white/80 text-sm mb-2 font-medium">Password requirements:</p>
                      {(() => {
                        const requirements = getPasswordRequirements(formData.password);
                        return (
                          <div className="space-y-1">
                            <div className={`flex items-center text-sm ${requirements.minLength ? 'text-green-400' : 'text-white/60'}`}>
                              <svg className={`w-3 h-3 mr-2 ${requirements.minLength ? 'text-green-400' : 'text-white/40'}`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                              </svg>
                              Minimum 8 characters
                            </div>
                            <div className={`flex items-center text-sm ${requirements.hasSpecialChar ? 'text-green-400' : 'text-white/60'}`}>
                              <svg className={`w-3 h-3 mr-2 ${requirements.hasSpecialChar ? 'text-green-400' : 'text-white/40'}`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                              </svg>
                              At least 1 special character (@, $, !, %)
                            </div>
                            <div className={`flex items-center text-sm ${requirements.hasUpperCase ? 'text-green-400' : 'text-white/60'}`}>
                              <svg className={`w-3 h-3 mr-2 ${requirements.hasUpperCase ? 'text-green-400' : 'text-white/40'}`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                              </svg>
                              At least 1 uppercase letter
                            </div>
                            <div className={`flex items-center text-sm ${requirements.hasLowerCase ? 'text-green-400' : 'text-white/60'}`}>
                              <svg className={`w-3 h-3 mr-2 ${requirements.hasLowerCase ? 'text-green-400' : 'text-white/40'}`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                              </svg>
                              At least 1 lowercase letter
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  
                  {fieldErrors.password && (
                    <p className="text-red-400 text-sm mt-1">{fieldErrors.password}</p>
                  )}
                </div>

                {!isLogin && (
                  <div>
                    <input
                      type="password"
                      name="confirmPassword"
                      placeholder="confirm password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      onBlur={(e) => handleFieldBlur('confirmPassword', e.target.value)}
                      className={`w-full bg-transparent border-b-2 pb-3 text-white placeholder-white/60 focus:outline-none transition-colors autofill-override ${
                        fieldErrors.confirmPassword 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-white/30 focus:border-[#59e3a5]'
                      }`}
                      style={{
                        WebkitTextFillColor: 'white',
                        WebkitBoxShadow: '0 0 0 1000px transparent inset',
                        transition: 'background-color 5000s ease-in-out 0s'
                      }}
                      required
                    />
                    {fieldErrors.confirmPassword && (
                      <p className="text-red-400 text-sm mt-1">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-bold py-4 px-6 rounded-md hover:opacity-90 transition-opacity mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (isLogin ? 'logging in...' : 'signing up...') : (isLogin ? 'log in' : 'sign up')}
                </button>
              </form>

              <div className="mt-6 text-center">
                <span className="text-white/70">
                  {isLogin ? "don't have an account? " : "already have an account? "}
                </span>
                <button
                  onClick={toggleForm}
                  className="text-[#59e3a5] hover:text-[#14c0ff] transition-colors font-semibold"
                >
                  {isLogin ? 'sign up now' : 'log in instead'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
} 