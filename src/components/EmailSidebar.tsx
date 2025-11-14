import { useState, useRef, useEffect } from 'react';
import { Inbox, Tag } from 'lucide-react';
import { EmailList } from './EmailList';
import { RecentEmailList } from './RecentEmailList';
import { EmailDetail } from './EmailDetail';
import { EmailCompose } from './EmailCompose';
import { EmailMessage, EmailComposition, CustomLabel } from '../types/gmail';
import { GmailApiService } from '../services/gmailApi';
import { GmailAuthService } from '../services/gmailAuth';

interface EmailSidebarProps {
  gmailApi: GmailApiService;
  customLabels: CustomLabel[];
  selectedFolder?: string;
  onFolderChange?: (folderId: string) => void;
}

type ViewMode = 'list' | 'detail' | 'compose' | 'reply' | 'forward';


export function EmailSidebar({ gmailApi, customLabels, selectedFolder: externalSelectedFolder, onFolderChange }: EmailSidebarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [internalSelectedFolder, setInternalSelectedFolder] = useState<string>('INBOX');
  const userEmail = GmailAuthService.getUserInfo()?.email;

  const selectedFolder = externalSelectedFolder !== undefined ? externalSelectedFolder : internalSelectedFolder;
  const setSelectedFolder = (folderId: string) => {
    if (onFolderChange) {
      onFolderChange(folderId);
    } else {
      setInternalSelectedFolder(folderId);
    }
  };

  useEffect(() => {
    if (externalSelectedFolder !== undefined) {
      setViewMode('list');
      setSelectedMessage(null);
    }
  }, [externalSelectedFolder]);

  const getLabelIds = (folderId: string): string[] => {
    switch (folderId) {
      case 'INBOX':
        return ['INBOX'];
      case 'RECENT':
        return ['INBOX'];
      case 'STARRED':
        return ['STARRED'];
      case 'UNREAD':
        return ['UNREAD'];
      case 'SENT':
        return ['SENT'];
      case 'DRAFT':
        return ['DRAFT'];
      case 'SPAM':
        return ['SPAM'];
      case 'TRASH':
        return ['TRASH'];
      default:
        return [folderId];
    }
  };


  const handleEmailClick = async (messageId: string) => {
    try {
      const message = await gmailApi.getMessage(messageId);
      setSelectedMessage(message);
      setViewMode('detail');
      await gmailApi.markAsRead(messageId);
    } catch (error) {
      console.error('Failed to load email:', error);
    }
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedMessage(null);
  };

  const handleBackToDetail = () => {
    if (selectedMessage) {
      setViewMode('detail');
    } else {
      handleBackToList();
    }
  };

  const handleCompose = () => {
    setViewMode('compose');
  };

  const handleReply = () => {
    setViewMode('reply');
  };

  const handleForward = () => {
    setViewMode('forward');
  };

  const handleSendEmail = async (composition: EmailComposition) => {
    const success = await gmailApi.sendEmail(composition);
    if (success) {
      if (selectedMessage && (viewMode === 'reply' || viewMode === 'forward')) {
        setViewMode('detail');
      } else {
        setViewMode('list');
        setSelectedMessage(null);
      }
    }
    return success;
  };

  const handleDelete = async (messageId: string) => {
    const success = await gmailApi.deleteMessage(messageId);
    if (success) {
      setViewMode('list');
      setSelectedMessage(null);
    }
  };


  return (
    <div
      data-email-sidebar
      ref={(el) => {
        if (el) {
          (el as any).handleCompose = handleCompose;
        }
      }}
      style={{
        backgroundColor: '#2a2e35'
      }}
      className="flex-1 flex flex-col transition-colors relative h-full overflow-hidden rounded-lg"
    >
      {selectedFolder === 'RECENT' ? (
        <RecentEmailList
          gmailApi={gmailApi}
          onEmailClick={handleEmailClick}
          onCompose={handleCompose}
        />
      ) : viewMode === 'detail' && selectedMessage ? (
        <EmailDetail
          message={selectedMessage}
          gmailApi={gmailApi}
          onReply={handleReply}
          onDelete={handleDelete}
          onForward={handleForward}
          onBack={handleBackToList}
        />
      ) : (
        <EmailList
          labelIds={getLabelIds(selectedFolder)}
          gmailApi={gmailApi}
          onEmailClick={handleEmailClick}
          onCompose={handleCompose}
          userEmail={userEmail}
        />
      )}

      {(viewMode === 'compose' || viewMode === 'reply' || viewMode === 'forward') && (
        <EmailCompose
          gmailApi={gmailApi}
          onSend={handleSendEmail}
          onCancel={viewMode === 'compose' ? handleBackToList : handleBackToDetail}
          replyToMessage={viewMode === 'reply' ? selectedMessage : undefined}
          forwardMessage={viewMode === 'forward' ? selectedMessage : undefined}
        />
      )}
    </div>
  );
}
