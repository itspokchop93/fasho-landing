// Index Links Component
// Allows submission of blog URLs for rapid indexing via Google and Bing APIs

import React, { useState, useEffect } from 'react';

interface IndexResult {
  status: string;
  response: string;
}

interface IndexSubmission {
  id: number;
  url: string;
  submitted_at: string;
  submitted_by: string;
  results: {
    googleIndexingAPI: IndexResult;
    bingIndexNowAPI: IndexResult;
  };
}

const IndexLinks: React.FC = () => {
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState<IndexSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch submission history
  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/blog/index-link/history');
      const data = await response.json();
      
      if (data.success) {
        setSubmissions(data.data);
      } else {
        console.error('Failed to fetch history:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit URL for indexing
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setMessage({ type: 'error', text: 'Please enter a valid URL' });
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage(null);

      const response = await fetch('/api/blog/index-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'URL submitted for indexing successfully!' });
        setUrl('');
        // Refresh history to show new submission
        await fetchHistory();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to submit URL' });
      }
    } catch (error) {
      console.error('Submission error:', error);
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete submission
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this submission?')) {
      return;
    }

    try {
      const response = await fetch(`/api/blog/index-link/history?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Submission deleted successfully' });
        await fetchHistory();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete submission' });
      }
    } catch (error) {
      console.error('Delete error:', error);
      setMessage({ type: 'error', text: 'Network error occurred' });
    }
  };

  // Toggle expanded state
  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    return status === 'success' ? '✅' : '❌';
  };

  // Load history on component mount
  useEffect(() => {
    fetchHistory();
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="space-y-8" style={{ zIndex: 15 }}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Index Links</h2>
        <p className="mt-2 text-gray-600">
          Submit blog URLs for rapid indexing via Google Indexing API and Bing IndexNow API.
          This will also ping both Google and Bing sitemaps.
        </p>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`p-4 rounded-md ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
          style={{ zIndex: 16 }}
        >
          {message.text}
        </div>
      )}

      {/* URL Submission Form */}
      <div className="bg-white p-6 rounded-lg border border-gray-200" style={{ zIndex: 15 }}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit URL for Indexing</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              Blog Post URL
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://fasho.co/blog/your-article-slug"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSubmitting}
              required
              style={{ zIndex: 15 }}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-2 rounded-md font-medium text-white transition-colors ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
            }`}
            style={{ zIndex: 15 }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit for Indexing'}
          </button>
        </form>
      </div>

      {/* Submission History */}
      <div className="bg-white rounded-lg border border-gray-200" style={{ zIndex: 15 }}>
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Submission History</h3>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-gray-500">
            Loading submission history...
          </div>
        ) : submissions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No submissions yet. Submit your first URL above!
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {submissions.map((submission) => (
              <div key={submission.id} className="p-6" style={{ zIndex: 15 }}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toggleExpanded(submission.id)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        style={{ zIndex: 16 }}
                      >
                        <span className={`transform transition-transform ${
                          expandedItems.has(submission.id) ? 'rotate-90' : ''
                        }`}>
                          ▶
                        </span>
                      </button>
                      <div>
                        <p className="font-medium text-gray-900 break-all">
                          {submission.url}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatTimestamp(submission.submitted_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(submission.id)}
                    className="ml-4 px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                    style={{ zIndex: 16 }}
                  >
                    DELETE
                  </button>
                </div>

                {/* Expanded Details */}
                {expandedItems.has(submission.id) && (
                  <div className="mt-4 ml-6 space-y-3 bg-gray-50 p-4 rounded-md" style={{ zIndex: 15 }}>
                    <div className="space-y-2">
                      <div className="text-sm text-blue-600 italic mb-2">
                        Note: Sitemap pings have been deprecated by Google and Bing. Using direct indexing APIs instead.
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span>{getStatusIcon(submission.results.googleIndexingAPI.status)}</span>
                        <span className="font-medium">Google Indexing API:</span>
                        <span className="text-sm text-gray-600 break-all">
                          {submission.results.googleIndexingAPI.response}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span>{getStatusIcon(submission.results.bingIndexNowAPI.status)}</span>
                        <span className="font-medium">Bing IndexNow API:</span>
                        <span className="text-sm text-gray-600">
                          {submission.results.bingIndexNowAPI.response}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default IndexLinks;
