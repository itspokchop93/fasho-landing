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

## Support

For issues with:
- **Sanity Studio**: Check [Sanity Documentation](https://www.sanity.io/docs)
- **This Integration**: Review the code in `/src/lib/sanity/` or contact the development team
