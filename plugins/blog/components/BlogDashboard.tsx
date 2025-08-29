// Blog Dashboard Component
// Main dashboard for blog management in admin panel

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
      {/* Header with Stats Cards */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" style={{ zIndex: 11 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Blog Management</h1>
            <p className="text-gray-600 mt-1">Manage your blog posts, analytics, and settings</p>
          </div>
          <button
            onClick={() => handleTabChange('new-post')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            style={{ zIndex: 12 }}
          >
            New Post
          </button>
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
              All Posts
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
              Add New
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

