// Sanity CMS Client Configuration
// Centralized client for fetching blog content from Sanity

import { createClient, type SanityClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

// Define SanityImageSource type locally to avoid import path issues
type SanityImageSource = Parameters<ReturnType<typeof imageUrlBuilder>['image']>[0];

// Environment variables for Sanity configuration
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '';
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const apiVersion = process.env.SANITY_API_VERSION || '2024-01-01';
const useCdn = process.env.NODE_ENV === 'production';

// Sanity Studio URL (hosted at *.sanity.studio)
export const SANITY_STUDIO_URL = process.env.NEXT_PUBLIC_SANITY_STUDIO_URL || '';

// Check if Sanity is configured (must have projectId)
export function isSanityConfigured(): boolean {
  return Boolean(projectId && projectId.length > 0);
}

// Lazy-initialized clients to avoid errors when Sanity is not configured
let _sanityClient: SanityClient | null = null;
let _previewClient: SanityClient | null = null;
let _imageBuilder: ReturnType<typeof imageUrlBuilder> | null = null;

// Create Sanity client for public (read-only) queries
function createSanityClient(): SanityClient | null {
  if (!isSanityConfigured()) {
    return null;
  }
  
  if (!_sanityClient) {
    _sanityClient = createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn,
      perspective: 'published', // Only fetch published content by default
    });
  }
  
  return _sanityClient;
}

// Create Sanity client with preview mode (for drafts - server-side only)
function createPreviewClient(): SanityClient | null {
  if (!isSanityConfigured()) {
    return null;
  }
  
  if (!_previewClient) {
    _previewClient = createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: false,
      perspective: 'previewDrafts',
      token: process.env.SANITY_READ_TOKEN, // Server-side only
    });
  }
  
  return _previewClient;
}

// Get the appropriate client based on preview mode
export function getClient(preview = false): SanityClient | null {
  return preview ? createPreviewClient() : createSanityClient();
}

// Export getter for sanityClient (for backwards compatibility)
export function getSanityClient(): SanityClient | null {
  return createSanityClient();
}

// Image URL builder
function getImageBuilder(): ReturnType<typeof imageUrlBuilder> | null {
  if (!isSanityConfigured()) {
    return null;
  }
  
  if (!_imageBuilder) {
    const client = createSanityClient();
    if (client) {
      _imageBuilder = imageUrlBuilder(client);
    }
  }
  
  return _imageBuilder;
}

// Chainable image builder interface
interface ImageBuilderChain {
  width: (w: number) => ImageBuilderChain;
  height: (h: number) => ImageBuilderChain;
  fit: (f: 'clip' | 'crop' | 'fill' | 'fillmax' | 'max' | 'scale' | 'min') => ImageBuilderChain;
  auto: (a: string) => ImageBuilderChain;
  url: () => string;
}

// URL for images - returns a builder or a mock that returns empty strings
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function urlFor(source: SanityImageSource): any {
  const builder = getImageBuilder();
  
  if (!builder || !source) {
    // Return a chainable mock that ultimately returns empty string
    const mockBuilder: ImageBuilderChain = {
      width: () => mockBuilder,
      height: () => mockBuilder,
      fit: () => mockBuilder,
      auto: () => mockBuilder,
      url: () => '',
    };
    return mockBuilder;
  }
  
  return builder.image(source);
}
