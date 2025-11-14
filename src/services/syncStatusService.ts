import { getSupabaseClient } from '../lib/supabase';

export interface SyncStatus {
  id: string;
  user_email: string;
  history_id: string;
  last_sync_at: string;
  sync_errors: number;
  last_error: string | null;
  watch_expiration: string | null;
  historical_import_completed: boolean;
  historical_import_started_at: string | null;
  historical_import_completed_at: string | null;
  historical_import_error: string | null;
  created_at: string;
  updated_at: string;
}

export class SyncStatusService {
  private supabase = getSupabaseClient();

  async getSyncStatus(userEmail: string): Promise<SyncStatus | null> {
    try {
      const { data, error } = await this.supabase
        .from('sync_status')
        .select('*')
        .eq('user_email', userEmail)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch sync status:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching sync status:', error);
      return null;
    }
  }

  async upsertSyncStatus(
    userEmail: string,
    historyId: string,
    watchExpiration?: number
  ): Promise<SyncStatus | null> {
    try {
      const updateData: any = {
        user_email: userEmail,
        history_id: historyId,
        last_sync_at: new Date().toISOString(),
        sync_errors: 0,
        last_error: null
      };

      if (watchExpiration) {
        updateData.watch_expiration = new Date(watchExpiration).toISOString();
      }

      const { data, error } = await this.supabase
        .from('sync_status')
        .upsert(updateData, {
          onConflict: 'user_email'
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Failed to upsert sync status:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error upserting sync status:', error);
      return null;
    }
  }

  async updateHistoryId(userEmail: string, historyId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('sync_status')
        .update({
          history_id: historyId,
          last_sync_at: new Date().toISOString(),
          sync_errors: 0,
          last_error: null
        })
        .eq('user_email', userEmail);

      if (error) {
        console.error('Failed to update history ID:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating history ID:', error);
      return false;
    }
  }

  async recordSyncError(userEmail: string, errorMessage: string): Promise<boolean> {
    try {
      const currentStatus = await this.getSyncStatus(userEmail);
      const errorCount = (currentStatus?.sync_errors || 0) + 1;

      const { error } = await this.supabase
        .from('sync_status')
        .update({
          sync_errors: errorCount,
          last_error: errorMessage
        })
        .eq('user_email', userEmail);

      if (error) {
        console.error('Failed to record sync error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error recording sync error:', error);
      return false;
    }
  }

  async updateWatchExpiration(userEmail: string, expiration: number): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('sync_status')
        .update({
          watch_expiration: new Date(expiration).toISOString()
        })
        .eq('user_email', userEmail);

      if (error) {
        console.error('Failed to update watch expiration:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating watch expiration:', error);
      return false;
    }
  }

  async needsWatchRenewal(userEmail: string): Promise<boolean> {
    try {
      const status = await this.getSyncStatus(userEmail);
      if (!status || !status.watch_expiration) {
        return true;
      }

      const expirationDate = new Date(status.watch_expiration);
      const now = new Date();
      const hoursUntilExpiration = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      return hoursUntilExpiration < 24;
    } catch (error) {
      console.error('Error checking watch renewal:', error);
      return true;
    }
  }

  subscribeToSyncChanges(userEmail: string, callback: (status: SyncStatus) => void) {
    const channel = this.supabase
      .channel('sync_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_status',
          filter: `user_email=eq.${userEmail}`
        },
        (payload) => {
          if (payload.new) {
            callback(payload.new as SyncStatus);
          }
        }
      )
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }

  async needsHistoricalImport(userEmail: string): Promise<boolean> {
    try {
      const status = await this.getSyncStatus(userEmail);
      if (!status) {
        return true;
      }
      return !status.historical_import_completed;
    } catch (error) {
      console.error('Error checking historical import status:', error);
      return true;
    }
  }

  async markHistoricalImportStarted(userEmail: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('sync_status')
        .update({
          historical_import_started_at: new Date().toISOString(),
          historical_import_error: null
        })
        .eq('user_email', userEmail);

      if (error) {
        console.error('Failed to mark historical import as started:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error marking historical import as started:', error);
      return false;
    }
  }

  async markHistoricalImportCompleted(userEmail: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('sync_status')
        .update({
          historical_import_completed: true,
          historical_import_completed_at: new Date().toISOString(),
          historical_import_error: null
        })
        .eq('user_email', userEmail);

      if (error) {
        console.error('Failed to mark historical import as completed:', error);
        return false;
      }

      console.log('[SyncStatusService] Historical import marked as completed');
      return true;
    } catch (error) {
      console.error('Error marking historical import as completed:', error);
      return false;
    }
  }

  async recordHistoricalImportError(userEmail: string, errorMessage: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('sync_status')
        .update({
          historical_import_error: errorMessage
        })
        .eq('user_email', userEmail);

      if (error) {
        console.error('Failed to record historical import error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error recording historical import error:', error);
      return false;
    }
  }
}
