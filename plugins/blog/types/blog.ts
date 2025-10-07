// Blog System TypeScript Interfaces
// Core types for the blog plugin system

export interface BlogPost {
  id: string;
  source_article_id?: string;
  title: string;
  content: string;
  html_content: string;
  excerpt?: string;
  meta_description?: string;
  tags: string[];
  featured_image_url?: string;
  target_keyword?: string;
  article_type?: string;
  slug: string;
  status: 'published' | 'draft' | 'scheduled' | 'archived';
  scheduled_at?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  
  // SEO fields
  meta_title?: string;
  open_graph_title?: string;
  open_graph_description?: string;
  open_graph_image?: string;
  twitter_title?: string;
  twitter_description?: string;
  twitter_image?: string;
  
  // Analytics fields
  view_count: number;
  read_time?: number;
  
  // Author info
  author_name: string;
  author_email?: string;
  
  // Relations
  categories?: BlogCategory[];
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
}

export interface BlogWebsiteSource {
  id: string;
  source_website_id: string;
  name: string;
  url?: string;
  description?: string;
  created_at: string;
}

export interface BlogWebhookLog {
  id: string;
  source_article_id?: string;
  payload: any;
  success: boolean;
  error_message?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface BlogAnalytics {
  id: string;
  post_id: string;
  date: string;
  views: number;
  unique_views: number;
  time_on_page: number;
  bounce_rate: number;
  created_at: string;
}

// Webhook interfaces (from webhookprompt.md)
export interface IncomingWebhookPayload {
  article: {
    id: string;                          // UUID of source article
    title: string;                       // SEO-optimized title
    content: string;                     // Plain text content
    htmlContent: string;                 // Complete HTML with embedded images
    excerpt?: string;                    // Brief summary
    metaDescription?: string;            // SEO meta description
    tags?: string[];                     // Array of tags
    featuredImageUrl?: string;           // Featured image URL (hosted on Supabase)
    targetKeyword: string;               // Primary SEO keyword
    articleType: string;                 // e.g., "blog_post"
    createdAt: string;                   // ISO timestamp
  };
  website: {
    id: string;                          // Source website UUID
    name: string;                        // Website name
    url: string;                         // Website URL
    description?: string;                // Website description
  };
  metadata: {
    source: 'article-chef';              // Always this value
    version: '1.0';                      // Version identifier
    timestamp: string;                   // ISO timestamp
  };
}

// Editor interfaces
export interface BlogEditorState {
  title: string;
  content: string;
  html_content: string;
  excerpt: string;
  meta_description: string;
  meta_title: string;
  slug: string;
  tags: string[];
  categories: string[];
  featured_image_url: string;
  target_keyword: string;
  status: BlogPost['status'];
  scheduled_at?: string;
  
  // SEO fields
  open_graph_title: string;
  open_graph_description: string;
  open_graph_image: string;
  twitter_title: string;
  twitter_description: string;
  twitter_image: string;
}

// Admin dashboard interfaces
export interface BlogDashboardStats {
  total_posts: number;
  published_posts: number;
  draft_posts: number;
  scheduled_posts: number;
  total_views: number;
  monthly_views: number;
  recent_posts: BlogPost[];
}

// API response interfaces
export interface BlogApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface BlogListResponse {
  posts: BlogPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// SEO analysis interfaces
export interface SEOAnalysis {
  title_length: number;
  meta_description_length: number;
  keyword_density: number;
  readability_score: number;
  heading_structure: {
    h1: number;
    h2: number;
    h3: number;
    h4: number;
    h5: number;
    h6: number;
  };
  image_alt_texts: number;
  internal_links: number;
  external_links: number;
  word_count: number;
  recommendations: string[];
}

// Filter and search interfaces
export interface BlogFilters {
  status?: BlogPost['status'];
  category?: string;
  tag?: string;
  search?: string;
  author?: string;
  date_from?: string;
  date_to?: string;
}

export interface BlogSortOptions {
  field: 'created_at' | 'published_at' | 'updated_at' | 'title' | 'view_count';
  direction: 'asc' | 'desc';
}







