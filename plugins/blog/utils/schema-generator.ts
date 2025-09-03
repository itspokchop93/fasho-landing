// Advanced Schema Markup Generator for Blog SEO
// Implements comprehensive JSON-LD structured data for maximum Google visibility

import { BlogPost } from '../types/blog';

export interface SchemaConfig {
  siteName: string;
  siteUrl: string;
  organizationName: string;
  organizationLogo: string;
  defaultAuthorName: string;
  defaultAuthorImage?: string;
  socialProfiles: string[];
}

export class SchemaMarkupGenerator {
  private config: SchemaConfig;

  constructor(config: SchemaConfig) {
    this.config = config;
  }

  // Generate comprehensive Article schema with all SEO signals
  generateArticleSchema(post: BlogPost, fullUrl: string): object {
    const publishedDate = post.published_at || post.created_at;
    const modifiedDate = post.updated_at || publishedDate;

    return {
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": fullUrl,
      "headline": post.title,
      "description": post.meta_description || post.excerpt,
      "image": this.generateImageSchema(post.featured_image_url),
      "datePublished": publishedDate,
      "dateModified": modifiedDate,
      "author": this.generateAuthorSchema(post.author_name, post.author_email),
      "publisher": this.generatePublisherSchema(),
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": fullUrl
      },
      "url": fullUrl,
      "wordCount": this.calculateWordCount(post.content),
      "timeRequired": `PT${post.read_time || 5}M`,
      "articleSection": this.extractCategories(post.categories),
      "keywords": post.tags?.join(", "),
      "about": post.target_keyword ? {
        "@type": "Thing",
        "name": post.target_keyword
      } : undefined,
      "inLanguage": "en-US",
      "copyrightYear": new Date(publishedDate).getFullYear(),
      "copyrightHolder": {
        "@type": "Organization",
        "name": this.config.organizationName
      },
      "isAccessibleForFree": true,
      "genre": "Technology",
      "audience": {
        "@type": "Audience",
        "audienceType": "Business Professionals"
      }
    };
  }

  // Generate BreadcrumbList schema for navigation
  generateBreadcrumbSchema(post: BlogPost): object {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": this.config.siteUrl
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Blog",
          "item": `${this.config.siteUrl}/blog`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": post.title,
          "item": `${this.config.siteUrl}/blog/${post.slug}`
        }
      ]
    };
  }

  // Generate Organization schema for E-A-T signals
  generateOrganizationSchema(): object {
    return {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": this.config.organizationName,
      "url": this.config.siteUrl,
      "logo": {
        "@type": "ImageObject",
        "url": this.config.organizationLogo,
        "width": 600,
        "height": 60
      },
      "sameAs": this.config.socialProfiles,
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "Customer Service",
        "url": `${this.config.siteUrl}/contact`
      }
    };
  }

  // Generate WebSite schema with search action
  generateWebsiteSchema(): object {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": this.config.siteName,
      "url": this.config.siteUrl,
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${this.config.siteUrl}/blog?search={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      }
    };
  }

  // Generate FAQ schema if post has FAQ content
  generateFAQSchema(faqData: Array<{question: string, answer: string}>): object {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqData.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };
  }

  // Generate HowTo schema for tutorial content
  generateHowToSchema(steps: Array<{name: string, text: string, image?: string}>): object {
    return {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "step": steps.map((step, index) => ({
        "@type": "HowToStep",
        "position": index + 1,
        "name": step.name,
        "text": step.text,
        "image": step.image ? {
          "@type": "ImageObject",
          "url": step.image
        } : undefined
      }))
    };
  }

  // Private helper methods
  private generateImageSchema(imageUrl?: string): object | object[] {
    if (!imageUrl) {
      return {
        "@type": "ImageObject",
        "url": `${this.config.siteUrl}/default-blog-image.jpg`,
        "width": 1200,
        "height": 630
      };
    }

    return [
      {
        "@type": "ImageObject",
        "url": imageUrl,
        "width": 1200,
        "height": 630
      },
      {
        "@type": "ImageObject",
        "url": imageUrl,
        "width": 1200,
        "height": 1200
      },
      {
        "@type": "ImageObject",
        "url": imageUrl,
        "width": 1200,
        "height": 900
      }
    ];
  }

  private generateAuthorSchema(authorName: string, authorEmail?: string): object {
    return {
      "@type": "Person",
      "name": authorName || this.config.defaultAuthorName,
      "email": authorEmail,
      "image": this.config.defaultAuthorImage,
      "sameAs": this.config.socialProfiles,
      "knowsAbout": ["Digital Marketing", "Music Industry", "Playlist Marketing", "SEO"],
      "jobTitle": "Digital Marketing Expert",
      "worksFor": {
        "@type": "Organization",
        "name": this.config.organizationName
      }
    };
  }

  private generatePublisherSchema(): object {
    return {
      "@type": "Organization",
      "name": this.config.organizationName,
      "url": this.config.siteUrl,
      "logo": {
        "@type": "ImageObject",
        "url": this.config.organizationLogo,
        "width": 600,
        "height": 60
      },
      "sameAs": this.config.socialProfiles
    };
  }

  private calculateWordCount(content: string): number {
    if (!content) return 0;
    // Remove HTML tags and count words
    const textContent = content.replace(/<[^>]*>/g, ' ');
    return textContent.trim().split(/\s+/).length;
  }

  private extractCategories(categories?: any[]): string[] {
    if (!categories || !Array.isArray(categories)) return [];
    return categories.map(cat => cat.name || cat).filter(Boolean);
  }

  // Generate combined schema for blog posts with all relevant structured data
  generateCombinedSchema(post: BlogPost, fullUrl: string, additionalSchemas?: object[]): string {
    const schemas = [
      this.generateArticleSchema(post, fullUrl),
      this.generateBreadcrumbSchema(post),
      this.generateOrganizationSchema(),
      this.generateWebsiteSchema(),
      ...(additionalSchemas || [])
    ];

    return JSON.stringify(schemas, null, 2);
  }
}

// Default configuration for FASHO.co
export const defaultSchemaConfig: SchemaConfig = {
  siteName: "FASHO.co Blog",
  siteUrl: "https://fasho.co",
  organizationName: "FASHO",
  organizationLogo: "https://fasho.co/fasho-logo-wide.png",
  defaultAuthorName: "FASHO Team",
  defaultAuthorImage: "https://fasho.co/team-photo.jpg",
  socialProfiles: [
    "https://twitter.com/fasho",
    "https://linkedin.com/company/fasho",
    "https://instagram.com/fasho",
    "https://facebook.com/fasho"
  ]
};

export const schemaGenerator = new SchemaMarkupGenerator(defaultSchemaConfig);



