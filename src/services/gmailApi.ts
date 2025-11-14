import { GmailLabel, GmailStats, EmailMessage, EmailListItem, EmailComposition, EmailAttachment } from '../types/gmail';

export class GmailApiService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async fetchGmail(endpoint: string): Promise<any> {
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getLabels(): Promise<GmailLabel[]> {
    const data = await this.fetchGmail('labels');
    const labels = data.labels || [];

    console.log('Raw labels from API:', labels);

    const detailedLabels = await Promise.all(
      labels.map(async (label: any) => {
        try {
          const details = await this.fetchGmail(`labels/${label.id}`);
          console.log(`Label ${label.name} details:`, details);
          return details;
        } catch (error) {
          console.error(`Failed to fetch details for label ${label.name}:`, error);
          return label;
        }
      })
    );

    return detailedLabels;
  }

  async getDraftsCount(): Promise<number> {
    try {
      const data = await this.fetchGmail('drafts');
      return data.drafts?.length || 0;
    } catch (error) {
      return 0;
    }
  }

  async getGmailStats(): Promise<GmailStats> {
    const labels = await this.getLabels();
    const draftsCount = await this.getDraftsCount();

    const inboxLabel = labels.find(l => l.id === 'INBOX');
    const spamLabel = labels.find(l => l.id === 'SPAM');
    const starredLabel = labels.find(l => l.id === 'STARRED');
    const trashLabel = labels.find(l => l.id === 'TRASH');
    const sentLabel = labels.find(l => l.id === 'SENT');

    const labelStats: Record<string, number> = {};
    labels.forEach(label => {
      if (label.messagesTotal !== undefined) {
        labelStats[label.name] = label.messagesTotal;
      }
    });

    const customLabels = labels
      .filter(label => label.type === 'user' && label.messagesTotal !== undefined)
      .map(label => ({
        id: label.id,
        name: label.name,
        messageCount: label.messagesTotal || 0,
        unreadCount: label.messagesUnread || 0
      }));

    return {
      totalInbox: inboxLabel?.messagesTotal || 0,
      unreadInbox: inboxLabel?.messagesUnread || 0,
      drafts: draftsCount,
      sent: sentLabel?.messagesTotal || 0,
      spam: spamLabel?.messagesTotal || 0,
      starred: starredLabel?.messagesTotal || 0,
      trash: trashLabel?.messagesTotal || 0,
      labels: labelStats,
      customLabels
    };
  }

  async getMessages(labelIds: string[] = ['INBOX'], maxResults: number = 20, pageToken?: string): Promise<{ messages: EmailListItem[]; nextPageToken?: string }> {
    const params = new URLSearchParams({
      maxResults: maxResults.toString(),
      labelIds: labelIds.join(','),
      ...(pageToken && { pageToken })
    });

    const data = await this.fetchGmail(`messages?${params.toString()}`);

    if (!data.messages || data.messages.length === 0) {
      return { messages: [], nextPageToken: data.nextPageToken };
    }

    const messages = await Promise.all(
      data.messages.map(async (msg: any) => {
        try {
          const fullMessage = await this.getMessage(msg.id);
          return this.parseEmailListItem(fullMessage);
        } catch (error) {
          console.error(`Failed to fetch message ${msg.id}:`, error);
          return null;
        }
      })
    );

    return {
      messages: messages.filter((m): m is EmailListItem => m !== null),
      nextPageToken: data.nextPageToken
    };
  }

  async getSLALabelIds(): Promise<Map<string, string>> {
    console.log('[GmailApi] Fetching all Gmail labels...');
    const labels = await this.getLabels();
    console.log('[GmailApi] Total labels found:', labels.length);

    const slaLabels = new Map<string, string>();
    const slaLabelNames = ['1: billing', '2: bug report', '3: feature request', '4: abuse report'];

    console.log('[GmailApi] Searching for SLA labels:', slaLabelNames);
    console.log('[GmailApi] Available label names:', labels.map(l => l.name).slice(0, 20).join(', '));

    for (const labelName of slaLabelNames) {
      const label = labels.find(l => l.name === labelName);
      if (label) {
        console.log(`[GmailApi] \u2713 Found SLA label: "${labelName}" (ID: ${label.id})`);
        slaLabels.set(labelName, label.id);
      } else {
        console.log(`[GmailApi] \u2717 Missing SLA label: "${labelName}"`);
      }
    }

    console.log('[GmailApi] Total SLA labels found:', slaLabels.size, 'out of', slaLabelNames.length);
    return slaLabels;
  }

