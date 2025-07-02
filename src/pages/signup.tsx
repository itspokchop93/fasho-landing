import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import Header from '../components/Header';
import VerticalShapeDivider from '../components/VerticalShapeDivider';

export default function SignUpPage() {
  const [isLogin, setIsLogin] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement auth logic with Supabase
    console.log('Form submitted:', formData);
  };

  const toggleForm = () => {
    setIsLogin(!isLogin);
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

              <form onSubmit={handleSubmit} className="space-y-6">
                {!isLogin && (
                  <div>
                    <input
                      type="text"
                      name="fullName"
                      placeholder="full name"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full bg-transparent border-b-2 border-white/30 pb-3 text-white placeholder-white/60 focus:border-[#59e3a5] focus:outline-none transition-colors text-lg"
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
                    className="w-full bg-transparent border-b-2 border-white/30 pb-3 text-white placeholder-white/60 focus:border-[#59e3a5] focus:outline-none transition-colors text-lg"
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
                    className="w-full bg-transparent border-b-2 border-white/30 pb-3 text-white placeholder-white/60 focus:border-[#59e3a5] focus:outline-none transition-colors text-lg"
                    required
                  />
                </div>

                {!isLogin && (
                  <div>
                    <input
                      type="password"
                      name="confirmPassword"
                      placeholder="confirm password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full bg-transparent border-b-2 border-white/30 pb-3 text-white placeholder-white/60 focus:border-[#59e3a5] focus:outline-none transition-colors text-lg"
                      required
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-bold py-4 px-6 rounded-md hover:opacity-90 transition-opacity text-lg mt-8"
                >
                  {isLogin ? 'log in' : 'sign up'}
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
            left: 'calc(50% - 200px)',
            background: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.1) 20%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.9) 90%, #000000 100%)',
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
            <div className="absolute bottom-8 left-8 z-20">
              <div className="text-white">
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

              <form onSubmit={handleSubmit} className="space-y-6">
                {!isLogin && (
                  <div>
                    <input
                      type="text"
                      name="fullName"
                      placeholder="full name"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full bg-transparent border-b-2 border-white/30 pb-3 text-white placeholder-white/60 focus:border-[#59e3a5] focus:outline-none transition-colors"
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
                    className="w-full bg-transparent border-b-2 border-white/30 pb-3 text-white placeholder-white/60 focus:border-[#59e3a5] focus:outline-none transition-colors"
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
                    className="w-full bg-transparent border-b-2 border-white/30 pb-3 text-white placeholder-white/60 focus:border-[#59e3a5] focus:outline-none transition-colors"
                    required
                  />
                </div>

                {!isLogin && (
                  <div>
                    <input
                      type="password"
                      name="confirmPassword"
                      placeholder="confirm password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full bg-transparent border-b-2 border-white/30 pb-3 text-white placeholder-white/60 focus:border-[#59e3a5] focus:outline-none transition-colors"
                      required
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-bold py-4 px-6 rounded-md hover:opacity-90 transition-opacity mt-8"
                >
                  {isLogin ? 'log in' : 'sign up'}
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