// Unified Blog Post Types
// Types that work across both Sanity and legacy blog systems

import { urlFor } from './client';
import type { SanityBlogPost, SanityBlogPostSummary } from './types';

// Legacy BlogPost interface (minimal definition to avoid import path issues)
// This mirrors the shape from plugins/blog/types/blog.ts
interface LegacyBlogPost {
  id: string;
  title: string;
  content: string;
  html_content: string;
  excerpt?: string;
  meta_description?: string;
  tags: string[];
  featured_image_url?: string;
  slug: string;
  status: 'published' | 'draft' | 'scheduled' | 'archived';
  published_at?: string;
  created_at: string;
  updated_at: string;
  meta_title?: string;
  open_graph_image?: string;
  read_time?: number;
  author_name: string;
}

// Unified post type that works with both systems
export interface UnifiedBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string; // HTML content for legacy, empty for Sanity (use body instead)
  coverImageUrl?: string;
  publishedAt: string;
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
  readTime?: number;
  authorName?: string;
  
  // SEO fields
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  
  // Source indicator
  source: 'sanity' | 'legacy';
  
  // Original data (for type-specific rendering)
  _sanityPost?: SanityBlogPost;
  _legacyPost?: LegacyBlogPost;
}

// Convert Sanity post to unified format
export function sanityToUnified(post: SanityBlogPost | SanityBlogPostSummary): UnifiedBlogPost {
  const isFull = '_createdAt' in post;
  const fullPost = isFull ? (post as SanityBlogPost) : null;
  
  let coverImageUrl: string | undefined;
  if (post.coverImage?.asset?._ref) {
    coverImageUrl = urlFor(post.coverImage).width(1200).height(630).fit('crop').auto('format').url();
  }
  
  return {
    id: post._id,
    title: post.title,
    slug: typeof post.slug === 'string' ? post.slug : post.slug?.current || '',
    excerpt: post.excerpt,
    coverImageUrl,
    publishedAt: post.publishedAt || (fullPost?._createdAt) || new Date().toISOString(),
    createdAt: fullPost?._createdAt || post.publishedAt || new Date().toISOString(),
    updatedAt: fullPost?._updatedAt,
    tags: post.tags,
    readTime: post.readTime,
    
    // SEO fields
    metaTitle: fullPost?.seoTitle,
    metaDescription: fullPost?.seoDescription,
    ogImage: fullPost?.ogImage?.asset?._ref 
      ? urlFor(fullPost.ogImage).width(1200).height(630).fit('crop').auto('format').url() 
      : coverImageUrl,
    canonicalUrl: fullPost?.canonicalUrl,
    noindex: fullPost?.noindex,
    
    source: 'sanity',
    _sanityPost: fullPost || undefined,
  };
}

// Convert legacy post to unified format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function legacyToUnified(post: any): UnifiedBlogPost {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt || post.meta_description,
    content: post.content,
    coverImageUrl: post.featured_image_url,
    publishedAt: post.published_at || post.created_at,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    tags: post.tags,
    readTime: post.read_time,
    authorName: post.author_name,
    
    // SEO fields
    metaTitle: post.meta_title,
    metaDescription: post.meta_description,
    ogImage: post.open_graph_image || post.featured_image_url,
    
    source: 'legacy',
    _legacyPost: post,
  };
}

// Sanitize post for Next.js serialization (convert undefined to null)
// Next.js getServerSideProps cannot serialize undefined values
export function sanitizeForSerialization(post: UnifiedBlogPost): UnifiedBlogPost {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? null,
    content: post.content ?? null,
    coverImageUrl: post.coverImageUrl ?? null,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt ?? null,
    tags: post.tags ?? null,
    readTime: post.readTime ?? null,
    authorName: post.authorName ?? null,
    metaTitle: post.metaTitle ?? null,
    metaDescription: post.metaDescription ?? null,
    ogImage: post.ogImage ?? null,
    canonicalUrl: post.canonicalUrl ?? null,
    noindex: post.noindex ?? null,
    source: post.source,
    // Omit _sanityPost and _legacyPost as they may contain non-serializable data
  } as UnifiedBlogPost;
}

// Merge Sanity and legacy posts (Sanity takes precedence for duplicate slugs)
export function mergePostLists(
  sanityPosts: UnifiedBlogPost[], 
  legacyPosts: UnifiedBlogPost[]
): UnifiedBlogPost[] {
  const slugSet = new Set(sanityPosts.map(p => p.slug));
  
  // Log collisions in development
  const collisions: string[] = [];
  
  // Filter out legacy posts that have Sanity equivalents
  const filteredLegacy = legacyPosts.filter(legacyPost => {
    if (slugSet.has(legacyPost.slug)) {
      collisions.push(legacyPost.slug);
      return false; // Sanity wins
    }
    return true;
  });
  
  // Log collisions in development
  if (process.env.NODE_ENV === 'development' && collisions.length > 0) {
    console.log(`⚠️ BLOG: Slug collisions detected: using Sanity over legacy for slugs: ${collisions.join(', ')}`);
  }
  
  // Combine and sort by published date
  const combined = [...sanityPosts, ...filteredLegacy];
  combined.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  
  return combined;
}
