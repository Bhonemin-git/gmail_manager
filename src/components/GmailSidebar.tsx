import { Inbox, Mail, FileText, AlertCircle, Tag, Star, Trash2, BarChart3, Send } from 'lucide-react';
import { GmailStats as GmailStatsType, CustomLabel } from '../types/gmail';

interface GmailSidebarProps {
  stats: GmailStatsType;
  onItemClick: (folderId: string) => void;
  selectedFolder: string;
}

export function GmailSidebar({ stats, onItemClick, selectedFolder }: GmailSidebarProps) {
  const mainItems = [
    { id: 'INBOX', label: 'Total Inbox', icon: Inbox, count: stats.totalInbox },
    { id: 'UNREAD', label: 'Unread', icon: Mail, count: stats.unreadInbox },
    { id: 'STARRED', label: 'Starred', icon: Star, count: stats.starred },
    { id: 'DRAFT', label: 'Drafts', icon: FileText, count: stats.drafts },
    { id: 'SENT', label: 'Sent', icon: Send, count: stats.sent },
    { id: 'SPAM', label: 'Spam', icon: AlertCircle, count: stats.spam },
    { id: 'TRASH', label: 'Trash', icon: Trash2, count: stats.trash },
  ];

  const getLabelColor = (index: number) => {
    const colors = [
      'text-gray-600',
      'text-gray-500',
      'text-gray-700',
      'text-orange-500',
      'text-teal-500',
      'text-gray-400',
    ];
    return colors[index % colors.length];
  };

  const sortedCustomLabels = [...stats.customLabels].sort((a, b) => {
    const getNumericPrefix = (name: string): number => {
      const match = name.match(/^(\d+):/);
      return match ? parseInt(match[1], 10) : Infinity;
    };

    const numA = getNumericPrefix(a.name);
    const numB = getNumericPrefix(b.name);

    if (numA === numB) {
      return a.name.localeCompare(b.name);
    }

    return numA - numB;
  });

  return (
    <div className="w-60 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full flex flex-col">
      <div className="flex-1">
        <div className="p-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5 px-2">
            Gmail Statistics
          </h2>

          <div className="space-y-0.5">
            {mainItems.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedFolder === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onItemClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-1 rounded-lg text-sm transition-colors ${
                    isSelected
                      ? 'bg-gray-200 dark:bg-gray-700 font-medium'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{item.label}</span>
                  </div>
                  <span className="text-gray-600 dark:text-gray-400 font-medium">
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>

          {stats.customLabels.length > 0 && (
            <>
              <div className="mt-3 mb-1.5 px-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Your Custom Labels
                  </h3>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {stats.customLabels.length}
                  </span>
                </div>
              </div>

              <div className="space-y-0.5">
                {sortedCustomLabels.map((label: CustomLabel, index: number) => {
                  const isSelected = selectedFolder === label.id;
                  return (
                    <button
                      key={label.id}
                      onClick={() => onItemClick(label.id)}
                      className={`w-full flex items-center justify-between px-3 py-1 rounded-lg text-sm transition-colors ${
                        isSelected
                          ? 'bg-gray-200 dark:bg-gray-700 font-medium'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Tag className={`w-4 h-4 flex-shrink-0 ${getLabelColor(index)}`} />
                        <span className="text-gray-900 dark:text-white truncate">{label.name}</span>
                      </div>
                      <span className="text-gray-600 dark:text-gray-400 font-medium">
                        {label.messageCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {stats.customLabels.length > 0 && (
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-3">
          <button
            onClick={() => onItemClick('LABEL_COMPARISON')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedFolder === 'LABEL_COMPARISON'
                ? 'bg-gray-200 dark:bg-gray-700 font-medium'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-gray-900 dark:text-white">Label Comparison</span>
          </button>
        </div>
      )}
    </div>
  );
}
