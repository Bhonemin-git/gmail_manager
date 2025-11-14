import { getSupabaseClient } from '../lib/supabase';

export interface StarredEmail {
  id: string;
  user_email: string;
  message_id: string;
  created_at: string;
}

export class StarredEmailsService {
  private supabase = getSupabaseClient();

  async getStarredEmailIds(userEmail: string): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('starred_emails')
        .select('message_id')
        .eq('user_email', userEmail);

      if (error) {
        console.error('Failed to fetch starred emails:', error);
        return [];
      }

      return data?.map((item) => item.message_id) || [];
    } catch (error) {
      console.error('Failed to fetch starred emails:', error);
      return [];
    }
  }

  async isStarred(userEmail: string, messageId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('starred_emails')
        .select('id')
        .eq('user_email', userEmail)
        .eq('message_id', messageId)
        .maybeSingle();

      if (error) {
        console.error('Failed to check starred status:', error);
        return false;
      }

      return data !== null;
    } catch (error) {
      console.error('Failed to check starred status:', error);
      return false;
    }
  }

  async addStarredEmail(userEmail: string, messageId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('starred_emails')
        .insert({
          user_email: userEmail,
          message_id: messageId
        });

      if (error) {
        if (error.code === '23505') {
          return true;
        }
        console.error('Failed to add starred email:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to add starred email:', error);
      return false;
    }
  }

  async removeStarredEmail(userEmail: string, messageId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('starred_emails')
        .delete()
        .eq('user_email', userEmail)
        .eq('message_id', messageId);

      if (error) {
        console.error('Failed to remove starred email:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to remove starred email:', error);
      return false;
    }
  }
}
