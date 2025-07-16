import { ReactNode } from 'react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function LegalModal({ isOpen, onClose, title, children }: LegalModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-black border border-white/20 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-black/95 backdrop-blur-sm border-b border-white/20 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors group"
          >
            <svg 
              className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
          <div className="prose prose-invert prose-lg max-w-none">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
} 