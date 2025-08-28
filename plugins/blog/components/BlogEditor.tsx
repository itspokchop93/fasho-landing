// WordPress-style Blog Editor with TipTap
// Full-featured WYSIWYG editor for creating and editing blog posts

import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import { BlogPost, BlogEditorState, SEOAnalysis } from '../types/blog';
import { generateSlug, cleanSlug, isValidSlug } from '../utils/slug-generator';
import SEOSidebar from './SEOSidebar';

interface BlogEditorProps {
  post?: BlogPost;
  onSave: () => void;
  onCancel: () => void;
}

const BlogEditor: React.FC<BlogEditorProps> = ({ post, onSave, onCancel }) => {
  const [editorState, setEditorState] = useState<BlogEditorState>({
    title: post?.title || '',
    content: post?.content || '',
    html_content: post?.html_content || '',
    excerpt: post?.excerpt || '',
    meta_description: post?.meta_description || '',
    meta_title: post?.meta_title || '',
    slug: post?.slug || '',
    tags: post?.tags || [],
    categories: [], // Will be populated from post relations
    featured_image_url: post?.featured_image_url || '',
    target_keyword: post?.target_keyword || '',
    status: post?.status || 'draft',
    scheduled_at: post?.scheduled_at,
    open_graph_title: post?.open_graph_title || '',
    open_graph_description: post?.open_graph_description || '',
    open_graph_image: post?.open_graph_image || '',
    twitter_title: post?.twitter_title || '',
    twitter_description: post?.twitter_description || '',
    twitter_image: post?.twitter_image || '',
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('');
  const [showSEOSidebar, setShowSEOSidebar] = useState(false);
  const [seoAnalysis, setSeoAnalysis] = useState<SEOAnalysis | null>(null);
  const [isSEOSectionCollapsed, setIsSEOSectionCollapsed] = useState(false);
  const [currentPost, setCurrentPost] = useState<BlogPost | null>(post || null);
  const [toast, setToast] = useState<{
    show: boolean;
    type: 'success' | 'info';
    message: string;
    linkText?: string;
    linkUrl?: string;
  }>({ show: false, type: 'success', message: '' });

  // Initialize TipTap editor
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Underline,
    ],
    content: editorState.html_content,
    editorProps: {
      attributes: {
        class: 'prose prose-lg prose-gray max-w-none min-h-[600px] focus:outline-none p-6 border border-gray-300 rounded-lg text-gray-900 leading-relaxed prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-h5:text-base prose-h6:text-sm prose-strong:font-bold prose-em:italic prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded',
        style: 'z-index: 10; font-size: 16px; line-height: 1.8;'
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      
      setEditorState(prev => ({
        ...prev,
        html_content: html,
        content: text
      }));
    },
  });

  // Initialize SEO section collapsed state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('blog-editor-seo-collapsed');
    if (savedState !== null) {
      setIsSEOSectionCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Auto-generate slug from title
  useEffect(() => {
    if (editorState.title && !post?.slug) {
      const newSlug = generateSlug(editorState.title);
      setEditorState(prev => ({ ...prev, slug: newSlug }));
    }
  }, [editorState.title, post?.slug]);

  // Toggle SEO section collapsed state and save to localStorage
  const toggleSEOSection = () => {
    const newCollapsedState = !isSEOSectionCollapsed;
    setIsSEOSectionCollapsed(newCollapsedState);
    localStorage.setItem('blog-editor-seo-collapsed', JSON.stringify(newCollapsedState));
  };

  // Show toast notification
  const showToast = (type: 'success' | 'info', message: string, linkText?: string, linkUrl?: string) => {
    setToast({ show: true, type, message, linkText, linkUrl });
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!editorState.title.trim()) return;
    if (isSaving) return; // Don't auto-save while manual save is in progress

    try {
      setAutoSaveStatus('Auto-saving...');
      console.log('🔄 AUTO-SAVE: Starting auto-save (content only, preserving status)...');
      
      // Auto-generate slug if empty or invalid for new posts
      let finalSlug = editorState.slug;
      if (!post && (!finalSlug || !isValidSlug(finalSlug))) {
        finalSlug = generateSlug(editorState.title);
      }

      // CRITICAL: Auto-save only content fields, NEVER the status
      const saveData = {
        title: editorState.title,
        content: editorState.content,
        html_content: editorState.html_content,
        excerpt: editorState.excerpt,
        meta_description: editorState.meta_description,
        meta_title: editorState.meta_title,
        slug: finalSlug,
        tags: editorState.tags,
        featured_image_url: editorState.featured_image_url,
        target_keyword: editorState.target_keyword,
        open_graph_title: editorState.open_graph_title,
        open_graph_description: editorState.open_graph_description,
        open_graph_image: editorState.open_graph_image,
        twitter_title: editorState.twitter_title,
        twitter_description: editorState.twitter_description,
        twitter_image: editorState.twitter_image,
        // NEVER include status, scheduled_at, or other publishing fields in auto-save
      };

      console.log('🔄 AUTO-SAVE: Sending content-only data (no status):', saveData);
      
      const response = await fetch(`/api/blog/admin/posts${post ? `/${post.id}` : ''}`, {
        method: post ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData),
      });

      const result = await response.json();

      if (response.ok) {
        setAutoSaveStatus(`Auto-saved at ${new Date().toLocaleTimeString()}`);
        console.log('✅ AUTO-SAVE: Success');
        
        // If this was a new post, update the post reference
        if (!post && result.data) {
          // This allows future saves to be updates instead of creates
          console.log('🆕 AUTO-SAVE: New post created, updating reference');
        }
      } else {
        console.error('❌ AUTO-SAVE: Failed:', result);
        setAutoSaveStatus('Auto-save failed');
      }
    } catch (error) {
      console.error('💥 AUTO-SAVE: Error:', error);
      setAutoSaveStatus('Auto-save failed');
    }
  }, [editorState, post, isSaving]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(autoSave, 30000);
    return () => clearInterval(interval);
  }, [autoSave]);

  // Handle manual save
  const handleSave = async (status: BlogPost['status'] = 'draft') => {
    // Prevent multiple simultaneous saves
    if (isSaving) {
      console.log('🚫 BLOG-EDITOR: Save already in progress, ignoring duplicate request');
      return;
    }

    if (!editorState.title.trim()) {
      alert('Please enter a title for your post');
      return;
    }

    // Auto-generate slug if empty
    let finalSlug = editorState.slug;
    if (!finalSlug || !isValidSlug(finalSlug)) {
      finalSlug = generateSlug(editorState.title);
    }

    if (!isValidSlug(finalSlug)) {
      alert('Please enter a valid URL slug');
      return;
    }

    try {
      setIsSaving(true);

      const saveData = {
        ...editorState,
        slug: finalSlug,
        status,
        published_at: status === 'published' ? new Date().toISOString() : undefined
      };

      console.log('🚀 BLOG-EDITOR: Sending data:', saveData);

      const response = await fetch(`/api/blog/admin/posts${post ? `/${post.id}` : ''}`, {
        method: post ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData),
      });

      if (response.ok) {
        const result = await response.json();
        const savedPost = result.data;
        
        // Update current post state
        setCurrentPost(savedPost);
        
        // Show appropriate toast notification
        if (status === 'published') {
          showToast(
            'success', 
            'Post successfully published!', 
            'View Now', 
            `/blog/${savedPost.slug}`
          );
        } else if (status === 'draft') {
          showToast('info', 'Post successfully saved as draft');
        } else {
          showToast('success', `Post successfully saved as ${status}`);
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to save: ${errorData.error}`);
      }
    } catch (error) {
      alert('Failed to save post');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle image upload
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create object URL for preview
    const url = URL.createObjectURL(file);
    
    // Insert image into editor
    editor?.chain().focus().setImage({ src: url }).run();
    
    // TODO: Implement actual file upload to storage
    console.log('Image upload needs to be implemented:', file);
  }, [editor]);

  // Handle link insertion
  const setLink = useCallback(() => {
    const previousUrl = editor?.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  // Toolbar button component
  const ToolbarButton: React.FC<{
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title?: string;
  }> = ({ onClick, isActive, children, title }) => (
    <button
      onClick={onClick}
      className={`p-2 rounded border ${
        isActive 
          ? 'bg-blue-100 border-blue-300 text-blue-700' 
          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
      }`}
      title={title}
      type="button"
      style={{ zIndex: 12 }}
    >
      {children}
    </button>
  );

  return (
    <div className="w-full max-w-none mx-auto px-4" style={{ zIndex: 10 }}>
      <div className="flex gap-8">
        {/* Main Editor Column - Much Wider */}
        <div className="flex-1 min-w-0 space-y-6" style={{ zIndex: 11 }}>
          {/* Top Action Buttons */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4" style={{ zIndex: 13 }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => handleSave('draft')}
                  disabled={isSaving}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                  style={{ zIndex: 14 }}
                >
                  {isSaving ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  onClick={() => handleSave('published')}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                  style={{ zIndex: 14 }}
                >
                  {post?.status === 'published' ? 'Update' : 'Publish'}
                </button>
                {/* View Post Button - Only show for published posts */}
                {currentPost?.status === 'published' && currentPost?.slug && (
                  <button
                    onClick={() => window.open(`/blog/${currentPost.slug}`, '_blank')}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
                    style={{ zIndex: 14 }}
                  >
                    View Post
                  </button>
                )}
              </div>
              
              <div className="flex items-center space-x-4">
                {autoSaveStatus && (
                  <span className="text-sm text-green-600">{autoSaveStatus}</span>
                )}
                <button
                  onClick={onCancel}
                  className="text-gray-600 hover:text-gray-800 font-medium"
                  style={{ zIndex: 14 }}
                >
                  Back to Posts
                </button>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" style={{ zIndex: 12 }}>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {post ? 'Edit Post' : 'Create New Post'}
              </h1>
              <div className="flex items-center space-x-3">
                {/* Status Flag/Badge */}
                {currentPost && (
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold uppercase tracking-wide ${
                    currentPost.status === 'published' 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : currentPost.status === 'draft'
                      ? 'bg-gray-100 text-gray-800 border border-gray-200'
                      : currentPost.status === 'scheduled'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  }`} style={{ zIndex: 14 }}>
                    {currentPost.status}
                  </div>
                )}
                {autoSaveStatus && (
                  <span className="text-sm text-green-600">{autoSaveStatus}</span>
                )}
              </div>
            </div>

            {/* Title Input */}
            <input
              type="text"
              placeholder="Enter post title..."
              value={editorState.title}
              onChange={(e) => setEditorState(prev => ({ ...prev, title: e.target.value }))}
              className="w-full text-3xl font-bold border-none outline-none placeholder-gray-400 mb-4"
              style={{ zIndex: 13 }}
            />

            {/* Slug Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL Slug
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-gray-500 text-sm">/blog/</span>
                <input
                  type="text"
                  value={editorState.slug}
                  onChange={(e) => setEditorState(prev => ({ ...prev, slug: cleanSlug(e.target.value) }))}
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                  style={{ zIndex: 13 }}
                />
              </div>
            </div>
          </div>

          {/* SEO Settings - Full Width with Collapsible */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200" style={{ zIndex: 12 }}>
            {/* SEO Settings Header with Chevron */}
            <div 
              className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={toggleSEOSection}
            >
              <h2 className="text-lg font-semibold text-gray-900">SEO Settings</h2>
              <div className="flex items-center">
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                    isSEOSectionCollapsed ? '-rotate-90' : 'rotate-0'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ zIndex: 13 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            {/* SEO Settings Content - Collapsible */}
            {!isSEOSectionCollapsed && (
              <div className="px-6 pb-6">
                <SEOSidebar
                  editorState={editorState}
                  onChange={setEditorState}
                  seoAnalysis={seoAnalysis}
                  visible={true}
                />
              </div>
            )}
          </div>

          {/* Editor Toolbar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8" style={{ zIndex: 12 }}>
            <div className="flex flex-wrap gap-3 mb-6 pb-6 border-b border-gray-200">
              {/* Text Formatting */}
              <div className="flex gap-1">
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  isActive={editor?.isActive('bold')}
                  title="Bold"
                >
                  <strong>B</strong>
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  isActive={editor?.isActive('italic')}
                  title="Italic"
                >
                  <em>I</em>
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  isActive={editor?.isActive('underline')}
                  title="Underline"
                >
                  <u>U</u>
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleStrike().run()}
                  isActive={editor?.isActive('strike')}
                  title="Strikethrough"
                >
                  <s>S</s>
                </ToolbarButton>
              </div>

              {/* Headings */}
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6].map((level) => (
                  <ToolbarButton
                    key={level}
                    onClick={() => editor?.chain().focus().toggleHeading({ level: level as any }).run()}
                    isActive={editor?.isActive('heading', { level })}
                    title={`Heading ${level}`}
                  >
                    H{level}
                  </ToolbarButton>
                ))}
              </div>

              {/* Lists */}
              <div className="flex gap-1">
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  isActive={editor?.isActive('bulletList')}
                  title="Bullet List"
                >
                  •
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  isActive={editor?.isActive('orderedList')}
                  title="Numbered List"
                >
                  1.
                </ToolbarButton>
              </div>

              {/* Links and Media */}
              <div className="flex gap-1">
                <ToolbarButton
                  onClick={setLink}
                  isActive={editor?.isActive('link')}
                  title="Insert Link"
                >
                  🔗
                </ToolbarButton>
                <label className="p-2 rounded border bg-white border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer" style={{ zIndex: 12 }}>
                  📷
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Other */}
              <div className="flex gap-1">
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                  isActive={editor?.isActive('blockquote')}
                  title="Quote"
                >
                  "
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                  isActive={editor?.isActive('codeBlock')}
                  title="Code Block"
                >
                  &lt;/&gt;
                </ToolbarButton>
              </div>
            </div>

            {/* Editor Content */}
            <div className="relative">
              <EditorContent editor={editor} />
              <style jsx global>{`
                .ProseMirror h1 {
                  font-size: 2rem;
                  font-weight: bold;
                  margin: 1.5rem 0 1rem 0;
                  line-height: 1.2;
                  color: #1f2937;
                }
                .ProseMirror h2 {
                  font-size: 1.75rem;
                  font-weight: bold;
                  margin: 1.25rem 0 0.75rem 0;
                  line-height: 1.3;
                  color: #1f2937;
                }
                .ProseMirror h3 {
                  font-size: 1.5rem;
                  font-weight: bold;
                  margin: 1rem 0 0.5rem 0;
                  line-height: 1.4;
                  color: #1f2937;
                }
                .ProseMirror h4 {
                  font-size: 1.25rem;
                  font-weight: bold;
                  margin: 0.75rem 0 0.5rem 0;
                  line-height: 1.4;
                  color: #1f2937;
                }
                .ProseMirror h5 {
                  font-size: 1.125rem;
                  font-weight: bold;
                  margin: 0.75rem 0 0.5rem 0;
                  line-height: 1.4;
                  color: #1f2937;
                }
                .ProseMirror h6 {
                  font-size: 1rem;
                  font-weight: bold;
                  margin: 0.5rem 0 0.25rem 0;
                  line-height: 1.4;
                  color: #1f2937;
                }
                .ProseMirror strong {
                  font-weight: bold;
                }
                .ProseMirror em {
                  font-style: italic;
                }
                .ProseMirror u {
                  text-decoration: underline;
                }
                .ProseMirror s {
                  text-decoration: line-through;
                }
                .ProseMirror blockquote {
                  border-left: 4px solid #d1d5db;
                  padding-left: 1rem;
                  margin: 1rem 0;
                  font-style: italic;
                  color: #6b7280;
                }
                .ProseMirror code {
                  background-color: #f3f4f6;
                  padding: 0.125rem 0.25rem;
                  border-radius: 0.25rem;
                  font-family: 'Courier New', monospace;
                  font-size: 0.875rem;
                }
                .ProseMirror pre {
                  background-color: #1f2937;
                  color: #f9fafb;
                  padding: 1rem;
                  border-radius: 0.5rem;
                  overflow-x: auto;
                  margin: 1rem 0;
                }
                .ProseMirror pre code {
                  background-color: transparent;
                  padding: 0;
                  color: inherit;
                }
                .ProseMirror ul, .ProseMirror ol {
                  margin: 1rem 0;
                  padding-left: 1.5rem;
                }
                .ProseMirror li {
                  margin: 0.25rem 0;
                }
                .ProseMirror p {
                  margin: 0.75rem 0;
                  line-height: 1.7;
                }
                .ProseMirror img {
                  max-width: 100%;
                  height: auto;
                  border-radius: 0.5rem;
                  margin: 1rem 0;
                }
                .ProseMirror a {
                  color: #2563eb;
                  text-decoration: underline;
                }
                .ProseMirror a:hover {
                  color: #1d4ed8;
                }
              `}</style>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4" style={{ zIndex: 12 }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => handleSave('draft')}
                  disabled={isSaving}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                  style={{ zIndex: 13 }}
                >
                  {isSaving ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  onClick={() => handleSave('published')}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                  style={{ zIndex: 13 }}
                >
                  {post?.status === 'published' ? 'Update' : 'Publish'}
                </button>
                {/* View Post Button - Only show for published posts */}
                {currentPost?.status === 'published' && currentPost?.slug && (
                  <button
                    onClick={() => window.open(`/blog/${currentPost.slug}`, '_blank')}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
                    style={{ zIndex: 13 }}
                  >
                    View Post
                  </button>
                )}
              </div>
              
              <div className="flex items-center space-x-4">
                {autoSaveStatus && (
                  <span className="text-sm text-green-600">{autoSaveStatus}</span>
                )}
                <button
                  onClick={onCancel}
                  className="text-gray-600 hover:text-gray-800 font-medium"
                  style={{ zIndex: 13 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        {toast.show && (
          <div 
            className={`fixed top-4 right-4 z-50 max-w-sm w-full transform transition-all duration-300 ease-in-out ${
              toast.show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            }`}
            style={{ zIndex: 9999 }}
          >
            <div className={`rounded-lg shadow-lg p-4 ${
              toast.type === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {toast.type === 'success' ? (
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3 w-0 flex-1">
                  <p className={`text-sm font-medium ${
                    toast.type === 'success' ? 'text-green-800' : 'text-blue-800'
                  }`}>
                    {toast.message}
                  </p>
                  {toast.linkText && toast.linkUrl && (
                    <a
                      href={toast.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mt-1 text-sm underline hover:no-underline font-medium ${
                        toast.type === 'success' ? 'text-green-600 hover:text-green-500' : 'text-blue-600 hover:text-blue-500'
                      }`}
                    >
                      {toast.linkText}
                    </a>
                  )}
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    className={`rounded-md inline-flex ${
                      toast.type === 'success' ? 'text-green-400 hover:text-green-500' : 'text-blue-400 hover:text-blue-500'
                    } focus:outline-none`}
                    onClick={() => setToast(prev => ({ ...prev, show: false }))}
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default BlogEditor;
