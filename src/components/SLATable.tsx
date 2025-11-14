import { useState, useEffect } from 'react';
import { Loader2, Clock, AlertCircle, RefreshCw, Trash2, Search, X } from 'lucide-react';
import { SLAEmailRow, SLALabel } from '../types/sla';
import { SLAEmailsService } from '../services/slaEmailsService';
import { format24h, computeProgress } from '../utils/slaUtils';
import { useNotifications } from '../contexts/NotificationContext';

interface SLATableProps {
  userEmail: string | null;
  gmailApi?: any;
  onManualSync?: (force?: boolean) => Promise<{ synced: number; errors: number }>;
}

export function SLATable({ userEmail, gmailApi, onManualSync }: SLATableProps) {
  const { addNotification } = useNotifications();
  const [allEmails, setAllEmails] = useState<SLAEmailRow[]>([]);
  const [filteredEmails, setFilteredEmails] = useState<SLAEmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [missingLabels, setMissingLabels] = useState<string[]>([]);
  const [showLabelWarning, setShowLabelWarning] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const slaService = new SLAEmailsService();

  useEffect(() => {
    if (userEmail) {
      loadSLAEmails();
      checkSLALabels();
    }
  }, [userEmail]);

  const checkSLALabels = async () => {
    if (!gmailApi) return;

    try {
      const slaLabelIds = await gmailApi.getSLALabelIds();
      const allLabels = ['1: billing', '2: bug report', '3: feature request', '4: abuse report'];
      const missing = allLabels.filter(label => !slaLabelIds.has(label));

      if (missing.length > 0) {
        setMissingLabels(missing);
        setShowLabelWarning(true);
      }
    } catch (error) {
      console.error('Failed to check SLA labels:', error);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadSLAEmails = async () => {
    if (!userEmail) return;
    setLoading(true);
    try {
      console.log('[SLATable] Loading SLA emails for user:', userEmail);
      const data = await slaService.getSLAEmails(userEmail);
      console.log('[SLATable] Received', data.length, 'SLA emails from database');
      setAllEmails(data);
    } catch (error) {
      console.error('[SLATable] Failed to load SLA emails:', error);
      addNotification('error', 'Failed to load SLA emails from database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [allEmails, showResolved, searchQuery]);

  const applyFilters = () => {
    let filtered = showResolved
      ? allEmails.filter(email => email.resolved)
      : allEmails.filter(email => !email.resolved);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(email =>
        email.email_address.toLowerCase().includes(query) ||
        email.subject.toLowerCase().includes(query) ||
        email.body_preview.toLowerCase().includes(query) ||
        email.label.toLowerCase().includes(query)
      );
    }

    setFilteredEmails(filtered);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleManualSync = async () => {
    if (!onManualSync || syncing) return;
    console.log('[SLATable] Manual sync triggered');
    setSyncing(true);
    try {
      console.log('[SLATable] Starting sync operation...');
      const result = await onManualSync(true);
      console.log('[SLATable] Sync completed:', result);

      if (result.synced > 0) {
        addNotification('success', `Synced ${result.synced} new SLA email${result.synced > 1 ? 's' : ''}`);
        console.log('[SLATable] Reloading emails after successful sync');
        await loadSLAEmails();
      } else if (result.errors > 0) {
        addNotification('warning', 'SLA sync completed with errors. Check console for details.');
      } else {
        addNotification('info', 'No new SLA emails to sync');
      }
    } catch (error) {
      console.error('[SLATable] Sync operation failed:', error);
      addNotification('error', 'Failed to sync SLA emails. Check console for details.');
    } finally {
      setSyncing(false);
    }
  };

  const handleMarkResolved = async (messageId: string) => {
    if (!userEmail) return;

    setResolvingIds(prev => new Set([...prev, messageId]));

    setAllEmails(prev => prev.map(email =>
      email.message_id === messageId
        ? { ...email, resolved: true, resolved_at: new Date().toISOString() }
        : email
    ));

    try {
      const success = await slaService.markEmailResolved(userEmail, messageId);
      if (success) {
        addNotification('success', 'Email marked as resolved');
      } else {
        setAllEmails(prev => prev.map(email =>
          email.message_id === messageId
            ? { ...email, resolved: false, resolved_at: null }
            : email
        ));
        addNotification('error', 'Failed to mark email as resolved');
      }
    } catch (error) {
      setAllEmails(prev => prev.map(email =>
        email.message_id === messageId
          ? { ...email, resolved: false, resolved_at: null }
          : email
      ));
      addNotification('error', 'Failed to mark email as resolved');
    } finally {
      setResolvingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    }
  };

  const handleDeleteEmail = async (messageId: string) => {
    if (!userEmail) return;

    setDeletingIds(prev => new Set([...prev, messageId]));
    setDeleteConfirmId(null);

    const emailToDelete = allEmails.find(e => e.message_id === messageId);
    setAllEmails(prev => prev.filter(email => email.message_id !== messageId));

    try {
      const success = await slaService.deleteSLAEmail(userEmail, messageId);
      if (success) {
        addNotification('success', 'SLA email deleted');
      } else {
        if (emailToDelete) {
          setAllEmails(prev => [...prev, emailToDelete]);
        }
        addNotification('error', 'Failed to delete email');
      }
    } catch (error) {
      if (emailToDelete) {
        setAllEmails(prev => [...prev, emailToDelete]);
      }
      addNotification('error', 'Failed to delete email');
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    }
  };

  const getLabelColor = (label: SLALabel) => {
    const colors = {
      "1: billing": "bg-blue-900 text-blue-200",
      "2: bug report": "bg-red-900 text-red-200",
      "3: feature request": "bg-purple-900 text-purple-200",
      "4: abuse report": "bg-orange-900 text-orange-200"
    };
    return colors[label];
  };

  const getStatusColor = (status: string) => {
    const colors = {
      "On Track": "bg-green-900 text-green-200",
      "Warning": "bg-amber-900 text-amber-200",
      "Breached": "bg-red-900 text-red-200",
      "Resolved": "bg-gray-700 text-gray-300"
    };
    return colors[status as keyof typeof colors];
  };

  const getProgressBarColor = (status: string) => {
    if (status === "On Track") return "bg-green-600";
    if (status === "Warning") return "bg-amber-600";
    if (status === "Breached") return "bg-red-600";
    return "bg-gray-600";
  };

  if (!userEmail) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#353d35' }} />
      </div>
    );
  }

  const unresolvedEmails = allEmails.filter(e => !e.resolved);
  const resolvedEmails = allEmails.filter(e => e.resolved);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-white dark:text-white" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">SLA Tracking</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative" style={{ width: '300px' }}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search SLA emails..."
                className="w-full pl-9 pr-9 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 flex items-center justify-center hover:opacity-70 transition-opacity text-gray-400 dark:text-gray-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showResolved}
                onChange={(e) => setShowResolved(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Show resolved
            </label>
            {onManualSync && (
              <button
                onClick={handleManualSync}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors text-white disabled:opacity-50"
                style={{ backgroundColor: syncing ? '#6b7280' : '#353d35' }}
                title="Sync SLA emails from Gmail"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync'}
              </button>
            )}
          </div>
        </div>
      </div>

      {showLabelWarning && missingLabels.length > 0 && (
        <div className="mx-4 mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-amber-900 dark:text-amber-200 text-sm">Missing SLA Labels</h4>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                The following Gmail labels are not found: <strong>{missingLabels.join(', ')}</strong>
              </p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                Create these labels in Gmail to start tracking SLA emails. After creating labels, click the Sync button to fetch emails.
              </p>
            </div>
            <button
              onClick={() => setShowLabelWarning(false)}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {!showLabelWarning && allEmails.length === 0 && (
        <div className="mx-4 mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 dark:text-blue-200 text-sm">No SLA Emails Found</h4>
              <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
                No emails with SLA labels have been synced yet.
              </p>
              <div className="mt-2 text-xs text-blue-700 dark:text-blue-400 space-y-1">
                <p className="font-semibold">Setup Instructions:</p>
                <ol className="list-decimal ml-4 space-y-0.5">
                  <li>Go to Gmail and create these labels (exact names):
                    <ul className="list-disc ml-4 mt-0.5">
                      <li>1: billing</li>
                      <li>2: bug report</li>
                      <li>3: feature request</li>
                      <li>4: abuse report</li>
                    </ul>
                  </li>
                  <li>Apply one or more of these labels to some test emails</li>
                  <li>Return here and click the "Sync" button above</li>
                  <li>Check browser console (F12) for detailed sync logs</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="h-[500px] overflow-y-auto overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Label
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                Received At
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                SLA Timer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredEmails.map((email) => {
              const progress = computeProgress(email, currentTime);
              const isResolving = resolvingIds.has(email.message_id);
              const isDeleting = deletingIds.has(email.message_id);
              const canResolve = !email.resolved && (progress.status === "On Track" || progress.status === "Warning");

              return (
                <tr
                  key={email.message_id}
                  className="group hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="text-sm max-w-xs">
                      <div className="font-semibold text-gray-900 dark:text-white truncate">
                        {email.email_address}
                      </div>
                      <div className="mt-0.5 text-gray-700 dark:text-gray-300 truncate">
                        {email.subject}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 truncate">
                        {email.body_preview}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${getLabelColor(email.label)}`}
                    >
                      {email.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {format24h(new Date(email.received_at))}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-full min-w-[200px]">
                      <div className="relative h-6 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                        <div
                          className="absolute inset-0 opacity-30"
                          style={{
                            background: `linear-gradient(to right,
                              #059669 0%,
                              #059669 ${progress.onTrackFraction * 100}%,
                              #d97706 ${progress.onTrackFraction * 100}%,
                              #d97706 100%)`
                          }}
                        />
                        <div
                          className={`relative h-full transition-all duration-500 ${getProgressBarColor(progress.status)}`}
                          style={{ width: `${progress.fraction * 100}%` }}
                        />
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-gray-800 dark:bg-gray-200"
                          style={{ left: `${progress.onTrackFraction * 100}%` }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 text-right">
                        {progress.timeRemainingText}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${getStatusColor(progress.status)}`}
                    >
                      {progress.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-4">
                      {!email.resolved ? (
                        <button
                          onClick={() => handleMarkResolved(email.message_id)}
                          disabled={!canResolve || isResolving}
                          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                            canResolve && !isResolving
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {isResolving ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Resolving...</span>
                            </>
                          ) : progress.status === "Breached" ? (
                            'Failed'
                          ) : (
                            'Mark Resolved'
                          )}
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                          Resolved
                        </span>
                      )}
                      <button
                        onClick={() => setDeleteConfirmId(email.message_id)}
                        disabled={isDeleting}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-lg transition-all hover:scale-110 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                        title="Delete SLA record"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredEmails.length === 0 && searchQuery && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No emails match your search</p>
          </div>
        )}

        {filteredEmails.length === 0 && !searchQuery && showResolved && resolvedEmails.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium mb-1">No resolved SLA tickets yet</p>
            <p className="text-sm">Mark tickets as resolved to see them here</p>
          </div>
        )}

        {filteredEmails.length === 0 && !searchQuery && !showResolved && unresolvedEmails.length === 0 && allEmails.length > 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium mb-1">All tickets resolved!</p>
            <p className="text-sm">Great job! No open tickets at the moment</p>
          </div>
        )}
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Delete SLA Email
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Are you sure you want to delete this SLA email record? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteEmail(deleteConfirmId)}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
