import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, PenSquare, BarChart3, Inbox, Mail, Star, FileText, Send, AlertOctagon, Trash2, Tag } from 'lucide-react';
import { Header } from './components/Header';
import { SLATable } from './components/SLATable';
import { LoginButton } from './components/LoginButton';
import { GmailStats } from './components/GmailStats';
import { WorkflowTrigger } from './components/WorkflowTrigger';
import { NotificationCenter } from './components/NotificationCenter';
import { EmailSidebar } from './components/EmailSidebar';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Modal } from './components/Modal';
import { CustomLabelsBarChart } from './components/CustomLabelsBarChart';
import { useNotifications } from './contexts/NotificationContext';
import { GmailAuthService } from './services/gmailAuth';
import { GmailApiService } from './services/gmailApi';
import { N8nService } from './services/n8nService';
import { GmailUser, GmailStats as GmailStatsType, EmailField } from './types/gmail';
import { CONFIG } from './config';
import { useEmailSync } from './hooks/useEmailSync';
import { useStatsAutoRefresh } from './hooks/useStatsAutoRefresh';

function App() {
  const [user, setUser] = useState<GmailUser | null>(null);
  const [stats, setStats] = useState<GmailStatsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [gmailApi, setGmailApi] = useState<GmailApiService | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>('INBOX');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [currentView, setCurrentView] = useState<'emails' | 'chart'>('emails');
  const { addNotification } = useNotifications();

  const { syncSLAEmails } = useEmailSync(
    gmailApi,
    user?.email || null,
    (count) => {
      addNotification('info', `You have ${count} new email${count > 1 ? 's' : ''}`);
    }
  );

  const { isRefreshing, lastUpdate, manualRefresh } = useStatsAutoRefresh({
    gmailApi,
    userEmail: user?.email || null,
    onStatsUpdate: async (newStats) => {
      setStats(newStats);
      if (syncSLAEmails) {
        await syncSLAEmails(false);
      }
    },
    onError: (error) => {
      addNotification('error', error);
    }
  });

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      const token = GmailAuthService.handleCallback();

      if (token) {
        await fetchUserInfo(token);
      } else {
        const existingToken = GmailAuthService.getAccessToken();
        const existingUser = GmailAuthService.getUserInfo();

        if (existingToken && existingUser) {
          setUser(existingUser);
          await fetchGmailStats(existingToken);
        }
      }
    } catch (error) {
      console.error('Initialization error:', error);
      addNotification('error', 'Failed to initialize app. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInfo = async (token: string) => {
    try {
      const userInfo = await GmailAuthService.fetchUserInfo(token);
      GmailAuthService.setUserInfo(userInfo);
      setUser(userInfo);
      await fetchGmailStats(token);
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      addNotification('error', 'Failed to fetch user information');
    }
  };

  const fetchGmailStats = async (token: string) => {
    setStatsLoading(true);
    try {
      const api = new GmailApiService(token);
      setGmailApi(api);
      const gmailStats = await api.getGmailStats();
      setStats(gmailStats);
    } catch (error) {
      console.error('Failed to fetch Gmail stats:', error);
      addNotification('error', 'Failed to fetch Gmail statistics');
    } finally {
      setStatsLoading(false);
    }
  };

  const handleLogin = () => {
    if (!CONFIG.GOOGLE_CLIENT_ID) {
      addNotification('error', 'Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file.');
      return;
    }
    GmailAuthService.initiateLogin();
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = () => {
    GmailAuthService.logout();
    setUser(null);
    setStats(null);
    setGmailApi(null);
    setShowLogoutConfirm(false);
    addNotification('success', 'Logged out successfully');
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  const handleTriggerWorkflow = async (emailFields: EmailField[]) => {
    if (!user || !stats) return;

    if (!CONFIG.N8N_WEBHOOK_URL) {
      addNotification('error', 'N8N Webhook URL not configured. Please set VITE_N8N_WEBHOOK_URL in your .env file.');
      return;
    }

    setTriggerLoading(true);

    try {
      const accessToken = GmailAuthService.getAccessToken();
      if (!accessToken) throw new Error('No access token found');

      const success = await N8nService.triggerWorkflow({
        userEmail: user.email,
        accessToken,
        timestamp: new Date().toISOString(),
        gmailStats: stats,
        emailFields
      });

      if (success) {
        addNotification('success', 'Workflow triggered successfully!');
        setShowWorkflowModal(false);
      } else {
        addNotification('error', 'Failed to trigger workflow. Please check your n8n webhook URL.');
      }
    } catch (error) {
      console.error('Failed to trigger workflow:', error);
      addNotification('error', 'An error occurred while triggering the workflow');
    } finally {
      setTriggerLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#353d35' }} />
      </div>
    );
  }

  return (
    <div
      className="h-screen transition-colors flex flex-col overflow-hidden relative"
      style={{ backgroundColor: '#050B22' }}
    >
      {!user && (
        <>
          <video
            autoPlay
            loop
            muted
            playsInline
            className="fixed inset-0 w-full h-full object-cover z-0"
          >
            <source src="/galaxy_background.mp4" type="video/mp4" />
          </video>
          <div className="fixed inset-0 bg-black/30 z-[1]" />
        </>
      )}
      {user && (
        <Header
          isSyncing={isRefreshing}
          lastSyncTime={lastUpdate}
          onManualSync={manualRefresh}
          user={user}
          onLogout={handleLogoutClick}
          onConnect={() => setShowWorkflowModal(true)}
          onLogoClick={() => {
            setSelectedFolder('INBOX');
            setCurrentView('emails');
          }}
        />
      )}
      <NotificationCenter />
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Confirm Logout"
        message="Are you sure you want to log out? You will need to sign in again to access your Gmail data."
        confirmText="Logout"
        cancelText="Cancel"
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
        variant="danger"
      />

      <div className="flex-1 overflow-y-auto relative">
        <main className={`${
          user ? '' : 'flex items-center justify-center min-h-screen'
        }`}>
          <div className={user ? 'w-full' : 'relative z-10 w-full'}>
            {!user ? (
              <LoginButton onLogin={handleLogin} />
            ) : (
              <>
                {statsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#353d35' }} />
                  </div>
                ) : stats ? (
                  <>
                    <div className="flex flex-col md:flex-row gap-4 px-6 pt-6" style={{ height: 'calc(100vh - 110px)', overflow: 'hidden', backgroundColor: '#050B22' }}>
                      <div className="w-full md:w-64 flex-shrink-0 flex flex-col rounded-lg overflow-hidden" style={{ backgroundColor: '#1a1a1a', height: '100%', maxHeight: '100%' }}>
                        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                          <div className="p-4">
                            <h2 className="text-sm font-semibold mb-4 px-2" style={{ color: '#ffffff' }}>
                              Gmail Statistics
                            </h2>

                            <div className="space-y-1">
                            {[
                              { id: 'INBOX', label: 'Total Inbox', count: stats.totalInbox, icon: Inbox },
                              { id: 'UNREAD', label: 'Unread', count: stats.unreadInbox, icon: Mail },
                              { id: 'STARRED', label: 'Starred', count: stats.starred, icon: Star },
                              { id: 'DRAFT', label: 'Drafts', count: stats.drafts, icon: FileText },
                              { id: 'SENT', label: 'Sent', count: stats.sent, icon: Send },
                              { id: 'SPAM', label: 'Spam', count: stats.spam, icon: AlertOctagon },
                              { id: 'TRASH', label: 'Trash', count: stats.trash, icon: Trash2 },
                            ].map((item) => {
                              const isSelected = selectedFolder === item.id && currentView === 'emails';
                              const IconComponent = item.icon;
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => {
                                    setSelectedFolder(item.id);
                                    setCurrentView('emails');
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors ${
                                    isSelected
                                      ? 'font-semibold'
                                      : ''
                                  }`}
                                  style={{
                                    backgroundColor: isSelected ? '#2c5282' : 'transparent',
                                    color: isSelected ? '#ffffff' : '#d1d5db'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isSelected) e.currentTarget.style.backgroundColor = '#2d2d2d';
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    <IconComponent className="w-4 h-4" />
                                    <span>{item.label}</span>
                                  </div>
                                  <span className="font-semibold">
                                    {item.count}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {stats.customLabels.length > 0 && (
                            <>
                              <div className="mt-6 mb-3 px-2">
                                <h3 className="text-sm font-semibold" style={{ color: '#ffffff' }}>
                                  AI-Organized Labels
                                </h3>
                              </div>

                              <div className="space-y-1">
                                {[...stats.customLabels].sort((a, b) => {
                                  const getNumericPrefix = (name: string) => {
                                    const match = name.match(/^(\d+):/);
                                    return match ? parseInt(match[1], 10) : Infinity;
                                  };
                                  return getNumericPrefix(a.name) - getNumericPrefix(b.name);
                                }).map((label) => {
                                  const isSelected = selectedFolder === label.id && currentView === 'emails';
                                  return (
                                    <button
                                      key={label.id}
                                      onClick={() => {
                                        setSelectedFolder(label.id);
                                        setCurrentView('emails');
                                      }}
                                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors ${
                                        isSelected
                                          ? 'font-semibold'
                                          : ''
                                      }`}
                                      style={{
                                        backgroundColor: isSelected ? '#2c5282' : 'transparent',
                                        color: isSelected ? '#ffffff' : '#d1d5db'
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!isSelected) e.currentTarget.style.backgroundColor = '#2d2d2d';
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                      }}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Tag className="w-4 h-4 flex-shrink-0" />
                                        <span className="truncate">{label.name}</span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          )}
                          </div>
                        </div>

                        {stats.customLabels.length > 0 && (
                          <div className="p-4 border-t border-gray-700 flex-shrink-0">
                            <button
                              onClick={() => setCurrentView('chart')}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                                currentView === 'chart'
                                  ? 'font-semibold'
                                  : ''
                              }`}
                              style={{
                                backgroundColor: currentView === 'chart' ? '#2c5282' : 'transparent',
                                color: currentView === 'chart' ? '#ffffff' : '#d1d5db'
                              }}
                              onMouseEnter={(e) => {
                                if (currentView !== 'chart') e.currentTarget.style.backgroundColor = '#2d2d2d';
                              }}
                              onMouseLeave={(e) => {
                                if (currentView !== 'chart') e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <BarChart3 className="w-4 h-4" />
                              <span>Label Statistics</span>
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 flex overflow-hidden h-full rounded-lg">
                        {currentView === 'emails' && gmailApi ? (
                          <EmailSidebar
                            gmailApi={gmailApi}
                            customLabels={stats.customLabels}
                            selectedFolder={selectedFolder}
                            onFolderChange={setSelectedFolder}
                          />
                        ) : currentView === 'chart' ? (
                          <div className="flex-1 p-4 flex flex-col overflow-hidden">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                              Label Statistics
                            </h2>
                            <div className="bg-white dark:bg-gray-900 rounded-lg p-3 flex-1 min-h-0">
                              <CustomLabelsBarChart
                                labels={stats.customLabels}
                                onLabelClick={(labelId) => {
                                  setSelectedFolder(labelId);
                                  setCurrentView('emails');
                                }}
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {user && currentView !== 'chart' && (
                      <div className="w-full px-6 py-8" style={{ minHeight: '50vh', backgroundColor: '#050B22' }}>
                        <SLATable userEmail={user?.email || null} gmailApi={gmailApi} onManualSync={syncSLAEmails} />
                      </div>
                    )}
                  </>
                ) : null}
              </>
            )}
          </div>
        </main>

        <Modal
          isOpen={showWorkflowModal}
          onClose={() => setShowWorkflowModal(false)}
          title="Connect to n8n Workflow"
        >
          <WorkflowTrigger
            onTrigger={handleTriggerWorkflow}
            loading={triggerLoading}
            onClose={() => setShowWorkflowModal(false)}
          />
        </Modal>
      </div>
    </div>
  );
}

export default App;
