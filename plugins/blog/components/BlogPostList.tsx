// Blog Post List Component
// Displays and manages list of blog posts in admin dashboard

import React, { useState, useEffect } from 'react';
import { BlogPost, BlogFilters, BlogListResponse } from '../types/blog';

interface BlogPostListProps {
  onEditPost: (post: BlogPost) => void;
  onRefresh: () => void;
}

const BlogPostList: React.FC<BlogPostListProps> = ({ onEditPost, onRefresh }) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<BlogFilters>({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Fetch posts
  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...filters
      });

      const response = await fetch(`/api/blog/admin/posts?${params}`);
      const data: BlogListResponse = await response.json();
      
      if (response.ok) {
        setPosts(data.posts);
        setPagination({
          page: data.page,
          limit: data.limit,
          total: data.total,
          totalPages: data.totalPages
        });
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete post
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const response = await fetch(`/api/blog/admin/posts/${postId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchPosts();
        onRefresh();
      } else {
        alert('Failed to delete post');
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Failed to delete post');
    }
  };

  // Update post status
  const handleStatusChange = async (postId: string, newStatus: BlogPost['status']) => {
    try {
      const response = await fetch(`/api/blog/admin/posts/${postId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchPosts();
        onRefresh();
      } else {
        alert('Failed to update post status');
      }
    } catch (error) {
      console.error('Failed to update post status:', error);
      alert('Failed to update post status');
    }
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof BlogFilters, value: string) => {
    const newFilters = { ...filters };
    if (value === '' || value === 'all') {
      delete newFilters[key];
    } else {
      if (key === 'status') {
        newFilters[key] = value as BlogPost['status'];
      } else {
        newFilters[key] = value;
      }
    }
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge styles
  const getStatusBadge = (status: BlogPost['status']) => {
    const styles = {
      published: 'bg-green-100 text-green-800',
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      archived: 'bg-red-100 text-red-800'
    };
    return styles[status] || styles.draft;
  };

  useEffect(() => {
    fetchPosts();
  }, [filters, pagination.page]);

  return (
    <div className="space-y-6" style={{ zIndex: 10 }}>
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4" style={{ zIndex: 11 }}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              style={{ zIndex: 12 }}
            >
              <option value="">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search posts..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              style={{ zIndex: 12 }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Author
            </label>
            <select
              value={filters.author || ''}
              onChange={(e) => handleFilterChange('author', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              style={{ zIndex: 12 }}
            >
              <option value="">All Authors</option>
              <option value="Admin">Admin</option>
              <option value="Article Chef">Article Chef</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFilters({});
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm transition-colors"
              style={{ zIndex: 12 }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Posts Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ zIndex: 11 }}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Views
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    Loading posts...
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No posts found
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div 
                          className="text-sm font-medium text-gray-900 truncate max-w-xs hover:text-blue-600 cursor-pointer transition-colors"
                          onClick={() => onEditPost(post)}
                          title="Click to edit this post"
                        >
                          {post.title}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          /{post.slug}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(post.status)}`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {post.author_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {post.view_count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(post.updated_at)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onEditPost(post)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                          style={{ zIndex: 12 }}
                        >
                          Edit
                        </button>
                        <select
                          value={post.status}
                          onChange={(e) => handleStatusChange(post.id, e.target.value as BlogPost['status'])}
                          className="text-xs border border-gray-300 rounded px-2 py-1"
                          style={{ zIndex: 12 }}
                        >
                          <option value="published">Published</option>
                          <option value="draft">Draft</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="archived">Archived</option>
                        </select>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="text-red-600 hover:text-red-900 font-medium"
                          style={{ zIndex: 12 }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                  style={{ zIndex: 12 }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                  style={{ zIndex: 12 }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogPostList;
