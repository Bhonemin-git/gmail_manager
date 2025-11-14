import { useState, useEffect } from 'react';
import { Send, X, Loader2 } from 'lucide-react';
import { EmailComposition, EmailMessage } from '../types/gmail';
import { GmailApiService } from '../services/gmailApi';

interface EmailComposeProps {
  gmailApi: GmailApiService;
  onSend: (composition: EmailComposition) => Promise<boolean>;
  onCancel: () => void;
  replyToMessage?: EmailMessage | null;
  forwardMessage?: EmailMessage | null;
}

export function EmailCompose({ gmailApi, onSend, onCancel, replyToMessage, forwardMessage }: EmailComposeProps) {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [userMessage, setUserMessage] = useState('');
  const [quotedHtml, setQuotedHtml] = useState<string>('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const [inReplyTo, setInReplyTo] = useState<string | undefined>(undefined);
  const [references, setReferences] = useState<string | undefined>(undefined);
  const [threadId, setThreadId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const loadMessageContent = async () => {
      if (replyToMessage) {
        const headers = replyToMessage.payload.headers || [];
        const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
        const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
        const messageIdHeader = headers.find(h => h.name.toLowerCase() === 'message-id')?.value || '';
        const referencesHeader = headers.find(h => h.name.toLowerCase() === 'references')?.value || '';

        const extractEmail = (address: string): string => {
          const match = address.match(/<(.+?)>/);
          return match ? match[1] : address;
        };

        setTo(extractEmail(fromHeader));
        setSubject(subjectHeader.startsWith('Re:') ? subjectHeader : `Re: ${subjectHeader}`);
        setThreadId(replyToMessage.threadId);

        if (messageIdHeader) {
          setInReplyTo(messageIdHeader);
          const newReferences = referencesHeader
            ? `${referencesHeader} ${messageIdHeader}`
            : messageIdHeader;
          setReferences(newReferences);
        }

        const { body: originalBody } = gmailApi.getEmailBody(replyToMessage);

        const cleanedHtml = originalBody
          .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<meta[^>]*>/gi, '')
          .replace(/<!DOCTYPE[^>]*>/gi, '')
          .replace(/<html[^>]*>/gi, '')
          .replace(/<\/html>/gi, '')
          .replace(/<body[^>]*>/gi, '')
          .replace(/<\/body>/gi, '');

        const dateString = headers.find(h => h.name.toLowerCase() === 'date')?.value ||
                          new Date(parseInt(replyToMessage.internalDate)).toUTCString();

        const replyHeader = `
          <div style="border-top: 1px solid #3f4349; margin-top: 20px; padding-top: 20px; color: #9ca3af; font-size: 14px;">
            <div style="margin-bottom: 10px;">On ${dateString}, ${fromHeader} wrote:</div>
          </div>
          <div style="margin-top: 15px; border-left: 3px solid #4a5568; padding-left: 15px;">
            ${cleanedHtml}
          </div>
        `;

        setQuotedHtml(replyHeader);
        setUserMessage('');
      } else if (forwardMessage) {
        const headers = forwardMessage.payload.headers || [];
        const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
        const toHeader = headers.find(h => h.name.toLowerCase() === 'to')?.value || '';
        const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
        const dateHeader = headers.find(h => h.name.toLowerCase() === 'date')?.value || '';

        setSubject(subjectHeader.startsWith('Fwd:') ? subjectHeader : `Fwd: ${subjectHeader}`);

        const { body: originalBody } = gmailApi.getEmailBody(forwardMessage);

        const cleanedHtml = originalBody
          .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<meta[^>]*>/gi, '')
          .replace(/<!DOCTYPE[^>]*>/gi, '')
          .replace(/<html[^>]*>/gi, '')
          .replace(/<\/html>/gi, '')
          .replace(/<body[^>]*>/gi, '')
          .replace(/<\/body>/gi, '');

        const forwardHeader = `
          <div style="border-top: 1px solid #3f4349; margin-top: 20px; padding-top: 20px; color: #9ca3af; font-size: 14px;">
            <strong>---------- Forwarded message ---------</strong><br>
            <strong>From:</strong> ${fromHeader}<br>
            <strong>Date:</strong> ${dateHeader}<br>
            <strong>Subject:</strong> ${subjectHeader}<br>
            <strong>To:</strong> ${toHeader}
          </div>
          <div style="margin-top: 15px;">
            ${cleanedHtml}
          </div>
        `;

        setQuotedHtml(forwardHeader);
        setUserMessage('');
      }
    };

    loadMessageContent();
  }, [replyToMessage, forwardMessage, gmailApi]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!to.trim()) {
      alert('Please enter a recipient');
      return;
    }

    if (!subject.trim()) {
      if (!confirm('Send this message without a subject?')) {
        return;
      }
    }

    setSending(true);
    try {
      let finalBody = body;

      if ((replyToMessage || forwardMessage) && quotedHtml) {
        const userText = userMessage.trim() ? `<div style="white-space: pre-wrap;">${userMessage}</div>` : '';
        finalBody = userText + quotedHtml;
      }

      const composition: EmailComposition = {
        to: to.trim(),
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        subject: subject.trim(),
        body: finalBody,
        inReplyTo: inReplyTo,
        references: references,
        threadId: threadId
      };

      const success = await onSend(composition);
      if (!success) {
        alert('Failed to send email. Please try again.');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('An error occurred while sending the email');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onCancel}
      />
      <div
        className="fixed top-[15%] left-1/2 transform -translate-x-1/2 w-full max-w-[800px] mx-4 shadow-2xl rounded-lg overflow-hidden z-50 flex flex-col"
        style={{
          backgroundColor: '#2a2e35',
          maxHeight: '75vh'
        }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#3f4349' }}>
          <h3 className="text-sm font-semibold" style={{ color: '#ffffff' }}>
            {replyToMessage ? 'Reply' : forwardMessage ? 'Forward' : 'New Message'}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5" style={{ color: '#9ca3af' }} />
          </button>
        </div>
        <form onSubmit={handleSend} className="flex flex-col flex-1 overflow-hidden">
        <div className="p-4 md:p-6 space-y-3 md:space-y-4 border-b" style={{ borderColor: '#3f4349' }}>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="To"
                className="flex-1 px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base border-b bg-transparent focus:outline-none"
                style={{ borderColor: '#4a5568', color: '#ffffff' }}
                onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#60a5fa'; }}
                onBlur={(e) => { e.currentTarget.style.borderBottomColor = '#4a5568'; }}
                required
              />
              <div className="flex gap-1.5 md:gap-2 flex-shrink-0">
                {!showCc && (
                  <button
                    type="button"
                    onClick={() => setShowCc(true)}
                    className="text-xs md:text-sm px-1 md:px-2 whitespace-nowrap"
                    style={{ color: '#9ca3af' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                  >
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button
                    type="button"
                    onClick={() => setShowBcc(true)}
                    className="text-xs md:text-sm px-1 md:px-2 whitespace-nowrap"
                    style={{ color: '#9ca3af' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                  >
                    Bcc
                  </button>
                )}
              </div>
            </div>
          </div>

          {showCc && (
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="Cc"
                className="flex-1 px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base border-b bg-transparent focus:outline-none"
                style={{ borderColor: '#4a5568', color: '#ffffff' }}
                onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#60a5fa'; }}
                onBlur={(e) => { e.currentTarget.style.borderBottomColor = '#4a5568'; }}
              />
              <button
                type="button"
                onClick={() => {
                  setShowCc(false);
                  setCc('');
                }}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {showBcc && (
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="Bcc"
                className="flex-1 px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base border-b bg-transparent focus:outline-none"
                style={{ borderColor: '#4a5568', color: '#ffffff' }}
                onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#60a5fa'; }}
                onBlur={(e) => { e.currentTarget.style.borderBottomColor = '#4a5568'; }}
              />
              <button
                type="button"
                onClick={() => {
                  setShowBcc(false);
                  setBcc('');
                }}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base border-b border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none"
              onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#353d35'; }}
              onBlur={(e) => { e.currentTarget.style.borderBottomColor = ''; }}
            />
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto" style={{ minHeight: '300px' }}>
          {(replyToMessage || forwardMessage) ? (
            <div className="flex flex-col h-full">
              <textarea
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                placeholder="Add your message..."
                className="w-full resize-none bg-transparent text-sm focus:outline-none mb-4"
                style={{ color: '#ffffff', minHeight: '80px' }}
              />
              <div
                className="flex-1 overflow-y-auto"
                style={{ maxHeight: '50vh' }}
              >
                <div
                  className="prose prose-invert max-w-none"
                  style={{
                    color: '#ffffff',
                    fontSize: '14px',
                    lineHeight: '1.6'
                  }}
                  dangerouslySetInnerHTML={{ __html: quotedHtml }}
                />
                <style>{`
                  .prose img {
                    max-width: 100%;
                    height: auto;
                    display: block;
                  }
                  .prose a {
                    color: #60a5fa;
                    text-decoration: underline;
                  }
                  .prose p {
                    margin-bottom: 1em;
                  }
                `}</style>
              </div>
            </div>
          ) : (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              className="w-full h-full resize-none bg-transparent text-sm focus:outline-none"
              style={{ color: '#ffffff', minHeight: '280px' }}
            />
          )}
        </div>

        <div className="px-4 py-4 pb-6 border-t flex items-center justify-between gap-2" style={{ borderColor: '#3f4349' }}>
          <button
            type="submit"
            disabled={sending}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm text-white rounded-lg transition-colors font-medium"
            style={{ backgroundColor: sending ? '#555d55' : '#353d35' }}
            onMouseEnter={(e) => !sending && (e.currentTarget.style.backgroundColor = '#2a312a')}
            onMouseLeave={(e) => !sending && (e.currentTarget.style.backgroundColor = '#353d35')}
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send
              </>
            )}
          </button>
        </div>
      </form>
      </div>
    </>
  );
}
