import { GmailApiService } from './gmailApi';
import { SLAEmailsService } from './slaEmailsService';
import { SLALabel } from '../types/sla';
import { EmailMessage } from '../types/gmail';

export class SLASyncService {
  private gmailApi: GmailApiService;
  private slaService: SLAEmailsService;

  constructor(gmailApi: GmailApiService) {
    this.gmailApi = gmailApi;
    this.slaService = new SLAEmailsService();
  }

  async syncSLAEmails(userEmail: string): Promise<{ synced: number; errors: number }> {
    console.log('[SLASyncService] Starting SLA email sync for:', userEmail);

    try {
      console.log('[SLASyncService] Step 1: Checking for SLA labels in Gmail...');
      const slaLabelIds = await this.gmailApi.getSLALabelIds();
      console.log('[SLASyncService] Found SLA labels:', Array.from(slaLabelIds.keys()));

      if (slaLabelIds.size === 0) {
        console.error('[SLASyncService] ERROR: No SLA labels found in Gmail. Please create labels: 1: billing, 2: bug report, 3: feature request, 4: abuse report');
        return { synced: 0, errors: 0 };
      }

      console.log('[SLASyncService] Step 2: Fetching emails with SLA labels...');
      const slaEmails = await this.gmailApi.getSLAEmails();
      console.log('[SLASyncService] Found SLA emails:', slaEmails.length);

      if (slaEmails.length === 0) {
        console.warn('[SLASyncService] No emails found with SLA labels. Make sure you have applied the SLA labels to some emails in Gmail.');
        return { synced: 0, errors: 0 };
      }

      let synced = 0;
      let errors = 0;

      console.log('[SLASyncService] Step 3: Processing and saving emails to database...');
      for (const { message, label } of slaEmails) {
        try {
          console.log('[SLASyncService] Processing email with label:', label, 'messageId:', message.id);
          const emailData = this.extractEmailData(message, label as SLALabel);

          if (emailData) {
            console.log('[SLASyncService] Extracted email data:', {
              messageId: emailData.messageId,
              emailAddress: emailData.emailAddress,
              subject: emailData.subject,
              label: emailData.label
            });

            const result = await this.slaService.addSLAEmail(
              userEmail,
              emailData.messageId,
              emailData.emailAddress,
              emailData.subject,
              emailData.bodyPreview,
              emailData.label,
              emailData.receivedAt
            );

            if (result) {
              console.log('[SLASyncService] ✓ Successfully synced email:', emailData.messageId);
              synced++;
            } else {
              console.log('[SLASyncService] ⊘ Email already exists (skipped):', emailData.messageId);
            }
          } else {
            console.error('[SLASyncService] Failed to extract email data for message:', message.id);
            errors++;
          }
        } catch (error) {
          console.error('[SLASyncService] Error syncing email:', message.id, error);
          errors++;
        }
      }

      console.log('[SLASyncService] ==========================================');
      console.log('[SLASyncService] Sync complete!');
      console.log('[SLASyncService] - New emails synced:', synced);
      console.log('[SLASyncService] - Errors:', errors);
      console.log('[SLASyncService] - Total processed:', slaEmails.length);
      console.log('[SLASyncService] ==========================================');
      return { synced, errors };
    } catch (error) {
      console.error('[SLASyncService] Failed to sync SLA emails:', error);
      return { synced: 0, errors: 1 };
    }
  }

  async checkSLALabels(): Promise<{ available: string[]; missing: string[] }> {
    const slaLabelIds = await this.gmailApi.getSLALabelIds();
    const allLabels = ['1: billing', '2: bug report', '3: feature request', '4: abuse report'];

    const available = Array.from(slaLabelIds.keys());
    const missing = allLabels.filter(label => !slaLabelIds.has(label));

    return { available, missing };
  }

  private extractEmailData(message: EmailMessage, label: SLALabel) {
    try {
      const headers = message.payload.headers || [];
      const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || 'Unknown';
      const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '(No subject)';
      const dateHeader = headers.find(h => h.name.toLowerCase() === 'date')?.value;

      const emailAddress = this.extractEmailAddress(fromHeader);
      const subject = subjectHeader;
      const bodyPreview = this.extractBodyPreview(message);
      const receivedAt = dateHeader ? new Date(dateHeader).toISOString() : new Date(parseInt(message.internalDate)).toISOString();

      return {
        messageId: message.id,
        emailAddress,
        subject,
        bodyPreview,
        label,
        receivedAt
      };
    } catch (error) {
      console.error('[SLASyncService] Failed to extract email data:', error);
      return null;
    }
  }

  private extractEmailAddress(from: string): string {
    const match = from.match(/<(.+?)>/);
    return match ? match[1] : from;
  }

  private extractBodyPreview(message: EmailMessage): string {
    const snippet = message.snippet || '';
    const maxLength = 100;

    if (snippet.length <= maxLength) {
      return snippet;
    }

    return snippet.substring(0, maxLength) + '...';
  }
}
