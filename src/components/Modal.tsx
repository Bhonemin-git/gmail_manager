import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function Modal({ isOpen, onClose, children, title }: ModalProps) {

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl animate-fadeIn"
        style={{ backgroundColor: '#2b2b2b' }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b"
          style={{
            backgroundColor: '#2b2b2b',
            borderColor: '#3d3d3d'
          }}
        >
          {title && (
            <h2 className="text-xl font-bold" style={{ color: '#ffffff' }}>
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="ml-auto p-2 rounded-lg transition-colors hover:bg-black hover:bg-opacity-10"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" style={{ color: '#ffffff' }} />
          </button>
        </div>

        <div className="p-4 md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
