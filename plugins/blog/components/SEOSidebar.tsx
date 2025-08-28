// SEO Sidebar Component
// WordPress/Yoast-style SEO optimization tools

import React, { useState, useEffect } from 'react';
import { BlogEditorState, SEOAnalysis } from '../types/blog';

interface SEOSidebarProps {
  editorState: BlogEditorState;
  onChange: (state: BlogEditorState) => void;
  seoAnalysis: SEOAnalysis | null;
  visible: boolean;
}

const SEOSidebar: React.FC<SEOSidebarProps> = ({ 
  editorState, 
  onChange, 
  seoAnalysis, 
  visible 
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'social' | 'analysis'>('general');

  // Auto-fill OpenGraph and Twitter data based on post content
  useEffect(() => {
    // Auto-fill OpenGraph title if empty
    if (!editorState.open_graph_title && editorState.title) {
      onChange({ 
        ...editorState, 
        open_graph_title: editorState.meta_title || editorState.title 
      });
    }

    // Auto-fill OpenGraph description if empty
    if (!editorState.open_graph_description && editorState.meta_description) {
      onChange({ 
        ...editorState, 
        open_graph_description: editorState.meta_description 
      });
    }

    // Auto-fill OpenGraph image if empty
    if (!editorState.open_graph_image && editorState.featured_image_url) {
      onChange({ 
        ...editorState, 
        open_graph_image: editorState.featured_image_url 
      });
    }

    // Auto-fill Twitter title if empty
    if (!editorState.twitter_title && editorState.title) {
      onChange({ 
        ...editorState, 
        twitter_title: editorState.meta_title || editorState.title 
      });
    }

    // Auto-fill Twitter description if empty
    if (!editorState.twitter_description && editorState.meta_description) {
      onChange({ 
        ...editorState, 
        twitter_description: editorState.meta_description 
      });
    }

    // Auto-fill Twitter image if empty
    if (!editorState.twitter_image && editorState.featured_image_url) {
      onChange({ 
        ...editorState, 
        twitter_image: editorState.featured_image_url 
      });
    }
  }, [editorState.title, editorState.meta_title, editorState.meta_description, editorState.featured_image_url]);

  // Calculate SEO score based on various factors
  const calculateSEOScore = (): { score: number; color: string; status: string } => {
    let score = 0;
    let maxScore = 0;

    // Title length (0-20 points)
    maxScore += 20;
    if (editorState.title.length >= 30 && editorState.title.length <= 60) {
      score += 20;
    } else if (editorState.title.length >= 20 && editorState.title.length <= 70) {
      score += 15;
    } else if (editorState.title.length > 0) {
      score += 10;
    }

    // Meta description (0-15 points)
    maxScore += 15;
    if (editorState.meta_description.length >= 120 && editorState.meta_description.length <= 160) {
      score += 15;
    } else if (editorState.meta_description.length >= 100 && editorState.meta_description.length <= 180) {
      score += 10;
    } else if (editorState.meta_description.length > 0) {
      score += 5;
    }

    // Target keyword (0-15 points)
    maxScore += 15;
    if (editorState.target_keyword) {
      score += 5;
      // Check if keyword is in title
      if (editorState.title.toLowerCase().includes(editorState.target_keyword.toLowerCase())) {
        score += 5;
      }
      // Check if keyword is in meta description
      if (editorState.meta_description.toLowerCase().includes(editorState.target_keyword.toLowerCase())) {
        score += 5;
      }
    }

    // Content length (0-10 points)
    maxScore += 10;
    const wordCount = editorState.content.split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount >= 300) {
      score += 10;
    } else if (wordCount >= 150) {
      score += 5;
    }

    // URL slug (0-10 points)
    maxScore += 10;
    if (editorState.slug) {
      score += 5;
      if (editorState.target_keyword && 
          editorState.slug.toLowerCase().includes(editorState.target_keyword.toLowerCase().replace(/\s+/g, '-'))) {
        score += 5;
      }
    }

    // Featured image (0-10 points)
    maxScore += 10;
    if (editorState.featured_image_url) {
      score += 10;
    }

    // Tags (0-5 points)
    maxScore += 5;
    if (editorState.tags.length > 0) {
      score += 5;
    }

    // Excerpt (0-5 points)
    maxScore += 5;
    if (editorState.excerpt) {
      score += 5;
    }

    // Social meta (0-10 points)
    maxScore += 10;
    if (editorState.open_graph_title || editorState.twitter_title) {
      score += 5;
    }
    if (editorState.open_graph_description || editorState.twitter_description) {
      score += 5;
    }

    const percentage = Math.round((score / maxScore) * 100);
    
    let color = 'red';
    let status = 'Poor';
    
    if (percentage >= 80) {
      color = 'green';
      status = 'Excellent';
    } else if (percentage >= 60) {
      color = 'yellow';
      status = 'Good';
    } else if (percentage >= 40) {
      color = 'orange';
      status = 'Fair';
    }

    return { score: percentage, color, status };
  };

  // Generate recommendations
  const getRecommendations = (): string[] => {
    const recommendations: string[] = [];

    if (editorState.title.length < 30) {
      recommendations.push('Consider making your title longer (30-60 characters)');
    } else if (editorState.title.length > 60) {
      recommendations.push('Consider shortening your title (under 60 characters)');
    }

    if (!editorState.meta_description) {
      recommendations.push('Add a meta description');
    } else if (editorState.meta_description.length < 120) {
      recommendations.push('Make your meta description longer (120-160 characters)');
    } else if (editorState.meta_description.length > 160) {
      recommendations.push('Shorten your meta description (under 160 characters)');
    }

    if (!editorState.target_keyword) {
      recommendations.push('Set a focus keyword for this post');
    }

    if (!editorState.featured_image_url) {
      recommendations.push('Add a featured image');
    }

    if (editorState.tags.length === 0) {
      recommendations.push('Add some tags to help categorize your post');
    }

    if (!editorState.excerpt) {
      recommendations.push('Write a custom excerpt');
    }

    const wordCount = editorState.content.split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount < 300) {
      recommendations.push('Consider adding more content (aim for 300+ words)');
    }

    return recommendations;
  };

  const seoScore = calculateSEOScore();
  const recommendations = getRecommendations();

  if (!visible) {
    return (
      <div className="lg:block hidden">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4" style={{ zIndex: 11 }}>
          <p className="text-sm text-gray-500 text-center">SEO tools hidden</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" style={{ zIndex: 11 }}>
      {/* SEO Score */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4" style={{ zIndex: 12 }}>
        <h3 className="font-semibold text-gray-900 mb-3">SEO Score</h3>
        <div className="flex items-center space-x-3 mb-3">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full bg-${seoScore.color === 'yellow' ? 'yellow-400' : seoScore.color === 'orange' ? 'orange-400' : seoScore.color === 'green' ? 'green-400' : 'red-400'}`}
              style={{ width: `${seoScore.score}%` }}
            ></div>
          </div>
          <span className={`text-sm font-medium text-${seoScore.color === 'yellow' ? 'yellow-600' : seoScore.color === 'orange' ? 'orange-600' : seoScore.color === 'green' ? 'green-600' : 'red-600'}`}>
            {seoScore.score}%
          </span>
        </div>
        <p className={`text-sm text-${seoScore.color === 'yellow' ? 'yellow-600' : seoScore.color === 'orange' ? 'orange-600' : seoScore.color === 'green' ? 'green-600' : 'red-600'}`}>
          {seoScore.status}
        </p>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4" style={{ zIndex: 12 }}>
          <h3 className="font-semibold text-gray-900 mb-3">Recommendations</h3>
          <ul className="space-y-2">
            {recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-start">
                <span className="text-yellow-500 mr-2">⚠</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* SEO Settings Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ zIndex: 12 }}>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex-1 py-2 px-3 text-sm font-medium border-b-2 ${
                activeTab === 'general'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              style={{ zIndex: 13 }}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab('social')}
              className={`flex-1 py-2 px-3 text-sm font-medium border-b-2 ${
                activeTab === 'social'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              style={{ zIndex: 13 }}
            >
              Social
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`flex-1 py-2 px-3 text-sm font-medium border-b-2 ${
                activeTab === 'analysis'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              style={{ zIndex: 13 }}
            >
              Analysis
            </button>
          </nav>
        </div>

        <div className="p-4">
          {activeTab === 'general' && (
            <div className="space-y-4">
              {/* Target Keyword */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Focus Keyword
                </label>
                <input
                  type="text"
                  value={editorState.target_keyword}
                  onChange={(e) => onChange({ ...editorState, target_keyword: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="Enter focus keyword"
                  style={{ zIndex: 13 }}
                />
              </div>

              {/* Meta Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SEO Title (<span className={editorState.meta_title.length > 60 ? 'text-red-600 font-medium' : 'text-gray-600'}>{editorState.meta_title.length}/60</span>)
                </label>
                <input
                  type="text"
                  value={editorState.meta_title}
                  onChange={(e) => onChange({ ...editorState, meta_title: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="SEO title (defaults to post title)"
                  style={{ zIndex: 13 }}
                />
              </div>

              {/* Meta Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meta Description (<span className={editorState.meta_description.length > 160 ? 'text-red-600 font-medium' : 'text-gray-600'}>{editorState.meta_description.length}/160</span>)
                </label>
                <textarea
                  value={editorState.meta_description}
                  onChange={(e) => onChange({ ...editorState, meta_description: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm h-20 resize-none"
                  placeholder="Brief description for search engines"
                  style={{ zIndex: 13 }}
                />
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Excerpt
                </label>
                <textarea
                  value={editorState.excerpt}
                  onChange={(e) => onChange({ ...editorState, excerpt: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm h-20 resize-none"
                  placeholder="Custom excerpt for blog listing"
                  style={{ zIndex: 13 }}
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={editorState.tags.join(', ')}
                  onChange={(e) => onChange({ 
                    ...editorState, 
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) 
                  })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="tag1, tag2, tag3"
                  style={{ zIndex: 13 }}
                />
              </div>

              {/* Featured Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Featured Image URL
                </label>
                <input
                  type="url"
                  value={editorState.featured_image_url}
                  onChange={(e) => onChange({ ...editorState, featured_image_url: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="https://example.com/image.jpg"
                  style={{ zIndex: 13 }}
                />
                {editorState.featured_image_url && (
                  <img 
                    src={editorState.featured_image_url} 
                    alt="Featured" 
                    className="mt-2 w-full h-32 object-cover rounded"
                    style={{ zIndex: 13 }}
                  />
                )}
              </div>
            </div>
          )}

          {activeTab === 'social' && (
            <div className="space-y-4">
              {/* Open Graph */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Open Graph (Facebook)</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      OG Title (<span className={editorState.open_graph_title.length > 60 ? 'text-red-600 font-medium' : 'text-gray-500'}>{editorState.open_graph_title.length}/60</span>)
                    </label>
                    <input
                      type="text"
                      value={editorState.open_graph_title}
                      onChange={(e) => onChange({ ...editorState, open_graph_title: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="OG Title (defaults to post title)"
                      style={{ zIndex: 13 }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      OG Description (<span className={editorState.open_graph_description.length > 160 ? 'text-red-600 font-medium' : 'text-gray-500'}>{editorState.open_graph_description.length}/160</span>)
                    </label>
                    <textarea
                      value={editorState.open_graph_description}
                      onChange={(e) => onChange({ ...editorState, open_graph_description: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm h-16 resize-none"
                      placeholder="OG Description"
                      style={{ zIndex: 13 }}
                    />
                  </div>
                  <input
                    type="url"
                    value={editorState.open_graph_image}
                    onChange={(e) => onChange({ ...editorState, open_graph_image: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="OG Image URL"
                    style={{ zIndex: 13 }}
                  />
                </div>
              </div>

              {/* Twitter Card */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Twitter Card</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Twitter Title (<span className={editorState.twitter_title.length > 70 ? 'text-red-600 font-medium' : 'text-gray-500'}>{editorState.twitter_title.length}/70</span>)
                    </label>
                    <input
                      type="text"
                      value={editorState.twitter_title}
                      onChange={(e) => onChange({ ...editorState, twitter_title: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="Twitter Title"
                      style={{ zIndex: 13 }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Twitter Description (<span className={editorState.twitter_description.length > 200 ? 'text-red-600 font-medium' : 'text-gray-500'}>{editorState.twitter_description.length}/200</span>)
                    </label>
                    <textarea
                      value={editorState.twitter_description}
                      onChange={(e) => onChange({ ...editorState, twitter_description: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm h-16 resize-none"
                      placeholder="Twitter Description"
                      style={{ zIndex: 13 }}
                    />
                  </div>
                  <input
                    type="url"
                    value={editorState.twitter_image}
                    onChange={(e) => onChange({ ...editorState, twitter_image: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Twitter Image URL"
                    style={{ zIndex: 13 }}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Content Analysis</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Word Count:</span>
                    <span>{editorState.content.split(/\s+/).filter(w => w.length > 0).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Character Count:</span>
                    <span>{editorState.content.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Title Length:</span>
                    <span className={editorState.title.length > 60 ? 'text-red-600' : editorState.title.length < 30 ? 'text-yellow-600' : 'text-green-600'}>
                      {editorState.title.length}/60
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Meta Desc Length:</span>
                    <span className={editorState.meta_description.length > 160 ? 'text-red-600' : editorState.meta_description.length < 120 ? 'text-yellow-600' : 'text-green-600'}>
                      {editorState.meta_description.length}/160
                    </span>
                  </div>
                </div>
              </div>

              {editorState.target_keyword && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Keyword Analysis</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>In Title:</span>
                      <span className={editorState.title.toLowerCase().includes(editorState.target_keyword.toLowerCase()) ? 'text-green-600' : 'text-red-600'}>
                        {editorState.title.toLowerCase().includes(editorState.target_keyword.toLowerCase()) ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>In Meta Desc:</span>
                      <span className={editorState.meta_description.toLowerCase().includes(editorState.target_keyword.toLowerCase()) ? 'text-green-600' : 'text-red-600'}>
                        {editorState.meta_description.toLowerCase().includes(editorState.target_keyword.toLowerCase()) ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>In URL:</span>
                      <span className={editorState.slug.toLowerCase().includes(editorState.target_keyword.toLowerCase().replace(/\s+/g, '-')) ? 'text-green-600' : 'text-red-600'}>
                        {editorState.slug.toLowerCase().includes(editorState.target_keyword.toLowerCase().replace(/\s+/g, '-')) ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SEOSidebar;
