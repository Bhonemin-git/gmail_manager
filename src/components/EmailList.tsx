import { useState, useEffect } from 'react';
import { Mail, Paperclip, Loader2, PenSquare, Search, Star, Trash2, Calendar, X } from 'lucide-react';
import { EmailListItem } from '../types/gmail';
import { GmailApiService } from '../services/gmailApi';
import { StarredEmailsService } from '../services/starredEmailsService';
import { useNotifications } from '../contexts/NotificationContext';
import { formatFullDate } from '../utils/dateUtils';
import { ConfirmDialog } from './ConfirmDialog';

interface EmailListProps {
  labelIds: string[];
  gmailApi: GmailApiService;
  onEmailClick: (messageId: string) => void;
  onCompose: () => void;
  userEmail?: string;
}

export function EmailList({ labelIds, gmailApi, onEmailClick, onCompose, userEmail }: EmailListProps) {
  const { addNotification } = useNotifications();
  const [emails, setEmails] = useState<EmailListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [starredEmailIds, setStarredEmailIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<{ [key: string]: 'star' | 'delete' | null }>({});
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState<EmailListItem | null>(null);
  const starredService = new StarredEmailsService();

  const getEmailColors = (isRead: boolean) => {
    return {
      base: isRead ? '#292827' : '#2d4a5a',
      hover: isRead ? '#3a3938' : '#355566'
    };
  };

  useEffect(() => {
    loadEmails();
  }, [labelIds]);

  useEffect(() => {
    if (userEmail) {
      loadStarredEmails();
    }
  }, [userEmail]);

  const loadStarredEmails = async () => {
    if (!userEmail) return;
    const starredIds = await starredService.getStarredEmailIds(userEmail);
    setStarredEmailIds(new Set(starredIds));
  };

  const loadEmails = async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) {
      setLoading(true);
    }
    try {
      const result = await gmailApi.getMessages(labelIds, 20);
      const emailsWithStarred = result.messages.map(email => ({
        ...email,
        isStarred: starredEmailIds.has(email.id) || email.labelIds.includes('STARRED')
      }));
      setEmails(emailsWithStarred);
      setNextPageToken(result.nextPageToken);
    } catch (error) {
      console.error('Failed to load emails:', error);
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
      setInitialLoading(false);
    }
  };

  const loadMoreEmails = async () => {
    if (!nextPageToken || loadingMore) return;

    setLoadingMore(true);
    try {
      const result = await gmailApi.getMessages(labelIds, 20, nextPageToken);
      const emailsWithStarred = result.messages.map(email => ({
        ...email,
        isStarred: starredEmailIds.has(email.id) || email.labelIds.includes('STARRED')
      }));
      setEmails(prev => [...prev, ...emailsWithStarred]);
      setNextPageToken(result.nextPageToken);
    } catch (error) {
      console.error('Failed to load more emails:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      loadEmails();
      return;
    }

    setLoading(true);
    try {
      const results = await gmailApi.searchMessages(searchQuery);
      setEmails(results);
      setNextPageToken(undefined);
    } catch (error) {
      console.error('Failed to search emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const bottom = target.scrollHeight - target.scrollTop === target.clientHeight;

    if (bottom && nextPageToken && !loadingMore) {
      loadMoreEmails();
    }
  };

  const handleToggleStar = async (e: React.MouseEvent, email: EmailListItem) => {
    e.stopPropagation();
    if (!userEmail) return;

    const messageId = email.id;
    setActionLoading(prev => ({ ...prev, [messageId]: 'star' }));

    const isCurrentlyStarred = email.isStarred;

    setEmails(prev => prev.map(e =>
      e.id === messageId ? { ...e, isStarred: !isCurrentlyStarred } : e
    ));

    try {
      let success = false;
      if (isCurrentlyStarred) {
        success = await gmailApi.unstarMessage(messageId);
        if (success) {
          await starredService.removeStarredEmail(userEmail, messageId);
          setStarredEmailIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(messageId);
            return newSet;
          });
          addNotification('success', 'Email unstarred');
        }
      } else {
        success = await gmailApi.starMessage(messageId);
        if (success) {
          await starredService.addStarredEmail(userEmail, messageId);
          setStarredEmailIds(prev => new Set([...prev, messageId]));
          addNotification('success', 'Email starred');
        }
      }

      if (!success) {
        setEmails(prev => prev.map(e =>
          e.id === messageId ? { ...e, isStarred: isCurrentlyStarred } : e
        ));
        addNotification('error', 'Failed to update star status');
      }
    } catch (error) {
      setEmails(prev => prev.map(e =>
        e.id === messageId ? { ...e, isStarred: isCurrentlyStarred } : e
      ));
      addNotification('error', 'Failed to update star status');
    } finally {
      setActionLoading(prev => ({ ...prev, [messageId]: null }));
    }
  };

  const handleDelete = (e: React.MouseEvent, email: EmailListItem) => {
    e.stopPropagation();
    setDeleteConfirmEmail(email);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmEmail) return;

    const messageId = deleteConfirmEmail.id;
    setActionLoading(prev => ({ ...prev, [messageId]: 'delete' }));
    setDeleteConfirmEmail(null);

    try {
      const success = await gmailApi.deleteMessage(messageId);
      if (success) {
        setEmails(prev => prev.filter(e => e.id !== messageId));
        addNotification('success', 'Email moved to trash');
      } else {
        addNotification('error', 'Failed to delete email');
      }
    } catch (error) {
      addNotification('error', 'Failed to delete email');
    } finally {
      setActionLoading(prev => ({ ...prev, [messageId]: null }));
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#353d35' }} />
      </div>
    );
  }

  const handleClearSearch = () => {
    setSearchQuery('');
    loadEmails();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: '#2a2e35' }}>
      <div className="p-3 flex-shrink-0" style={{ borderBottom: '1px solid #3f4349' }}>
        <div className="flex items-center gap-4">
          <form onSubmit={handleSearch} className="relative flex-1" style={{ maxWidth: '700px', marginLeft: '20px' }}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#9ca3af' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in mail"
              className="w-full pl-10 pr-10 py-2.5 text-base rounded-full focus:outline-none"
              style={{
                backgroundColor: '#3d424a',
                color: '#ffffff',
                border: '1px solid #4a5568'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#60a5fa';
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(96, 165, 250, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#4a5568';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 flex items-center justify-center hover:opacity-70 transition-opacity"
                style={{ color: '#9ca3af' }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          <button
            onClick={onCompose}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-full transition-all font-medium text-sm shadow-lg hover:shadow-xl flex-shrink-0"
            style={{ backgroundColor: '#c2e7ff', marginLeft: '20px' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#a8d9ff'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#c2e7ff'}
          >
            <PenSquare className="w-4 h-4" style={{ color: '#001d35' }} />
            <span style={{ color: '#001d35' }}>Compose</span>
          </button>
        </div>
      </div>

      {emails.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-0" style={{ color: '#9ca3af' }}>
          <Mail className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg">No emails found</p>
        </div>
      ) : (
        <div
          className="flex-1 overflow-y-auto min-h-0"
          onScroll={handleScroll}
        >
          {emails.map((email) => {
            const colors = getEmailColors(email.isRead);
            const isLoading = actionLoading[email.id];
            const borderColor = email.isRead ? '#3f4349' : '#1e3a47';
            return (
              <div
                key={email.id}
                className="relative group"
              >
                <button
                  onClick={() => onEmailClick(email.id)}
                  className="w-full text-left transition-colors border-b"
                  style={{
                    background: colors.base,
                    borderColor: borderColor,
                    borderWidth: '1px',
                    paddingTop: '1rem',
                    paddingBottom: '1rem',
                    paddingLeft: '1rem',
                    paddingRight: '6rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.hover;
                    e.currentTarget.style.borderColor = borderColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = colors.base;
                    e.currentTarget.style.borderColor = borderColor;
                  }}
                >
                  <div className="flex items-start justify-between gap-1.5 md:gap-2 mb-1">
                    <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0">
                      <span className={`font-medium truncate text-sm md:text-base ${
                        !email.isRead
                          ? 'text-gray-900'
                          : 'text-gray-700'
                      }`}
                      style={{
                        color: '#ded8c8'
                      }}>
                        {email.from}
                      </span>
                      {email.hasAttachments && (
                        <Paperclip className="w-3 h-3 md:w-4 md:h-4 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                    <div
                      className="text-xs md:text-sm text-gray-500 whitespace-nowrap flex-shrink-0 group/date relative"
                      style={{
                        color: '#ded8c8'
                      }}
                      title={formatFullDate(email.date)}
                    >
                      <span className="md:hidden">{email.date}</span>
                      <span className="hidden md:inline">{email.date}</span>
                    </div>
                  </div>
                  <div className={`text-xs md:text-sm mb-1 truncate ${
                    !email.isRead
                      ? 'font-semibold text-gray-900'
                      : 'text-gray-700'
                  }`}
                  style={{
                    color: '#ded8c8'
                  }}>
                    {email.subject}
                  </div>
                  <div className="text-xs md:text-sm text-gray-600 line-clamp-2"
                    style={{
                      color: '#ded8c8'
                    }}>
                    {email.snippet}
                  </div>
                </button>
                <div className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 md:gap-2 opacity-0 group-hover:opacity-100 md:opacity-0 opacity-100 md:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleToggleStar(e, email)}
                    disabled={!!isLoading}
                    className="p-1.5 md:p-2 rounded-lg transition-all hover:scale-110"
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      backdropFilter: 'blur(4px)'
                    }}
                    title={email.isStarred ? 'Unstar' : 'Star'}
                  >
                    {isLoading === 'star' ? (
                      <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" style={{ color: '#d4af37' }} />
                    ) : (
                      <Star
                        className="w-4 h-4 md:w-5 md:h-5 transition-colors"
                        style={{
                          color: email.isStarred ? '#d4af37' : '#999',
                          fill: email.isStarred ? '#d4af37' : 'none'
                        }}
                      />
                    )}
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, email)}
                    disabled={!!isLoading}
                    className="p-1.5 md:p-2 rounded-lg transition-all hover:scale-110"
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      backdropFilter: 'blur(4px)'
                    }}
                    title="Delete"
                  >
                    {isLoading === 'delete' ? (
                      <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" style={{ color: '#ef4444' }} />
                    ) : (
                      <Trash2
                        className="w-4 h-4 md:w-5 md:h-5 transition-colors"
                        style={{ color: '#ef4444' }}
                      />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
          {loadingMore && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#353d35' }} />
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteConfirmEmail}
        title="Delete Email"
        message={`Are you sure you want to move "${deleteConfirmEmail?.subject}" to trash?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmEmail(null)}
      />
    </div>
  );
}
