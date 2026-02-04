// Portable Text Renderer Component
// Renders Sanity Portable Text content with proper styling and image handling

import { PortableText, PortableTextComponents } from '@portabletext/react';
import type { PortableTextBlock } from '@portabletext/types';
import Image from 'next/image';
import Link from 'next/link';
import { urlFor } from '../lib/sanity/client';
import type { SanityImage } from '../lib/sanity/types';

interface PortableTextRendererProps {
  content: PortableTextBlock[];
  className?: string;
}

// Custom components for Portable Text rendering
const components: PortableTextComponents = {
  types: {
    // Image block renderer
    image: ({ value }: { value: SanityImage & { caption?: string } }) => {
      if (!value?.asset?._ref) {
        return null;
      }
      
      const imageUrl = urlFor(value)
        .width(1200)
        .height(675)
        .fit('max')
        .auto('format')
        .url();
      
      return (
        <figure className="my-8">
          <div className="relative aspect-video overflow-hidden rounded-xl shadow-lg">
            <Image
              src={imageUrl}
              alt={value.alt || 'Blog post image'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
            />
          </div>
          {value.caption && (
            <figcaption className="mt-3 text-center text-gray-500 text-sm italic">
              {value.caption}
            </figcaption>
          )}
        </figure>
      );
    },
    
    // Code block renderer
    code: ({ value }: { value: { code: string; language?: string } }) => {
      return (
        <pre className="my-6 p-4 bg-gray-900 text-gray-100 rounded-xl overflow-x-auto">
          <code className={`language-${value.language || 'plaintext'}`}>
            {value.code}
          </code>
        </pre>
      );
    },
  },
  
  block: {
    // Heading styles
    h1: ({ children }) => (
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mt-10 mb-4 leading-tight">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-8 mb-4 leading-tight">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mt-6 mb-3 leading-tight">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-lg md:text-xl font-semibold text-gray-900 mt-5 mb-2 leading-tight">
        {children}
      </h4>
    ),
    h5: ({ children }) => (
      <h5 className="text-base md:text-lg font-semibold text-gray-900 mt-4 mb-2">
        {children}
      </h5>
    ),
    h6: ({ children }) => (
      <h6 className="text-sm md:text-base font-semibold text-gray-900 mt-4 mb-2">
        {children}
      </h6>
    ),
    
    // Normal paragraph
    normal: ({ children }) => (
      <p className="text-gray-700 leading-relaxed mb-4" style={{ fontSize: '1.0625rem' }}>
        {children}
      </p>
    ),
    
    // Blockquote
    blockquote: ({ children }) => (
      <blockquote className="my-6 pl-6 border-l-4 border-[#59e3a5] italic text-gray-600 bg-gray-50 py-4 pr-4 rounded-r-lg">
        {children}
      </blockquote>
    ),
  },
  
  list: {
    bullet: ({ children }) => (
      <ul className="list-disc list-inside my-4 space-y-2 text-gray-700 ml-4">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="list-decimal list-inside my-4 space-y-2 text-gray-700 ml-4">
        {children}
      </ol>
    ),
  },
  
  listItem: {
    bullet: ({ children }) => (
      <li className="text-gray-700" style={{ fontSize: '1.0625rem' }}>
        {children}
      </li>
    ),
    number: ({ children }) => (
      <li className="text-gray-700" style={{ fontSize: '1.0625rem' }}>
        {children}
      </li>
    ),
  },
  
  marks: {
    // Strong/bold text
    strong: ({ children }) => (
      <strong className="font-semibold text-gray-900">{children}</strong>
    ),
    
    // Emphasis/italic text
    em: ({ children }) => (
      <em className="italic">{children}</em>
    ),
    
    // Underline
    underline: ({ children }) => (
      <span className="underline decoration-2 decoration-[#59e3a5]">{children}</span>
    ),
    
    // Strike-through
    'strike-through': ({ children }) => (
      <span className="line-through text-gray-500">{children}</span>
    ),
    
    // Code inline
    code: ({ children }) => (
      <code className="bg-gray-100 text-[#e63946] px-2 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    ),
    
    // Links
    link: ({ value, children }) => {
      const href = value?.href || '';
      const isInternal = href.startsWith('/') || href.startsWith('#');
      
      if (isInternal) {
        return (
          <Link
            href={href}
            className="text-[#59e3a5] hover:text-[#14c0ff] underline decoration-1 underline-offset-2 transition-colors"
          >
            {children}
          </Link>
        );
      }
      
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#59e3a5] hover:text-[#14c0ff] underline decoration-1 underline-offset-2 transition-colors"
        >
          {children}
        </a>
      );
    },
    
    // Highlight
    highlight: ({ children }) => (
      <mark className="bg-yellow-200 px-1 rounded">{children}</mark>
    ),
  },
};

export default function PortableTextRenderer({ content, className = '' }: PortableTextRendererProps) {
  if (!content || !Array.isArray(content) || content.length === 0) {
    return null;
  }
  
  return (
    <div className={`prose prose-lg max-w-none ${className}`}>
      <PortableText value={content} components={components} />
    </div>
  );
}
