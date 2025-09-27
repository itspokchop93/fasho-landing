// Blog Analytics Component
// Analytics dashboard for blog performance tracking

import React, { useState, useEffect } from 'react';

const BlogAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState({
    totalViews: 0,
    monthlyViews: 0,
    topPosts: [],
    recentActivity: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/blog/admin/analytics');
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8" style={{ zIndex: 11 }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ zIndex: 10 }}>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" style={{ zIndex: 11 }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Views</h3>
          <p className="text-3xl font-bold text-blue-600">{analytics.totalViews.toLocaleString()}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" style={{ zIndex: 11 }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">This Month</h3>
          <p className="text-3xl font-bold text-green-600">{analytics.monthlyViews.toLocaleString()}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" style={{ zIndex: 11 }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Top Posts</h3>
          <p className="text-3xl font-bold text-purple-600">{analytics.topPosts.length}</p>
        </div>
      </div>

      {/* Placeholder for future analytics features */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8" style={{ zIndex: 11 }}>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Advanced Analytics</h3>
          <p className="text-gray-500 mb-4">
            Detailed analytics dashboard coming soon. This will include:
          </p>
          <ul className="text-left text-gray-600 space-y-2 max-w-md mx-auto">
            <li>• Traffic sources and referrers</li>
            <li>• Page views and unique visitors</li>
            <li>• Time on page and bounce rates</li>
            <li>• Popular search keywords</li>
            <li>• Social media engagement</li>
            <li>• Geographic visitor data</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BlogAnalytics;






