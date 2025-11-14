import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  stickyTop?: number;
  zIndex?: number;
}

export function CollapsibleSection({ title, count, children, defaultExpanded = true, stickyTop = 0, zIndex = 10 }: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="border-b" style={{ borderColor: '#353d35' }}>
      <button
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between p-4 transition-colors"
        style={{
          backgroundColor: '#252525',
          position: 'sticky',
          top: `${stickyTop}px`,
          zIndex
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2f2f2f'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#252525'}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 transition-transform" style={{ color: '#ffffff' }} />
          ) : (
            <ChevronRight className="w-5 h-5 transition-transform" style={{ color: '#ffffff' }} />
          )}
          <span className="font-semibold text-lg" style={{ color: '#ffffff' }}>
            {title}
          </span>
        </div>
        <div
          className="px-3 py-1 rounded-full text-sm font-medium"
          style={{
            backgroundColor: '#353d35',
            color: '#ffffff'
          }}
        >
          {count}
        </div>
      </button>
      {isExpanded && (
        <div className="transition-all duration-200 ease-in-out">
          {children}
        </div>
      )}
    </div>
  );
}
