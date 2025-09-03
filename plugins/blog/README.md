# Blog Plugin System

A complete WordPress-style blogging system for Next.js applications with Supabase backend.

## 🚀 Features

### Core Functionality
- **WordPress-style Editor**: TipTap-powered WYSIWYG editor with full formatting options
- **Admin Dashboard**: Complete blog management interface integrated into existing admin panel
- **SEO Optimization**: Built-in SEO tools with meta tags, OpenGraph, Twitter Cards, and Schema.org markup
- **Webhook Integration**: Receives articles from Article Chef with full content processing
- **Publishing Workflow**: Draft saving, auto-save, scheduling, and version control
- **Public Pages**: SEO-optimized blog listing and individual post pages

### SEO & Performance
- **SEO Score Calculator**: Real-time SEO analysis like Yoast/RankMath
- **Meta Management**: Title, description, keywords, and social media optimization
- **URL Slugs**: Automatic and manual slug generation with uniqueness checking
- **Structured Data**: JSON-LD schema markup for better search engine understanding
- **XML Sitemap**: Auto-generated sitemap at `/api/blog/sitemap.xml`
- **RSS Feed**: Auto-generated RSS feed at `/api/blog/rss.xml`
- **View Tracking**: Page view analytics and engagement metrics

### Technical Architecture
- **Modular Design**: Self-contained plugin architecture for easy replication
- **Type Safety**: Full TypeScript implementation with comprehensive interfaces
- **Database Safety**: Non-destructive migrations with proper namespacing (`blog_*` tables)
- **Production Ready**: Error handling, logging, and security best practices

## 📁 Directory Structure

```
plugins/blog/
├── components/           # React components
│   ├── BlogDashboard.tsx    # Main admin dashboard
│   ├── BlogEditor.tsx       # TipTap WYSIWYG editor
│   ├── BlogPostList.tsx     # Admin post management
│   ├── SEOSidebar.tsx       # SEO optimization tools
│   ├── BlogAnalytics.tsx    # Analytics dashboard
│   └── BlogSettings.tsx     # Global blog settings
├── types/               # TypeScript interfaces
│   └── blog.ts             # All blog-related types
└── utils/               # Utility functions
    ├── supabase.ts         # Database operations
    └── slug-generator.ts   # URL slug utilities
```

## 🗄️ Database Schema

The system creates the following namespaced tables:

- `blog_posts` - Main blog posts with content and metadata
- `blog_categories` - Post categories and tags
- `blog_post_categories` - Many-to-many relationship table
- `blog_website_sources` - External source tracking (Article Chef)
- `blog_webhook_logs` - Webhook request logging
- `blog_analytics` - Post performance metrics

## 🔧 Installation & Setup

### 1. Install Dependencies
The required TipTap packages are already installed:
```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header @tiptap/extension-text-style @tiptap/extension-underline @tiptap/extension-strike @tiptap/extension-highlight @tiptap/pm
```

### 2. Run Database Migration
Execute the migration in Supabase SQL Editor:
```sql
-- Run: supabase/migrations/20250109130000_create_blog_system.sql
```

### 3. Access Admin Dashboard
Navigate to `/admin` and click the "Blog" tab (admin users only).

## 📡 Webhook Integration

### Article Chef Integration
The system receives blog articles via webhook at `/api/blog/webhook`:

```typescript
// Payload format from Article Chef
{
  article: {
    id: string;
    title: string;
    content: string;              // Plain text
    htmlContent: string;          // Full HTML with images
    excerpt?: string;
    metaDescription?: string;
    tags?: string[];
    featuredImageUrl?: string;
    targetKeyword: string;
    articleType: string;
    createdAt: string;
  },
  website: {
    id: string;
    name: string;
    url: string;
    description?: string;
  },
  metadata: {
    source: 'article-chef';
    version: '1.0';
    timestamp: string;
  }
}
```

### Webhook Features
- ✅ Payload validation and sanitization
- ✅ Duplicate article detection
- ✅ Automatic publishing
- ✅ Comprehensive logging
- ✅ Error handling and recovery

## 🎨 Editor Features

### TipTap WYSIWYG Editor
- **Text Formatting**: Bold, italic, underline, strikethrough, highlight
- **Headings**: H1-H6 with proper structure
- **Lists**: Ordered and unordered lists
- **Links**: Easy link insertion and editing
- **Images**: Drag-and-drop image support with alt text
- **Tables**: Full table editing capabilities
- **Code**: Inline code and code blocks
- **Quotes**: Blockquotes for emphasis
- **Auto-save**: Automatic draft saving every 30 seconds

### SEO Tools
- **SEO Score**: Real-time analysis with recommendations
- **Meta Optimization**: Title, description, keywords
- **Social Media**: OpenGraph and Twitter Card settings
- **Content Analysis**: Word count, readability, keyword density
- **URL Management**: Custom slug editing with validation

## 🌐 Public Pages

