// Blog Dashboard Component
// Main dashboard for blog management in admin panel
// Now integrates Sanity CMS as the primary blog management system

import React, { useState, useEffect } from 'react';
import BlogPostList from './BlogPostList';
import BlogEditor from './BlogEditor';
import BlogSettings from './BlogSettings';
import BlogAnalytics from './BlogAnalytics';
import IndexLinks from './IndexLinks';
import { BlogPost, BlogDashboardStats } from '../types/blog';

interface BlogDashboardProps {
  adminUser: {
    id: string;
    email: string;
    role: string;
  };
}

type BlogTab = 'posts' | 'new-post' | 'edit-post' | 'analytics' | 'settings' | 'index-links';

// Get Sanity Studio URL from environment
const SANITY_STUDIO_URL = process.env.NEXT_PUBLIC_SANITY_STUDIO_URL || '';
const SANITY_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID);

const BlogDashboard: React.FC<BlogDashboardProps> = ({ adminUser }) => {
  const [activeTab, setActiveTab] = useState<BlogTab>('posts');
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [stats, setStats] = useState<BlogDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handle tab changes and URL hash updates
  const handleTabChange = (tab: BlogTab) => {
    setActiveTab(tab);
    setEditingPost(null); // Clear editing post when changing tabs
    
    // Update URL hash to reflect current tab
    const currentUrl = new URL(window.location.href);
    currentUrl.hash = `blog-${tab}`;
    window.history.replaceState({}, '', currentUrl.toString());
  };

  // Handle edit post action
  const handleEditPost = (post: BlogPost) => {
    setEditingPost(post);
    setActiveTab('edit-post');
  };

  // Handle post creation/update success
  const handlePostSaved = () => {
    setActiveTab('posts');
    setEditingPost(null);
    // Refresh stats if needed
    fetchStats();
  };

  // Fetch dashboard statistics
  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/blog/admin/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch blog stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize stats on component mount
  useEffect(() => {
    fetchStats();
  }, []);

  // Handle initial tab state from URL hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('blog-')) {
      const tab = hash.split('blog-')[1] as BlogTab;
      if (['posts', 'new-post', 'analytics', 'settings', 'index-links'].includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'posts':
        return (
          <BlogPostList 
            onEditPost={handleEditPost}
            onRefresh={fetchStats}
          />
        );
      case 'new-post':
        return (
          <BlogEditor 
            onSave={handlePostSaved}
            onCancel={() => handleTabChange('posts')}
          />
        );
      case 'edit-post':
        return editingPost ? (
          <BlogEditor 
            post={editingPost}
            onSave={handlePostSaved}
            onCancel={() => handleTabChange('posts')}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No post selected for editing</p>
          </div>
        );
      case 'analytics':
        return <BlogAnalytics />;
      case 'settings':
        return <BlogSettings />;
      case 'index-links':
        return <IndexLinks />;
      default:
        return (
          <BlogPostList 
            onEditPost={handleEditPost}
            onRefresh={fetchStats}
          />
        );
    }
  };

  return (
    <div className="space-y-6" style={{ zIndex: 10 }}>
      {/* Sanity CMS Banner - Primary CTA */}
      <div className="bg-gradient-to-r from-[#f25d52] to-[#f7766d] rounded-xl p-6 text-white shadow-lg" style={{ zIndex: 11 }}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">✨ New: Sanity CMS is Now Live!</h2>
              <p className="text-white/90" style={{ fontSize: '0.9375rem' }}>
                We've upgraded to Sanity CMS for a better blog publishing experience. Create, edit, and publish posts from anywhere with our new content management system.
              </p>
            </div>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            {SANITY_STUDIO_URL ? (
              <a
                href={SANITY_STUDIO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-[#f25d52] hover:bg-gray-100 px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-105 shadow-md"
                style={{ zIndex: 12 }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open Sanity Studio
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 bg-white/20 text-white px-6 py-3 rounded-lg font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Sanity Not Configured
              </span>
            )}
          </div>
        </div>
        
        {/* Quick Setup Info */}
        {!SANITY_STUDIO_URL && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-white/80 text-sm">
              <strong>Setup Required:</strong> Add <code className="bg-white/10 px-2 py-0.5 rounded">NEXT_PUBLIC_SANITY_STUDIO_URL</code> to your environment variables. 
              Deploy Sanity Studio using <code className="bg-white/10 px-2 py-0.5 rounded">sanity deploy</code> first.
            </p>
          </div>
        )}
      </div>

      {/* Header with Stats Cards */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" style={{ zIndex: 11 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Blog Management</h1>
            <p className="text-gray-600 mt-1">Manage your blog posts, analytics, and settings</p>
          </div>
          <div className="flex gap-3">
            {/* Primary CTA: Sanity Studio */}
            {SANITY_STUDIO_URL && (
              <a
                href={SANITY_STUDIO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-[#f25d52] to-[#f7766d] hover:from-[#e04d42] hover:to-[#e66660] text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
                style={{ zIndex: 12 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Post (Sanity)
              </a>
            )}
            {/* Legacy: Create Post in Old System */}
            <button
              onClick={() => handleTabChange('new-post')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
              style={{ zIndex: 12 }}
              title="Create a post using the legacy system"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Legacy Post
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4" style={{ zIndex: 11 }}>
              <div className="text-2xl font-bold text-gray-900">{stats.total_posts}</div>
              <div className="text-sm text-gray-600">Total Posts</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4" style={{ zIndex: 11 }}>
              <div className="text-2xl font-bold text-green-700">{stats.published_posts}</div>
              <div className="text-sm text-green-600">Published</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4" style={{ zIndex: 11 }}>
              <div className="text-2xl font-bold text-yellow-700">{stats.draft_posts}</div>
              <div className="text-sm text-yellow-600">Drafts</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4" style={{ zIndex: 11 }}>
              <div className="text-2xl font-bold text-blue-700">{stats.total_views.toLocaleString()}</div>
              <div className="text-sm text-blue-600">Total Views</div>
            </div>
          </div>
        )}

        {/* Info Banner about Legacy System */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-amber-800">
              <strong>Legacy System:</strong> The controls below manage posts in the old blog system. 
              For new posts, use <strong>Sanity Studio</strong> instead. 
              Existing legacy posts will continue to work and display on the public blog.
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange('posts')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'posts' || activeTab === 'edit-post'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              style={{ zIndex: 12 }}
            >
              Legacy Posts
            </button>
            <button
              onClick={() => handleTabChange('new-post')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'new-post'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              style={{ zIndex: 12 }}
            >
              Add Legacy
            </button>
            <button
              onClick={() => handleTabChange('analytics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              style={{ zIndex: 12 }}
            >
              Analytics
            </button>
            <button
              onClick={() => handleTabChange('index-links')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'index-links'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              style={{ zIndex: 12 }}
            >
              Index Links
            </button>
            <button
              onClick={() => handleTabChange('settings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              style={{ zIndex: 12 }}
            >
              Settings
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ zIndex: 10 }}>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default BlogDashboard;
