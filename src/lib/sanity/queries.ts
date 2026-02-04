// Sanity GROQ Queries
// Centralized queries for fetching blog content from Sanity

import { getClient, isSanityConfigured } from './client';
import type { SanityBlogPost, SanityBlogPostSummary, SanityPostResult } from './types';

// GROQ query projections
const postSummaryProjection = `{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  coverImage,
  publishedAt,
  tags,
  readTime
}`;

const postFullProjection = `{
  _id,
  _type,
  _createdAt,
  _updatedAt,
  title,
  slug,
  excerpt,
  coverImage,
  body,
  publishedAt,
  seoTitle,
  seoDescription,
  ogImage,
  canonicalUrl,
  noindex,
  redirectFrom,
  tags,
  author,
  readTime
}`;

// Fetch all published posts for the blog index
export async function getPublishedPosts(limit = 50): Promise<SanityBlogPostSummary[]> {
  if (!isSanityConfigured()) {
    console.log('⚠️ SANITY: Not configured, returning empty array for published posts');
    return [];
  }

  const client = getClient();
  if (!client) {
    console.log('⚠️ SANITY: Client not available, returning empty array');
    return [];
  }

  const query = `*[_type == "post" && defined(publishedAt) && publishedAt <= now()] | order(publishedAt desc) [0...$limit] ${postSummaryProjection}`;

  try {
    const posts = await client.fetch<SanityBlogPostSummary[]>(query, { limit });
    console.log(`✅ SANITY: Fetched ${posts.length} published posts`);
    return posts;
  } catch (error) {
    console.error('❌ SANITY: Error fetching published posts:', error);
    return [];
  }
}

// Fetch a single published post by slug
export async function getPostBySlug(slug: string): Promise<SanityBlogPost | null> {
  if (!isSanityConfigured()) {
    console.log('⚠️ SANITY: Not configured, returning null for post by slug');
    return null;
  }

  const client = getClient();
  if (!client) {
    console.log('⚠️ SANITY: Client not available');
    return null;
  }

  const query = `*[_type == "post" && slug.current == $slug && defined(publishedAt) && publishedAt <= now()][0] ${postFullProjection}`;

  try {
    const post = await client.fetch<SanityBlogPost | null>(query, { slug });
    if (post) {
      console.log(`✅ SANITY: Found published post with slug "${slug}"`);
    } else {
      console.log(`⚠️ SANITY: No published post found with slug "${slug}"`);
    }
    return post;
  } catch (error) {
    console.error(`❌ SANITY: Error fetching post by slug "${slug}":`, error);
    return null;
  }
}

// Fetch post by redirectFrom (for 301 redirects on old slugs)
export async function getPostByRedirectSlug(slug: string): Promise<{ post: SanityBlogPost; newSlug: string } | null> {
  if (!isSanityConfigured()) {
    console.log('⚠️ SANITY: Not configured, returning null for redirect lookup');
    return null;
  }

  const client = getClient();
  if (!client) {
    return null;
  }

  const query = `*[_type == "post" && $slug in redirectFrom && defined(publishedAt) && publishedAt <= now()][0] ${postFullProjection}`;

  try {
    const post = await client.fetch<SanityBlogPost | null>(query, { slug });
    if (post && post.slug?.current) {
      console.log(`✅ SANITY: Found redirect from "${slug}" to "${post.slug.current}"`);
      return { post, newSlug: post.slug.current };
    }
    return null;
  } catch (error) {
    console.error(`❌ SANITY: Error looking up redirect for slug "${slug}":`, error);
    return null;
  }
}

// Combined resolver: Check for published post, then redirect
export async function resolvePostBySlug(slug: string): Promise<SanityPostResult> {
  // First, try to find a published post with this exact slug
  const directPost = await getPostBySlug(slug);
  if (directPost) {
    return { post: directPost, isRedirect: false };
  }

  // If not found, check if this slug is in redirectFrom of another post
  const redirectResult = await getPostByRedirectSlug(slug);
  if (redirectResult) {
    return {
      post: redirectResult.post,
      isRedirect: true,
      redirectToSlug: redirectResult.newSlug,
    };
  }

  // Not found anywhere in Sanity
  return { post: null, isRedirect: false };
}

// Get all published slugs (for sitemap generation)
export async function getAllPublishedSlugs(): Promise<string[]> {
  if (!isSanityConfigured()) {
    console.log('⚠️ SANITY: Not configured, returning empty array for slugs');
    return [];
  }

  const client = getClient();
  if (!client) {
    return [];
  }

  const query = `*[_type == "post" && defined(publishedAt) && publishedAt <= now()] { "slug": slug.current }`;

  try {
    const results = await client.fetch<{ slug: string }[]>(query);
    const slugs = results.map((r) => r.slug).filter(Boolean);
    console.log(`✅ SANITY: Found ${slugs.length} published slugs for sitemap`);
    return slugs;
  } catch (error) {
    console.error('❌ SANITY: Error fetching slugs for sitemap:', error);
    return [];
  }
}

// Get featured posts for blog index hero
export async function getFeaturedPosts(limit = 5): Promise<SanityBlogPostSummary[]> {
  if (!isSanityConfigured()) {
    return [];
  }

  const client = getClient();
  if (!client) {
    return [];
  }

  // Get the most recent posts with cover images as featured
  const query = `*[_type == "post" && defined(publishedAt) && publishedAt <= now() && defined(coverImage)] | order(publishedAt desc) [0...$limit] ${postSummaryProjection}`;

  try {
    const posts = await client.fetch<SanityBlogPostSummary[]>(query, { limit });
    console.log(`✅ SANITY: Fetched ${posts.length} featured posts`);
    return posts;
  } catch (error) {
    console.error('❌ SANITY: Error fetching featured posts:', error);
    return [];
  }
}

// Get related posts (for sidebar/bottom of post)
export async function getRelatedPosts(currentPostId: string, limit = 5): Promise<SanityBlogPostSummary[]> {
  if (!isSanityConfigured()) {
    return [];
  }

  const client = getClient();
  if (!client) {
    return [];
  }

  // Get recent posts excluding the current one
  const query = `*[_type == "post" && _id != $currentPostId && defined(publishedAt) && publishedAt <= now()] | order(publishedAt desc) [0...$limit] ${postSummaryProjection}`;

  try {
    const posts = await client.fetch<SanityBlogPostSummary[]>(query, { currentPostId, limit });
    return posts;
  } catch (error) {
    console.error('❌ SANITY: Error fetching related posts:', error);
    return [];
  }
}
