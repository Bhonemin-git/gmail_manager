import { useState, useEffect } from 'react';
import { Mail, Paperclip, Loader2, PenSquare, Search, Calendar } from 'lucide-react';
import { EmailListItem } from '../types/gmail';
import { GmailApiService } from '../services/gmailApi';
import { CollapsibleSection } from './CollapsibleSection';
import { formatFullDate } from '../utils/dateUtils';

interface RecentEmailListProps {
  gmailApi: GmailApiService;
  onEmailClick: (messageId: string) => void;
  onCompose: () => void;
}

export function RecentEmailList({ gmailApi, onEmailClick, onCompose }: RecentEmailListProps) {
  const [todayEmails, setTodayEmails] = useState<EmailListItem[]>([]);
  const [weekEmails, setWeekEmails] = useState<EmailListItem[]>([]);
  const [monthEmails, setMonthEmails] = useState<EmailListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const getEmailColors = (isRead: boolean) => {
    return {
      base: isRead ? '#292827' : '#353d35',
      hover: isRead ? '#3a3938' : '#353d35'
    };
  };

  useEffect(() => {
    loadRecentEmails();
  }, []);

  const loadRecentEmails = async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) {
      setLoading(true);
    }
    try {
      const { today, thisWeek, thisMonth } = await gmailApi.getRecentEmails();
      setTodayEmails(today);
      setWeekEmails(thisWeek);
      setMonthEmails(thisMonth);
    } catch (error) {
      console.error('Failed to load recent emails:', error);
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
      setInitialLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      loadRecentEmails();
      return;
    }

    setLoading(true);
    try {
      const results = await gmailApi.searchMessages(searchQuery);

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      const monthStart = new Date(now);
      monthStart.setDate(now.getDate() - 30);

      const today: EmailListItem[] = [];
      const week: EmailListItem[] = [];
      const month: EmailListItem[] = [];

      results.forEach(email => {
        const emailDate = new Date(email.date);
        if (emailDate >= todayStart) {
          today.push(email);
        } else if (emailDate >= weekStart) {
          week.push(email);
        } else if (emailDate >= monthStart) {
          month.push(email);
        }
      });

      setTodayEmails(today);
      setWeekEmails(week);
      setMonthEmails(month);
    } catch (error) {
      console.error('Failed to search emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderEmailItem = (email: EmailListItem) => {
    const colors = getEmailColors(email.isRead);
    return (
      <button
        key={email.id}
        onClick={() => onEmailClick(email.id)}
        className="w-full p-4 text-left border-b border-gray-200 dark:border-gray-700 transition-colors"
        style={{ background: colors.base }}
        onMouseEnter={(e) => e.currentTarget.style.background = colors.hover}
        onMouseLeave={(e) => e.currentTarget.style.background = colors.base}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className={`font-medium truncate ${!email.isRead ? 'text-gray-900' : 'text-gray-700'}`}
              style={{
                color: '#ded8c8'
              }}
            >
              {email.from}
            </span>
            {email.hasAttachments && (
              <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
            )}
          </div>
          <span
            className="text-xs text-gray-500 whitespace-nowrap"
            style={{
              color: '#ded8c8'
            }}
            title={formatFullDate(email.date)}
          >
            {email.date}
          </span>
        </div>
        <div
          className={`text-sm mb-1 truncate ${!email.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
          style={{
            color: '#ded8c8'
          }}
        >
          {email.subject}
        </div>
        <div
          className="text-sm text-gray-600 line-clamp-2"
          style={{
            color: '#ded8c8'
          }}
        >
          {email.snippet}
        </div>
      </button>
    );
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#353d35' }} />
      </div>
    );
  }

  const totalEmails = todayEmails.length + weekEmails.length + monthEmails.length;

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#2a2e35' }}>
      <div className="p-3" style={{ borderBottom: '1px solid #3f4349' }}>
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#9ca3af' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in mail"
            className="w-full pl-10 pr-4 py-2.5 text-base rounded-full focus:outline-none"
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
        </form>
      </div>

      {totalEmails === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
          <Calendar className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg">No recent emails found</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <CollapsibleSection title="Today" count={todayEmails.length} defaultExpanded={true} stickyTop={0} zIndex={30}>
            {todayEmails.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No emails today</p>
              </div>
            ) : (
              <div>
                {todayEmails.map(renderEmailItem)}
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="This Week" count={weekEmails.length} defaultExpanded={true} stickyTop={0} zIndex={20}>
            {weekEmails.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No emails this week</p>
              </div>
            ) : (
              <div>
                {weekEmails.map(renderEmailItem)}
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="This Month" count={monthEmails.length} defaultExpanded={false} stickyTop={0} zIndex={10}>
            {monthEmails.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No emails this month</p>
              </div>
            ) : (
              <div>
                {monthEmails.map(renderEmailItem)}
              </div>
            )}
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}
