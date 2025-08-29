// Individual Blog Post Page
// Public page for displaying single blog post with full SEO optimization

import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useEffect } from 'react';
import { getBlogSupabaseClient } from '../../../plugins/blog/utils/supabase';
import { BlogPost } from '../../../plugins/blog/types/blog';
import { schemaGenerator } from '../../../plugins/blog/utils/schema-generator';
import PerformanceOptimizer, { WebVitalsTracker } from '../../../plugins/blog/utils/performance-optimizer';
import BlogHeader from '../../components/BlogHeader';
import Footer from '../../components/Footer';

interface BlogPostPageProps {
  post: BlogPost;
  relatedPosts: BlogPost[];
  error?: string;
}

export default function BlogPostPage({ post, relatedPosts, error }: BlogPostPageProps) {
  // Performance and analytics initialization
  useEffect(() => {
    // Initialize performance optimizations
    PerformanceOptimizer.initializeAll();
    
    // Track Core Web Vitals
    WebVitalsTracker.trackCoreWebVitals();
    
    // Track page view
    if (post?.id) {
      fetch(`/api/blog/posts/${post.id}/view`, { method: 'POST' })
        .catch(err => console.error('Failed to track view:', err));
    }
  }, [post?.id]);

  if (error || !post) {
    return (
      <>
        <Head>
          <title>Post Not Found | Fasho.co</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Post Not Found</h1>
            <p className="text-gray-600 mb-8">The blog post you're looking for doesn't exist.</p>
            <Link 
              href="/blog"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Back to Blog
            </Link>
          </div>
        </main>
      </>
    );
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get read time
  const getReadTime = (readTime?: number) => {
    return readTime ? `${readTime} min read` : '5 min read';
  };

  // Generate advanced structured data for SEO
  const fullUrl = `https://fasho.co/blog/${post.slug}`;
  const advancedSchemaMarkup = schemaGenerator.generateCombinedSchema(post, fullUrl);

  return (
    <>
      <Head>
        {/* Ensure Tailwind CSS is loaded */}
        <link rel="stylesheet" href="/_next/static/css/app.css" />
        <style>{`
          /* Force CSS Reset and Base Styles */
          *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          html, body {
            height: 100%;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          
          /* Ensure Tailwind classes work */
          .min-h-screen { min-height: 100vh; }
          .bg-gradient-to-br { background-image: linear-gradient(to bottom right, var(--tw-gradient-stops)); }
          .from-\\[\\#0f0f23\\] { --tw-gradient-from: #0f0f23; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(15, 15, 35, 0)); }
          .via-\\[\\#1a1a2e\\] { --tw-gradient-stops: var(--tw-gradient-from), #1a1a2e, var(--tw-gradient-to, rgba(26, 26, 46, 0)); }
          .to-\\[\\#16213e\\] { --tw-gradient-to: #16213e; }
          
          /* Container styles */
          .max-w-6xl { max-width: 72rem; }
          .mx-auto { margin-left: auto; margin-right: auto; }
          .px-4 { padding-left: 1rem; padding-right: 1rem; }
          .sm\\:px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
          .lg\\:px-8 { padding-left: 2rem; padding-right: 2rem; }
          .pt-16 { padding-top: 4rem; }
          .pb-16 { padding-bottom: 4rem; }
          
          /* White card container */
          .bg-white { background-color: #ffffff; }
          .rounded-2xl { border-radius: 1rem; }
          .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
          .p-8 { padding: 2rem; }
          .lg\\:p-12 { padding: 3rem; }
          
          /* Typography */
          .text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
          .lg\\:text-5xl { font-size: 3rem; line-height: 1; }
          .font-bold { font-weight: 700; }
          .text-gray-900 { color: #111827; }
          .mb-6 { margin-bottom: 1.5rem; }
          .leading-tight { line-height: 1.25; }
          
          /* Additional fallback styles */
          .relative { position: relative; }
          .overflow-hidden { overflow: hidden; }
          .border { border-width: 1px; }
          .border-gray-200 { border-color: #e5e7eb; }
          .aspect-video { aspect-ratio: 16 / 9; }
          .w-full { width: 100%; }
          .h-full { height: 100%; }
          .object-cover { object-fit: cover; }
          .flex { display: flex; }
          .flex-wrap { flex-wrap: wrap; }
          .gap-2 { gap: 0.5rem; }
          .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
          .px-4 { padding-left: 1rem; padding-right: 1rem; }
          .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
          .rounded-full { border-radius: 9999px; }
          .transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
          .duration-300 { transition-duration: 300ms; }
          .hover\\:scale-105:hover { transform: scale(1.05); }
          .text-center { text-align: center; }
          
          /* Prose styles for content */
          .prose { 
            max-width: none;
            color: #374151;
            line-height: 1.7;
            font-size: 19px;
          }
          .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 { 
            color: #1f2937;
            font-weight: 600;
            margin-top: 1.5rem;
            margin-bottom: 1rem;
          }
          .prose p { 
            margin-top: 1.25rem;
            margin-bottom: 1.25rem;
          }
          .prose a { 
            color: #2563eb;
            text-decoration: none;
            font-weight: 500;
          }
          .prose a:hover { 
            color: #1d4ed8;
            text-decoration: underline;
          }
          .prose img { 
            max-width: 100%;
            height: auto;
            border-radius: 0.75rem;
            margin: 1.5rem 0;
          }
          .prose strong { 
            font-weight: 700;
            color: #1f2937;
          }
          .prose ul, .prose ol { 
            margin: 1.25rem 0;
            padding-left: 1.75rem;
          }
          .prose li { 
            margin: 0.5rem 0;
          }
        `}</style>
        {/* Basic Meta Tags */}
        <title>{post.meta_title || `${post.title} | Fasho Blog`}</title>
        <meta name="description" content={post.meta_description || post.excerpt || post.content.substring(0, 160)} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href={`https://fasho.co/blog/${post.slug}`} />
        
        {/* Keywords */}
        {post.target_keyword && (
          <meta name="keywords" content={`${post.target_keyword}, ${post.tags?.join(', ')}`} />
        )}
        
        {/* Open Graph - Facebook & LinkedIn */}
        <meta property="og:title" content={post.open_graph_title || post.meta_title || post.title} />
        <meta property="og:description" content={post.open_graph_description || post.meta_description || post.excerpt || post.content.substring(0, 160)} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://fasho.co/blog/${post.slug}`} />
        <meta property="og:site_name" content="Fasho" />
        <meta property="og:locale" content="en_US" />
        
        {/* OpenGraph Image with required dimensions */}
        {(post.open_graph_image || post.featured_image_url) ? (
          <>
            <meta property="og:image" content={post.open_graph_image || post.featured_image_url} />
            <meta property="og:image:secure_url" content={post.open_graph_image || post.featured_image_url} />
            <meta property="og:image:type" content="image/jpeg" />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:alt" content={post.title} />
          </>
        ) : (
          <>
            <meta property="og:image" content="https://fasho.co/fasho-logo-wide.png" />
            <meta property="og:image:secure_url" content="https://fasho.co/fasho-logo-wide.png" />
            <meta property="og:image:type" content="image/png" />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:alt" content={`${post.title} - Fasho Blog`} />
          </>
        )}
        
        {/* Article-specific OpenGraph */}
        <meta property="article:author" content={post.author_name} />
        <meta property="article:published_time" content={post.published_at || post.created_at} />
        <meta property="article:modified_time" content={post.updated_at} />
        <meta property="article:section" content="Blog" />
        {post.tags?.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
        
        {/* Additional OpenGraph for better sharing */}
        <meta property="og:updated_time" content={post.updated_at} />
        <meta property="og:see_also" content="https://fasho.co/blog" />
        
        {/* Twitter Card - Enhanced */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fasho" />
        <meta name="twitter:creator" content="@fasho" />
        <meta name="twitter:title" content={post.twitter_title || post.meta_title || post.title} />
        <meta name="twitter:description" content={post.twitter_description || post.meta_description || post.excerpt || post.content.substring(0, 200)} />
        
        {/* Twitter Image with proper dimensions */}
        {(post.twitter_image || post.featured_image_url) ? (
          <>
            <meta name="twitter:image" content={post.twitter_image || post.featured_image_url} />
            <meta name="twitter:image:alt" content={post.title} />
            <meta name="twitter:image:width" content="1200" />
            <meta name="twitter:image:height" content="630" />
          </>
        ) : (
          <>
            <meta name="twitter:image" content="https://fasho.co/fasho-logo-wide.png" />
            <meta name="twitter:image:alt" content={`${post.title} - Fasho Blog`} />
            <meta name="twitter:image:width" content="1200" />
            <meta name="twitter:image:height" content="630" />
          </>
        )}
        
        {/* Twitter domain verification and additional meta */}
        <meta name="twitter:domain" content="fasho.co" />
        <meta name="twitter:url" content={`https://fasho.co/blog/${post.slug}`} />
        
        {/* Advanced Structured Data - Article, Breadcrumbs, Organization, Website */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: advancedSchemaMarkup }}
        />
        
        {/* Additional Performance and SEO Tags */}
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="author" content={post.author_name} />
        <meta name="article:author" content={post.author_name} />
        <meta name="article:published_time" content={post.published_at || post.created_at} />
        <meta name="article:modified_time" content={post.updated_at} />
        <meta name="article:section" content="Technology" />
        <meta name="news_keywords" content={post.target_keyword || post.tags?.slice(0, 5).join(', ')} />
        
        {/* DNS Prefetch for Performance */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Theme Color */}
        <meta name="theme-color" content="#2563eb" />
        
        {/* Google Fonts - Inter and Inter Tight */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Inter+Tight:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div 
        className="min-h-screen bg-gradient-to-br from-[#0f0f23] via-[#1a1a2e] to-[#16213e]" 
        style={{ 
          zIndex: 1,
          minHeight: '100vh',
          background: 'linear-gradient(to bottom right, #0f0f23, #1a1a2e, #16213e)',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        }}
      >
        {/* Blog Header */}
        <div style={{ zIndex: 9999 }}>
          <style jsx global>{`
            /* FORCE HEADER STYLES - Production Fix */
            header {
              position: fixed !important;
              width: 100% !important;
              top: 0 !important;
              z-index: 9998 !important;
              transition: all 0.3s !important;
              background-color: rgba(24, 25, 42, 0.95) !important;
              backdrop-filter: blur(8px) !important;
              border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
            }
            header .container {
              max-width: 1200px !important;
              margin: 0 auto !important;
              padding: 0.5rem 1rem !important;
            }
            header .flex {
              display: flex !important;
              align-items: center !important;
              justify-content: space-between !important;
              height: 4rem !important;
            }
            header nav {
              display: flex !important;
              align-items: center !important;
              gap: 0.5rem !important;
            }
            header nav a {
              color: white !important;
              font-weight: 500 !important;
              padding: 0.5rem 1rem !important;
              border-radius: 0.5rem !important;
              transition: all 0.3s !important;
              text-decoration: none !important;
            }
            header nav a:hover {
              color: #59e3a5 !important;
              background-color: rgba(255, 255, 255, 0.05) !important;
              transform: scale(1.05) !important;
            }
            header img {
              height: 2rem !important;
              width: auto !important;
            }
            header button {
              background: linear-gradient(to right, #8b5cf6, #6366f1) !important;
              color: white !important;
              font-weight: bold !important;
              padding: 0.5rem 0.75rem !important;
              border-radius: 0.5rem !important;
              border: none !important;
              cursor: pointer !important;
              transition: all 0.3s !important;
            }
            header button:hover {
              opacity: 0.9 !important;
              transform: scale(1.05) !important;
            }
            /* Mobile Menu */
            header .md\\:hidden {
              display: block !important;
            }
            @media (min-width: 768px) {
              header .md\\:hidden {
                display: none !important;
              }
              header .hidden {
                display: flex !important;
              }
            }
          `}</style>
          <BlogHeader />
        </div>

        <main className="pt-16" style={{ paddingTop: '4rem', zIndex: 2 }}>
          {/* Breadcrumb */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-6" style={{ zIndex: 2 }}>
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2 text-xs text-white/80">
                <li>
                  <Link href="/" className="hover:text-white transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <span className="text-white/60">/</span>
                </li>
                <li>
                  <Link href="/blog" className="hover:text-white transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <span className="text-white/60">/</span>
                </li>
                <li className="text-white/60 truncate max-w-xs">{post.title}</li>
              </ol>
            </nav>
          </div>

          {/* Article */}
          <article className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 relative" style={{ zIndex: 10 }}>
            {/* BIG GRADIENT GLOW - positioned to be visible around container */}
            <div 
              className="absolute -inset-16 rounded-3xl pointer-events-none" 
              style={{
                background: 'radial-gradient(ellipse 140% 140% at center, rgba(89, 227, 165, 0.4), rgba(20, 192, 255, 0.35), rgba(139, 92, 246, 0.25), rgba(59, 130, 246, 0.15), transparent 70%)',
                filter: 'blur(80px)',
                zIndex: 9
              }}
            ></div>
            
            <div className="relative">
              <div 
                className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200/40 relative" 
                style={{ 
                  zIndex: 12,
                  backgroundColor: '#ffffff',
                  borderRadius: '1rem',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                  overflow: 'hidden',
                  border: '1px solid rgba(229, 231, 235, 0.4)',
                  position: 'relative'
                }} 
                suppressHydrationWarning={true}
              >
              {/* Featured Image */}
              {post.featured_image_url && (
                <div className="aspect-video relative overflow-hidden">
                  <img
                    src={post.featured_image_url}
                    alt={post.title}
                    className="w-full h-full object-cover"
                    style={{ zIndex: 13 }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
              )}

              {/* Content */}
              <div 
                className="p-8 lg:p-12" 
                style={{ 
                  padding: '3rem',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                }}
              >
                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {post.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/blog?tag=${encodeURIComponent(tag)}`}
                        className="text-sm bg-gradient-to-r from-[#59e3a5]/20 to-[#14c0ff]/20 text-[#059669] px-4 py-2 rounded-full hover:from-[#59e3a5]/30 hover:to-[#14c0ff]/30 transition-all duration-300 border border-[#59e3a5]/40"
                        style={{ zIndex: 13 }}
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Title */}
                <h1 
                  className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight" 
                  style={{ 
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: '3rem',
                    fontWeight: '700',
                    color: '#111827',
                    marginBottom: '1.5rem',
                    lineHeight: '1.25'
                  }}
                >
                  {post.title}
                </h1>

                {/* Meta (without author and views) */}
                <div className="flex items-center border-b border-gray-200 pb-6 mb-8 text-sm text-gray-600">
                  <div className="flex items-center space-x-4">
                    <time dateTime={post.published_at || post.created_at} className="font-medium">
                      {formatDate(post.published_at || post.created_at)}
                    </time>
                    <span>•</span>
                    <span>{getReadTime(post.read_time)}</span>
                  </div>
                </div>

                {/* Article Content */}
                <div 
                  className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-[#059669] prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-code:text-[#0ea5e9] prose-blockquote:border-l-[#059669] prose-blockquote:text-gray-600"
                  dangerouslySetInnerHTML={{ __html: post.html_content }}
                  style={{ 
                    zIndex: 13,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '19px',
                    lineHeight: '1.7',
                    maxWidth: 'none',
                    color: '#374151'
                  }}
                />
              
              {/* Enhanced Styling for Blog Content */}
              <style jsx global>{`
                .prose h1 {
                  font-family: 'Inter Tight', sans-serif !important;
                  font-size: 2.5rem !important;
                  font-weight: 700 !important;
                  color: #1f2937 !important;
                  margin: 2rem 0 1.5rem 0 !important;
                  line-height: 1.2 !important;
                  border-bottom: none !important;
                }
                .prose h2 {
                  font-family: 'Inter Tight', sans-serif !important;
                  font-size: 2rem !important;
                  font-weight: 600 !important;
                  color: #1f2937 !important;
                  margin: 1.75rem 0 1rem 0 !important;
                  line-height: 1.3 !important;
                  border-bottom: none !important;
                }
                .prose h3 {
                  font-family: 'Inter Tight', sans-serif !important;
                  font-size: 1.75rem !important;
                  font-weight: 600 !important;
                  color: #1f2937 !important;
                  margin: 1.5rem 0 0.75rem 0 !important;
                  line-height: 1.4 !important;
                }
                .prose h4 {
                  font-family: 'Inter Tight', sans-serif !important;
                  font-size: 1.5rem !important;
                  font-weight: 600 !important;
                  color: #1f2937 !important;
                  margin: 1.25rem 0 0.5rem 0 !important;
                  line-height: 1.4 !important;
                }
                .prose h5 {
                  font-family: 'Inter Tight', sans-serif !important;
                  font-size: 1.25rem !important;
                  font-weight: 600 !important;
                  color: #1f2937 !important;
                  margin: 1rem 0 0.5rem 0 !important;
                  line-height: 1.4 !important;
                }
                .prose h6 {
                  font-family: 'Inter Tight', sans-serif !important;
                  font-size: 1.125rem !important;
                  font-weight: 600 !important;
                  color: #1f2937 !important;
                  margin: 1rem 0 0.5rem 0 !important;
                  line-height: 1.4 !important;
                }
                .prose strong {
                  font-weight: 700 !important;
                  color: #1f2937 !important;
                }
                .prose em {
                  font-style: italic !important;
                }
                .prose u {
                  text-decoration: underline !important;
                }
                .prose s {
                  text-decoration: line-through !important;
                }
                .prose blockquote {
                  border-left: 4px solid #3b82f6 !important;
                  padding-left: 1.5rem !important;
                  margin: 1.5rem 0 !important;
                  font-style: italic !important;
                  color: #6b7280 !important;
                  background-color: #f9fafb !important;
                  padding: 1rem 1.5rem !important;
                  border-radius: 0.5rem !important;
                }
                .prose code {
                  background-color: #f3f4f6 !important;
                  padding: 0.125rem 0.375rem !important;
                  border-radius: 0.375rem !important;
                  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
                  font-size: 0.875rem !important;
                  color: #e11d48 !important;
                }
                .prose pre {
                  background-color: #1f2937 !important;
                  color: #f9fafb !important;
                  padding: 1.5rem !important;
                  border-radius: 0.75rem !important;
                  overflow-x: auto !important;
                  margin: 1.5rem 0 !important;
                  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
                }
                .prose pre code {
                  background-color: transparent !important;
                  padding: 0 !important;
                  color: inherit !important;
                  font-size: 0.875rem !important;
                }
                .prose ul, .prose ol {
                  margin: 1.25rem 0 !important;
                  padding-left: 1.75rem !important;
                }
                .prose p {
                  font-family: 'Inter', sans-serif !important;
                  font-size: 19px !important;
                  margin: 1.25rem 0 !important;
                  line-height: 1.7 !important;
                  color: #374151 !important;
                }
                .prose li {
                  font-family: 'Inter', sans-serif !important;
                  font-size: 19px !important;
                  margin: 0.5rem 0 !important;
                  line-height: 1.7 !important;
                }
                .prose img {
                  max-width: 100% !important;
                  height: auto !important;
                  border-radius: 0.75rem !important;
                  margin: 1.5rem 0 !important;
                  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
                }
                .prose a {
                  color: #2563eb !important;
                  text-decoration: none !important;
                  font-weight: 500 !important;
                  transition: color 0.2s ease !important;
                }
                .prose a:hover {
                  color: #1d4ed8 !important;
                  text-decoration: underline !important;
                }
                .prose table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                  margin: 1.5rem 0 !important;
                  background-color: white !important;
                  border-radius: 0.5rem !important;
                  overflow: hidden !important;
                  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1) !important;
                }
                .prose th {
                  background-color: #f9fafb !important;
                  padding: 0.75rem 1rem !important;
                  text-align: left !important;
                  font-weight: 600 !important;
                  color: #1f2937 !important;
                  border-bottom: 1px solid #e5e7eb !important;
                }
                .prose td {
                  padding: 0.75rem 1rem !important;
                  border-bottom: 1px solid #f3f4f6 !important;
                  color: #374151 !important;
                }
                .prose hr {
                  border: none !important;
                  height: 1px !important;
                  background-color: #e5e7eb !important;
                  margin: 2rem 0 !important;
                }
              `}</style>

                {/* Share Buttons */}
                <div className="border-t border-gray-200 pt-8 mt-12">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Share this article</h3>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://fasho.co/blog/${post.slug}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gradient-to-r from-[#1da1f2] to-[#1a8cd8] hover:from-[#1a8cd8] hover:to-[#1976d2] text-white px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 shadow-lg"
                      style={{ zIndex: 13 }}
                    >
                      Share on Twitter
                    </a>
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://fasho.co/blog/${post.slug}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gradient-to-r from-[#4267B2] to-[#365899] hover:from-[#365899] hover:to-[#2d4373] text-white px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 shadow-lg"
                      style={{ zIndex: 13 }}
                    >
                      Share on Facebook
                    </a>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://fasho.co/blog/${post.slug}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gradient-to-r from-[#0077b5] to-[#005885] hover:from-[#005885] hover:to-[#004471] text-white px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 shadow-lg"
                      style={{ zIndex: 13 }}
                    >
                      Share on LinkedIn
                    </a>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </article>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" style={{ zIndex: 2 }}>
              <h2 className="text-3xl font-bold text-white mb-12 text-center">Related Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {relatedPosts.map((relatedPost) => (
                  <article 
                    key={relatedPost.id}
                    className="bg-white rounded-2xl shadow-xl overflow-hidden hover:scale-105 transition-all duration-300 border border-gray-200/40"
                    style={{ zIndex: 3 }}
                    suppressHydrationWarning={true}
                  >
                    {relatedPost.featured_image_url && (
                      <div className="aspect-video relative overflow-hidden">
                        <img
                          src={relatedPost.featured_image_url}
                          alt={relatedPost.title}
                          className="w-full h-full object-cover"
                          style={{ zIndex: 4 }}
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2 leading-tight">
                        <Link 
                          href={`/blog/${relatedPost.slug}`}
                          className="hover:text-[#059669] transition-colors"
                          style={{ zIndex: 4 }}
                        >
                          {relatedPost.title}
                        </Link>
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
                        {relatedPost.excerpt || relatedPost.content.substring(0, 120) + '...'}
                      </p>
                      <div className="text-sm text-gray-500 font-medium">
                        {formatDate(relatedPost.published_at || relatedPost.created_at)}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Back to Blog */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16" style={{ zIndex: 2 }}>
            <Link
              href="/blog"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-[#59e3a5]/20 to-[#14c0ff]/20 hover:from-[#59e3a5]/30 hover:to-[#14c0ff]/30 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 border border-[#59e3a5]/30 hover:scale-105"
              style={{ zIndex: 3 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Blog</span>
            </Link>
          </div>
        </main>

        {/* Footer */}
        <div style={{ zIndex: 100 }}>
          <style jsx global>{`
            /* FORCE FOOTER STYLES - Production Fix */
            footer {
              background: linear-gradient(to bottom, #0a0a13, #000000) !important;
              border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
              padding: 3rem 1rem !important;
            }
            footer .max-w-6xl {
              max-width: 72rem !important;
              margin: 0 auto !important;
            }
            footer .grid {
              display: grid !important;
              gap: 2rem !important;
            }
            footer .grid-cols-1 {
              grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
            }
            @media (min-width: 768px) {
              footer .md\\:grid-cols-4 {
                grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
              }
            }
            footer h4 {
              color: white !important;
              font-weight: 600 !important;
              margin-bottom: 1rem !important;
              font-size: 1rem !important;
            }
            footer ul {
              list-style: none !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            footer li {
              margin-bottom: 0.5rem !important;
            }
            footer a {
              color: #9ca3af !important;
              text-decoration: none !important;
              font-size: 0.875rem !important;
              transition: color 0.2s !important;
            }
            footer a:hover {
              color: #59e3a5 !important;
            }
            footer p {
              color: #9ca3af !important;
              font-size: 0.875rem !important;
              line-height: 1.6 !important;
              margin: 0 !important;
            }
            footer img {
              height: 2rem !important;
              width: auto !important;
              margin-bottom: 1rem !important;
            }
            footer .border-t {
              border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
              margin-top: 2rem !important;
              padding-top: 1.5rem !important;
            }
            footer .text-center {
              text-align: center !important;
            }
            footer .text-gray-500 {
              color: #6b7280 !important;
            }
          `}</style>
          <Footer />
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.params!;

  if (!slug || typeof slug !== 'string') {
    return {
      notFound: true
    };
  }

  try {
    const supabase = getBlogSupabaseClient();

    // Get the blog post
    const { data: post, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        categories:blog_post_categories(
          category:blog_categories(*)
        )
      `)
      .eq('slug', slug)
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
      .single();

    if (error || !post) {
      return {
        notFound: true
      };
    }

    // Get related posts (same tags, excluding current post)
    let relatedQuery = supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, content, featured_image_url, published_at, created_at')
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
      .neq('id', post.id)
      .limit(3);

    // If post has tags, find posts with similar tags
    if (post.tags && post.tags.length > 0) {
      relatedQuery = relatedQuery.overlaps('tags', post.tags);
    }

    const { data: relatedPosts } = await relatedQuery
      .order('published_at', { ascending: false });

    return {
      props: {
        post,
        relatedPosts: relatedPosts || []
      }
    };

  } catch (error) {
    console.error('Error in blog post page getServerSideProps:', error);
    
    return {
      props: {
        post: null,
        relatedPosts: [],
        error: 'Failed to load post'
      }
    };
  }
};
