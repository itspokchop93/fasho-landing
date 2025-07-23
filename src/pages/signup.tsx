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
  const [isLogin, setIsLogin] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [emailStatus, setEmailStatus] = useState<'checking' | 'available' | 'exists' | 'invalid' | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const router = useRouter();
  const supabase = createClient();

  // All available signup images
  const allImages = [
    '/signup-pics/haybeeth.jpg',
    '/signup-pics/eyupcan.jpg',
    '/signup-pics/aaronnicc.jpg',
    '/signup-pics/lebele.jpg',
    '/signup-pics/wesleydavi.jpg',
    '/signup-pics/kleber.jpg',
    '/signup-pics/jean-daniel.jpg',
    '/signup-pics/yankruko.jpg',
    '/signup-pics/hinrichsen.jpg',
    '/signup-pics/a-darmel.jpg',
    '/signup-pics/eduardo.jpg',
    '/signup-pics/jc-siller.jpg',
    '/signup-pics/zac-osori.jpg',
    '/signup-pics/olanma.jpg',
    '/signup-pics/bgcortez.jpg',
    '/signup-pics/collins.jpg',
    '/signup-pics/cottonbr.jpg',
    '/signup-pics/brett.jpg',
    '/signup-pics/neplokhov.jpg',
    '/signup-pics/ficky.jpg',
    '/signup-pics/guitarist-plays-in-a-smokey-venue.jpg',
    '/signup-pics/dj-in-blue-light.jpg',
    '/signup-pics/crowd-loving-music.jpg',
    '/signup-pics/indie-music-concert.jpg'
  ];

  // Randomized images state
  const [images, setImages] = useState<string[]>([]);

  // Randomize images on component mount
  useEffect(() => {
    const shuffleArray = (array: string[]) => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // Randomize the images and select the first 6 for slideshow
    const randomizedImages = shuffleArray(allImages).slice(0, 6);
    setImages(randomizedImages);
  }, []);

  // Auto-rotate images every 4 seconds
  useEffect(() => {
    if (images.length === 0) return;

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
        
        // Simple session check - this is more reliable
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('🔐 SIGNUP: Session check:', { session: session?.user?.email || 'No session', error: sessionError });
        
        if (session?.user && !sessionError) {
          console.log('🔐 SIGNUP: Valid session found, redirecting to dashboard...');
          router.push('/dashboard');
          return;
        }
        
        console.log('🔐 SIGNUP: No valid session, staying on signup page');
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
          setMessage(`Login failed: ${error.message}`);
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
          // Auto-confirm the user to bypass email verification
          try {
            console.log('🔧 SIGNUP: Auto-confirming user email...');
            const confirmResponse = await fetch('/api/auto-confirm-user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email: formData.email }),
            });

            const confirmResult = await confirmResponse.json();
            
            if (confirmResponse.ok) {
              console.log('🔧 SIGNUP: ✅ User auto-confirmed successfully');
              setMessage('Account created successfully! Redirecting to dashboard...');
              
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

              // Redirect to dashboard since user is now authenticated
              setTimeout(() => {
                router.push('/dashboard');
              }, 1500);
              
            } else {
              console.error('🔧 SIGNUP: ❌ Auto-confirm failed:', confirmResult);
              setMessage('Account created but requires email verification. Please check your email.');
            }
          } catch (confirmError) {
            console.error('🔧 SIGNUP: ❌ Error auto-confirming user:', confirmError);
            setMessage('Account created but requires email verification. Please check your email.');
          }
        }
      }
    } catch (error) {
      setMessage('An unexpected error occurred. Please try again.');
      console.error('Auth error:', error);
    }

    setIsLoading(false);
  };

  // OAuth login functions
  const handleSpotifyLogin = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'spotify',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        console.error('Spotify OAuth error:', error);
        setMessage(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Spotify login failed:', error);
      setMessage('Spotify login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        console.error('Google OAuth error:', error);
        setMessage(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Google login failed:', error);
      setMessage('Google login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setMessage('');
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
                        WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
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
                      WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
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

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder={isLogin ? "password" : "create password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    onFocus={() => !isLogin && setShowPasswordRequirements(true)}
                    onBlur={(e) => handleFieldBlur('password', e.target.value)}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    className={`w-full bg-transparent border-b-2 pb-3 pr-10 text-white placeholder-white/60 focus:outline-none transition-colors text-lg autofill-override ${
                      fieldErrors.password 
                        ? 'border-red-500 focus:border-red-500' 
                        : 'border-white/30 focus:border-[#59e3a5]'
                    }`}
                    style={{
                      WebkitTextFillColor: 'white !important',
                      WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
                      backgroundColor: 'transparent !important',
                      backgroundImage: 'none !important',
                      caretColor: 'white !important',
                      transition: 'background-color 5000s ease-in-out 0s !important'
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-3 text-white/60 hover:text-white transition-colors z-10"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L12 12m-3.122-3.122l4.242 4.242M12 12l6.878 6.878" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                  
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
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="confirm password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      onBlur={(e) => handleFieldBlur('confirmPassword', e.target.value)}
                      autoComplete="new-password"
                      className={`w-full bg-transparent border-b-2 pb-3 pr-10 text-white placeholder-white/60 focus:outline-none transition-colors text-lg autofill-override ${
                        fieldErrors.confirmPassword 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-white/30 focus:border-[#59e3a5]'
                      }`}
                      style={{
                        WebkitTextFillColor: 'white !important',
                        WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
                        backgroundColor: 'transparent !important',
                        backgroundImage: 'none !important',
                        caretColor: 'white !important',
                        transition: 'background-color 5000s ease-in-out 0s !important'
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-3 text-white/60 hover:text-white transition-colors z-10"
                    >
                      {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L12 12m-3.122-3.122l4.242 4.242M12 12l6.878 6.878" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
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

              {/* OAuth Separator */}
              <div className="mt-8 mb-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-[#0a0a13] px-4 text-white/60">or continue with</span>
                  </div>
                </div>
              </div>

              {/* OAuth Buttons */}
              <div className="space-y-3">
                {/* Spotify OAuth Button */}
                <button
                  onClick={handleSpotifyLogin}
                  disabled={isLoading}
                  className="w-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg width="337" height="49" viewBox="0 0 337 49" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                    <rect x="0.3" y="0.3" width="336.4" height="48.4" rx="24.2" fill="#121212" stroke="white" strokeWidth="0.6"/>
                    <path d="M105.728 28.888H109.312V31H102.992V19.768H105.728V28.888ZM114.681 31.128C113.806 31.128 113.017 30.9413 112.313 30.568C111.62 30.1947 111.07 29.6613 110.665 28.968C110.27 28.2747 110.073 27.464 110.073 26.536C110.073 25.6187 110.276 24.8133 110.681 24.12C111.086 23.416 111.641 22.8773 112.345 22.504C113.049 22.1307 113.838 21.944 114.713 21.944C115.588 21.944 116.377 22.1307 117.081 22.504C117.785 22.8773 118.34 23.416 118.745 24.12C119.15 24.8133 119.353 25.6187 119.353 26.536C119.353 27.4533 119.145 28.264 118.729 28.968C118.324 29.6613 117.764 30.1947 117.049 30.568C116.345 30.9413 115.556 31.128 114.681 31.128ZM114.681 28.76C115.204 28.76 115.646 28.568 116.009 28.184C116.382 27.8 116.569 27.2507 116.569 26.536C116.569 25.8213 116.388 25.272 116.025 24.888C115.673 24.504 115.236 24.312 114.713 24.312C114.18 24.312 113.737 24.504 113.385 24.888C113.033 25.2613 112.857 25.8107 112.857 26.536C112.857 27.2507 113.028 27.8 113.369 28.184C113.721 28.568 114.158 28.76 114.681 28.76ZM124.197 21.944C124.826 21.944 125.375 22.072 125.845 22.328C126.325 22.584 126.693 22.92 126.949 23.336V22.072H129.685V30.984C129.685 31.8053 129.519 32.5467 129.189 33.208C128.869 33.88 128.373 34.4133 127.701 34.808C127.039 35.2027 126.213 35.4 125.221 35.4C123.898 35.4 122.826 35.0853 122.005 34.456C121.183 33.8373 120.714 32.9947 120.597 31.928H123.301C123.386 32.2693 123.589 32.536 123.909 32.728C124.229 32.9307 124.623 33.032 125.093 33.032C125.658 33.032 126.106 32.8667 126.437 32.536C126.778 32.216 126.949 31.6987 126.949 30.984V29.72C126.682 30.136 126.314 30.4773 125.845 30.744C125.375 31 124.826 31.128 124.197 31.128C123.461 31.128 122.794 30.9413 122.197 30.568C121.599 30.184 121.125 29.6453 120.773 28.952C120.431 28.248 120.261 27.4373 120.261 26.52C120.261 25.6027 120.431 24.7973 120.773 24.104C121.125 23.4107 121.599 22.8773 122.197 22.504C122.794 22.1307 123.461 21.944 124.197 21.944ZM126.949 26.536C126.949 25.8533 126.757 25.3147 126.373 24.92C125.999 24.5253 125.541 24.328 124.997 24.328C124.453 24.328 123.989 24.5253 123.605 24.92C123.231 25.304 123.045 25.8373 123.045 26.52C123.045 27.2027 123.231 27.7467 123.605 28.152C123.989 28.5467 124.453 28.744 124.997 28.744C125.541 28.744 125.999 28.5467 126.373 28.152C126.757 27.7573 126.949 27.2187 126.949 26.536ZM133.04 21.144C132.56 21.144 132.165 21.0053 131.856 20.728C131.557 20.44 131.408 20.088 131.408 19.672C131.408 19.2453 131.557 18.8933 131.856 18.616C132.165 18.328 132.56 18.184 133.04 18.184C133.509 18.184 133.893 18.328 134.192 18.616C134.501 18.8933 134.656 19.2453 134.656 19.672C134.656 20.088 134.501 20.44 134.192 20.728C133.893 21.0053 133.509 21.144 133.04 21.144ZM134.4 22.072V31H131.664V22.072H134.4ZM141.823 21.976C142.868 21.976 143.7 22.3173 144.319 23C144.948 23.672 145.263 24.6 145.263 25.784V31H142.543V26.152C142.543 25.5547 142.388 25.0907 142.079 24.76C141.769 24.4293 141.353 24.264 140.831 24.264C140.308 24.264 139.892 24.4293 139.583 24.76C139.273 25.0907 139.119 25.5547 139.119 26.152V31H136.383V22.072H139.119V23.256C139.396 22.8613 139.769 22.552 140.239 22.328C140.708 22.0933 141.236 21.976 141.823 21.976ZM163.371 22.072L160.955 31H157.931L156.523 25.208L155.067 31H152.059L149.627 22.072H152.363L153.627 28.456L155.131 22.072H158.027L159.547 28.424L160.795 22.072H163.371ZM165.79 21.144C165.31 21.144 164.915 21.0053 164.606 20.728C164.307 20.44 164.158 20.088 164.158 19.672C164.158 19.2453 164.307 18.8933 164.606 18.616C164.915 18.328 165.31 18.184 165.79 18.184C166.259 18.184 166.643 18.328 166.942 18.616C167.251 18.8933 167.406 19.2453 167.406 19.672C167.406 20.088 167.251 20.44 166.942 20.728C166.643 21.0053 166.259 21.144 165.79 21.144ZM167.15 22.072V31H164.414V22.072H167.15ZM174.109 28.68V31H172.717C171.725 31 170.951 30.76 170.397 30.28C169.842 29.7893 169.565 28.9947 169.565 27.896V24.344H168.477V22.072H169.565V19.896H172.301V22.072H174.093V24.344H172.301V27.928C172.301 28.1947 172.365 28.3867 172.493 28.504C172.621 28.6213 172.834 28.68 173.133 28.68H174.109ZM181.121 21.976C182.145 21.976 182.966 22.3173 183.585 23C184.203 23.672 184.513 24.6 184.513 25.784V31H181.793V26.152C181.793 25.5547 181.638 25.0907 181.329 24.76C181.019 24.4293 180.603 24.264 180.081 24.264C179.558 24.264 179.142 24.4293 178.833 24.76C178.523 25.0907 178.369 25.5547 178.369 26.152V31H175.633V19.16H178.369V23.272C178.646 22.8773 179.025 22.5627 179.505 22.328C179.985 22.0933 180.523 21.976 181.121 21.976ZM193.869 31.112C193.047 31.112 192.311 30.9787 191.661 30.712C191.01 30.4453 190.487 30.0507 190.093 29.528C189.709 29.0053 189.506 28.376 189.485 27.64H192.397C192.439 28.056 192.583 28.376 192.829 28.6C193.074 28.8133 193.394 28.92 193.789 28.92C194.194 28.92 194.514 28.8293 194.749 28.648C194.983 28.456 195.101 28.1947 195.101 27.864C195.101 27.5867 195.005 27.3573 194.813 27.176C194.631 26.9947 194.402 26.8453 194.125 26.728C193.858 26.6107 193.474 26.4773 192.973 26.328C192.247 26.104 191.655 25.88 191.197 25.656C190.738 25.432 190.343 25.1013 190.013 24.664C189.682 24.2267 189.517 23.656 189.517 22.952C189.517 21.9067 189.895 21.0907 190.653 20.504C191.41 19.9067 192.397 19.608 193.613 19.608C194.85 19.608 195.847 19.9067 196.605 20.504C197.362 21.0907 197.767 21.912 197.821 22.968H194.861C194.839 22.6053 194.706 22.3227 194.461 22.12C194.215 21.9067 193.901 21.8 193.516 21.8C193.186 21.8 192.919 21.8907 192.717 22.072C192.514 22.2427 192.413 22.4933 192.413 22.824C192.413 23.1867 192.583 23.4693 192.924 23.672C193.266 23.8747 193.799 24.0933 194.525 24.328C195.25 24.5733 195.837 24.808 196.285 25.032C196.743 25.256 197.138 25.5813 197.469 26.008C197.799 26.4347 197.965 26.984 197.965 27.656C197.965 28.296 197.799 28.8773 197.469 29.4C197.149 29.9227 196.679 30.3387 196.061 30.648C195.442 30.9573 194.711 31.112 193.869 31.112ZM202.384 23.336C202.651 22.92 203.019 22.584 203.488 22.328C203.958 22.072 204.507 21.944 205.136 21.944C205.872 21.944 206.539 22.1307 207.136 22.504C207.734 22.8773 208.203 23.4107 208.544 24.104C208.896 24.7973 209.072 25.6027 209.072 26.52C209.072 27.4373 208.896 28.248 208.544 28.952C208.203 29.6453 207.734 30.184 207.136 30.568C206.539 30.9413 205.872 31.128 205.136 31.128C204.518 31.128 203.968 31 203.488 30.744C203.019 30.488 202.651 30.1573 202.384 29.752V35.256H199.648V22.072H202.384V23.336ZM206.288 26.52C206.288 25.8373 206.096 25.304 205.712 24.92C205.339 24.5253 204.875 24.328 204.32 24.328C203.776 24.328 203.312 24.5253 202.928 24.92C202.555 25.3147 202.368 25.8533 202.368 26.536C202.368 27.2187 202.555 27.7573 202.928 28.152C203.312 28.5467 203.776 28.744 204.32 28.744C204.864 28.744 205.328 28.5467 205.712 28.152C206.096 27.7467 206.288 27.2027 206.288 26.52ZM214.572 31.128C213.697 31.128 212.908 30.9413 212.204 30.568C211.51 30.1947 210.961 29.6613 210.556 28.968C210.161 28.2747 209.964 27.464 209.964 26.536C209.964 25.6187 210.166 24.8133 210.572 24.12C210.977 23.416 211.532 22.8773 212.236 22.504C212.94 22.1307 213.729 21.944 214.604 21.944C215.478 21.944 216.268 22.1307 216.972 22.504C217.676 22.8773 218.23 23.416 218.636 24.12C219.041 24.8133 219.244 25.6187 219.244 26.536C219.244 27.4533 219.036 28.264 218.62 28.968C218.214 29.6613 217.654 30.1947 216.94 30.568C216.236 30.9413 215.446 31.128 214.572 31.128ZM214.572 28.76C215.094 28.76 215.537 28.568 215.9 28.184C216.273 27.8 216.46 27.2507 216.46 26.536C216.46 25.8213 216.278 25.272 215.916 24.888C215.564 24.504 215.126 24.312 214.604 24.312C214.07 24.312 213.628 24.504 213.276 24.888C212.924 25.2613 212.748 25.8107 212.748 26.536C212.748 27.2507 212.918 27.8 213.26 28.184C213.612 28.568 214.049 28.76 214.572 28.76ZM225.671 28.68V31H224.279C223.287 31 222.514 30.76 221.959 30.28C221.404 29.7893 221.127 28.9947 221.127 27.896V24.344H220.039V22.072H221.127V19.896H223.863V22.072H225.655V24.344H223.863V27.928C223.863 28.1947 223.927 28.3867 224.055 28.504C224.183 28.6213 224.396 28.68 224.695 28.68H225.671ZM228.571 21.144C228.091 21.144 227.696 21.0053 227.387 20.728C227.088 20.44 226.939 20.088 226.939 19.672C226.939 19.2453 227.088 18.8933 227.387 18.616C227.696 18.328 228.091 18.184 228.571 18.184C229.04 18.184 229.424 18.328 229.723 18.616C230.032 18.8933 230.187 19.2453 230.187 19.672C230.187 20.088 230.032 20.44 229.723 20.728C229.424 21.0053 229.04 21.144 228.571 21.144ZM229.931 22.072V31H227.195V22.072H229.931ZM236.394 24.344H234.922V31H232.186V24.344H231.194V22.072H232.186V21.816C232.186 20.7173 232.501 19.8853 233.13 19.32C233.759 18.744 234.682 18.456 235.898 18.456C236.101 18.456 236.25 18.4613 236.346 18.472V20.792C235.823 20.76 235.455 20.8347 235.242 21.016C235.029 21.1973 234.922 21.5227 234.922 21.992V22.072H236.394V24.344ZM246.8 22.072L241.2 35.24H238.256L240.304 30.696L236.671 22.072H239.728L241.792 27.656L243.84 22.072H246.8Z" fill="#F5F5F5"/>
                    <g clipPath="url(#clip0_0_1)">
                      <path d="M33.4864 11.0444C26.0603 11.0444 20.04 17.0646 20.04 24.4906C20.04 31.917 26.0603 37.9366 33.4864 37.9366C40.9132 37.9366 46.9329 31.917 46.9329 24.4906C46.9329 17.065 40.9134 11.0444 33.4864 11.0444ZM39.6528 30.4377C39.4119 30.8327 38.8949 30.9579 38.4999 30.7155C35.3428 28.787 31.3685 28.3503 26.688 29.4197C26.2369 29.5224 25.7874 29.2398 25.6846 28.7887C25.5814 28.3375 25.8628 27.8879 26.315 27.7851C31.4371 26.6149 35.8306 27.1188 39.375 29.2848C39.77 29.5273 39.8952 30.0427 39.6528 30.4377ZM41.2986 26.7764C40.9951 27.2697 40.3496 27.4254 39.8567 27.122C36.2423 24.9004 30.7328 24.257 26.4577 25.5547C25.9033 25.7222 25.3177 25.4097 25.1494 24.8562C24.9824 24.3018 25.2951 23.7173 25.8485 23.5487C30.7319 22.067 36.8027 22.7847 40.9534 25.3353C41.4463 25.6388 41.6021 26.2841 41.2986 26.7764ZM41.4399 22.9639C37.1062 20.3899 29.9562 20.1532 25.8185 21.409C25.1541 21.6105 24.4514 21.2354 24.2501 20.571C24.0487 19.9063 24.4235 19.2041 25.0884 19.0021C29.8381 17.5602 37.734 17.8388 42.7234 20.8008C43.3224 21.1555 43.5183 21.9273 43.1634 22.5241C42.8102 23.1218 42.0356 23.3188 41.4399 22.9639Z" fill="#1ED760"/>
                    </g>
                    <defs>
                      <clipPath id="clip0_0_1">
                        <rect width="27" height="27" fill="white" transform="translate(20 11)"/>
                      </clipPath>
                    </defs>
                  </svg>
                </button>

                {/* Google OAuth Button */}
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg width="337" height="49" viewBox="0 0 337 49" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                    <rect x="0.3" y="0.3" width="336.4" height="48.4" rx="24.2" fill="#121212" stroke="white" strokeWidth="0.6"/>
                    <path d="M107.728 28.888H111.312V31H104.992V19.768H107.728V28.888ZM116.681 31.128C115.806 31.128 115.017 30.9413 114.313 30.568C113.62 30.1947 113.07 29.6613 112.665 28.968C112.27 28.2747 112.073 27.464 112.073 26.536C112.073 25.6187 112.276 24.8133 112.681 24.12C113.086 23.416 113.641 22.8773 114.345 22.504C115.049 22.1307 115.838 21.944 116.713 21.944C117.588 21.944 118.377 22.1307 119.081 22.504C119.785 22.8773 120.34 23.416 120.745 24.12C121.15 24.8133 121.353 25.6187 121.353 26.536C121.353 27.4533 121.145 28.264 120.729 28.968C120.324 29.6613 119.764 30.1947 119.049 30.568C118.345 30.9413 117.556 31.128 116.681 31.128ZM116.681 28.76C117.204 28.76 117.646 28.568 118.009 28.184C118.382 27.8 118.569 27.2507 118.569 26.536C118.569 25.8213 118.388 25.272 118.025 24.888C117.673 24.504 117.236 24.312 116.713 24.312C116.18 24.312 115.737 24.504 115.385 24.888C115.033 25.2613 114.857 25.8107 114.857 26.536C114.857 27.2507 115.028 27.8 115.369 28.184C115.721 28.568 116.158 28.76 116.681 28.76ZM126.197 21.944C126.826 21.944 127.375 22.072 127.845 22.328C128.325 22.584 128.693 22.92 128.949 23.336V22.072H131.685V30.984C131.685 31.8053 131.519 32.5467 131.189 33.208C130.869 33.88 130.373 34.4133 129.701 34.808C129.039 35.2027 128.213 35.4 127.221 35.4C125.898 35.4 124.826 35.0853 124.005 34.456C123.183 33.8373 122.714 32.9947 122.597 31.928H125.301C125.386 32.2693 125.589 32.536 125.909 32.728C126.229 32.9307 126.623 33.032 127.093 33.032C127.658 33.032 128.106 32.8667 128.437 32.536C128.778 32.216 128.949 31.6987 128.949 30.984V29.72C128.682 30.136 128.314 30.4773 127.845 30.744C127.375 31 126.826 31.128 126.197 31.128C125.461 31.128 124.794 30.9413 124.197 30.568C123.599 30.184 123.125 29.6453 122.773 28.952C122.431 28.248 122.261 27.4373 122.261 26.52C122.261 25.6027 122.431 24.7973 122.773 24.104C123.125 23.4107 123.599 22.8773 124.197 22.504C124.794 22.1307 125.461 21.944 126.197 21.944ZM128.949 26.536C128.949 25.8533 128.757 25.3147 128.373 24.92C127.999 24.5253 127.541 24.328 126.997 24.328C126.453 24.328 125.989 24.5253 125.605 24.92C125.231 25.304 125.045 25.8373 125.045 26.52C125.045 27.2027 125.231 27.7467 125.605 28.152C125.989 28.5467 126.453 28.744 126.997 28.744C127.541 28.744 127.999 28.5467 128.373 28.152C128.757 27.7573 128.949 27.2187 128.949 26.536ZM135.04 21.144C134.56 21.144 134.165 21.0053 133.856 20.728C133.557 20.44 133.408 20.088 133.408 19.672C133.408 19.2453 133.557 18.8933 133.856 18.616C134.165 18.328 134.56 18.184 135.04 18.184C135.509 18.184 135.893 18.328 136.192 18.616C136.501 18.8933 136.656 19.2453 136.656 19.672C136.656 20.088 136.501 20.44 136.192 20.728C135.893 21.0053 135.509 21.144 135.04 21.144ZM136.4 22.072V31H133.664V22.072H136.4ZM143.823 21.976C144.868 21.976 145.7 22.3173 146.319 23C146.948 23.672 147.263 24.6 147.263 25.784V31H144.543V26.152C144.543 25.5547 144.388 25.0907 144.079 24.76C143.769 24.4293 143.353 24.264 142.831 24.264C142.308 24.264 141.892 24.4293 141.583 24.76C141.273 25.0907 141.119 25.5547 141.119 26.152V31H138.383V22.072H141.119V23.256C141.396 22.8613 141.769 22.552 142.239 22.328C142.708 22.0933 143.236 21.976 143.823 21.976ZM165.371 22.072L162.955 31H159.931L158.523 25.208L157.067 31H154.059L151.627 22.072H154.363L155.627 28.456L157.131 22.072H160.027L161.547 28.424L162.795 22.072H165.371ZM167.79 21.144C167.31 21.144 166.915 21.0053 166.606 20.728C166.307 20.44 166.158 20.088 166.158 19.672C166.158 19.2453 166.307 18.8933 166.606 18.616C166.915 18.328 167.31 18.184 167.79 18.184C168.259 18.184 168.643 18.328 168.942 18.616C169.251 18.8933 169.406 19.2453 169.406 19.672C169.406 20.088 169.251 20.44 168.942 20.728C168.643 21.0053 168.259 21.144 167.79 21.144ZM169.15 22.072V31H166.414V22.072H169.15ZM176.109 28.68V31H174.717C173.725 31 172.951 30.76 172.397 30.28C171.842 29.7893 171.565 28.9947 171.565 27.896V24.344H170.477V22.072H171.565V19.896H174.301V22.072H176.093V24.344H174.301V27.928C174.301 28.1947 174.365 28.3867 174.493 28.504C174.621 28.6213 174.834 28.68 175.133 28.68H176.109ZM183.121 21.976C184.145 21.976 184.966 22.3173 185.585 23C186.203 23.672 186.513 24.6 186.513 25.784V31H183.793V26.152C183.793 25.5547 183.638 25.0907 183.329 24.76C183.019 24.4293 182.603 24.264 182.081 24.264C181.558 24.264 181.142 24.4293 180.833 24.76C180.523 25.0907 180.369 25.5547 180.369 26.152V31H177.633V19.16H180.369V23.272C180.646 22.8773 181.025 22.5627 181.505 22.328C181.985 22.0933 182.523 21.976 183.121 21.976ZM199.26 23.32C199.058 22.9467 198.765 22.664 198.381 22.472C198.007 22.2693 197.565 22.168 197.053 22.168C196.167 22.168 195.458 22.4613 194.924 23.048C194.391 23.624 194.125 24.3973 194.125 25.368C194.125 26.4027 194.402 27.2133 194.957 27.8C195.522 28.376 196.295 28.664 197.277 28.664C197.949 28.664 198.514 28.4933 198.973 28.152C199.442 27.8107 199.783 27.32 199.997 26.68H196.525V24.664H202.477V27.208C202.274 27.8907 201.927 28.5253 201.437 29.112C200.957 29.6987 200.343 30.1733 199.597 30.536C198.85 30.8987 198.007 31.08 197.069 31.08C195.959 31.08 194.967 30.84 194.093 30.36C193.229 29.8693 192.551 29.192 192.061 28.328C191.581 27.464 191.34 26.4773 191.34 25.368C191.34 24.2587 191.581 23.272 192.061 22.408C192.551 21.5333 193.229 20.856 194.093 20.376C194.957 19.8853 195.943 19.64 197.053 19.64C198.397 19.64 199.527 19.9653 200.445 20.616C201.373 21.2667 201.986 22.168 202.285 23.32H199.26ZM208.056 31.128C207.181 31.128 206.392 30.9413 205.688 30.568C204.995 30.1947 204.445 29.6613 204.04 28.968C203.645 28.2747 203.448 27.464 203.448 26.536C203.448 25.6187 203.651 24.8133 204.056 24.12C204.461 23.416 205.016 22.8773 205.72 22.504C206.424 22.1307 207.213 21.944 208.088 21.944C208.963 21.944 209.752 22.1307 210.456 22.504C211.16 22.8773 211.715 23.416 212.12 24.12C212.525 24.8133 212.728 25.6187 212.728 26.536C212.728 27.4533 212.52 28.264 212.104 28.968C211.699 29.6613 211.139 30.1947 210.424 30.568C209.72 30.9413 208.931 31.128 208.056 31.128ZM208.056 28.76C208.579 28.76 209.021 28.568 209.384 28.184C209.757 27.8 209.944 27.2507 209.944 26.536C209.944 25.8213 209.763 25.272 209.4 24.888C209.048 24.504 208.611 24.312 208.088 24.312C207.555 24.312 207.112 24.504 206.76 24.888C206.408 25.2613 206.232 25.8107 206.232 26.536C206.232 27.2507 206.403 27.8 206.744 28.184C207.096 28.568 207.533 28.76 208.056 28.76ZM218.244 31.128C217.369 31.128 216.58 30.9413 215.876 30.568C215.182 30.1947 214.633 29.6613 214.228 28.968C213.833 28.2747 213.636 27.464 213.636 26.536C213.636 25.6187 213.838 24.8133 214.243 24.12C214.649 23.416 215.204 22.8773 215.908 22.504C216.612 22.1307 217.401 21.944 218.276 21.944C219.15 21.944 219.94 22.1307 220.644 22.504C221.348 22.8773 221.902 23.416 222.308 24.12C222.713 24.8133 222.916 25.6187 222.916 26.536C222.916 27.4533 222.708 28.264 222.292 28.968C221.886 29.6613 221.326 30.1947 220.612 30.568C219.908 30.9413 219.118 31.128 218.244 31.128ZM218.244 28.76C218.766 28.76 219.209 28.568 219.572 28.184C219.945 27.8 220.132 27.2507 220.132 26.536C220.132 25.8213 219.95 25.272 219.588 24.888C219.236 24.504 218.798 24.312 218.276 24.312C217.742 24.312 217.3 24.504 216.948 24.888C216.596 25.2613 216.42 25.8107 216.42 26.536C216.42 27.2507 216.59 27.8 216.932 28.184C217.284 28.568 217.721 28.76 218.244 28.76ZM227.759 21.944C228.388 21.944 228.938 22.072 229.407 22.328C229.887 22.584 230.255 22.92 230.511 23.336V22.072H233.247V30.984C233.247 31.8053 233.082 32.5467 232.751 33.208C232.431 33.88 231.935 34.4133 231.263 34.808C230.602 35.2027 229.775 35.4 228.783 35.4C227.46 35.4 226.388 35.0853 225.567 34.456C224.746 33.8373 224.276 32.9947 224.159 31.928H226.863C226.948 32.2693 227.151 32.536 227.471 32.728C227.791 32.9307 228.186 33.032 228.655 33.032C229.22 33.032 229.668 32.8667 229.999 32.536C230.34 32.216 230.511 31.6987 230.511 30.984V29.72C230.244 30.136 229.876 30.4773 229.407 30.744C228.938 31 228.388 31.128 227.759 31.128C227.023 31.128 226.356 30.9413 225.759 30.568C225.162 30.184 224.687 29.6453 224.335 28.952C223.994 28.248 223.823 27.4373 223.823 26.52C223.823 25.6027 223.994 24.7973 224.335 24.104C224.687 23.4107 225.162 22.8773 225.759 22.504C226.356 22.1307 227.023 21.944 227.759 21.944ZM230.511 26.536C230.511 25.8533 230.319 25.3147 229.935 24.92C229.562 24.5253 229.103 24.328 228.559 24.328C228.015 24.328 227.551 24.5253 227.167 24.92C226.794 25.304 226.607 25.8373 226.607 26.52C226.607 27.2027 226.794 27.7467 227.167 28.152C227.551 28.5467 228.015 28.744 228.559 28.744C229.103 28.744 229.562 28.5467 229.935 28.152C230.319 27.7573 230.511 27.2187 230.511 26.536ZM237.962 19.16V31H235.226V19.16H237.962ZM248.361 26.392C248.361 26.648 248.345 26.9147 248.313 27.192H242.121C242.164 27.7467 242.34 28.1733 242.649 28.472C242.969 28.76 243.358 28.904 243.817 28.904C244.5 28.904 244.974 28.616 245.241 28.04H248.153C248.004 28.6267 247.732 29.1547 247.337 29.624C246.953 30.0933 246.468 30.4613 245.881 30.728C245.294 30.9947 244.638 31.128 243.913 31.128C243.038 31.128 242.26 30.9413 241.577 30.568C240.894 30.1947 240.361 29.6613 239.977 28.968C239.593 28.2747 239.401 27.464 239.401 26.536C239.401 25.608 239.588 24.7973 239.961 24.104C240.345 23.4107 240.878 22.8773 241.561 22.504C242.244 22.1307 243.028 21.944 243.913 21.944C244.777 21.944 245.545 22.1253 246.217 22.488C246.889 22.8507 247.412 23.368 247.785 24.04C248.169 24.712 248.361 25.496 248.361 26.392ZM245.561 25.672C245.561 25.2027 245.401 24.8293 245.081 24.552C244.761 24.2747 244.361 24.136 243.881 24.136C243.422 24.136 243.033 24.2693 242.713 24.536C242.404 24.8027 242.212 25.1813 242.137 25.672H245.561Z" fill="#F5F5F5"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M44 25.7417C44 25.1379 43.9403 24.5573 43.8295 24H35V27.2937H40.0455C39.8281 28.358 39.1676 29.2598 38.1747 29.8636V32H41.2045C42.9773 30.5177 44 28.3348 44 25.7417Z" fill="#4285F4"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M35.0433 34C37.4734 34 39.5108 33.2262 41 31.9063L38.0912 29.7379C37.2852 30.2565 36.2542 30.5629 35.0433 30.5629C32.699 30.5629 30.7148 29.0426 30.007 27H27V29.2391C28.481 32.0634 31.5248 34 35.0433 34Z" fill="#34A853"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M30 26.6923C29.8184 26.1579 29.7152 25.587 29.7152 25C29.7152 24.413 29.8184 23.8421 30 23.3077V21H26.9659C26.3509 22.2024 26 23.5628 26 25C26 26.4372 26.3509 27.7976 26.9659 29L30 26.6923Z" fill="#FBBC05"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M35.0058 19.4371C36.3211 19.4371 37.502 19.8732 38.4305 20.7295L41 18.2508C39.4485 16.8563 37.4206 16 35.0058 16C31.5038 16 28.4741 17.9366 27 20.7609L29.993 23C30.6975 20.9574 32.6725 19.4371 35.0058 19.4371Z" fill="#EA4335"/>
                  </svg>
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
            
            {/* Lens glow gradient overlay - dual light sources */}
            <div className="absolute inset-0 z-20 pointer-events-none">
              {/* Top-right light source */}
              <div 
                className="absolute inset-0 opacity-85"
                style={{
                  background: `radial-gradient(ellipse 80% 60% at 85% 15%, 
                    rgba(89, 227, 165, 0.375) 0%, 
                    rgba(20, 192, 255, 0.31) 15%, 
                    rgba(89, 227, 165, 0.19) 30%, 
                    rgba(20, 192, 255, 0.125) 45%, 
                    rgba(89, 227, 165, 0.063) 60%, 
                    rgba(20, 192, 255, 0.025) 80%, 
                    transparent 100%)`
                }}
              ></div>
              {/* Middle-left light source (20% up from bottom) */}
              <div 
                className="absolute inset-0 opacity-70"
                style={{
                  background: `radial-gradient(ellipse 80% 60% at 35% 65%, 
                    rgba(20, 192, 255, 0.375) 0%, 
                    rgba(89, 227, 165, 0.31) 15%, 
                    rgba(20, 192, 255, 0.19) 30%, 
                    rgba(89, 227, 165, 0.125) 45%, 
                    rgba(20, 192, 255, 0.063) 60%, 
                    rgba(89, 227, 165, 0.025) 80%, 
                    transparent 100%)`
                }}
              ></div>
            </div>
            
            {/* Images */}
            {images.length > 0 && images.map((src, index) => (
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
                  className="object-cover brightness-140 contrast-110"
                  priority={index === 0}
                />
              </div>
            ))}


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

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder={isLogin ? "password" : "create password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    onFocus={() => !isLogin && setShowPasswordRequirements(true)}
                    onBlur={(e) => handleFieldBlur('password', e.target.value)}
                    className={`w-full bg-transparent border-b-2 pb-3 pr-10 text-white placeholder-white/60 focus:outline-none transition-colors autofill-override ${
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
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-3 text-white/60 hover:text-white transition-colors z-10"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L12 12m-3.122-3.122l4.242 4.242M12 12l6.878 6.878" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                  
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
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="confirm password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      onBlur={(e) => handleFieldBlur('confirmPassword', e.target.value)}
                      className={`w-full bg-transparent border-b-2 pb-3 pr-10 text-white placeholder-white/60 focus:outline-none transition-colors autofill-override ${
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
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-3 text-white/60 hover:text-white transition-colors z-10"
                    >
                      {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L12 12m-3.122-3.122l4.242 4.242M12 12l6.878 6.878" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
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

              {/* OAuth Separator - Mobile */}
              <div className="mt-8 mb-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-[#0a0a13] px-4 text-white/60">or continue with</span>
                  </div>
                </div>
              </div>

              {/* OAuth Buttons - Mobile */}
              <div className="space-y-3">
                {/* Spotify OAuth Button */}
                <button
                  onClick={handleSpotifyLogin}
                  disabled={isLoading}
                  className="w-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg width="337" height="49" viewBox="0 0 337 49" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                    <rect x="0.3" y="0.3" width="336.4" height="48.4" rx="24.2" fill="#121212" stroke="white" strokeWidth="0.6"/>
                    <path d="M105.728 28.888H109.312V31H102.992V19.768H105.728V28.888ZM114.681 31.128C113.806 31.128 113.017 30.9413 112.313 30.568C111.62 30.1947 111.07 29.6613 110.665 28.968C110.27 28.2747 110.073 27.464 110.073 26.536C110.073 25.6187 110.276 24.8133 110.681 24.12C111.086 23.416 111.641 22.8773 112.345 22.504C113.049 22.1307 113.838 21.944 114.713 21.944C115.588 21.944 116.377 22.1307 117.081 22.504C117.785 22.8773 118.34 23.416 118.745 24.12C119.15 24.8133 119.353 25.6187 119.353 26.536C119.353 27.4533 119.145 28.264 118.729 28.968C118.324 29.6613 117.764 30.1947 117.049 30.568C116.345 30.9413 115.556 31.128 114.681 31.128ZM114.681 28.76C115.204 28.76 115.646 28.568 116.009 28.184C116.382 27.8 116.569 27.2507 116.569 26.536C116.569 25.8213 116.388 25.272 116.025 24.888C115.673 24.504 115.236 24.312 114.713 24.312C114.18 24.312 113.737 24.504 113.385 24.888C113.033 25.2613 112.857 25.8107 112.857 26.536C112.857 27.2507 113.028 27.8 113.369 28.184C113.721 28.568 114.158 28.76 114.681 28.76ZM124.197 21.944C124.826 21.944 125.375 22.072 125.845 22.328C126.325 22.584 126.693 22.92 126.949 23.336V22.072H129.685V30.984C129.685 31.8053 129.519 32.5467 129.189 33.208C128.869 33.88 128.373 34.4133 127.701 34.808C127.039 35.2027 126.213 35.4 125.221 35.4C123.898 35.4 122.826 35.0853 122.005 34.456C121.183 33.8373 120.714 32.9947 120.597 31.928H123.301C123.386 32.2693 123.589 32.536 123.909 32.728C124.229 32.9307 124.623 33.032 125.093 33.032C125.658 33.032 126.106 32.8667 126.437 32.536C126.778 32.216 126.949 31.6987 126.949 30.984V29.72C126.682 30.136 126.314 30.4773 125.845 30.744C125.375 31 124.826 31.128 124.197 31.128C123.461 31.128 122.794 30.9413 122.197 30.568C121.599 30.184 121.125 29.6453 120.773 28.952C120.431 28.248 120.261 27.4373 120.261 26.52C120.261 25.6027 120.431 24.7973 120.773 24.104C121.125 23.4107 121.599 22.8773 122.197 22.504C122.794 22.1307 123.461 21.944 124.197 21.944ZM126.949 26.536C126.949 25.8533 126.757 25.3147 126.373 24.92C125.999 24.5253 125.541 24.328 124.997 24.328C124.453 24.328 123.989 24.5253 123.605 24.92C123.231 25.304 123.045 25.8373 123.045 26.52C123.045 27.2027 123.231 27.7467 123.605 28.152C123.989 28.5467 124.453 28.744 124.997 28.744C125.541 28.744 125.999 28.5467 126.373 28.152C126.757 27.7573 126.949 27.2187 126.949 26.536ZM133.04 21.144C132.56 21.144 132.165 21.0053 131.856 20.728C131.557 20.44 131.408 20.088 131.408 19.672C131.408 19.2453 131.557 18.8933 131.856 18.616C132.165 18.328 132.56 18.184 133.04 18.184C133.509 18.184 133.893 18.328 134.192 18.616C134.501 18.8933 134.656 19.2453 134.656 19.672C134.656 20.088 134.501 20.44 134.192 20.728C133.893 21.0053 133.509 21.144 133.04 21.144ZM134.4 22.072V31H131.664V22.072H134.4ZM141.823 21.976C142.868 21.976 143.7 22.3173 144.319 23C144.948 23.672 145.263 24.6 145.263 25.784V31H142.543V26.152C142.543 25.5547 142.388 25.0907 142.079 24.76C141.769 24.4293 141.353 24.264 140.831 24.264C140.308 24.264 139.892 24.4293 139.583 24.76C139.273 25.0907 139.119 25.5547 139.119 26.152V31H136.383V22.072H139.119V23.256C139.396 22.8613 139.769 22.552 140.239 22.328C140.708 22.0933 141.236 21.976 141.823 21.976ZM163.371 22.072L160.955 31H157.931L156.523 25.208L155.067 31H152.059L149.627 22.072H152.363L153.627 28.456L155.131 22.072H158.027L159.547 28.424L160.795 22.072H163.371ZM165.79 21.144C165.31 21.144 164.915 21.0053 164.606 20.728C164.307 20.44 164.158 20.088 164.158 19.672C164.158 19.2453 164.307 18.8933 164.606 18.616C164.915 18.328 165.31 18.184 165.79 18.184C166.259 18.184 166.643 18.328 166.942 18.616C167.251 18.8933 167.406 19.2453 167.406 19.672C167.406 20.088 167.251 20.44 166.942 20.728C166.643 21.0053 166.259 21.144 165.79 21.144ZM167.15 22.072V31H164.414V22.072H167.15ZM174.109 28.68V31H172.717C171.725 31 170.951 30.76 170.397 30.28C169.842 29.7893 169.565 28.9947 169.565 27.896V24.344H168.477V22.072H169.565V19.896H172.301V22.072H174.093V24.344H172.301V27.928C172.301 28.1947 172.365 28.3867 172.493 28.504C172.621 28.6213 172.834 28.68 173.133 28.68H174.109ZM181.121 21.976C182.145 21.976 182.966 22.3173 183.585 23C184.203 23.672 184.513 24.6 184.513 25.784V31H181.793V26.152C181.793 25.5547 181.638 25.0907 181.329 24.76C181.019 24.4293 180.603 24.264 180.081 24.264C179.558 24.264 179.142 24.4293 178.833 24.76C178.523 25.0907 178.369 25.5547 178.369 26.152V31H175.633V19.16H178.369V23.272C178.646 22.8773 179.025 22.5627 179.505 22.328C179.985 22.0933 180.523 21.976 181.121 21.976ZM193.869 31.112C193.047 31.112 192.311 30.9787 191.661 30.712C191.01 30.4453 190.487 30.0507 190.093 29.528C189.709 29.0053 189.506 28.376 189.485 27.64H192.397C192.439 28.056 192.583 28.376 192.829 28.6C193.074 28.8133 193.394 28.92 193.789 28.92C194.194 28.92 194.514 28.8293 194.749 28.648C194.983 28.456 195.101 28.1947 195.101 27.864C195.101 27.5867 195.005 27.3573 194.813 27.176C194.631 26.9947 194.402 26.8453 194.125 26.728C193.858 26.6107 193.474 26.4773 192.973 26.328C192.247 26.104 191.655 25.88 191.197 25.656C190.738 25.432 190.343 25.1013 190.013 24.664C189.682 24.2267 189.517 23.656 189.517 22.952C189.517 21.9067 189.895 21.0907 190.653 20.504C191.41 19.9067 192.397 19.608 193.613 19.608C194.85 19.608 195.847 19.9067 196.605 20.504C197.362 21.0907 197.767 21.912 197.821 22.968H194.861C194.839 22.6053 194.706 22.3227 194.461 22.12C194.215 21.9067 193.901 21.8 193.516 21.8C193.186 21.8 192.919 21.8907 192.717 22.072C192.514 22.2427 192.413 22.4933 192.413 22.824C192.413 23.1867 192.583 23.4693 192.924 23.672C193.266 23.8747 193.799 24.0933 194.525 24.328C195.25 24.5733 195.837 24.808 196.285 25.032C196.743 25.256 197.138 25.5813 197.469 26.008C197.799 26.4347 197.965 26.984 197.965 27.656C197.965 28.296 197.799 28.8773 197.469 29.4C197.149 29.9227 196.679 30.3387 196.061 30.648C195.442 30.9573 194.711 31.112 193.869 31.112ZM202.384 23.336C202.651 22.92 203.019 22.584 203.488 22.328C203.958 22.072 204.507 21.944 205.136 21.944C205.872 21.944 206.539 22.1307 207.136 22.504C207.734 22.8773 208.203 23.4107 208.544 24.104C208.896 24.7973 209.072 25.6027 209.072 26.52C209.072 27.4373 208.896 28.248 208.544 28.952C208.203 29.6453 207.734 30.184 207.136 30.568C206.539 30.9413 205.872 31.128 205.136 31.128C204.518 31.128 203.968 31 203.488 30.744C203.019 30.488 202.651 30.1573 202.384 29.752V35.256H199.648V22.072H202.384V23.336ZM206.288 26.52C206.288 25.8373 206.096 25.304 205.712 24.92C205.339 24.5253 204.875 24.328 204.32 24.328C203.776 24.328 203.312 24.5253 202.928 24.92C202.555 25.3147 202.368 25.8533 202.368 26.536C202.368 27.2187 202.555 27.7573 202.928 28.152C203.312 28.5467 203.776 28.744 204.32 28.744C204.864 28.744 205.328 28.5467 205.712 28.152C206.096 27.7467 206.288 27.2027 206.288 26.52ZM214.572 31.128C213.697 31.128 212.908 30.9413 212.204 30.568C211.51 30.1947 210.961 29.6613 210.556 28.968C210.161 28.2747 209.964 27.464 209.964 26.536C209.964 25.6187 210.166 24.8133 210.572 24.12C210.977 23.416 211.532 22.8773 212.236 22.504C212.94 22.1307 213.729 21.944 214.604 21.944C215.478 21.944 216.268 22.1307 216.972 22.504C217.676 22.8773 218.23 23.416 218.636 24.12C219.041 24.8133 219.244 25.6187 219.244 26.536C219.244 27.4533 219.036 28.264 218.62 28.968C218.214 29.6613 217.654 30.1947 216.94 30.568C216.236 30.9413 215.446 31.128 214.572 31.128ZM214.572 28.76C215.094 28.76 215.537 28.568 215.9 28.184C216.273 27.8 216.46 27.2507 216.46 26.536C216.46 25.8213 216.278 25.272 215.916 24.888C215.564 24.504 215.126 24.312 214.604 24.312C214.07 24.312 213.628 24.504 213.276 24.888C212.924 25.2613 212.748 25.8107 212.748 26.536C212.748 27.2507 212.918 27.8 213.26 28.184C213.612 28.568 214.049 28.76 214.572 28.76ZM225.671 28.68V31H224.279C223.287 31 222.514 30.76 221.959 30.28C221.404 29.7893 221.127 28.9947 221.127 27.896V24.344H220.039V22.072H221.127V19.896H223.863V22.072H225.655V24.344H223.863V27.928C223.863 28.1947 223.927 28.3867 224.055 28.504C224.183 28.6213 224.396 28.68 224.695 28.68H225.671ZM228.571 21.144C228.091 21.144 227.696 21.0053 227.387 20.728C227.088 20.44 226.939 20.088 226.939 19.672C226.939 19.2453 227.088 18.8933 227.387 18.616C227.696 18.328 228.091 18.184 228.571 18.184C229.04 18.184 229.424 18.328 229.723 18.616C230.032 18.8933 230.187 19.2453 230.187 19.672C230.187 20.088 230.032 20.44 229.723 20.728C229.424 21.0053 229.04 21.144 228.571 21.144ZM229.931 22.072V31H227.195V22.072H229.931ZM236.394 24.344H234.922V31H232.186V24.344H231.194V22.072H232.186V21.816C232.186 20.7173 232.501 19.8853 233.13 19.32C233.759 18.744 234.682 18.456 235.898 18.456C236.101 18.456 236.25 18.4613 236.346 18.472V20.792C235.823 20.76 235.455 20.8347 235.242 21.016C235.029 21.1973 234.922 21.5227 234.922 21.992V22.072H236.394V24.344ZM246.8 22.072L241.2 35.24H238.256L240.304 30.696L236.671 22.072H239.728L241.792 27.656L243.84 22.072H246.8Z" fill="#F5F5F5"/>
                    <g clipPath="url(#clip0_0_1)">
                      <path d="M33.4864 11.0444C26.0603 11.0444 20.04 17.0646 20.04 24.4906C20.04 31.917 26.0603 37.9366 33.4864 37.9366C40.9132 37.9366 46.9329 31.917 46.9329 24.4906C46.9329 17.065 40.9134 11.0444 33.4864 11.0444ZM39.6528 30.4377C39.4119 30.8327 38.8949 30.9579 38.4999 30.7155C35.3428 28.787 31.3685 28.3503 26.688 29.4197C26.2369 29.5224 25.7874 29.2398 25.6846 28.7887C25.5814 28.3375 25.8628 27.8879 26.315 27.7851C31.4371 26.6149 35.8306 27.1188 39.375 29.2848C39.77 29.5273 39.8952 30.0427 39.6528 30.4377ZM41.2986 26.7764C40.9951 27.2697 40.3496 27.4254 39.8567 27.122C36.2423 24.9004 30.7328 24.257 26.4577 25.5547C25.9033 25.7222 25.3177 25.4097 25.1494 24.8562C24.9824 24.3018 25.2951 23.7173 25.8485 23.5487C30.7319 22.067 36.8027 22.7847 40.9534 25.3353C41.4463 25.6388 41.6021 26.2841 41.2986 26.7764ZM41.4399 22.9639C37.1062 20.3899 29.9562 20.1532 25.8185 21.409C25.1541 21.6105 24.4514 21.2354 24.2501 20.571C24.0487 19.9063 24.4235 19.2041 25.0884 19.0021C29.8381 17.5602 37.734 17.8388 42.7234 20.8008C43.3224 21.1555 43.5183 21.9273 43.1634 22.5241C42.8102 23.1218 42.0356 23.3188 41.4399 22.9639Z" fill="#1ED760"/>
                    </g>
                    <defs>
                      <clipPath id="clip0_0_1">
                        <rect width="27" height="27" fill="white" transform="translate(20 11)"/>
                      </clipPath>
                    </defs>
                  </svg>
                </button>

                {/* Google OAuth Button */}
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg width="337" height="49" viewBox="0 0 337 49" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                    <rect x="0.3" y="0.3" width="336.4" height="48.4" rx="24.2" fill="#121212" stroke="white" strokeWidth="0.6"/>
                    <path d="M107.728 28.888H111.312V31H104.992V19.768H107.728V28.888ZM116.681 31.128C115.806 31.128 115.017 30.9413 114.313 30.568C113.62 30.1947 113.07 29.6613 112.665 28.968C112.27 28.2747 112.073 27.464 112.073 26.536C112.073 25.6187 112.276 24.8133 112.681 24.12C113.086 23.416 113.641 22.8773 114.345 22.504C115.049 22.1307 115.838 21.944 116.713 21.944C117.588 21.944 118.377 22.1307 119.081 22.504C119.785 22.8773 120.34 23.416 120.745 24.12C121.15 24.8133 121.353 25.6187 121.353 26.536C121.353 27.4533 121.145 28.264 120.729 28.968C120.324 29.6613 119.764 30.1947 119.049 30.568C118.345 30.9413 117.556 31.128 116.681 31.128ZM116.681 28.76C117.204 28.76 117.646 28.568 118.009 28.184C118.382 27.8 118.569 27.2507 118.569 26.536C118.569 25.8213 118.388 25.272 118.025 24.888C117.673 24.504 117.236 24.312 116.713 24.312C116.18 24.312 115.737 24.504 115.385 24.888C115.033 25.2613 114.857 25.8107 114.857 26.536C114.857 27.2507 115.028 27.8 115.369 28.184C115.721 28.568 116.158 28.76 116.681 28.76ZM126.197 21.944C126.826 21.944 127.375 22.072 127.845 22.328C128.325 22.584 128.693 22.92 128.949 23.336V22.072H131.685V30.984C131.685 31.8053 131.519 32.5467 131.189 33.208C130.869 33.88 130.373 34.4133 129.701 34.808C129.039 35.2027 128.213 35.4 127.221 35.4C125.898 35.4 124.826 35.0853 124.005 34.456C123.183 33.8373 122.714 32.9947 122.597 31.928H125.301C125.386 32.2693 125.589 32.536 125.909 32.728C126.229 32.9307 126.623 33.032 127.093 33.032C127.658 33.032 128.106 32.8667 128.437 32.536C128.778 32.216 128.949 31.6987 128.949 30.984V29.72C128.682 30.136 128.314 30.4773 127.845 30.744C127.375 31 126.826 31.128 126.197 31.128C125.461 31.128 124.794 30.9413 124.197 30.568C123.599 30.184 123.125 29.6453 122.773 28.952C122.431 28.248 122.261 27.4373 122.261 26.52C122.261 25.6027 122.431 24.7973 122.773 24.104C123.125 23.4107 123.599 22.8773 124.197 22.504C124.794 22.1307 125.461 21.944 126.197 21.944ZM128.949 26.536C128.949 25.8533 128.757 25.3147 128.373 24.92C127.999 24.5253 127.541 24.328 126.997 24.328C126.453 24.328 125.989 24.5253 125.605 24.92C125.231 25.304 125.045 25.8373 125.045 26.52C125.045 27.2027 125.231 27.7467 125.605 28.152C125.989 28.5467 126.453 28.744 126.997 28.744C127.541 28.744 127.999 28.5467 128.373 28.152C128.757 27.7573 128.949 27.2187 128.949 26.536ZM135.04 21.144C134.56 21.144 134.165 21.0053 133.856 20.728C133.557 20.44 133.408 20.088 133.408 19.672C133.408 19.2453 133.557 18.8933 133.856 18.616C134.165 18.328 134.56 18.184 135.04 18.184C135.509 18.184 135.893 18.328 136.192 18.616C136.501 18.8933 136.656 19.2453 136.656 19.672C136.656 20.088 136.501 20.44 136.192 20.728C135.893 21.0053 135.509 21.144 135.04 21.144ZM136.4 22.072V31H133.664V22.072H136.4ZM143.823 21.976C144.868 21.976 145.7 22.3173 146.319 23C146.948 23.672 147.263 24.6 147.263 25.784V31H144.543V26.152C144.543 25.5547 144.388 25.0907 144.079 24.76C143.769 24.4293 143.353 24.264 142.831 24.264C142.308 24.264 141.892 24.4293 141.583 24.76C141.273 25.0907 141.119 25.5547 141.119 26.152V31H138.383V22.072H141.119V23.256C141.396 22.8613 141.769 22.552 142.239 22.328C142.708 22.0933 143.236 21.976 143.823 21.976ZM165.371 22.072L162.955 31H159.931L158.523 25.208L155.067 31H152.059L149.627 22.072H152.363L153.627 28.456L155.131 22.072H158.027L159.547 28.424L160.795 22.072H163.371ZM167.79 21.144C167.31 21.144 166.915 21.0053 166.606 20.728C166.307 20.44 166.158 20.088 166.158 19.672C166.158 19.2453 166.307 18.8933 166.606 18.616C166.915 18.328 167.31 18.184 167.79 18.184C168.259 18.184 168.643 18.328 168.942 18.616C169.251 18.8933 169.406 19.2453 169.406 19.672C169.406 20.088 169.251 20.44 168.942 20.728C168.643 21.0053 168.259 21.144 167.79 21.144ZM169.15 22.072V31H166.414V22.072H169.15ZM176.109 28.68V31H172.717C173.725 31 172.951 30.76 172.397 30.28C171.842 29.7893 171.565 28.9947 171.565 27.896V24.344H170.477V22.072H171.565V19.896H174.301V22.072H176.093V24.344H174.301V27.928C174.301 28.1947 174.365 28.3867 174.493 28.504C174.621 28.6213 174.834 28.68 175.133 28.68H176.109ZM183.121 21.976C184.145 21.976 184.966 22.3173 185.585 23C186.203 23.672 186.513 24.6 186.513 25.784V31H183.793V26.152C183.793 25.5547 183.638 25.0907 183.329 24.76C183.019 24.4293 182.603 24.264 182.081 24.264C181.558 24.264 181.142 24.4293 180.833 24.76C180.523 25.0907 180.369 25.5547 180.369 26.152V31H177.633V19.16H180.369V23.272C180.646 22.8773 181.025 22.5627 181.505 22.328C181.985 22.0933 182.523 21.976 183.121 21.976ZM199.26 23.32C199.058 22.9467 198.765 22.664 198.381 22.472C198.007 22.2693 197.565 22.168 197.053 22.168C196.167 22.168 195.458 22.4613 194.924 23.048C194.391 23.624 194.125 24.3973 194.125 25.368C194.125 26.4027 194.402 27.2133 194.957 27.8C195.522 28.376 196.295 28.664 197.277 28.664C197.949 28.664 198.514 28.4933 198.973 28.152C199.442 27.8107 199.783 27.32 199.997 26.68H196.525V24.664H202.477V27.208C202.274 27.8907 201.927 28.5253 201.437 29.112C200.957 29.6987 200.343 30.1733 199.597 30.536C198.85 30.8987 198.007 31.08 197.069 31.08C195.959 31.08 194.967 30.84 194.093 30.36C193.229 29.8693 192.551 29.192 192.061 28.328C191.581 27.464 191.34 26.4773 191.34 25.368C191.34 24.2587 191.581 23.272 192.061 22.408C192.551 21.5333 193.229 20.856 194.093 20.376C194.957 19.8853 195.943 19.64 197.053 19.64C198.397 19.64 199.527 19.9653 200.445 20.616C201.373 21.2667 201.986 22.168 202.285 23.32H199.26ZM208.056 31.128C207.181 31.128 206.392 30.9413 205.688 30.568C204.995 30.1947 204.445 29.6613 204.04 28.968C203.645 28.2747 203.448 27.464 203.448 26.536C203.448 25.6187 203.651 24.8133 204.056 24.12C204.461 23.416 205.016 22.8773 205.72 22.504C206.424 22.1307 207.213 21.944 208.088 21.944C208.963 21.944 209.752 22.1307 210.456 22.504C211.16 22.8773 211.715 23.416 212.12 24.12C212.525 24.8133 212.728 25.6187 212.728 26.536C212.728 27.4533 212.52 28.264 212.104 28.968C211.699 29.6613 211.139 30.1947 210.424 30.568C209.72 30.9413 208.931 31.128 208.056 31.128ZM208.056 28.76C208.579 28.76 209.021 28.568 209.384 28.184C209.757 27.8 209.944 27.2507 209.944 26.536C209.944 25.8213 209.763 25.272 209.4 24.888C209.048 24.504 208.611 24.312 208.088 24.312C207.555 24.312 207.112 24.504 206.76 24.888C206.408 25.2613 206.232 25.8107 206.232 26.536C206.232 27.2507 206.403 27.8 206.744 28.184C207.096 28.568 207.533 28.76 208.056 28.76ZM218.244 31.128C217.369 31.128 216.58 30.9413 215.876 30.568C215.182 30.1947 214.633 29.6613 214.228 28.968C213.833 28.2747 213.636 27.464 213.636 26.536C213.636 25.6187 213.838 24.8133 214.243 24.12C214.649 23.416 215.204 22.8773 215.908 22.504C216.612 22.1307 217.401 21.944 218.276 21.944C219.15 21.944 219.94 22.1307 220.644 22.504C221.348 22.8773 221.902 23.416 222.308 24.12C222.713 24.8133 222.916 25.6187 222.916 26.536C222.916 27.4533 222.708 28.264 222.292 28.968C221.886 29.6613 221.326 30.1947 220.612 30.568C219.908 30.9413 219.118 31.128 218.244 31.128ZM218.244 28.76C218.766 28.76 219.209 28.568 219.572 28.184C219.945 27.8 220.132 27.2507 220.132 26.536C220.132 25.8213 219.95 25.272 219.588 24.888C219.236 24.504 218.798 24.312 218.276 24.312C217.742 24.312 217.3 24.504 216.948 24.888C216.596 25.2613 216.42 25.8107 216.42 26.536C216.42 27.2507 216.59 27.8 216.932 28.184C217.284 28.568 217.721 28.76 218.244 28.76ZM227.759 21.944C228.388 21.944 228.938 22.072 229.407 22.328C229.887 22.584 230.255 22.92 230.511 23.336V22.072H233.247V30.984C233.247 31.8053 233.082 32.5467 232.751 33.208C232.431 33.88 231.935 34.4133 231.263 34.808C230.602 35.2027 229.775 35.4 228.783 35.4C227.46 35.4 226.388 35.0853 225.567 34.456C224.746 33.8373 224.276 32.9947 224.159 31.928H226.863C226.948 32.2693 227.151 32.536 227.471 32.728C227.791 32.9307 228.186 33.032 228.655 33.032C229.22 33.032 229.668 32.8667 229.999 32.536C230.34 32.216 230.511 31.6987 230.511 30.984V29.72C230.244 30.136 229.876 30.4773 229.407 30.744C228.938 31 228.388 31.128 227.759 31.128C227.023 31.128 226.356 30.9413 225.759 30.568C225.162 30.184 224.687 29.6453 224.335 28.952C223.994 28.248 223.823 27.4373 223.823 26.52C223.823 25.6027 223.994 24.7973 224.335 24.104C224.687 23.4107 225.162 22.8773 225.759 22.504C226.356 22.1307 227.023 21.944 227.759 21.944ZM230.511 26.536C230.511 25.8533 230.319 25.3147 229.935 24.92C229.562 24.5253 229.103 24.328 228.559 24.328C228.015 24.328 227.551 24.5253 227.167 24.92C226.794 25.304 226.607 25.8373 226.607 26.52C226.607 27.2027 226.794 27.7467 227.167 28.152C227.551 28.5467 228.015 28.744 228.559 28.744C229.103 28.744 229.562 28.5467 229.935 28.152C230.319 27.7573 230.511 27.2187 230.511 26.536ZM237.962 19.16V31H235.226V19.16H237.962ZM248.361 26.392C248.361 26.648 248.345 26.9147 248.313 27.192H242.121C242.164 27.7467 242.34 28.1733 242.649 28.472C242.969 28.76 243.358 28.904 243.817 28.904C244.5 28.904 244.974 28.616 245.241 28.04H248.153C248.004 28.6267 247.732 29.1547 247.337 29.624C246.953 30.0933 246.468 30.4613 245.881 30.728C245.294 30.9947 244.638 31.128 243.913 31.128C243.038 31.128 242.26 30.9413 241.577 30.568C240.894 30.1947 240.361 29.6613 239.977 28.968C239.593 28.2747 239.401 27.464 239.401 26.536C239.401 25.608 239.588 24.7973 239.961 24.104C240.345 23.4107 240.878 22.8773 241.561 22.504C242.244 22.1307 243.028 21.944 243.913 21.944C244.777 21.944 245.545 22.1253 246.217 22.488C246.889 22.8507 247.412 23.368 247.785 24.04C248.169 24.712 248.361 25.496 248.361 26.392ZM245.561 25.672C245.561 25.2027 245.401 24.8293 245.081 24.552C244.761 24.2747 244.361 24.136 243.881 24.136C243.422 24.136 243.033 24.2693 242.713 24.536C242.404 24.8027 242.212 25.1813 242.137 25.672H245.561Z" fill="#F5F5F5"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M44 25.7417C44 25.1379 43.9403 24.5573 43.8295 24H35V27.2937H40.0455C39.8281 28.358 39.1676 29.2598 38.1747 29.8636V32H41.2045C42.9773 30.5177 44 28.3348 44 25.7417Z" fill="#4285F4"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M35.0433 34C37.4734 34 39.5108 33.2262 41 31.9063L38.0912 29.7379C37.2852 30.2565 36.2542 30.5629 35.0433 30.5629C32.699 30.5629 30.7148 29.0426 30.007 27H27V29.2391C28.481 32.0634 31.5248 34 35.0433 34Z" fill="#34A853"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M30 26.6923C29.8184 26.1579 29.7152 25.587 29.7152 25C29.7152 24.413 29.8184 23.8421 30 23.3077V21H26.9659C26.3509 22.2024 26 23.5628 26 25C26 26.4372 26.3509 27.7976 26.9659 29L30 26.6923Z" fill="#FBBC05"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M35.0058 19.4371C36.3211 19.4371 37.502 19.8732 38.4305 20.7295L41 18.2508C39.4485 16.8563 37.4206 16 35.0058 16C31.5038 16 28.4741 17.9366 27 20.7609L29.993 23C30.6975 20.9574 32.6725 19.4371 35.0058 19.4371Z" fill="#EA4335"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
} 