// Sanity CMS Type Definitions
// Types for blog posts and content from Sanity

import type { PortableTextBlock } from '@portabletext/types';

// Sanity image reference type
export interface SanityImageAsset {
  _ref: string;
  _type: 'reference';
}

export interface SanityImage {
  _type: 'image';
  asset: SanityImageAsset;
  alt?: string;
  hotspot?: {
    x: number;
    y: number;
    height: number;
    width: number;
  };
  crop?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

// Sanity slug type
export interface SanitySlug {
  _type: 'slug';
  current: string;
}

// Main Sanity Blog Post type
export interface SanityBlogPost {
  _id: string;
  _type: 'post';
  _createdAt: string;
  _updatedAt: string;
  
  // Core content fields
  title: string;
  slug: SanitySlug;
  excerpt?: string;
  coverImage?: SanityImage;
  body: PortableTextBlock[];
  publishedAt?: string;
  
  // SEO fields
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: SanityImage;
  canonicalUrl?: string;
  noindex?: boolean;
  
  // Redirect support for SEO-safe slug changes
  redirectFrom?: string[];
  
  // Optional metadata
  tags?: string[];
  author?: {
    name: string;
    image?: SanityImage;
  };
  readTime?: number;
}

// Simplified post type for list views
export interface SanityBlogPostSummary {
  _id: string;
  title: string;
  slug: SanitySlug;
  excerpt?: string;
  coverImage?: SanityImage;
  publishedAt?: string;
  tags?: string[];
  readTime?: number;
}

// Query result types
export interface SanityPostResult {
  post: SanityBlogPost | null;
  isRedirect: boolean;
  redirectToSlug?: string;
}

// Type guard to check if a post is from Sanity
export function isSanityPost(post: any): post is SanityBlogPost {
  return post && typeof post._id === 'string' && post._type === 'post';
}
