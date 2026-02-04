// Individual Blog Post Page
// Public page for displaying single blog post with full SEO optimization
// Integrates Sanity CMS (primary) with legacy Supabase fallback

import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import { getBlogSupabaseClient } from '../../../plugins/blog/utils/supabase';
import { BlogPost } from '../../../plugins/blog/types/blog';
import { schemaGenerator } from '../../../plugins/blog/utils/schema-generator';
import PerformanceOptimizer, { WebVitalsTracker } from '../../../plugins/blog/utils/performance-optimizer';
import BlogHeader from '../../components/BlogHeader';
import Footer from '../../components/Footer';
import PortableTextRenderer from '../../components/PortableTextRenderer';
import { resolvePostBySlug, getRelatedPosts, isSanityConfigured, urlFor } from '../../lib/sanity';
import type { SanityBlogPost } from '../../lib/sanity/types';
import { UnifiedBlogPost, sanityToUnified, legacyToUnified } from '../../lib/sanity/unified-types';

interface BlogPostPageProps {
  post: UnifiedBlogPost | null;
  sanityPost?: SanityBlogPost | null;
  relatedPosts: UnifiedBlogPost[];
  error?: string;
  source: 'sanity' | 'legacy' | null;
}

export default function BlogPostPage({ post, sanityPost, relatedPosts, error, source }: BlogPostPageProps) {
  // Performance and analytics initialization
  useEffect(() => {
    // Initialize performance optimizations
    PerformanceOptimizer.initializeAll();
    
    // Track Core Web Vitals
    WebVitalsTracker.trackCoreWebVitals();
    
    // Track page view (for legacy posts)
    if (post?.id && source === 'legacy') {
      fetch(`/api/blog/posts/${post.id}/view`, { method: 'POST' })
        .catch(err => console.error('Failed to track view:', err));
    }
  }, [post?.id, source]);

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
  
  // Build schema manually for Sanity posts since they use different structure
  const generatePostSchema = () => {
    const postSchema = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": post.metaTitle || post.title,
      "description": post.metaDescription || post.excerpt,
      "url": fullUrl,
      "datePublished": post.publishedAt,
      "dateModified": post.updatedAt || post.publishedAt,
      "author": {
        "@type": "Person",
        "name": post.authorName || "Fasho Team"
      },
      "publisher": schemaGenerator.generateOrganizationSchema(),
      "image": post.ogImage || post.coverImageUrl,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": fullUrl
      }
    };

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://fasho.co"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Blog",
          "item": "https://fasho.co/blog"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": post.title,
          "item": fullUrl
        }
      ]
    };

    return JSON.stringify([postSchema, breadcrumbSchema, schemaGenerator.generateOrganizationSchema()], null, 2);
  };

  return (
    <>
      <Head>
        {/* Basic Meta Tags */}
        <title>{post.metaTitle || `${post.title} | Fasho Blog`}</title>
        <meta name="description" content={post.metaDescription || post.excerpt || (post.content ? post.content.substring(0, 160) : '')} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Canonical URL */}
        <link rel="canonical" href={post.canonicalUrl || fullUrl} />
        
        {/* Noindex if specified */}
        {post.noindex && <meta name="robots" content="noindex, follow" />}
        
        {/* Keywords from tags */}
        {post.tags && post.tags.length > 0 && (
          <meta name="keywords" content={post.tags.join(', ')} />
        )}
        
        {/* Open Graph - Facebook & LinkedIn */}
        <meta property="og:title" content={post.metaTitle || post.title} />
        <meta property="og:description" content={post.metaDescription || post.excerpt || ''} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={fullUrl} />
        <meta property="og:site_name" content="Fasho" />
        <meta property="og:locale" content="en_US" />
        
        {/* Article-specific Open Graph */}
        <meta property="article:published_time" content={post.publishedAt} />
        {post.updatedAt && <meta property="article:modified_time" content={post.updatedAt} />}
        {post.tags && post.tags.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
        
        {/* Open Graph Image */}
        <meta property="og:image" content={post.ogImage || post.coverImageUrl || 'https://fasho.co/fasho-logo-wide.png'} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={`${post.title} - Fasho Blog`} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fasho" />
        <meta name="twitter:title" content={post.metaTitle || post.title} />
        <meta name="twitter:description" content={post.metaDescription || post.excerpt || ''} />
        <meta name="twitter:image" content={post.ogImage || post.coverImageUrl || 'https://fasho.co/fasho-logo-wide.png'} />
        <meta name="twitter:image:alt" content={`${post.title} - Fasho Blog`} />
        <meta name="twitter:domain" content="fasho.co" />
        <meta name="twitter:url" content={fullUrl} />
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: generatePostSchema() }}
        />
        
        {/* Performance and SEO optimizations */}
        <link rel="dns-prefetch" href="//cdn.sanity.io" />
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.sanity.io" crossOrigin="anonymous" />
        
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
          {post.coverImageUrl && (
            <div className="max-w-[90vw] mx-auto px-4 sm:px-6 lg:px-8 mb-8" style={{ zIndex: 2 }}>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl h-64 md:h-96 border border-[#1db954]/30 shadow-[0_0_20px_rgba(29,185,84,0.3)]" style={{ zIndex: 3 }}>
                <Image
                  src={post.coverImageUrl}
                  alt={post.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="90vw"
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
                      <time dateTime={post.publishedAt} className="text-sm">
                        {formatDate(post.publishedAt)}
                      </time>
                      <span className="text-white/60">•</span>
                      <span className="text-sm">{getReadTime(post.readTime)}</span>
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
                
                {/* Article Content - Render based on source */}
                {source === 'sanity' && sanityPost?.body ? (
                  // Sanity Portable Text content
                  <PortableTextRenderer content={sanityPost.body} />
                ) : (
                  // Legacy HTML content
                  <div 
                    className="prose prose-lg max-w-none blog-content" 
                    style={{ zIndex: 4 }}
                    dangerouslySetInnerHTML={{ __html: post.content || '' }}
                  />
                )}

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
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(fullUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gradient-to-r from-[#1da1f2] to-[#1a8cd8] hover:from-[#1a8cd8] hover:to-[#1976d2] text-white px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 shadow-lg"
                      style={{ zIndex: 5 }}
                    >
                      Share on Twitter
                    </a>
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gradient-to-r from-[#4267B2] to-[#365899] hover:from-[#365899] hover:to-[#2d4373] text-white px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 shadow-lg"
                      style={{ zIndex: 5 }}
                    >
                      Share on Facebook
                    </a>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gradient-to-r from-[#0077b5] to-[#005885] hover:from-[#005885] hover:to-[#004471] text-white px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 shadow-lg"
                      style={{ zIndex: 5 }}
                    >
                      Share on LinkedIn
                    </a>
                  </div>
                </div>

                {/* Related Posts Section */}
                {relatedPosts && relatedPosts.length > 0 && (
                  <div className="mt-12 pt-8 border-t border-gray-200" style={{ zIndex: 4 }}>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">Related Posts</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {relatedPosts.slice(0, 3).map((relatedPost) => (
                        <Link
                          key={relatedPost.id}
                          href={`/blog/${relatedPost.slug}`}
                          className="group bg-gray-50 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300"
                        >
                          {relatedPost.coverImageUrl && (
                            <div className="h-32 relative overflow-hidden">
                              <Image
                                src={relatedPost.coverImageUrl}
                                alt={relatedPost.title}
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-300"
                                sizes="(max-width: 768px) 100vw, 33vw"
                              />
                            </div>
                          )}
                          <div className="p-4">
                            <h4 className="text-sm font-semibold text-gray-900 group-hover:text-[#59e3a5] transition-colors line-clamp-2">
                              {relatedPost.title}
                            </h4>
                            <p className="text-xs text-gray-500 mt-2">
                              {formatDate(relatedPost.publishedAt)}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </article>

              {/* Trending Posts Sidebar - 30% */}
              <aside className="lg:col-span-3 hidden lg:block">
                <div className="sticky top-24" style={{ zIndex: 9990 }}>
                  <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-700/50 p-6" style={{ zIndex: 9991 }}>
                    <h2 className="text-xl font-bold text-white mb-6">Trending Posts</h2>
                    <div className="space-y-4">
                      {relatedPosts && relatedPosts.length > 0 ? (
                        relatedPosts.slice(0, 5).map((trendingPost) => (
                          <div
                            key={trendingPost.id}
                            className="group border-b border-gray-600/30 pb-4 last:border-b-0 last:pb-0"
                            style={{ zIndex: 9992 }}
                          >
                            <Link href={`/blog/${trendingPost.slug}`} className="block">
                              <div className="flex gap-3">
                                {trendingPost.coverImageUrl && (
                                  <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden relative">
                                    <Image
                                      src={trendingPost.coverImageUrl}
                                      alt={trendingPost.title}
                                      fill
                                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                                      sizes="64px"
                                    />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-medium text-white group-hover:text-[#59e3a5] transition-colors line-clamp-2 mb-1">
                                    {trendingPost.title}
                                  </h3>
                                  <p className="text-xs text-gray-300">
                                    {formatDate(trendingPost.publishedAt)}
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

export const getServerSideProps: GetServerSideProps = async ({ params, res }) => {
  try {
    const { slug } = params!;
    const slugString = typeof slug === 'string' ? slug : slug?.[0] || '';
    
    console.log(`🔍 BLOG POST: Resolving slug "${slugString}"...`);
    
    // Check if Sanity is configured
    const sanityEnabled = isSanityConfigured();
    
    // Resolution order:
    // 1. Published Sanity post with exact slug (wins)
    // 2. Sanity redirectFrom match → 301 redirect
    // 3. Legacy Supabase fallback
    // 4. 404
    
    // 1. Try Sanity first (PRIMARY SOURCE)
    if (sanityEnabled) {
      try {
        console.log('📡 BLOG POST: Checking Sanity...');
        const sanityResult = await resolvePostBySlug(slugString);
        
        // 1a. Check for 301 redirect from old slug
        if (sanityResult.isRedirect && sanityResult.redirectToSlug) {
          console.log(`↪️ BLOG POST: 301 redirect from "${slugString}" to "${sanityResult.redirectToSlug}"`);
          res.setHeader('Location', `/blog/${sanityResult.redirectToSlug}`);
          res.statusCode = 301;
          res.end();
          return { props: {} };
        }
        
        // 1b. Found published Sanity post
        if (sanityResult.post) {
          console.log(`✅ BLOG POST: Found Sanity post "${sanityResult.post.title}"`);
          
          // Get related posts from Sanity
          const sanityRelated = await getRelatedPosts(sanityResult.post._id, 5);
          const relatedUnified = sanityRelated.map(sanityToUnified);
          
          const unifiedPost = sanityToUnified(sanityResult.post);
          
          return {
            props: {
              post: unifiedPost,
              sanityPost: sanityResult.post,
              relatedPosts: relatedUnified,
              source: 'sanity'
            }
          };
        }
      } catch (sanityError) {
        console.error('❌ BLOG POST: Sanity error:', sanityError);
        // Continue to legacy fallback
      }
    }
    
    // 2. Legacy Supabase fallback
    console.log('📡 BLOG POST: Checking legacy Supabase...');
    const supabase = getBlogSupabaseClient();
    
    const { data: legacyPost, error: legacyError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slugString)
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
      .single();
    
    if (legacyError || !legacyPost) {
      console.log(`❌ BLOG POST: Post not found for slug "${slugString}"`);
      return {
        props: {
          post: null,
          relatedPosts: [],
          error: 'Post not found',
          source: null
        }
      };
    }
    
    console.log(`✅ BLOG POST: Found legacy post "${legacyPost.title}"`);
    
    // Get related posts from legacy system
    const { data: legacyRelated } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, featured_image_url, published_at, created_at, read_time')
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
      .neq('id', legacyPost.id)
      .order('published_at', { ascending: false })
      .limit(5);
    
    const unifiedPost = legacyToUnified(legacyPost);
    const relatedUnified = (legacyRelated || []).map(legacyToUnified);
    
    return {
      props: {
        post: unifiedPost,
        sanityPost: null,
        relatedPosts: relatedUnified,
        source: 'legacy'
      }
    };
    
  } catch (error) {
    console.error('❌ BLOG POST: Critical error:', error);
    return {
      props: {
        post: null,
        relatedPosts: [],
        error: 'Failed to load post',
        source: null
      }
    };
  }
};
