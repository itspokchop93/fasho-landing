/**
 * Sanity Blog Post Schema
 * 
 * IMPORTANT: This is a reference schema file. Copy this to your Sanity Studio project.
 * 
 * To use:
 * 1. Create a new Sanity Studio project: npx sanity init
 * 2. Copy this file to: your-sanity-studio/schemas/post.js
 * 3. Import it in your schemas/index.js or schema.ts
 * 
 * For TypeScript, rename to post.ts and keep the same content.
 */

// If using TypeScript in Sanity Studio, add: import { defineField, defineType } from 'sanity';
// And replace all `{}` objects with the proper defineField/defineType calls.

export default {
  name: 'post',
  title: 'Blog Post',
  type: 'document',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'seo', title: 'SEO & Meta' },
    { name: 'settings', title: 'Settings' },
  ],
  fields: [
    // === CONTENT GROUP ===
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (Rule) => Rule.required().max(100).error('Title is required and must be under 100 characters'),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: {
        source: 'title',
        maxLength: 96,
        slugify: (input) =>
          input
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '')
            .slice(0, 96),
      },
      validation: (Rule) => Rule.required().error('Slug is required for the URL'),
    },
    {
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      group: 'content',
      rows: 3,
      description: 'A brief summary of the post (used in listings and previews)',
      validation: (Rule) => Rule.max(300).warning('Excerpt should be under 300 characters for best display'),
    },
    {
      name: 'coverImage',
      title: 'Cover Image',
      type: 'image',
      group: 'content',
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alternative Text',
          description: 'Describe the image for accessibility and SEO',
          validation: (Rule) => Rule.required().error('Alt text is required for accessibility'),
        },
      ],
    },
    {
      name: 'body',
      title: 'Content',
      type: 'array',
      group: 'content',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'H1', value: 'h1' },
            { title: 'H2', value: 'h2' },
            { title: 'H3', value: 'h3' },
            { title: 'H4', value: 'h4' },
            { title: 'Quote', value: 'blockquote' },
          ],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
              { title: 'Underline', value: 'underline' },
              { title: 'Strike', value: 'strike-through' },
              { title: 'Code', value: 'code' },
              { title: 'Highlight', value: 'highlight' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  {
                    name: 'href',
                    type: 'url',
                    title: 'URL',
                    validation: (Rule) =>
                      Rule.uri({
                        allowRelative: true,
                        scheme: ['http', 'https', 'mailto', 'tel'],
                      }),
                  },
                ],
              },
            ],
          },
        },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            {
              name: 'alt',
              type: 'string',
              title: 'Alternative Text',
            },
            {
              name: 'caption',
              type: 'string',
              title: 'Caption',
            },
          ],
        },
        {
          name: 'code',
          type: 'object',
          title: 'Code Block',
          fields: [
            { name: 'code', type: 'text', title: 'Code' },
            { name: 'language', type: 'string', title: 'Language' },
          ],
        },
      ],
      validation: (Rule) => Rule.required().error('Content is required'),
    },
    {
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      group: 'content',
      description: 'Set to schedule the post for a future date',
      initialValue: () => new Date().toISOString(),
    },
    {
      name: 'tags',
      title: 'Tags',
      type: 'array',
      group: 'content',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags',
      },
    },
    {
      name: 'readTime',
      title: 'Read Time (minutes)',
      type: 'number',
      group: 'content',
      description: 'Estimated reading time. Leave blank to auto-calculate.',
      validation: (Rule) => Rule.min(1).max(60),
    },

    // === SEO GROUP ===
    {
      name: 'seoTitle',
      title: 'SEO Title',
      type: 'string',
      group: 'seo',
      description: 'Override the title for search engines (50-60 characters ideal)',
      validation: (Rule) => Rule.max(70).warning('SEO title should be under 70 characters'),
    },
    {
      name: 'seoDescription',
      title: 'SEO Description',
      type: 'text',
      group: 'seo',
      rows: 3,
      description: 'Meta description for search engines (150-160 characters ideal)',
      validation: (Rule) => Rule.max(200).warning('Meta description should be under 200 characters'),
    },
    {
      name: 'ogImage',
      title: 'Open Graph Image',
      type: 'image',
      group: 'seo',
      description: 'Custom image for social media sharing. Defaults to cover image if not set.',
      options: {
        hotspot: true,
      },
    },
    {
      name: 'canonicalUrl',
      title: 'Canonical URL',
      type: 'url',
      group: 'seo',
      description: 'Set if this content was originally published elsewhere',
    },
    {
      name: 'noindex',
      title: 'Hide from Search Engines',
      type: 'boolean',
      group: 'seo',
      description: 'Enable to prevent this page from being indexed by search engines',
      initialValue: false,
    },

    // === SETTINGS GROUP ===
    {
      name: 'redirectFrom',
      title: 'Redirect From (Old Slugs)',
      type: 'array',
      group: 'settings',
      of: [{ type: 'string' }],
      description: 'Add old slugs here when you change the URL. Visitors to old URLs will be redirected here with a 301.',
    },
    {
      name: 'author',
      title: 'Author',
      type: 'object',
      group: 'settings',
      fields: [
        {
          name: 'name',
          type: 'string',
          title: 'Name',
        },
        {
          name: 'image',
          type: 'image',
          title: 'Photo',
          options: { hotspot: true },
        },
      ],
    },
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'publishedAt',
      media: 'coverImage',
    },
    prepare({ title, subtitle, media }) {
      const formattedDate = subtitle
        ? new Date(subtitle).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : 'Draft';
      return {
        title,
        subtitle: formattedDate,
        media,
      };
    },
  },
  orderings: [
    {
      title: 'Published Date, Newest',
      name: 'publishedAtDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
    {
      title: 'Published Date, Oldest',
      name: 'publishedAtAsc',
      by: [{ field: 'publishedAt', direction: 'asc' }],
    },
    {
      title: 'Title A-Z',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }],
    },
  ],
};
