// Blog-specific Supabase utilities
// Handles database operations for the blog system

import { createAdminClient } from '../../../src/utils/supabase/server';
import { BlogPost, BlogCategory, BlogWebhookLog, BlogApiResponse } from '../types/blog';

// Get admin Supabase client for blog operations
export function getBlogSupabaseClient() {
  return createAdminClient();
}

// Blog post database operations
export class BlogPostService {
  private supabase = getBlogSupabaseClient();

  async createPost(postData: Partial<BlogPost>): Promise<BlogApiResponse<BlogPost>> {
    try {
      console.log('🔍 SUPABASE-CREATE: Attempting to create post with data:', JSON.stringify(postData, null, 2));
      
      // Debug meta_description specifically
      if (postData.meta_description) {
        console.log(`📝 SUPABASE-CREATE: Meta description length: ${postData.meta_description.length}`);
        console.log(`📝 SUPABASE-CREATE: Meta description: "${postData.meta_description}"`);
      }
      
      // Remove categories from postData since it's handled via junction table
      const { categories, ...cleanPostData } = postData;
      console.log('🧹 SUPABASE-CLEAN: Cleaned data (removed categories):', JSON.stringify(cleanPostData, null, 2));
      
      const { data, error } = await this.supabase
        .from('blog_posts')
        .insert(cleanPostData)
        .select()
        .single();

      if (error) {
        console.log('🚨 SUPABASE-ERROR:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('✅ SUPABASE-SUCCESS: Post created:', data?.id);
      return { success: true, data };
    } catch (error) {
      console.log('💥 SUPABASE-CATCH:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create post'
      };
    }
  }

  async updatePost(id: string, postData: Partial<BlogPost>): Promise<BlogApiResponse<BlogPost>> {
    try {
      console.log('🔄 SUPABASE-UPDATE: Attempting to update post with data:', JSON.stringify(postData, null, 2));
      
      // Remove categories from postData since it's handled via junction table
      const { categories, ...cleanPostData } = postData;
      console.log('🧹 SUPABASE-UPDATE-CLEAN: Cleaned data (removed categories):', JSON.stringify(cleanPostData, null, 2));
      
      const { data, error } = await this.supabase
        .from('blog_posts')
        .update(cleanPostData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.log('🚨 SUPABASE-UPDATE-ERROR:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('✅ SUPABASE-UPDATE-SUCCESS: Post updated:', data?.id);
      return { success: true, data };
    } catch (error) {
      console.log('💥 SUPABASE-UPDATE-CATCH:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update post'
      };
    }
  }

  async getPostBySlug(slug: string): Promise<BlogApiResponse<BlogPost>> {
    try {
      const { data, error } = await this.supabase
        .from('blog_posts')
        .select(`
          *,
          categories:blog_post_categories(
            category:blog_categories(*)
          )
        `)
        .eq('slug', slug)
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Post not found'
      };
    }
  }

  async getPostById(id: string): Promise<BlogApiResponse<BlogPost>> {
    try {
      const { data, error } = await this.supabase
        .from('blog_posts')
        .select(`
          *,
          categories:blog_post_categories(
            category:blog_categories(*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Post not found'
      };
    }
  }

  async checkSlugExists(slug: string, excludeId?: string): Promise<boolean> {
    try {
      let query = this.supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', slug);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query.single();
      
      return !error && !!data;
    } catch (error) {
      return false;
    }
  }

  async generateUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
    let slug = baseSlug;
    let counter = 0;

    while (await this.checkSlugExists(slug, excludeId)) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    return slug;
  }

  async incrementViewCount(postId: string): Promise<void> {
    try {
      // Get current view count and increment it
      const { data: post } = await this.supabase
        .from('blog_posts')
        .select('view_count')
        .eq('id', postId)
        .single();

      if (post) {
        await this.supabase
          .from('blog_posts')
          .update({ view_count: (post.view_count || 0) + 1 })
          .eq('id', postId);
      }
    } catch (error) {
      console.error('Failed to increment view count:', error);
    }
  }
}

// Website source operations
export class WebsiteSourceService {
  private supabase = getBlogSupabaseClient();

  async upsertWebsiteSource(sourceData: {
    source_website_id: string;
    name: string;
    url?: string;
    description?: string;
  }): Promise<BlogApiResponse> {
    try {
      const { error } = await this.supabase
        .from('blog_website_sources')
        .upsert(sourceData, { 
          onConflict: 'source_website_id' 
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to upsert website source'
      };
    }
  }
}

// Webhook logging operations
export class WebhookLogService {
  private supabase = getBlogSupabaseClient();

  async logWebhook(logData: {
    source_article_id?: string;
    payload: any;
    success: boolean;
    error_message?: string;
    ip_address?: string;
    user_agent?: string;
  }): Promise<BlogApiResponse<BlogWebhookLog>> {
    try {
      const { data, error } = await this.supabase
        .from('blog_webhook_logs')
        .insert(logData)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to log webhook'
      };
    }
  }
}

// Category operations
export class CategoryService {
  private supabase = getBlogSupabaseClient();

  async getAllCategories(): Promise<BlogApiResponse<BlogCategory[]>> {
    try {
      const { data, error } = await this.supabase
        .from('blog_categories')
        .select('*')
        .order('name');

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch categories'
      };
    }
  }

  async createCategory(categoryData: {
    name: string;
    slug: string;
    description?: string;
  }): Promise<BlogApiResponse<BlogCategory>> {
    try {
      const { data, error } = await this.supabase
        .from('blog_categories')
        .insert(categoryData)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create category'
      };
    }
  }
}
