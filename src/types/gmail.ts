export interface GmailUser {
  email: string;
  name: string;
  picture: string;
}

export interface GmailLabel {
  id: string;
  name: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
}

export interface CustomLabel {
  id: string;
  name: string;
  messageCount: number;
  unreadCount: number;
}

export interface GmailStats {
  totalInbox: number;
  unreadInbox: number;
  drafts: number;
  sent: number;
  spam: number;
  starred: number;
  trash: number;
  labels: Record<string, number>;
  customLabels: CustomLabel[];
}

export interface EmailField {
  labelId: string;
  labelName?: string;
  email: string;
}

export interface N8nPayload {
  userEmail: string;
  accessToken: string;
  timestamp: string;
  gmailStats: GmailStats;
  emailFields: EmailField[];
}

export interface EmailHeader {
  name: string;
  value: string;
}

export interface EmailPart {
  partId?: string;
  mimeType: string;
  filename?: string;
  body?: {
    size: number;
    data?: string;
    attachmentId?: string;
  };
  parts?: EmailPart[];
  headers?: EmailHeader[];
}

export interface EmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: EmailPart;
  sizeEstimate: number;
  historyId: string;
  internalDate: string;
  from?: string;
  to?: string;
  subject?: string;
  date?: string;
  isRead?: boolean;
  hasAttachments?: boolean;
}

export interface EmailListItem {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  subject: string;
  date: string;
  isRead: boolean;
  hasAttachments: boolean;
  labelIds: string[];
  isStarred?: boolean;
}

export interface EmailComposition {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
  threadId?: string;
}

export interface EmailThread {
  id: string;
  historyId: string;
  messages: EmailMessage[];
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
  messageId: string;
}