  async getEmailsByLabel(labelId: string, maxResults: number = 50): Promise<EmailMessage[]> {
    try {
      const params = new URLSearchParams({
        labelIds: labelId,
        maxResults: maxResults.toString()
      });

      const data = await this.fetchGmail(`messages?${params.toString()}`);

      if (!data.messages || data.messages.length === 0) {
        return [];
      }

      const messages = await Promise.all(
        data.messages.map(async (msg: any) => {
          try {
            return await this.getMessage(msg.id);
          } catch (error) {
            console.error(`Failed to fetch message ${msg.id}:`, error);
            return null;
          }
        })
      );

      return messages.filter((m): m is EmailMessage => m !== null);
    } catch (error) {
      console.error(`Failed to fetch emails for label ${labelId}:`, error);
      return [];
    }
  }

  async getSLAEmails(): Promise<Array<{ message: EmailMessage; label: string }>> {
    const slaLabelIds = await this.getSLALabelIds();
    console.log('[GmailApi] SLA Label IDs found:', Array.from(slaLabelIds.entries()));

    const allSlaEmails: Array<{ message: EmailMessage; label: string }> = [];

    for (const [labelName, labelId] of slaLabelIds.entries()) {
      console.log(`[GmailApi] Fetching emails for label "${labelName}" (ID: ${labelId})`);
      const messages = await this.getEmailsByLabel(labelId, 50);
      console.log(`[GmailApi] Found ${messages.length} emails for label "${labelName}"`);

      for (const message of messages) {
        allSlaEmails.push({ message, label: labelName });
      }
    }

    console.log('[GmailApi] Total SLA emails collected:', allSlaEmails.length);
    return allSlaEmails;
  }

  async getMessagesByDateRange(afterDate: Date, beforeDate?: Date, maxResults: number = 50): Promise<EmailListItem[]> {
    const afterTimestamp = Math.floor(afterDate.getTime() / 1000);
    let query = `after:${afterTimestamp}`;

    if (beforeDate) {
      const beforeTimestamp = Math.floor(beforeDate.getTime() / 1000);
      query += ` before:${beforeTimestamp}`;
    }

    const params = new URLSearchParams({
      q: query,
      maxResults: maxResults.toString()
    });

    const data = await this.fetchGmail(`messages?${params.toString()}`);

    if (!data.messages || data.messages.length === 0) {
      return [];
    }

    const messages = await Promise.all(
      data.messages.map(async (msg: any) => {
        try {
          const fullMessage = await this.getMessage(msg.id);
          return this.parseEmailListItem(fullMessage);
        } catch (error) {
          console.error(`Failed to fetch message ${msg.id}:`, error);
          return null;
        }
      })
    );

    return messages.filter((m): m is EmailListItem => m !== null);
  }

  async getRecentEmails(): Promise<{ today: EmailListItem[]; thisWeek: EmailListItem[]; thisMonth: EmailListItem[] }> {
    const now = new Date();

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const monthStart = new Date(now);
    monthStart.setDate(now.getDate() - 30);

    const [today, thisWeek, thisMonth] = await Promise.all([
      this.getMessagesByDateRange(todayStart),
      this.getMessagesByDateRange(weekStart, todayStart),
      this.getMessagesByDateRange(monthStart, weekStart)
    ]);

    return { today, thisWeek, thisMonth };
  }

  async getMessage(messageId: string): Promise<EmailMessage> {
    return await this.fetchGmail(`messages/${messageId}?format=full`);
  }

