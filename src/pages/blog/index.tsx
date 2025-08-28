// Blog List Page
// Public page displaying all published blog posts with SEO optimization

import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { getBlogSupabaseClient } from '../../../plugins/blog/utils/supabase';
import { BlogPost, BlogListResponse } from '../../../plugins/blog/types/blog';
import { schemaGenerator } from '../../../plugins/blog/utils/schema-generator';
import BlogHeader from '../../components/BlogHeader';
import Footer from '../../components/Footer';

interface BlogPageProps {
  posts: BlogPost[];
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
}

export default function BlogPage({ posts, pagination, filters }: BlogPageProps) {
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
        "description": post.meta_description || post.excerpt,
        "url": `https://fasho.co/blog/${post.slug}`,
        "datePublished": post.published_at || post.created_at,
        "dateModified": post.updated_at,
        "author": {
          "@type": "Person",
          "name": post.author_name
        },
        "image": post.featured_image_url
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
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Theme Color */}
        <meta name="theme-color" content="#2563eb" />
        
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-[#0f0f23] via-[#1a1a2e] to-[#16213e]" style={{ zIndex: 1 }}>
        {/* Blog Header */}
        <BlogHeader />

        <main className="pt-16">
          {/* Hero Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" style={{ zIndex: 2 }}>
            <div className="text-center mb-16">
              <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                FASHO <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">Blog</span>
              </h1>
              <p className="text-xl lg:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed">
                Insights, tips, and industry news to help you succeed in music promotion
              </p>
            </div>

            {/* Search and Filters */}
            <div className="mb-12" style={{ zIndex: 2 }}>
              <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
                <div className="flex bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden" suppressHydrationWarning={true}>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search articles..."
                    className="flex-1 bg-transparent px-6 py-4 text-white placeholder-white/60 focus:outline-none"
                    style={{ zIndex: 3 }}
                  />
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] hover:from-[#4ade80] hover:to-[#06b6d4] text-white px-8 py-4 font-medium transition-all duration-300 hover:scale-105"
                    style={{ zIndex: 3 }}
                  >
                    Search
                  </button>
                </div>
              </form>
            </div>

            {/* Posts Grid */}
            {posts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16" style={{ zIndex: 2 }}>
                {posts.map((post) => (
                  <article 
                    key={post.id} 
                    className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 overflow-hidden hover:bg-white/15 hover:scale-105 transition-all duration-300"
                    style={{ zIndex: 3 }}
                    suppressHydrationWarning={true}
                  >
                    {/* Featured Image */}
                    {post.featured_image_url && (
                      <div className="aspect-video relative overflow-hidden">
                        <img
                          src={post.featured_image_url}
                          alt={post.title}
                          className="w-full h-full object-cover"
                          style={{ zIndex: 4 }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-6">
                      {/* Tags */}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {post.tags.slice(0, 3).map((tag) => (
                            <Link
                              key={tag}
                              href={`/blog?tag=${encodeURIComponent(tag)}`}
                              className="text-xs bg-gradient-to-r from-[#59e3a5]/20 to-[#14c0ff]/20 text-[#59e3a5] px-3 py-1 rounded-full hover:from-[#59e3a5]/30 hover:to-[#14c0ff]/30 transition-all duration-300 border border-[#59e3a5]/30"
                              style={{ zIndex: 4 }}
                            >
                              #{tag}
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Title */}
                      <h2 className="text-xl font-bold text-white mb-3 line-clamp-2 leading-tight">
                        <Link 
                          href={`/blog/${post.slug}`}
                          className="hover:text-[#59e3a5] transition-colors"
                          style={{ zIndex: 4 }}
                        >
                          {post.title}
                        </Link>
                      </h2>

                      {/* Excerpt */}
                      <p className="text-white/70 mb-4 line-clamp-3 leading-relaxed">
                        {post.excerpt || post.content.substring(0, 150) + '...'}
                      </p>

                      {/* Meta (without author) */}
                      <div className="flex items-center justify-between text-sm text-white/60">
                        <time dateTime={post.published_at || post.created_at} className="font-medium">
                          {formatDate(post.published_at || post.created_at)}
                        </time>
                        <span>{getReadTime(post.read_time)}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="text-center py-16" style={{ zIndex: 2 }}>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-12 border border-white/20 max-w-md mx-auto" suppressHydrationWarning={true}>
                  <h3 className="text-2xl font-semibold text-white mb-4">No posts found</h3>
                  <p className="text-white/70">
                    {filters.search ? 'Try adjusting your search terms.' : 'Check back soon for new content!'}
                  </p>
                </div>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center space-x-4 pt-8" style={{ zIndex: 2 }}>
                {/* Previous Button */}
                {pagination.page > 1 ? (
                  <Link
                    href={`/blog?page=${pagination.page - 1}${filters.search ? `&search=${encodeURIComponent(filters.search)}` : ''}`}
                    className="px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all duration-300 font-medium"
                    style={{ zIndex: 3 }}
                    suppressHydrationWarning={true}
                  >
                    Previous
                  </Link>
                ) : (
                  <span className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white/40 cursor-not-allowed font-medium">
                    Previous
                  </span>
                )}

                {/* Page Numbers */}
                <div className="flex space-x-2">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, pagination.page - 2) + i;
                    if (pageNum > pagination.totalPages) return null;

                    return (
                      <Link
                        key={pageNum}
                        href={`/blog?page=${pageNum}${filters.search ? `&search=${encodeURIComponent(filters.search)}` : ''}`}
                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                          pageNum === pagination.page
                            ? 'bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-white shadow-lg'
                            : 'bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border border-white/20'
                        }`}
                        style={{ zIndex: 3 }}
                        suppressHydrationWarning={true}
                      >
                        {pageNum}
                      </Link>
                    );
                  })}
                </div>

                {/* Next Button */}
                {pagination.page < pagination.totalPages ? (
                  <Link
                    href={`/blog?page=${pagination.page + 1}${filters.search ? `&search=${encodeURIComponent(filters.search)}` : ''}`}
                    className="px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all duration-300 font-medium"
                    style={{ zIndex: 3 }}
                    suppressHydrationWarning={true}
                  >
                    Next
                  </Link>
                ) : (
                  <span className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white/40 cursor-not-allowed font-medium">
                    Next
                  </span>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const supabase = getBlogSupabaseClient();
    
    // Extract query parameters
    const {
      page = '1',
      search,
      tag,
      category
    } = context.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limit = 12; // Posts per page

    // Build query
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
        created_at
      `, { count: 'exact' })
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString());

    // Apply filters
    if (search && typeof search === 'string') {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,excerpt.ilike.%${search}%`);
    }
    
    if (tag && typeof tag === 'string') {
      query = query.contains('tags', [tag]);
    }

    // Apply pagination and ordering
    const offset = (pageNum - 1) * limit;
    query = query
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: posts, error, count } = await query;

    if (error) {
      console.error('Error fetching blog posts:', error);
      throw error;
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return {
      props: {
        posts: posts || [],
        pagination: {
          page: pageNum,
          limit,
          total: count || 0,
          totalPages
        },
        filters: {
          search: search || null,
          tag: tag || null,
          category: category || null
        }
      }
    };

  } catch (error) {
    console.error('Error in blog page getServerSideProps:', error);
    
    return {
      props: {
        posts: [],
        pagination: {
          page: 1,
          limit: 12,
          total: 0,
          totalPages: 0
        },
        filters: {}
      }
    };
  }
};
