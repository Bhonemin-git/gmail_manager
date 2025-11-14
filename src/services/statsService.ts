import { getSupabaseClient } from '../lib/supabase';
import { GmailStats, CustomLabel } from '../types/gmail';
import { LabelEmailsService } from './labelEmailsService';

export interface GmailStatsRecord {
  id: string;
  user_email: string;
  total_inbox: number;
  unread_inbox: number;
  drafts: number;
  sent?: number;
  spam: number;
  starred?: number;
  trash?: number;
  custom_labels: any[];
  created_at: string;
  updated_at: string;
}

export class StatsService {
  private supabase = getSupabaseClient();
  private labelEmailsService = new LabelEmailsService();

  async saveStats(userEmail: string, stats: GmailStats): Promise<GmailStatsRecord | null> {
    try {
      const { data, error } = await this.supabase
        .from('gmail_stats')
        .insert({
          user_email: userEmail,
          total_inbox: stats.totalInbox,
          unread_inbox: stats.unreadInbox,
          drafts: stats.drafts,
          sent: stats.sent,
          spam: stats.spam,
          custom_labels: stats.customLabels
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Failed to save stats to database:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error saving stats:', error);
      return null;
    }
  }

  async getLatestStats(userEmail: string): Promise<GmailStatsRecord | null> {
    try {
      const { data, error } = await this.supabase
        .from('gmail_stats')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch latest stats:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching latest stats:', error);
      return null;
    }
  }

  async getStatsHistory(userEmail: string, limit: number = 10): Promise<GmailStatsRecord[]> {
    try {
      const { data, error } = await this.supabase
        .from('gmail_stats')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch stats history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching stats history:', error);
      return [];
    }
  }

  async deleteOldStats(userEmail: string, daysToKeep: number = 30): Promise<boolean> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { error } = await this.supabase
        .from('gmail_stats')
        .delete()
        .eq('user_email', userEmail)
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        console.error('Failed to delete old stats:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting old stats:', error);
      return false;
    }
  }

  subscribeToStatsChanges(userEmail: string, callback: (stats: GmailStatsRecord) => void) {
    const channel = this.supabase
      .channel('gmail_stats_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gmail_stats',
          filter: `user_email=eq.${userEmail}`
        },
        (payload) => {
          callback(payload.new as GmailStatsRecord);
        }
      )
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }
}
