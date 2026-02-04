# Sanity CMS Setup Guide for Fasho Blog

This guide will help you set up Sanity CMS as the primary blog management system for Fasho.

## Overview

The Fasho website now supports **Sanity CMS** as the primary blog system, with your existing blog posts still working as a fallback. This gives you:

- ✅ A professional WordPress-like editing experience
- ✅ Works from anywhere (not just localhost)
- ✅ Reliable publishing on Vercel production
- ✅ SEO-friendly with 301 redirects for slug changes
- ✅ All existing blog posts continue to work

---

## Step 1: Create a Sanity Project

1. Go to [sanity.io](https://www.sanity.io/) and sign up or log in
2. Create a new project:
   - Click "Create new project"
   - Name it something like "fasho-blog"
   - Choose the "Production" dataset
   - Select the "Clean project with no predefined schemas" template

3. Note down your **Project ID** from the project dashboard

---

## Step 2: Set Up Sanity Studio

### Option A: Use Sanity CLI (Recommended)

```bash
# Install Sanity CLI globally
npm install -g @sanity/cli

# Create a new Sanity Studio project
sanity init

# When prompted:
# - Use your existing project
# - Select your project ID
# - Choose a dataset (production)
# - Select "Empty project"
```

### Option B: Clone a starter

You can also start from the [Sanity Blog Starter](https://www.sanity.io/templates/blog-template).

---

## Step 3: Add the Blog Post Schema

Copy the schema file from this repo to your Sanity Studio project:

```bash
# From fasho-landing directory
cp docs/sanity-schema-post.js your-sanity-studio/schemas/post.js
```

Then update your Sanity Studio's `schema.ts` or `index.ts` to include the post schema:

```typescript
// schemas/index.ts
import post from './post'

export const schemaTypes = [post]
```

---

## Step 4: Deploy Sanity Studio

Deploy your Studio to get a public URL:

```bash
cd your-sanity-studio
sanity deploy
```

Choose a hostname (e.g., `fasho-blog`). Your Studio will be available at:
`https://fasho-blog.sanity.studio`

---

## Step 5: Configure Environment Variables

Add these environment variables to your Vercel project (and `.env.local` for development):

```env
# Required: Your Sanity project ID
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id

# Required: Your dataset name (usually "production")
NEXT_PUBLIC_SANITY_DATASET=production

# Required: Your deployed Studio URL
NEXT_PUBLIC_SANITY_STUDIO_URL=https://your-studio.sanity.studio

# Optional: API version (date format)
SANITY_API_VERSION=2024-01-01

# Required for webhook revalidation: A random secret string
SANITY_WEBHOOK_SECRET=9YxH2mVqQfR7kL3pTnW8cD1sZ5gJ0aB6uE4iO7rN2xV9hS3yKpL8tM1wQ6cF0dR


# Optional: For preview mode (drafts)
SANITY_READ_TOKEN=your-read-token-from-sanity
```

To generate a webhook secret, you can use:
```bash
openssl rand -hex 32
```

---

## Step 6: Set Up Webhook for Revalidation

This ensures your website updates when you publish content in Sanity:

1. Go to [Sanity Manage](https://www.sanity.io/manage) → Your Project → API → Webhooks
2. Click "Add webhook"
3. Configure:
   - **Name**: Fasho Blog Revalidation
   - **URL**: `https://fasho.co/api/sanity/revalidate`
   - **Dataset**: production
   - **Trigger on**: Create, Update, Delete
   - **Filter**: `_type == "post"`
   - **Secret**: (paste your SANITY_WEBHOOK_SECRET value)
   - **HTTP Headers**: Add `sanity-webhook-secret` with your secret value

4. Save the webhook

---

## Step 7: Configure CORS (if needed)

If you encounter CORS errors when fetching content:

1. Go to [Sanity Manage](https://www.sanity.io/manage) → Your Project → API → CORS Origins
2. Add your origins:
   - `http://localhost:3000` (for development)
   - `https://fasho.co` (for production)
   - `https://www.fasho.co` (if using www)

---

## How the Integration Works

### Resolution Order (for `/blog/[slug]`)

1. **Sanity Published Post** → If a published Sanity post exists with the slug, render it
2. **Sanity Redirect** → If slug matches `redirectFrom` on a Sanity post, 301 redirect to new slug
3. **Legacy Fallback** → If not found in Sanity, check the old Supabase blog system
4. **404** → If not found anywhere

### Blog Index (`/blog`)

- Lists **Sanity posts first** (primary)
- Legacy posts are merged in, but Sanity takes precedence for duplicate slugs
- Collision logging in development mode

### Admin Dashboard (`/admin?p=blog`)

- Now prominently displays a link to **Sanity Studio**
- Legacy controls are labeled as "Legacy" and still functional
- Stats show both Sanity and legacy post counts

---

## Migrating Existing Posts

To migrate your ~5 existing posts to Sanity:

1. Open Sanity Studio
2. Create new posts with the **exact same slugs** as your legacy posts
3. Copy the content (you may need to reformat for Portable Text)
4. Publish the posts in Sanity

Once migrated, the Sanity version will take precedence over the legacy version.

---

## Troubleshooting

### "Sanity Not Configured" in Admin

- Ensure `NEXT_PUBLIC_SANITY_PROJECT_ID` is set
- Ensure `NEXT_PUBLIC_SANITY_STUDIO_URL` is set
- Redeploy your Vercel project after adding environment variables

### Posts Not Updating After Publishing

- Check that your webhook is configured correctly
- Verify the webhook secret matches `SANITY_WEBHOOK_SECRET`
- Check Vercel function logs for revalidation errors

### Images Not Loading

- Ensure `cdn.sanity.io` is in your Next.js `remotePatterns` (already configured)
- Check that images have the required alt text

### 404 for Sanity Posts

- Ensure the post has a `publishedAt` date that is in the past
- Check that the slug is set and valid
- Verify the post is published (not a draft)

---

## External AI Blog Writer Integration

This section documents how to configure an external AI Blog Writer to push draft posts to Sanity.

### Overview

The AI writer creates **draft posts** via the Sanity API. These drafts:
- ✅ Appear in Sanity Studio for editing
- ✅ Can be reviewed and published by your team
- ❌ Do NOT appear on the public website until published

### Required Configuration for AI Writer

Provide these values to your AI writer application:

```javascript
// Sanity Configuration
const config = {
  projectId: 'vwqzooxn',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: 'YOUR_WRITE_TOKEN', // See "Creating a Write Token" below
  useCdn: false, // Must be false for writes
};
```

### Creating a Write Token

1. Go to [Sanity Manage → API → Tokens](https://www.sanity.io/manage/project/vwqzooxn/api/tokens)
2. Click **"Add API token"**
3. Configure:
   - **Name**: `AI Blog Writer`
   - **Permissions**: `Editor` (or `Write` if available)
4. Copy the generated token
5. Store it securely in your AI writer's environment variables

⚠️ **Security Warning**: Never expose this token in client-side code or commit it to git.

### Post Schema for AI Writer

The AI writer should send posts in this format:

```javascript
const post = {
  // Required: Use drafts.{unique-id} pattern for drafts
  _id: `drafts.${generateUniqueId()}`,
  _type: 'post',
  
  // Required fields
  title: 'Your Post Title',
  slug: {
    _type: 'slug',
    current: 'your-post-slug',
  },
  body: [
    // Portable Text blocks (see below)
  ],
  
  // Optional fields
  excerpt: 'A brief summary of the post...',
  seoTitle: 'SEO Title | Fasho Blog',
  seoDescription: 'Meta description for search engines',
  tags: ['music', 'promotion'],
  readTime: 5,
  
  // Do NOT set publishedAt for drafts
  // publishedAt: null, // Leave undefined or null
};
```

### Portable Text Body Format

The `body` field uses Sanity's Portable Text format:

```javascript
const body = [
  // Paragraph
  {
    _type: 'block',
    _key: 'unique-key-1',
    style: 'normal',
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: 'span-1',
        text: 'This is a paragraph.',
        marks: [],
      },
    ],
  },
  
  // Heading
  {
    _type: 'block',
    _key: 'unique-key-2',
    style: 'h2', // h1, h2, h3, h4
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: 'span-2',
        text: 'This is a heading',
        marks: [],
      },
    ],
  },
  
  // Bold/Italic text
  {
    _type: 'block',
    _key: 'unique-key-3',
    style: 'normal',
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: 'span-3',
        text: 'This is bold',
        marks: ['strong'], // 'em' for italic, 'underline', 'code'
      },
    ],
  },
  
  // Link
  {
    _type: 'block',
    _key: 'unique-key-4',
    style: 'normal',
    markDefs: [
      {
        _type: 'link',
        _key: 'link-1',
        href: 'https://example.com',
      },
    ],
    children: [
      {
        _type: 'span',
        _key: 'span-4',
        text: 'Click here',
        marks: ['link-1'],
      },
    ],
  },
  
  // Blockquote
  {
    _type: 'block',
    _key: 'unique-key-5',
    style: 'blockquote',
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: 'span-5',
        text: 'This is a quote.',
        marks: [],
      },
    ],
  },
];
```

### API Calls

**Create or Update Draft:**

```javascript
import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'vwqzooxn',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

// Create or update (upsert)
const result = await client.createOrReplace(post);
console.log('Draft created:', result._id);
```

**Check if slug exists:**

```javascript
const existing = await client.fetch(
  `*[_type == "post" && slug.current == $slug][0]._id`,
  { slug: 'your-slug' }
);

if (existing) {
  console.log('Slug already exists:', existing);
}
```

### Draft vs Published

- **Draft IDs** start with `drafts.` (e.g., `drafts.abc123`)
- **Published IDs** do NOT have the `drafts.` prefix
- When you click "Publish" in Studio, Sanity creates a published version
- The website only displays published posts (drafts are filtered out)

### Testing the Integration

Run the test script included in this repo:

```bash
# Set your write token
export SANITY_WRITE_TOKEN=your_token_here

# Run the test
node scripts/test-sanity-writer.js
```

This will:
1. Create a test draft post
2. Update it (upsert test)
3. Verify it doesn't appear in published queries
4. Provide instructions to verify in Studio

### Workflow Summary

1. **AI Writer** creates draft → `client.createOrReplace(post)`
2. **Draft appears in Sanity Studio** (under "Blog Post" → shows as "Draft")
3. **Editor reviews and publishes** in Studio
4. **Webhook triggers** → `/api/sanity/revalidate`
5. **Website updates** → Post appears on `/blog` and `/blog/[slug]`
6. **Sitemap auto-updates** → `/sitemap.xml` is regenerated with the new post

---

## Sitemap Integration

The sitemap automatically includes all published Sanity blog posts and updates when content changes.

### Sitemap URLs

| URL | Description |
|-----|-------------|
| `/sitemap.xml` | **Main sitemap** - Core pages + all blog posts (recommended for search engines) |
| `/blog/sitemap.xml` | Blog-only sitemap (includes `/blog` index + all posts) |

### How Auto-Update Works

When you publish, update, or unpublish a post in Sanity:

1. **Sanity webhook fires** → `POST /api/sanity/revalidate`
2. **Webhook handler**:
   - Revalidates affected blog pages (`/blog`, `/blog/[slug]`)
   - **Regenerates the sitemap** via `forceSitemapUpdate()`
3. **Sitemap cache is cleared** and fresh data is fetched from Sanity
4. **Search engines** see updated sitemap on next crawl

### Sitemap Features

- **`<lastmod>`** uses Sanity's `_updatedAt` field for accurate timestamps
- **Drafts are excluded** - Only published posts appear in sitemap
- **Image sitemap** - Featured images are included with `<image:image>` tags
- **News sitemap** - Recent posts (< 2 days) include `<news:news>` for Google News
- **Caching** - 5-minute in-memory cache with stale-while-revalidate for performance

### Webhook Configuration for Sitemap

The existing webhook at `/api/sanity/revalidate` handles sitemap updates. Ensure it's configured in Sanity with these triggers:

| Trigger | Sitemap Effect |
|---------|----------------|
| **Create** | New post added to sitemap (when published) |
| **Update** | Post `<lastmod>` updated |
| **Delete** | Post removed from sitemap |
| **Publish** | Post added to sitemap |
| **Unpublish** | Post removed from sitemap |

### Testing Sitemap Updates

1. **Publish a new post** in Sanity Studio
2. **Wait 10-30 seconds** for webhook to process
3. **Visit** `https://fasho.co/sitemap.xml?force=true` to force refresh
4. **Verify** the new post appears in the sitemap

### Sitemap Response Headers

The sitemap API returns helpful debugging headers:

```
X-Sitemap-Core-Pages: 10
X-Sitemap-Blog-Posts: 25
X-Sitemap-Blog-Cache: HIT
X-Sitemap-Blog-Age: 120
```

### CORS (Not Usually Needed)

If your AI writer runs server-side (Node.js), CORS is not an issue. If it runs in a browser, add the origin to:

[Sanity Manage → API → CORS Origins](https://www.sanity.io/manage/project/vwqzooxn/api/cors)

---

## Support

For issues with:
- **Sanity Studio**: Check [Sanity Documentation](https://www.sanity.io/docs)
- **This Integration**: Review the code in `/src/lib/sanity/` or contact the development team
