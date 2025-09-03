// Individual Blog Post Page
// Public page for displaying single blog post with full SEO optimization

import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getBlogSupabaseClient } from '../../../plugins/blog/utils/supabase';
import { BlogPost } from '../../../plugins/blog/types/blog';
import { schemaGenerator } from '../../../plugins/blog/utils/schema-generator';
import PerformanceOptimizer, { WebVitalsTracker } from '../../../plugins/blog/utils/performance-optimizer';
import BlogHeader from '../../components/BlogHeader';
import Footer from '../../components/Footer';

interface BlogPostPageProps {
  post: BlogPost;
  trendingPosts: BlogPost[];
  latestPosts: BlogPost[];
  error?: string;
}

// Latest Posts Carousel Component
const LatestPostsCarousel = ({ latestPosts, formatDate, getReadTime }: { latestPosts: BlogPost[], formatDate: (date: string) => string, getReadTime: (time?: number) => string }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const maxSlides = Math.max(0, latestPosts.length - 3); // Show 3 at a time, so max slides = total - 3
  
  const nextSlide = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, maxSlides));
  };
  
  const prevSlide = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };
  
  return (
    <div className="mt-12 pt-8 border-t border-gray-200" style={{ zIndex: 4 }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-900">Latest Posts</h3>
        <div className="flex gap-2">
          <button
            onClick={prevSlide}
            disabled={currentIndex === 0}
            className={`p-2 rounded-full text-white transition-opacity ${
              currentIndex === 0 
                ? 'bg-gray-500 opacity-50 cursor-not-allowed' 
                : 'bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] hover:opacity-90'
            }`}
            style={{ zIndex: 5 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={nextSlide}
            disabled={currentIndex >= maxSlides}
            className={`p-2 rounded-full text-white transition-opacity ${
              currentIndex >= maxSlides 
                ? 'bg-gray-500 opacity-50 cursor-not-allowed' 
                : 'bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] hover:opacity-90'
            }`}
            style={{ zIndex: 5 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      <div className="relative overflow-hidden">
        <div 
          className="flex transition-transform duration-300 ease-in-out gap-6"
          style={{ transform: `translateX(-${currentIndex * (100 / 3)}%)` }}
        >
          {latestPosts.map((latestPost) => (
            <article
              key={latestPost.id}
              className="flex-shrink-0 w-1/3 bg-white rounded-2xl shadow-xl overflow-hidden hover:scale-105 transition-all duration-300 border border-gray-200 hover:border-[#59e3a5]/50 hover:shadow-2xl hover:shadow-[#59e3a5]/20"
              style={{ zIndex: 5 }}
            >
              <Link href={`/blog/${latestPost.slug}`} className="block">
                {latestPost.featured_image_url && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={latestPost.featured_image_url}
                      alt={latestPost.title}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-[#59e3a5] transition-colors">
                    {latestPost.title}
                  </h4>
                  {latestPost.excerpt && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {latestPost.excerpt}
                    </p>
                  )}
                  <div className="flex items-center text-xs text-gray-500">
                    <time dateTime={latestPost.published_at || latestPost.created_at}>
                      {formatDate(latestPost.published_at || latestPost.created_at)}
                    </time>
                    <span className="mx-2">•</span>
                    <span>{getReadTime(latestPost.read_time)}</span>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function BlogPostPage({ post, trendingPosts, latestPosts, error }: BlogPostPageProps) {
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
        
        {/* Article-specific Open Graph */}
        <meta property="article:published_time" content={post.published_at || post.created_at} />
        {post.tags && post.tags.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
        
        {/* Open Graph Image */}
        {post.featured_image_url ? (
          <>
            <meta property="og:image" content={post.featured_image_url} />
            <meta property="og:image:secure_url" content={post.featured_image_url} />
            <meta property="og:image:type" content="image/jpeg" />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:alt" content={`${post.title} - Fasho Blog`} />
          </>
        ) : (
          <>
            <meta property="og:image" content="https://fasho.co/fasho-logo-wide.png" />
            <meta property="og:image:secure_url" content="https://fasho.co/fasho-logo-wide.png" />
            <meta property="og:image:type" content="image/png" />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:alt" content="Fasho - Music Marketing Platform" />
          </>
        )}
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fasho" />
        <meta name="twitter:title" content={post.twitter_title || post.meta_title || post.title} />
        <meta name="twitter:description" content={post.twitter_description || post.meta_description || post.excerpt || post.content.substring(0, 160)} />
        
        {/* Twitter Image */}
        {post.featured_image_url ? (
          <>
            <meta name="twitter:image" content={post.featured_image_url} />
            <meta name="twitter:image:alt" content={`${post.title} - Fasho Blog`} />
            <meta name="twitter:image:width" content="1200" />
            <meta name="twitter:image:height" content="630" />
          </>
        ) : (
          <>
            <meta name="twitter:image" content="https://fasho.co/fasho-logo-wide.png" />
            <meta name="twitter:image:alt" content="Fasho - Music Marketing Platform" />
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
        
        {/* Performance and SEO optimizations */}
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
          <BlogHeader />
        </div>

        <main className="pt-16" style={{ paddingTop: '4rem', zIndex: 2 }}>
          {/* Breadcrumb - positioned above featured image */}
          <div className="max-w-[90vw] mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-12" style={{ zIndex: 2 }}>
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2 text-sm text-white/70">
                <li>
                  <Link href="/" className="hover:text-white/90 transition-colors text-xs">
                    Home
                  </Link>
                </li>
                <li>
                  <span className="mx-2">/</span>
                </li>
                <li>
                  <Link href="/blog" className="hover:text-white/90 transition-colors text-xs">
                    Blog
                  </Link>
                </li>
                <li>
                  <span className="mx-2">/</span>
                </li>
                <li className="text-white/50 text-xs truncate max-w-xs">
                  {post.title}
                </li>
              </ol>
            </nav>
          </div>

          {/* Featured Image with Overlay */}
              {post.featured_image_url && (
            <div className="max-w-[90vw] mx-auto px-4 sm:px-6 lg:px-8 mb-8" style={{ zIndex: 2 }}>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl h-64 md:h-96 border border-[#1db954]/30 shadow-[0_0_20px_rgba(29,185,84,0.3)]" style={{ zIndex: 3 }}>
                  <img
                    src={post.featured_image_url}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  style={{ zIndex: 4 }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" style={{ zIndex: 5 }}></div>
                
                {/* Overlay Content */}
                <div className="absolute inset-0 flex items-end" style={{ zIndex: 6 }}>
                  <div className="p-8 md:p-12 w-full">
                    <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight max-w-[80%]" style={{ zIndex: 7 }}>
                      {post.title}
                    </h1>
                    
                    {/* Article Meta */}
                    <div className="flex flex-wrap items-center gap-4 mb-4 text-white/90" style={{ zIndex: 7 }}>
                      <time dateTime={post.published_at || post.created_at} className="text-sm">
                        {formatDate(post.published_at || post.created_at)}
                      </time>
                      <span className="text-white/60">•</span>
                      <span className="text-sm">{getReadTime(post.read_time)}</span>
                </div>

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2" style={{ zIndex: 7 }}>
                    {post.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/blog?tag=${encodeURIComponent(tag)}`}
                            className="text-xs bg-gradient-to-r from-[#59e3a5]/20 to-[#14c0ff]/20 text-[#59e3a5] px-3 py-1 rounded-full hover:from-[#59e3a5]/30 hover:to-[#14c0ff]/30 transition-all duration-300 border border-[#59e3a5]/40"
                            style={{ zIndex: 8 }}
                      >
                            {tag}
                      </Link>
                    ))}
                  </div>
                )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Grid - 2 Column Layout */}
          <div className="max-w-[90vw] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
              {/* Main Article Content - 70% */}
              <article className="lg:col-span-7 bg-white rounded-2xl shadow-2xl p-8 lg:p-12" style={{ zIndex: 3 }}>

                {/* Article Content */}
                <div 
                  className="prose prose-lg max-w-none blog-content" 
                  style={{ zIndex: 4 }}
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />

              <style jsx global>{`
                  .blog-content p {
                    margin-bottom: 1.5em !important;
                    margin-top: 0 !important;
                  }
                  .blog-content p:last-child {
                    margin-bottom: 0 !important;
                  }
                  .blog-content h1, .blog-content h2, .blog-content h3, .blog-content h4, .blog-content h5, .blog-content h6 {
                    margin-top: 2em !important;
                    margin-bottom: 1em !important;
                  }
                  .blog-content h1:first-child, .blog-content h2:first-child, .blog-content h3:first-child, .blog-content h4:first-child, .blog-content h5:first-child, .blog-content h6:first-child {
                    margin-top: 0 !important;
                  }
                  .blog-content ul, .blog-content ol {
                    margin-bottom: 1.5em !important;
                  }
                  .blog-content blockquote {
                    margin: 2em 0 !important;
                  }
                  .blog-content br {
                    margin-bottom: 1em !important;
                }
                .prose p {
                    margin-bottom: 1.5em !important;
                }
              `}</style>

                {/* Share Buttons */}
                <div className="mt-12 pt-8 border-t border-gray-200" style={{ zIndex: 4 }}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Share this article</h3>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://fasho.co/blog/${post.slug}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gradient-to-r from-[#1da1f2] to-[#1a8cd8] hover:from-[#1a8cd8] hover:to-[#1976d2] text-white px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 shadow-lg"
                      style={{ zIndex: 5 }}
                    >
                      Share on Twitter
                    </a>
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://fasho.co/blog/${post.slug}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gradient-to-r from-[#4267B2] to-[#365899] hover:from-[#365899] hover:to-[#2d4373] text-white px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 shadow-lg"
                      style={{ zIndex: 5 }}
                    >
                      Share on Facebook
                    </a>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://fasho.co/blog/${post.slug}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gradient-to-r from-[#0077b5] to-[#005885] hover:from-[#005885] hover:to-[#004471] text-white px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 shadow-lg"
                      style={{ zIndex: 5 }}
                    >
                      Share on LinkedIn
                    </a>
                  </div>
                </div>

                {/* Latest Posts Carousel Section at Bottom */}
                {latestPosts && latestPosts.length > 0 && <LatestPostsCarousel latestPosts={latestPosts} formatDate={formatDate} getReadTime={getReadTime} />}
          </article>

              {/* Trending Posts Sidebar - 30% */}
              <aside className="lg:col-span-3 hidden lg:block">
                <div className="sticky top-24" style={{ zIndex: 9990 }}>
                  <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-700/50 p-6" style={{ zIndex: 9991 }}>
                    <h2 className="text-xl font-bold text-white mb-6">Trending Posts</h2>
                    <div className="space-y-4">
                      {trendingPosts && trendingPosts.length > 0 ? (
                        trendingPosts.map((trendingPost) => (
                          <div
                            key={trendingPost.id}
                            className="group border-b border-gray-600/30 pb-4 last:border-b-0 last:pb-0"
                            style={{ zIndex: 9992 }}
                          >
                            <Link href={`/blog/${trendingPost.slug}`} className="block">
                              <div className="flex gap-3">
                                {trendingPost.featured_image_url && (
                                  <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden">
                                    <img
                                      src={trendingPost.featured_image_url}
                                      alt={trendingPost.title}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                    )}
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-medium text-white group-hover:text-[#59e3a5] transition-colors line-clamp-2 mb-1">
                                    {trendingPost.title}
                      </h3>
                                  <p className="text-xs text-gray-300">
                                    {formatDate(trendingPost.published_at || trendingPost.created_at)}
                      </p>
                                </div>
                              </div>
                            </Link>
                      </div>
                        ))
                      ) : (
                        <p className="text-gray-300 text-sm">No trending posts found.</p>
                      )}
                    </div>
                  </div>
                </div>
              </aside>
              </div>
          </div>
        </main>

        {/* Footer */}
        <div style={{ zIndex: 2 }}>
          <Footer />
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  try {
    const { slug } = params!;
    const supabase = getBlogSupabaseClient();

    // Fetch the blog post
    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
      .single();

    if (postError || !post) {
      console.error('Post not found:', postError);
      return {
        props: {
          post: null,
          trendingPosts: [],
          latestPosts: [],
          error: 'Post not found'
        }
      };
    }

    // Get 5 Random Posts for Sidebar (Trending Posts)
    console.log('📈 TRENDING POSTS: Fetching 5 random posts for sidebar');
    const { data: trendingPosts, error: trendingError } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, featured_image_url, published_at, created_at, read_time')
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
      .neq('id', post.id)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('📈 TRENDING POSTS: Found', trendingPosts?.length || 0, 'posts');
    if (trendingError) console.error('📈 TRENDING POSTS: Error:', trendingError);

    // Get Latest 9 Posts for Bottom Carousel
    console.log('🔄 LATEST POSTS: Fetching 9 latest posts for carousel');
    const { data: latestPosts, error: latestError } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, featured_image_url, published_at, created_at, read_time')
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
      .neq('id', post.id)
      .order('published_at', { ascending: false })
      .limit(9);

    console.log('🔄 LATEST POSTS: Found', latestPosts?.length || 0, 'latest posts');
    if (latestError) console.error('🔄 LATEST POSTS: Error:', latestError);

    return {
      props: {
        post,
        trendingPosts: trendingPosts || [],
        latestPosts: latestPosts || []
      }
    };
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return {
      props: {
        post: null,
        trendingPosts: [],
        latestPosts: [],
        error: 'Failed to load post'
      }
    };
  }
};