import { useState, useEffect } from 'react';
import { Reply, Forward, Trash2, MoreVertical, Loader2, ArrowLeft } from 'lucide-react';
import { EmailMessage } from '../types/gmail';
import { GmailApiService } from '../services/gmailApi';
import { formatEmailBody } from '../utils/emailFormatter';

interface EmailDetailProps {
  message: EmailMessage;
  gmailApi: GmailApiService;
  onReply: () => void;
  onDelete: (messageId: string) => void;
  onForward: () => void;
  onBack?: () => void;
}

export function EmailDetail({ message, gmailApi, onReply, onDelete, onForward, onBack }: EmailDetailProps) {
  const [emailBody, setEmailBody] = useState<string>('');
  const [isHtmlEmail, setIsHtmlEmail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    loadEmailBody();
  }, [message.id]);

  const loadEmailBody = async () => {
    setLoading(true);
    try {
      const result = await gmailApi.getEmailBodyWithImages(message);
      setEmailBody(result.body);
      setIsHtmlEmail(result.isHtml);
    } catch (error) {
      console.error('Failed to load email body:', error);
      setEmailBody('Failed to load email content');
      setIsHtmlEmail(false);
    } finally {
      setLoading(false);
    }
  };

  const processedEmailBody = formatEmailBody(emailBody, isHtmlEmail);

  const getHeader = (name: string): string => {
    const header = message.payload.headers?.find(
      h => h.name.toLowerCase() === name.toLowerCase()
    );
    return header?.value || '';
  };

  const from = getHeader('from');
  const to = getHeader('to');
  const subject = getHeader('subject') || '(No subject)';
  const date = getHeader('date');

  const formatEmailAddress = (address: string): string => {
    const match = address.match(/^(.+?)\s*<(.+?)>$/);
    if (match) {
      return match[1].replace(/"/g, '');
    }
    return address;
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to move this email to trash?')) {
      onDelete(message.id);
    }
  };

  const handleForward = () => {
    onForward();
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 mb-4 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}
        <div className="flex items-start justify-between gap-2 mb-3 md:mb-4">
          <h1 className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white pr-2 md:pr-4">
            {subject}
          </h1>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 md:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <MoreVertical className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-10">
                <button
                  onClick={() => {
                    handleForward();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                >
                  <Forward className="w-4 h-4" />
                  Forward
                </button>
                <button
                  onClick={() => {
                    handleDelete();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2 text-red-600 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 md:space-y-3">
          <div className="flex items-start gap-2 md:gap-3">
            <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm md:text-base" style={{ background: 'linear-gradient(to bottom right, #353d35, #505850)' }}>
              {formatEmailAddress(from).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <span className="font-medium text-sm md:text-base text-gray-900 dark:text-white truncate">
                  {formatEmailAddress(from)}
                </span>
                <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {new Date(date).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                to {to}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3 md:mt-4">
          <button
            onClick={onReply}
            className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 text-sm md:text-base text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#353d35' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a312a'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#353d35'}
          >
            <Reply className="w-4 h-4 md:w-5 md:h-5" />
            Reply
          </button>
          <button
            onClick={handleForward}
            className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            <Forward className="w-4 h-4 md:w-5 md:h-5" />
            Forward
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#353d35' }} />
          </div>
        ) : (
          <div
            className="email-body-container text-gray-900 dark:text-[#ded8c8]"
            dangerouslySetInnerHTML={{ __html: processedEmailBody }}
          />
        )}
      </div>
    </div>
  );
}
