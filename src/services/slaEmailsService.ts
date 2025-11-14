import { getSupabaseClient } from '../lib/supabase';
import { SLAEmailRow, SLALabel } from '../types/sla';

export class SLAEmailsService {
  private supabase = getSupabaseClient();

  async getSLAEmails(userEmail: string): Promise<SLAEmailRow[]> {
    try {
      console.log('[SLAEmailsService] Fetching SLA emails for user:', userEmail);
      const { data, error } = await this.supabase
        .from('sla_emails')
        .select('*')
        .eq('user_email', userEmail)
        .order('received_at', { ascending: false });

      if (error) {
        console.error('[SLAEmailsService] Database error fetching SLA emails:', error);
        console.error('[SLAEmailsService] Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('[SLAEmailsService] Successfully fetched', data?.length || 0, 'SLA emails');
      return data || [];
    } catch (error) {
      console.error('[SLAEmailsService] Exception while fetching SLA emails:', error);
      return [];
    }
  }

  async markEmailResolved(userEmail: string, messageId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('sla_emails')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString()
        })
        .eq('user_email', userEmail)
        .eq('message_id', messageId);

      if (error) {
        console.error('[SLAEmailsService] Error marking email as resolved:', error);
        throw error;
      }

      console.log('[SLAEmailsService] Email marked as resolved:', messageId);
      return true;
    } catch (error) {
      console.error('[SLAEmailsService] Failed to mark email as resolved:', error);
      return false;
    }
  }

  async addSLAEmail(
    userEmail: string,
    messageId: string,
    emailAddress: string,
    subject: string,
    bodyPreview: string,
    label: SLALabel,
    receivedAt: string
  ): Promise<SLAEmailRow | null> {
    try {
      console.log('[SLAEmailsService] Attempting to add SLA email:', {
        userEmail,
        messageId,
        emailAddress,
        subject,
        label,
        receivedAt
      });

      const { data, error } = await this.supabase
        .from('sla_emails')
        .upsert({
          user_email: userEmail,
          message_id: messageId,
          email_address: emailAddress,
          subject: subject,
          body_preview: bodyPreview,
          label: label,
          received_at: receivedAt
        }, {
          onConflict: 'user_email,message_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          console.log('[SLAEmailsService] Email already exists (duplicate):', messageId);
          return null;
        }
        console.error('[SLAEmailsService] Database error adding SLA email:', error);
        console.error('[SLAEmailsService] Error code:', error.code, 'Message:', error.message);
        throw error;
      }

      console.log('[SLAEmailsService] SLA email added/updated successfully:', messageId);
      return data;
    } catch (error) {
      console.error('[SLAEmailsService] Failed to add SLA email:', error);
      return null;
    }
  }

  async updateSLAEmail(
    userEmail: string,
    messageId: string,
    updates: Partial<Omit<SLAEmailRow, 'id' | 'user_email' | 'message_id' | 'created_at' | 'updated_at'>>
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('sla_emails')
        .update(updates)
        .eq('user_email', userEmail)
        .eq('message_id', messageId);

      if (error) {
        console.error('[SLAEmailsService] Error updating SLA email:', error);
        throw error;
      }

      console.log('[SLAEmailsService] SLA email updated:', messageId);
      return true;
    } catch (error) {
      console.error('[SLAEmailsService] Failed to update SLA email:', error);
      return false;
    }
  }

  async deleteSLAEmail(userEmail: string, messageId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('sla_emails')
        .delete()
        .eq('user_email', userEmail)
        .eq('message_id', messageId);

      if (error) {
        console.error('[SLAEmailsService] Error deleting SLA email:', error);
        throw error;
      }

      console.log('[SLAEmailsService] SLA email deleted:', messageId);
      return true;
    } catch (error) {
      console.error('[SLAEmailsService] Failed to delete SLA email:', error);
      return false;
    }
  }
}
