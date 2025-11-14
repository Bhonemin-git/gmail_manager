import { RefreshCw } from 'lucide-react';
import { GmailStats as GmailStatsType } from '../types/gmail';
import { GmailSidebar } from './GmailSidebar';
import { CustomLabelsBarChart } from './CustomLabelsBarChart';

interface GmailStatsProps {
  stats: GmailStatsType;
  isRefreshing?: boolean;
  onManualRefresh?: () => void;
  onCardClick?: (folderId: string) => void;
  userEmail?: string | null;
}

export function GmailStats({ stats, isRefreshing, onManualRefresh, onCardClick, userEmail }: GmailStatsProps) {
  return (
    <div className="flex gap-4 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden" style={{ height: '450px' }}>
      <GmailSidebar
        stats={stats}
        onItemClick={onCardClick || (() => {})}
        selectedFolder="INBOX"
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Inbox
          </h2>
          {isRefreshing && (
            <RefreshCw className="w-4 h-4 animate-spin text-gray-500" />
          )}
        </div>
        <div className="text-gray-600 dark:text-gray-400">
          <p>Select an item from the sidebar to view emails or click Label Comparison to view the chart.</p>
        </div>
      </div>
    </div>
  );
}
