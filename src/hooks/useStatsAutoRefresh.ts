import { useEffect, useRef, useCallback, useState } from 'react';
import { GmailApiService } from '../services/gmailApi';
import { StatsService } from '../services/statsService';
import { GmailStats } from '../types/gmail';
import { CONFIG } from '../config';

interface UseStatsAutoRefreshOptions {
  gmailApi: GmailApiService | null;
  userEmail: string | null;
  onStatsUpdate: (stats: GmailStats) => void;
  onError?: (error: string) => void;
}

export function useStatsAutoRefresh({
  gmailApi,
  userEmail,
  onStatsUpdate,
  onError
}: UseStatsAutoRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const intervalRef = useRef<number>();
  const statsService = useRef(new StatsService());
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const fetchAndUpdateStats = useCallback(async () => {
    if (!gmailApi || !userEmail || isRefreshing) return;

    setIsRefreshing(true);

    try {
      const stats = await gmailApi.getGmailStats();

      await statsService.current.saveStats(userEmail, stats);

      onStatsUpdate(stats);
      setLastUpdate(new Date());
      retryCountRef.current = 0;

    } catch (error) {
      console.error('Failed to refresh stats:', error);
      retryCountRef.current += 1;

      if (retryCountRef.current >= maxRetries) {
        onError?.('Failed to refresh statistics after multiple attempts');
        retryCountRef.current = 0;
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [gmailApi, userEmail, isRefreshing, onStatsUpdate, onError]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = window.setInterval(
      fetchAndUpdateStats,
      CONFIG.STATS_REFRESH_INTERVAL
    );
  }, [fetchAndUpdateStats]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    if (!gmailApi || !userEmail) {
      stopPolling();
      return;
    }

    const unsubscribe = statsService.current.subscribeToStatsChanges(
      userEmail,
      (record) => {
        const stats: GmailStats = {
          totalInbox: record.total_inbox,
          unreadInbox: record.unread_inbox,
          drafts: record.drafts,
          spam: record.spam,
          starred: record.starred || 0,
          trash: record.trash || 0,
          labels: {},
          customLabels: record.custom_labels
        };
        onStatsUpdate(stats);
        setLastUpdate(new Date(record.created_at));
      }
    );

    startPolling();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
        fetchAndUpdateStats();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [gmailApi, userEmail, startPolling, stopPolling, fetchAndUpdateStats, onStatsUpdate]);

  return {
    isRefreshing,
    lastUpdate,
    manualRefresh: fetchAndUpdateStats
  };
}
