import { getSupabaseClient } from '../lib/supabase';

export interface LabelEmail {
  id: string;
  user_email: string;
  message_id: string;
  label_id: string;
  label_name: string;
  received_date: string;
  created_at: string;
}

export interface LabelCount {
  label_id: string;
  label_name: string;
  email_count: number;
}

export class LabelEmailsService {
  private supabase = getSupabaseClient();

  async saveLabelEmails(
    userEmail: string,
    messageId: string,
    labelIds: string[],
    labelNames: Map<string, string>,
    receivedDate: Date
  ): Promise<boolean> {
    try {
      const records = labelIds.map(labelId => ({
        user_email: userEmail,
        message_id: messageId,
        label_id: labelId,
        label_name: labelNames.get(labelId) || labelId,
        received_date: receivedDate.toISOString()
      }));

      console.log(`[LabelEmailsService] Saving ${records.length} label associations for message ${messageId}`);

      const { error } = await this.supabase
        .from('label_emails')
        .upsert(records, {
          onConflict: 'user_email,message_id,label_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('[LabelEmailsService] Failed to save label emails:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[LabelEmailsService] Error saving label emails:', error);
      return false;
    }
  }

  async getTopCustomLabels(userEmail: string, limit: number = 7): Promise<LabelCount[]> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_user_custom_labels', { p_user_email: userEmail });

      if (error) {
        console.error('Failed to get custom labels:', error);
        return [];
      }

      return (data || []).slice(0, limit).map((row: any) => ({
        label_id: row.label_id,
        label_name: row.label_name,
        email_count: parseInt(row.email_count, 10)
      }));
    } catch (error) {
      console.error('Error getting custom labels:', error);
      return [];
    }
  }

  async getCustomLabelsForDateRange(
    userEmail: string,
    startDate: Date,
    endDate: Date,
    limit: number = 7
  ): Promise<LabelCount[]> {
    try {
      console.log(`[LabelEmailsService] Querying labels for date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

      const { data, error } = await this.supabase
        .rpc('get_user_custom_labels_by_date_range', {
          p_user_email: userEmail,
          p_start_date: startDate.toISOString(),
          p_end_date: endDate.toISOString()
        });

      if (error) {
        console.error('[LabelEmailsService] Failed to get custom labels by date range:', error);
        return [];
      }

      const results = (data || []).slice(0, limit).map((row: any) => ({
        label_id: row.label_id,
        label_name: row.label_name,
        email_count: parseInt(row.email_count, 10)
      }));

      console.log(`[LabelEmailsService] Found ${results.length} labels with data in date range`);
      return results;
    } catch (error) {
      console.error('[LabelEmailsService] Error getting custom labels by date range:', error);
      return [];
    }
  }

  async countEmailsByLabel(
    userEmail: string,
    labelIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Map<string, number>> {
    try {
      const { data, error } = await this.supabase
        .from('label_emails')
        .select('label_id, message_id')
        .eq('user_email', userEmail)
        .in('label_id', labelIds)
        .gte('received_date', startDate.toISOString())
        .lte('received_date', endDate.toISOString());

      if (error) {
        console.error('Failed to count emails by label:', error);
        return new Map();
      }

      const countMap = new Map<string, Set<string>>();

      (data || []).forEach((row: any) => {
        if (!countMap.has(row.label_id)) {
          countMap.set(row.label_id, new Set());
        }
        countMap.get(row.label_id)!.add(row.message_id);
      });

      const result = new Map<string, number>();
      countMap.forEach((messageIds, labelId) => {
        result.set(labelId, messageIds.size);
      });

      return result;
    } catch (error) {
      console.error('Error counting emails by label:', error);
      return new Map();
    }
  }

  async getLabelEmailsInDateRange(
    userEmail: string,
    startDate: Date,
    endDate: Date
  ): Promise<LabelEmail[]> {
    try {
      const { data, error } = await this.supabase
        .from('label_emails')
        .select('*')
        .eq('user_email', userEmail)
        .gte('received_date', startDate.toISOString())
        .lte('received_date', endDate.toISOString())
        .order('received_date', { ascending: false });

      if (error) {
        console.error('Failed to get label emails:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting label emails:', error);
      return [];
    }
  }

  async deleteLabelEmailsByMessageId(userEmail: string, messageId: string): Promise<boolean> {
    try {
      console.log(`[LabelEmailsService] Deleting old label associations for message ${messageId}`);

      const { error } = await this.supabase
        .from('label_emails')
        .delete()
        .eq('user_email', userEmail)
        .eq('message_id', messageId);

      if (error) {
        console.error('[LabelEmailsService] Failed to delete label emails:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[LabelEmailsService] Error deleting label emails:', error);
      return false;
    }
  }

  async cleanupOldLabelEmails(): Promise<boolean> {
    try {
      const { error } = await this.supabase.rpc('cleanup_old_label_emails');

      if (error) {
        console.error('Failed to cleanup old label emails:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error cleaning up old label emails:', error);
      return false;
    }
  }

  async countAllEmailsByLabel(
    userEmail: string,
    labelIds: string[]
  ): Promise<Map<string, number>> {
    try {
      const { data, error } = await this.supabase
        .from('label_emails')
        .select('label_id, message_id')
        .eq('user_email', userEmail)
        .in('label_id', labelIds);

      if (error) {
        console.error('Failed to count all emails by label:', error);
        return new Map();
      }

      const countMap = new Map<string, Set<string>>();

      (data || []).forEach((row: any) => {
        if (!countMap.has(row.label_id)) {
          countMap.set(row.label_id, new Set());
        }
        countMap.get(row.label_id)!.add(row.message_id);
      });

      const result = new Map<string, number>();
      countMap.forEach((messageIds, labelId) => {
        result.set(labelId, messageIds.size);
      });

      return result;
    } catch (error) {
      console.error('Error counting all emails by label:', error);
      return new Map();
    }
  }

  async bulkSaveLabelEmails(
    userEmail: string,
    emailRecords: Array<{
      messageId: string;
      labelIds: string[];
      receivedDate: Date;
    }>,
    labelNames: Map<string, string>
  ): Promise<{ success: boolean; savedCount: number }> {
    try {
      const records = emailRecords.flatMap(email =>
        email.labelIds.map(labelId => ({
          user_email: userEmail,
          message_id: email.messageId,
          label_id: labelId,
          label_name: labelNames.get(labelId) || labelId,
          received_date: email.receivedDate.toISOString()
        }))
      );

      if (records.length === 0) {
        return { success: true, savedCount: 0 };
      }

      const batchSize = 500;
      let savedCount = 0;

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { error } = await this.supabase
          .from('label_emails')
          .upsert(batch, {
            onConflict: 'user_email,message_id,label_id',
            ignoreDuplicates: true
          });

        if (error) {
          console.error(`Failed to save batch ${i / batchSize + 1}:`, error);
          continue;
        }

        savedCount += batch.length;
      }

      console.log(`[LabelEmailsService] Bulk saved ${savedCount} label email records`);
      return { success: true, savedCount };
    } catch (error) {
      console.error('Error bulk saving label emails:', error);
      return { success: false, savedCount: 0 };
    }
  }
}