### Blog Index (`/blog`)
- **Responsive Design**: Mobile-first, optimized layout
- **Search & Filter**: Full-text search and tag filtering
- **Pagination**: Efficient page navigation
- **SEO Optimized**: Meta tags, canonical URLs, structured data

### Individual Posts (`/blog/[slug]`)
- **Full SEO**: Meta tags, OpenGraph, Twitter Cards, JSON-LD
- **Social Sharing**: Twitter, Facebook, LinkedIn integration
- **Related Posts**: Automatic related article suggestions
- **View Tracking**: Anonymous page view analytics
- **Breadcrumbs**: Clear navigation structure

## 🔒 Security & Performance

### Security Features
- **Row Level Security**: Supabase RLS policies for data protection
- **Input Sanitization**: Safe handling of user content
- **Webhook Validation**: Source verification and payload validation
- **Admin Only**: Blog management restricted to admin users

### Performance Optimizations
- **Lazy Loading**: Efficient component loading
- **Image Optimization**: Responsive images with proper sizing
- **Caching**: API response caching for better performance
- **Database Indexing**: Optimized queries with proper indexes

## 🔧 Configuration

### Blog Settings
Access via Admin Dashboard → Blog → Settings:
- **General**: Site title, description, posts per page
- **SEO**: Title templates, meta defaults, sitemap/RSS toggles
- **Social**: Twitter and Facebook integration
- **Analytics**: Google Analytics integration

### Environment Variables
No additional environment variables required - uses existing Supabase configuration.

## 📊 Analytics & Monitoring

### Built-in Analytics
- **View Tracking**: Page views and unique visitors
- **Popular Posts**: Most viewed content
- **Recent Activity**: Latest post interactions
- **SEO Performance**: Search engine optimization metrics

### Webhook Monitoring
- **Success/Failure Rates**: Webhook processing statistics
- **Error Logging**: Detailed error tracking and debugging
- **Source Tracking**: Article Chef integration monitoring

## 🚀 Usage Examples

### Creating a Post
1. Navigate to Admin → Blog → Add New
2. Enter title (slug auto-generates)
3. Use TipTap editor for content
4. Configure SEO settings in sidebar
5. Save as draft or publish immediately

### Webhook Testing
```bash
curl -X POST https://yourdomain.com/api/blog/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "article": {
      "id": "test-123",
      "title": "Test Article",
      "content": "Plain text content",
      "htmlContent": "<h1>Test Article</h1><p>HTML content</p>",
      "targetKeyword": "test"
    },
    "website": {
      "id": "site-123",
      "name": "Test Site",
      "url": "https://example.com"
    },
    "metadata": {
      "source": "article-chef",
      "version": "1.0",
      "timestamp": "2025-01-09T13:00:00Z"
    }
  }'
```

## 🔄 Migration & Replication

### Copying to Another Site
1. Copy `/plugins/blog/` directory
2. Copy API routes from `/src/pages/api/blog/`
3. Copy public pages from `/src/pages/blog/`
4. Run database migration
5. Update admin dashboard imports

### Database Migration Safety
- Uses `IF NOT EXISTS` for all table creation
- Proper foreign key constraints
- Rollback-safe operations
- Preserves existing data

## 📚 API Reference

### Admin Endpoints
- `GET /api/blog/admin/posts` - List posts with filters
- `POST /api/blog/admin/posts` - Create new post
- `GET /api/blog/admin/posts/[id]` - Get single post
- `PATCH /api/blog/admin/posts/[id]` - Update post
- `DELETE /api/blog/admin/posts/[id]` - Delete post
- `GET /api/blog/admin/stats` - Dashboard statistics
- `GET /api/blog/admin/analytics` - Analytics data
- `GET|POST /api/blog/admin/settings` - Blog settings

### Public Endpoints
- `POST /api/blog/webhook` - Article Chef webhook receiver
- `POST /api/blog/posts/[id]/view` - Track page view
- `GET /api/blog/sitemap.xml` - XML sitemap
- `GET /api/blog/rss.xml` - RSS feed

## 🎯 Production Checklist

- ✅ Database migration completed
- ✅ Admin dashboard integrated
- ✅ Webhook endpoint configured
- ✅ Public pages accessible
- ✅ SEO optimization enabled
- ✅ Error handling implemented
- ✅ Security policies active
- ✅ Performance optimized

## 🆘 Troubleshooting

### Common Issues
1. **Webhook fails**: Check payload format and source validation
2. **Editor not loading**: Verify TipTap dependencies installed
3. **SEO tools not working**: Ensure all meta fields are properly configured
4. **Admin access denied**: Verify user has admin role in database
5. **Posts not displaying**: Check RLS policies and publication status

### Debug Endpoints
- Check webhook logs in `blog_webhook_logs` table
- Monitor admin API responses for error details
- Use browser dev tools for client-side debugging

This blog system provides enterprise-level functionality while maintaining the modular, reusable architecture specified in your requirements.


