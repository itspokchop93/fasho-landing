import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { createClient } from '../utils/supabase/client';
import Header from '../components/Header';
import VerticalShapeDivider from '../components/VerticalShapeDivider';

export default function SignUpPage() {
  const [isLogin, setIsLogin] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showResendLink, setShowResendLink] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push('/dashboard');
      }
    };
    checkUser();
  }, [router, supabase.auth]);

  // Check for confirmation failure message
  useEffect(() => {
    if (router.query.message === 'confirmation_failed') {
      setMessage('Email confirmation failed or expired. Please try signing up again.');
      // Clean up the URL parameter
      router.replace('/signup', undefined, { shallow: true });
    }
  }, [router]);

  // Password validation function
  const validatePassword = (password: string) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    return hasUpperCase && hasNumber;
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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    
    // Clear field error when user starts typing
    if (fieldErrors[e.target.name]) {
      setFieldErrors(prev => ({
        ...prev,
        [e.target.name]: ''
      }));
    }
  };

  // Handle field validation on blur
  const handleFieldBlur = (field: string, value: string) => {
    let error = '';
    
    if (field === 'password' && value && !isLogin) {
      if (value.length < 6) {
        error = 'Password must be at least 6 characters long';
      } else if (!validatePassword(value)) {
        error = 'Passwords require 1 Uppercase Letter and 1 Number';
      }
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

        if (formData.password.length < 6) {
          setMessage('Password must be at least 6 characters long');
          setIsLoading(false);
          return;
        }

        if (!validatePassword(formData.password)) {
          setMessage('Passwords require 1 Uppercase Letter and 1 Number');
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
                      className="w-full bg-transparent border-b-2 border-white/30 pb-3 text-white placeholder-white/60 focus:border-[#59e3a5] focus:outline-none transition-colors text-lg autofill-override"
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
                      className="w-full bg-transparent border-b-2 border-white/30 pb-3 text-white placeholder-white/60 focus:border-[#59e3a5] focus:outline-none transition-colors text-lg autofill-override"
                      style={{
                        WebkitTextFillColor: 'white',
                        WebkitBoxShadow: '0 0 0 1000px transparent inset',
                        transition: 'background-color 5000s ease-in-out 0s'
                      }}
                      required
                    />
                </div>

                <div>
                  <input
                    type="password"
                    name="password"
                    placeholder={isLogin ? "password" : "create password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    onBlur={(e) => handleFieldBlur('password', e.target.value)}
                    className={`w-full bg-transparent border-b-2 pb-3 text-white placeholder-white/60 focus:outline-none transition-colors text-lg autofill-override ${
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
                      className={`w-full bg-transparent border-b-2 pb-3 text-white placeholder-white/60 focus:outline-none transition-colors text-lg autofill-override ${
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
                    className="w-full bg-transparent border-b-2 border-white/30 pb-3 text-white placeholder-white/60 focus:border-[#59e3a5] focus:outline-none transition-colors autofill-override"
                    style={{
                      WebkitTextFillColor: 'white',
                      WebkitBoxShadow: '0 0 0 1000px transparent inset',
                      transition: 'background-color 5000s ease-in-out 0s'
                    }}
                    required
                  />
                </div>

                <div>
                  <input
                    type="password"
                    name="password"
                    placeholder={isLogin ? "password" : "create password"}
                    value={formData.password}
                    onChange={handleInputChange}
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