  async searchMessages(query: string, maxResults: number = 20): Promise<EmailListItem[]> {
    const params = new URLSearchParams({
      q: query,
      maxResults: maxResults.toString()
    });

    const data = await this.fetchGmail(`messages?${params.toString()}`);

    if (!data.messages || data.messages.length === 0) {
      return [];
    }

    const messages = await Promise.all(
      data.messages.map(async (msg: any) => {
        try {
          const fullMessage = await this.getMessage(msg.id);
          return this.parseEmailListItem(fullMessage);
        } catch (error) {
          console.error(`Failed to fetch message ${msg.id}:`, error);
          return null;
        }
      })
    );

    return messages.filter((m): m is EmailListItem => m !== null);
  }

  async sendEmail(composition: EmailComposition): Promise<boolean> {
    try {
      const email = this.createMimeMessage(composition);
      const encodedEmail = btoa(unescape(encodeURIComponent(email)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      console.log('Sending email to:', composition.to);
      console.log('Subject:', composition.subject);
      if (composition.threadId) {
        console.log('Reply in thread:', composition.threadId);
      }

      const requestBody: any = { raw: encodedEmail };
      if (composition.threadId) {
        requestBody.threadId = composition.threadId;
      }

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Gmail API send error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });

        if (response.status === 403) {
          console.error('Permission denied. You need to log out and log back in to grant send permissions.');
        }

        return false;
      }

      console.log('Email sent successfully!');
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  async modifyMessage(messageId: string, addLabelIds: string[] = [], removeLabelIds: string[] = []): Promise<boolean> {
    try {
      await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ addLabelIds, removeLabelIds })
      });
      return true;
    } catch (error) {
      console.error('Failed to modify message:', error);
      return false;
    }
  }

  async markAsRead(messageId: string): Promise<boolean> {
    return this.modifyMessage(messageId, [], ['UNREAD']);
  }

  async markAsUnread(messageId: string): Promise<boolean> {
    return this.modifyMessage(messageId, ['UNREAD'], []);
  }

  async archiveMessage(messageId: string): Promise<boolean> {
    return this.modifyMessage(messageId, [], ['INBOX']);
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    try {
      await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      return true;
    } catch (error) {
      console.error('Failed to delete message:', error);
      return false;
    }
  }

  async starMessage(messageId: string): Promise<boolean> {
    return this.modifyMessage(messageId, ['STARRED'], []);
  }

  async unstarMessage(messageId: string): Promise<boolean> {
    return this.modifyMessage(messageId, [], ['STARRED']);
  }

  async getAttachment(messageId: string, attachmentId: string): Promise<string | null> {
    try {
      const data = await this.fetchGmail(`messages/${messageId}/attachments/${attachmentId}`);
      return data.data || null;
    } catch (error) {
      console.error('Failed to fetch attachment:', error);
      return null;
    }
  }

  private parseEmailListItem(message: EmailMessage): EmailListItem {
    const headers = message.payload.headers || [];
    const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || 'Unknown';
    const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '(No subject)';
    const date = headers.find(h => h.name.toLowerCase() === 'date')?.value || message.internalDate;

    return {
      id: message.id,
      threadId: message.threadId,
      snippet: message.snippet,
      from: this.extractEmailAddress(from),
      subject,
      date: this.formatDate(date),
      isRead: !message.labelIds.includes('UNREAD'),
      hasAttachments: this.hasAttachments(message.payload),
      labelIds: message.labelIds
    };
  }

  private extractEmailAddress(from: string): string {
    const match = from.match(/<(.+?)>/);
    return match ? match[1] : from;
  }

  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  }

  private hasAttachments(payload: any): boolean {
    if (payload.parts) {
      return payload.parts.some((part: any) =>
        part.filename && part.filename.length > 0
      );
    }
    return false;
  }

  private createMimeMessage(composition: EmailComposition): string {
    const boundary = '----=_Part_' + Date.now();
    const lines: string[] = [];

    lines.push(`To: ${composition.to}`);
    if (composition.cc) lines.push(`Cc: ${composition.cc}`);
    if (composition.bcc) lines.push(`Bcc: ${composition.bcc}`);
    lines.push(`Subject: ${composition.subject}`);
    lines.push('MIME-Version: 1.0');
    lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    if (composition.inReplyTo) lines.push(`In-Reply-To: ${composition.inReplyTo}`);
    if (composition.references) lines.push(`References: ${composition.references}`);
    lines.push('');
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/plain; charset="UTF-8"');
    lines.push('');
    lines.push(composition.body);
    lines.push('');
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/html; charset="UTF-8"');
    lines.push('');
    lines.push(composition.body.replace(/\n/g, '<br>'));
    lines.push('');
    lines.push(`--${boundary}--`);

    return lines.join('\r\n');
  }

  async getEmailBodyWithImages(message: EmailMessage): Promise<{ body: string; isHtml: boolean }> {
    const result = this.getEmailBody(message);
    let htmlBody = result.body;

    const inlineImages = this.extractInlineImages(message.payload);

    if (inlineImages.length > 0) {
      const imageDataMap = await this.fetchInlineImages(message.id, inlineImages);
      htmlBody = this.replaceInlineImages(htmlBody, imageDataMap);
    }

    return { body: htmlBody, isHtml: result.isHtml };
  }

  getEmailBody(message: EmailMessage): { body: string; isHtml: boolean } {
    if (message.payload.body?.data) {
      const body = this.decodeBase64(message.payload.body.data);
      const isHtml = message.payload.mimeType === 'text/html';
      return { body, isHtml };
    }

    if (message.payload.parts) {
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          return { body: this.decodeBase64(part.body.data), isHtml: true };
        }
      }
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return { body: this.decodeBase64(part.body.data), isHtml: false };
        }
        if (part.parts) {
          const nestedBody = this.getNestedBody(part.parts);
          if (nestedBody) return nestedBody;
        }
      }
    }

    return { body: message.snippet || '', isHtml: false };
  }

  private getNestedBody(parts: any[]): { body: string; isHtml: boolean } | null {
    for (const part of parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return { body: this.decodeBase64(part.body.data), isHtml: true };
      }
    }
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return { body: this.decodeBase64(part.body.data), isHtml: false };
      }
      if (part.parts) {
        const nestedBody = this.getNestedBody(part.parts);
        if (nestedBody) return nestedBody;
      }
    }
    return null;
  }

  private decodeBase64(encoded: string): string {
    try {
      const cleaned = encoded.replace(/-/g, '+').replace(/_/g, '/');
      return decodeURIComponent(escape(atob(cleaned)));
    } catch (error) {
      console.error('Failed to decode base64:', error);
      return '';
    }
  }

  private extractInlineImages(payload: any, images: Array<{cid: string; attachmentId: string; mimeType: string}> = []): Array<{cid: string; attachmentId: string; mimeType: string}> {
    if (!payload) return images;

    if (payload.headers) {
      const contentId = payload.headers.find((h: any) => h.name.toLowerCase() === 'content-id')?.value;
      if (contentId && payload.body?.attachmentId && payload.mimeType?.startsWith('image/')) {
        const cid = contentId.replace(/^<|>$/g, '');
        images.push({
          cid,
          attachmentId: payload.body.attachmentId,
          mimeType: payload.mimeType
        });
      }
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        this.extractInlineImages(part, images);
      }
    }

    return images;
  }

  private async fetchInlineImages(messageId: string, images: Array<{cid: string; attachmentId: string; mimeType: string}>): Promise<Map<string, string>> {
    const imageDataMap = new Map<string, string>();

    await Promise.all(
      images.map(async (img) => {
        try {
          const data = await this.getAttachment(messageId, img.attachmentId);
          if (data) {
            const cleanedData = data.replace(/-/g, '+').replace(/_/g, '/');
            imageDataMap.set(img.cid, `data:${img.mimeType};base64,${cleanedData}`);
          }
        } catch (error) {
          console.error(`Failed to fetch inline image ${img.cid}:`, error);
        }
      })
    );

    return imageDataMap;
  }

  private replaceInlineImages(html: string, imageDataMap: Map<string, string>): string {
    let processedHtml = html;

    imageDataMap.forEach((dataUrl, cid) => {
      const cidPattern = new RegExp(`src=["']cid:${cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'gi');
      processedHtml = processedHtml.replace(cidPattern, `src="${dataUrl}"`);
    });

    return processedHtml;
  }
}
