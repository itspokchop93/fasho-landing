// Blog List Page
// Public page displaying all published blog posts with SEO optimization
// Integrates Sanity CMS (primary) with legacy Supabase fallback

import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { getBlogSupabaseClient } from '../../../plugins/blog/utils/supabase';
import { BlogPost } from '../../../plugins/blog/types/blog';
import { schemaGenerator } from '../../../plugins/blog/utils/schema-generator';
import BlogHeader from '../../components/BlogHeader';
import Footer from '../../components/Footer';
import { getPublishedPosts, getFeaturedPosts, isSanityConfigured, urlFor } from '../../lib/sanity';
import { UnifiedBlogPost, sanityToUnified, legacyToUnified, mergePostLists, sanitizeForSerialization } from '../../lib/sanity/unified-types';

interface BlogPageProps {
  posts: UnifiedBlogPost[];
  featuredPosts: UnifiedBlogPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    search?: string;
    tag?: string;
    category?: string;
  };
  sanityEnabled: boolean;
}

// Featured Hero Carousel Component
const FeaturedHeroCarousel = ({ featuredPosts }: { featuredPosts: UnifiedBlogPost[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (featuredPosts.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === featuredPosts.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [featuredPosts.length]);

  if (!featuredPosts.length) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="relative h-[70vh] overflow-hidden" style={{ zIndex: 1 }}>
      {featuredPosts.map((post, index) => (
        <div
          key={post.id}
          className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
            index === currentIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
          style={{ zIndex: index === currentIndex ? 2 : 1 }}
        >
          {/* Background Image */}
          <div className="absolute inset-0" style={{ zIndex: 1 }}>
            {post.coverImageUrl ? (
              <Image
                src={post.coverImageUrl}
                alt={post.title}
                fill
                className="object-cover"
                priority={index === 0}
                sizes="100vw"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#0a0a13] to-[#1a1a2e]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" style={{ zIndex: 2 }}></div>
          </div>

          {/* Content Overlay */}
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center" style={{ zIndex: 3 }}>
            <div className="max-w-3xl">
              <div className="mb-4">
                <span className="inline-block bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-white px-4 py-2 rounded-full text-sm font-medium" style={{ zIndex: 4 }}>
                  Featured Article
                </span>
              </div>
              <Link href={`/blog/${post.slug}`}>
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight hover:text-[#59e3a5] transition-colors cursor-pointer" style={{ zIndex: 4 }}>
                  {post.title}
                </h1>
              </Link>
              <p className="text-xl text-gray-200 mb-8 leading-relaxed" style={{ zIndex: 4 }}>
                {post.excerpt || (post.content ? post.content.substring(0, 200) + '...' : '')}
              </p>
              <div className="flex items-center space-x-6 mb-8" style={{ zIndex: 4 }}>
                <span className="text-gray-300">{formatDate(post.publishedAt)}</span>
                <span className="text-gray-300">•</span>
                <span className="text-gray-300">{post.readTime || 5} min read</span>
              </div>
              <Link
                href={`/blog/${post.slug}`}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] hover:from-[#59e3a5]/90 hover:to-[#14c0ff]/90 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-2xl"
                style={{ zIndex: 4 }}
              >
                <span>Read Full Article</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* Carousel Indicators */}
      {featuredPosts.length > 1 && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3" style={{ zIndex: 4 }}>
          {featuredPosts.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] scale-125'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              style={{ zIndex: 5 }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function BlogPage({ posts, featuredPosts, pagination, filters, sanityEnabled }: BlogPageProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calculate read time
  const getReadTime = (readTime?: number) => {
    return readTime ? `${readTime} min read` : '5 min read';
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const url = new URL(window.location.href);
    if (searchTerm) {
      url.searchParams.set('search', searchTerm);
    } else {
      url.searchParams.delete('search');
    }
    url.searchParams.delete('page'); // Reset to first page
    window.location.href = url.toString();
  };

  // Generate page title based on filters and pagination
  const generatePageTitle = () => {
    let title = "Blog | Fasho.co";
    if (filters.search) title = `Search: ${filters.search} | Blog | Fasho.co`;
    if (filters.tag) title = `Tag: ${filters.tag} | Blog | Fasho.co`;
    if (pagination.page > 1) title = `Page ${pagination.page} | ${title}`;
    return title;
  };

  // Generate meta description
  const generateMetaDescription = () => {
    let desc = "Discover insights, tips, and industry news on the Fasho blog. Stay updated with the latest in music promotion and playlist marketing.";
    if (filters.search) desc = `Search results for "${filters.search}" on Fasho blog. ${desc}`;
    if (filters.tag) desc = `Articles tagged with "${filters.tag}" on Fasho blog. ${desc}`;
    return desc;
  };

  // Generate blog listing schema
  const generateBlogSchema = () => {
    const blogSchema = {
      "@context": "https://schema.org",
      "@type": "Blog",
      "name": "Fasho.co Blog",
      "description": "Music industry insights, playlist marketing tips, and digital promotion strategies",
      "url": "https://fasho.co/blog",
      "publisher": schemaGenerator.generateOrganizationSchema(),
      "blogPost": posts.slice(0, 10).map(post => ({
        "@type": "BlogPosting",
        "headline": post.title,
        "description": post.metaDescription || post.excerpt,
        "url": `https://fasho.co/blog/${post.slug}`,
        "datePublished": post.publishedAt,
        "dateModified": post.updatedAt || post.publishedAt,
        "author": {
          "@type": "Person",
          "name": post.authorName || "Fasho Team"
        },
        "image": post.coverImageUrl
      }))
    };

    const websiteSchema = schemaGenerator.generateWebsiteSchema();
    const organizationSchema = schemaGenerator.generateOrganizationSchema();

    return JSON.stringify([blogSchema, websiteSchema, organizationSchema], null, 2);
  };

  return (
    <>
      <Head>
        {/* Dynamic Title Based on Filters */}
        <title>{generatePageTitle()}</title>
        <meta name="description" content={generateMetaDescription()} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Advanced SEO Meta Tags */}
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="language" content="en" />
        
        {/* Canonical URL with pagination */}
        <link rel="canonical" href={`https://fasho.co/blog${pagination.page > 1 ? `?page=${pagination.page}` : ''}`} />
        
        {/* Open Graph Enhanced */}
        <meta property="og:title" content={generatePageTitle()} />
        <meta property="og:description" content={generateMetaDescription()} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://fasho.co/blog${pagination.page > 1 ? `?page=${pagination.page}` : ''}`} />
        <meta property="og:site_name" content="Fasho.co Blog" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:image" content="https://fasho.co/fasho-logo-wide.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Fasho.co Blog - Music Industry Insights" />
        
        {/* Twitter Card Enhanced */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fasho" />
        <meta name="twitter:creator" content="@fasho" />
        <meta name="twitter:title" content={generatePageTitle()} />
        <meta name="twitter:description" content={generateMetaDescription()} />
        <meta name="twitter:image" content="https://fasho.co/fasho-logo-wide.png" />
        <meta name="twitter:image:alt" content="Fasho.co Blog" />
        
        {/* Pagination SEO */}
        {pagination.page > 1 && (
          <link rel="prev" href={pagination.page === 2 ? '/blog' : `/blog?page=${pagination.page - 1}`} />
        )}
        {pagination.page < pagination.totalPages && (
          <link rel="next" href={`/blog?page=${pagination.page + 1}`} />
        )}
        
        {/* No index for filtered pages to avoid duplicate content */}
        {(filters.search || filters.tag) && (
          <meta name="robots" content="noindex, follow" />
        )}
        
        {/* Keywords for blog index */}
        <meta name="keywords" content="music promotion, playlist marketing, music industry, spotify promotion, digital marketing, music blog" />
        
        {/* Article tags for current posts */}
        {posts.length > 0 && (
          <meta name="article:tag" content={Array.from(new Set(posts.flatMap(post => post.tags || []))).slice(0, 10).join(', ')} />
        )}
        
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: generateBlogSchema()
          }}
        />
        
        {/* Performance Hints */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
        <link rel="dns-prefetch" href="//cdn.sanity.io" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.sanity.io" crossOrigin="anonymous" />
        
        {/* Theme Color */}
        <meta name="theme-color" content="#2563eb" />
        
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Dark background with gradient */}
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a13] via-[#0d0d1a] to-[#000000] relative" style={{ zIndex: 1 }}>
        {/* Header */}
        <div style={{ zIndex: 100 }}>
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

        <main className="pt-16" style={{ zIndex: 2 }}>
          {/* Featured Hero Carousel - only show on page 1 and without search */}
          {pagination.page === 1 && !filters.search && (
            <FeaturedHeroCarousel featuredPosts={featuredPosts} />
          )}

          {/* Blog Archive Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            {/* Section Header */}
            <div className="text-center mb-12" style={{ zIndex: 3 }}>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Latest <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">Articles</span>
              </h1>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Discover insights, tips, and industry news to help you succeed in music promotion and playlist marketing
              </p>
            </div>

            {/* Search and Filters */}
            <div className="mb-12" style={{ zIndex: 3 }}>
              <form onSubmit={handleSearch} className="max-w-md mx-auto">
                <div className="flex">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search articles..."
                    className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-l-xl px-6 py-4 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#59e3a5] focus:border-[#59e3a5]"
                    style={{ zIndex: 4 }}
                  />
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] hover:from-[#59e3a5]/90 hover:to-[#14c0ff]/90 text-white px-8 py-4 rounded-r-xl font-semibold transition-all duration-300 hover:scale-105"
                    style={{ zIndex: 4 }}
                  >
                    Search
                  </button>
                </div>
              </form>
            </div>

            {/* Posts Grid */}
            {posts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16" style={{ zIndex: 3 }}>
                {posts.map((post) => (
                  <article
                    key={post.id}
                    className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden hover:scale-105 transition-all duration-300 border border-white/20 hover:border-[#59e3a5]/50 hover:shadow-2xl hover:shadow-[#59e3a5]/20"
                    style={{ zIndex: 4 }}
                  >
                    {post.coverImageUrl && (
                      <div className="aspect-video relative overflow-hidden">
                        <Image
                          src={post.coverImageUrl}
                          alt={post.title}
                          fill
                          className="object-cover hover:scale-110 transition-transform duration-500"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" style={{ zIndex: 6 }}></div>
                      </div>
                    )}
                    <div className="p-6">
                      {/* Tags */}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {post.tags.slice(0, 3).map((tag) => (
                            <Link
                              key={tag}
                              href={`/blog?tag=${encodeURIComponent(tag)}`}
                              className="text-xs bg-gradient-to-r from-[#59e3a5]/20 to-[#14c0ff]/20 text-[#59e3a5] px-3 py-1 rounded-full hover:from-[#59e3a5]/30 hover:to-[#14c0ff]/30 transition-colors border border-[#59e3a5]/30"
                              style={{ zIndex: 5 }}
                            >
                              {tag}
                            </Link>
                          ))}
                        </div>
                      )}

                      <h2 className="text-xl font-semibold text-white mb-3 line-clamp-2 leading-tight">
                        <Link 
                          href={`/blog/${post.slug}`}
                          className="hover:text-[#59e3a5] transition-colors"
                          style={{ zIndex: 5 }}
                        >
                          {post.title}
                        </Link>
                      </h2>
                      <p className="text-gray-300 text-sm mb-4 line-clamp-3 leading-relaxed">
                        {post.excerpt || (post.content ? post.content.substring(0, 150) + '...' : '')}
                      </p>
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <time dateTime={post.publishedAt}>
                          {formatDate(post.publishedAt)}
                        </time>
                        <span>{getReadTime(post.readTime)}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="text-center py-16" style={{ zIndex: 3 }}>
                <div className="max-w-md mx-auto">
                  <h3 className="text-2xl font-semibold text-white mb-4">No articles found</h3>
                  <p className="text-gray-300 mb-8">
                    {filters.search 
                      ? `No articles match your search for "${filters.search}"`
                      : "We haven't published any articles yet, but we're working on it!"
                    }
                  </p>
                  {filters.search && (
                    <Link
                      href="/blog"
                      className="inline-flex items-center space-x-2 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] hover:from-[#59e3a5]/90 hover:to-[#14c0ff]/90 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105"
                      style={{ zIndex: 4 }}
                    >
                      <span>View All Articles</span>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center space-x-6" style={{ zIndex: 3 }}>
                {pagination.page > 1 && (
                  <Link
                    href={pagination.page === 2 ? "/blog" : `/blog?page=${pagination.page - 1}`}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-xl hover:border-[#59e3a5]/50 hover:shadow-lg hover:shadow-[#59e3a5]/20 transition-all duration-300 text-white"
                    style={{ zIndex: 4 }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Previous</span>
                  </Link>
                )}

                <span className="text-gray-300 px-4 py-2">
                  Page {pagination.page} of {pagination.totalPages}
                </span>

                {pagination.page < pagination.totalPages && (
                  <Link
                    href={`/blog?page=${pagination.page + 1}`}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-xl hover:border-[#59e3a5]/50 hover:shadow-lg hover:shadow-[#59e3a5]/20 transition-all duration-300 text-white"
                    style={{ zIndex: 4 }}
                  >
                    <span>Next</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
              </div>
            )}
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
            footer ul li {
              margin-bottom: 0.5rem !important;
            }
            footer ul li a {
              color: #9ca3af !important;
              text-decoration: none !important;
              transition: color 0.3s !important;
            }
            footer ul li a:hover {
              color: #59e3a5 !important;
            }
            footer p {
              color: #9ca3af !important;
              font-size: 0.875rem !important;
              line-height: 1.5 !important;
            }
            footer .text-center {
              text-align: center !important;
              margin-top: 2rem !important;
              padding-top: 2rem !important;
              border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
            }
          `}</style>
          <Footer />
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    // Extract query parameters
    const {
      page = '1',
      search,
      tag,
      category
    } = context.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limit = 12; // Posts per page

    // Check if Sanity is configured
    const sanityEnabled = isSanityConfigured();
    console.log(`🔄 BLOG INDEX: Sanity enabled: ${sanityEnabled}`);

    // Unified arrays to hold posts from both sources
    let unifiedPosts: UnifiedBlogPost[] = [];
    let unifiedFeaturedPosts: UnifiedBlogPost[] = [];
    let totalCount = 0;

    // 1. Fetch from Sanity (PRIMARY SOURCE)
    if (sanityEnabled) {
      try {
        console.log('📡 BLOG INDEX: Fetching posts from Sanity...');
        const [sanityPosts, sanityFeatured] = await Promise.all([
          getPublishedPosts(100), // Get more to allow for filtering
          getFeaturedPosts(5)
        ]);

        // Convert Sanity posts to unified format
        const sanityCombined = sanityPosts.map(sanityToUnified);
        const sanityFeaturedUnified = sanityFeatured.map(sanityToUnified);

        console.log(`✅ BLOG INDEX: Fetched ${sanityCombined.length} Sanity posts`);

        // Filter by search/tag if provided
        let filteredSanity = sanityCombined;
        if (search && typeof search === 'string') {
          const searchLower = search.toLowerCase();
          filteredSanity = filteredSanity.filter(post => 
            post.title.toLowerCase().includes(searchLower) ||
            (post.excerpt && post.excerpt.toLowerCase().includes(searchLower))
          );
        }
        if (tag && typeof tag === 'string') {
          filteredSanity = filteredSanity.filter(post => 
            post.tags && post.tags.includes(tag)
          );
        }

        unifiedPosts = filteredSanity;
        unifiedFeaturedPosts = sanityFeaturedUnified;
      } catch (sanityError) {
        console.error('❌ BLOG INDEX: Sanity fetch error:', sanityError);
        // Continue with legacy fallback
      }
    }

    // 2. Fetch from Legacy Supabase (FALLBACK)
    try {
      console.log('📡 BLOG INDEX: Fetching posts from legacy Supabase...');
      const supabase = getBlogSupabaseClient();
      
      // Build query for legacy posts
      let query = supabase
        .from('blog_posts')
        .select(`
          id,
          title,
          content,
          excerpt,
          slug,
          tags,
          featured_image_url,
          author_name,
          read_time,
          view_count,
          published_at,
          created_at,
          updated_at,
          meta_title,
          meta_description,
          open_graph_image
        `, { count: 'exact' })
        .eq('status', 'published')
        .not('published_at', 'is', null)
        .lte('published_at', new Date().toISOString());

      // Apply filters for legacy
      if (search && typeof search === 'string') {
        query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,excerpt.ilike.%${search}%`);
      }
      
      if (tag && typeof tag === 'string') {
        query = query.contains('tags', [tag]);
      }

      query = query.order('published_at', { ascending: false });

      const { data: legacyPosts, error: legacyError, count } = await query;

      if (legacyError) {
        console.error('❌ BLOG INDEX: Legacy fetch error:', legacyError);
      } else if (legacyPosts) {
        console.log(`✅ BLOG INDEX: Fetched ${legacyPosts.length} legacy posts`);
        
        // Convert legacy posts to unified format
        const legacyUnified = legacyPosts.map(legacyToUnified);
        
        // Merge with Sanity posts (Sanity takes precedence for duplicate slugs)
        unifiedPosts = mergePostLists(unifiedPosts, legacyUnified);
        totalCount = count || unifiedPosts.length;

        // Get legacy featured posts if no Sanity featured
        if (unifiedFeaturedPosts.length === 0) {
          const { data: legacyFeatured } = await supabase
            .from('blog_posts')
            .select(`
              id,
              title,
              content,
              excerpt,
              slug,
              featured_image_url,
              author_name,
              read_time,
              published_at,
              created_at
            `)
            .eq('status', 'published')
            .not('published_at', 'is', null)
            .not('featured_image_url', 'is', null)
            .lte('published_at', new Date().toISOString())
            .order('published_at', { ascending: false })
            .limit(5);

          if (legacyFeatured) {
            unifiedFeaturedPosts = legacyFeatured.map(legacyToUnified);
          }
        }
      }
    } catch (legacyError) {
      console.error('❌ BLOG INDEX: Legacy system error:', legacyError);
    }

    // 3. Apply pagination
    const offset = (pageNum - 1) * limit;
    const paginatedPosts = unifiedPosts.slice(offset, offset + limit);
    const totalPages = Math.ceil(unifiedPosts.length / limit);

    console.log(`📊 BLOG INDEX: Returning ${paginatedPosts.length} posts (page ${pageNum}/${totalPages})`);

    // Sanitize posts for Next.js serialization (convert undefined to null)
    const sanitizedPosts = paginatedPosts.map(sanitizeForSerialization);
    const sanitizedFeatured = unifiedFeaturedPosts.map(sanitizeForSerialization);

    return {
      props: {
        posts: sanitizedPosts,
        featuredPosts: sanitizedFeatured,
        pagination: {
          page: pageNum,
          limit,
          total: unifiedPosts.length,
          totalPages
        },
        filters: {
          search: search || null,
          tag: tag || null,
          category: category || null
        },
        sanityEnabled
      }
    };

  } catch (error) {
    console.error('❌ BLOG INDEX: Critical error in getServerSideProps:', error);
    
    return {
      props: {
        posts: [],
        featuredPosts: [],
        pagination: {
          page: 1,
          limit: 12,
          total: 0,
          totalPages: 0
        },
        filters: {},
        sanityEnabled: false
      }
    };
  }
};
