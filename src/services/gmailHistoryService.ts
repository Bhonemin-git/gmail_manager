import { EmailListItem } from '../types/gmail';

export interface HistoryChange {
  messagesAdded?: Array<{ message: { id: string; threadId: string; labelIds: string[] } }>;
  messagesDeleted?: Array<{ message: { id: string; threadId: string } }>;
  labelsAdded?: Array<{ message: { id: string; threadId: string; labelIds: string[] } }>;
  labelsRemoved?: Array<{ message: { id: string; threadId: string; labelIds: string[] } }>;
}

export interface HistoryResponse {
  history: HistoryChange[];
  historyId: string;
}

export class GmailHistoryService {
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
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Gmail API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getProfile(): Promise<{ historyId: string; emailAddress: string }> {
    const data = await this.fetchGmail('profile');
    return {
      historyId: data.historyId,
      emailAddress: data.emailAddress
    };
  }

  async listHistory(startHistoryId: string): Promise<HistoryResponse | null> {
    try {
      const params = new URLSearchParams({
        startHistoryId,
        historyTypes: ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved'].join(',')
      });

      const data = await this.fetchGmail(`history?${params.toString()}`);

      if (!data || !data.history) {
        return null;
      }

      return {
        history: data.history,
        historyId: data.historyId
      };
    } catch (error) {
      console.error('Failed to fetch history:', error);
      return null;
    }
  }

  async getMessage(messageId: string): Promise<any> {
    try {
      return await this.fetchGmail(`messages/${messageId}?format=full`);
    } catch (error) {
      console.error(`Failed to fetch message ${messageId}:`, error);
      return null;
    }
  }

  async getIncrementalChanges(startHistoryId: string): Promise<{
    added: EmailListItem[];
    deleted: string[];
    modified: EmailListItem[];
    newHistoryId: string | null;
  }> {
    const historyResponse = await this.listHistory(startHistoryId);

    if (!historyResponse) {
      return {
        added: [],
        deleted: [],
        modified: [],
        newHistoryId: null
      };
    }

    const addedMessageIds = new Set<string>();
    const deletedMessageIds = new Set<string>();
    const modifiedMessageIds = new Set<string>();

    for (const change of historyResponse.history) {
      if (change.messagesAdded) {
        change.messagesAdded.forEach(item => addedMessageIds.add(item.message.id));
      }

      if (change.messagesDeleted) {
        change.messagesDeleted.forEach(item => {
          deletedMessageIds.add(item.message.id);
          addedMessageIds.delete(item.message.id);
        });
      }

      if (change.labelsAdded || change.labelsRemoved) {
        const items = [...(change.labelsAdded || []), ...(change.labelsRemoved || [])];
        items.forEach(item => {
          if (!addedMessageIds.has(item.message.id) && !deletedMessageIds.has(item.message.id)) {
            modifiedMessageIds.add(item.message.id);
          }
        });
      }
    }

    const fetchedAdded = await this.fetchMessages(Array.from(addedMessageIds));
    const fetchedModified = await this.fetchMessages(Array.from(modifiedMessageIds));

    console.log(`[GmailHistoryService] Incremental changes: ${fetchedAdded.length} added, ${deletedMessageIds.size} deleted, ${fetchedModified.length} modified`);

    return {
      added: fetchedAdded,
      deleted: Array.from(deletedMessageIds),
      modified: fetchedModified,
      newHistoryId: historyResponse.historyId
    };
  }

  private async fetchMessages(messageIds: string[]): Promise<EmailListItem[]> {
    if (messageIds.length === 0) return [];

    const messages = await Promise.all(
      messageIds.map(async (id) => {
        const message = await this.getMessage(id);
        if (!message) return null;
        return this.parseEmailListItem(message);
      })
    );

    return messages.filter((m): m is EmailListItem => m !== null);
  }

  private parseEmailListItem(message: any): EmailListItem {
    const headers = message.payload?.headers || [];
    const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown';
    const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No subject)';
    const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || message.internalDate;

    return {
      id: message.id,
      threadId: message.threadId,
      snippet: message.snippet || '',
      from: this.extractEmailAddress(from),
      subject,
      date: this.formatDate(date),
      isRead: !message.labelIds?.includes('UNREAD'),
      hasAttachments: this.hasAttachments(message.payload),
      labelIds: message.labelIds || [],
      isStarred: message.labelIds?.includes('STARRED')
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
    if (payload?.parts) {
      return payload.parts.some((part: any) =>
        part.filename && part.filename.length > 0
      );
    }
    return false;
  }

  async setupWatch(topicName: string, labelIds: string[] = ['INBOX']): Promise<{ historyId: string; expiration: number } | null> {
    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/watch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topicName,
          labelIds,
          labelFilterAction: 'include'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to setup watch: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        historyId: data.historyId,
        expiration: parseInt(data.expiration)
      };
    } catch (error) {
      console.error('Failed to setup Gmail watch:', error);
      return null;
    }
  }

  async stopWatch(): Promise<boolean> {
    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/stop', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to stop Gmail watch:', error);
      return false;
    }
  }
}
