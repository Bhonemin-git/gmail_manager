import { RefreshCw, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SyncStatusIndicatorProps {
  isSyncing?: boolean;
  lastSyncTime?: Date | null;
  syncErrors?: number;
  onManualSync?: () => void;
}

export function SyncStatusIndicator({
  isSyncing = false,
  lastSyncTime = null,
  syncErrors = 0,
  onManualSync
}: SyncStatusIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!lastSyncTime) {
      setTimeAgo('Never synced');
      return;
    }

    const updateTimeAgo = () => {
      const now = new Date();
      const diffMs = now.getTime() - lastSyncTime.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);

      if (diffSecs < 10) {
        setTimeAgo('Just now');
      } else if (diffSecs < 60) {
        setTimeAgo(`${diffSecs}s ago`);
      } else if (diffMins < 60) {
        setTimeAgo(`${diffMins}m ago`);
      } else {
        setTimeAgo(lastSyncTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }));
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);

    return () => clearInterval(interval);
  }, [lastSyncTime]);

  const getStatusIcon = () => {
    if (!isOnline) {
      return <WifiOff className="w-4 h-4 text-gray-400 dark:text-gray-500" />;
    }

    if (isSyncing) {
      return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
    }

    if (syncErrors > 0) {
      return <AlertCircle className="w-4 h-4 text-orange-500" />;
    }

    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (!isOnline) {
      return 'Offline';
    }

    if (isSyncing) {
      return 'Syncing...';
    }

    if (syncErrors > 0) {
      return `${syncErrors} sync error${syncErrors > 1 ? 's' : ''}`;
    }

    return timeAgo;
  };

  return (
    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
      {getStatusIcon()}
      <span className="hidden sm:inline">{getStatusText()}</span>

      {onManualSync && isOnline && !isSyncing && (
        <button
          onClick={onManualSync}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="Sync now"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      )}

      {!isOnline && (
        <div className="flex items-center gap-1 px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">
          <WifiOff className="w-3 h-3" />
          <span className="hidden sm:inline">Working offline</span>
        </div>
      )}
    </div>
  );
}
