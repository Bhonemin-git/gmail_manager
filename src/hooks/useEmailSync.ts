import { useEffect, useCallback, useRef } from 'react';
import { GmailApiService } from '../services/gmailApi';
import { GmailHistoryService } from '../services/gmailHistoryService';
import { SyncStatusService } from '../services/syncStatusService';
import { EmailCacheService } from '../services/emailCacheService';
import { LabelEmailsService } from '../services/labelEmailsService';
import { SLASyncService } from '../services/slaSyncService';
import { EmailListItem } from '../types/gmail';

const SYNC_INTERVAL = 15000;
const HISTORICAL_DAYS = 90;

export function useEmailSync(
  gmailApi: GmailApiService | null,
  userEmail: string | null,
  onNewEmails?: (count: number) => void,
  onEmailsUpdated?: (emails: EmailListItem[]) => void
) {
  const intervalRef = useRef<number>();
  const lastCheckRef = useRef<number>(Date.now());
  const historyService = useRef<GmailHistoryService | null>(null);
  const syncStatusService = useRef(new SyncStatusService());
  const cacheService = useRef(new EmailCacheService());
  const labelEmailsService = useRef(new LabelEmailsService());
  const slaSyncService = useRef<SLASyncService | null>(null);
  const labelNamesCache = useRef<Map<string, string>>(new Map());
  const isInitialized = useRef(false);
  const slaInitialized = useRef(false);

  const performHistoricalImport = useCallback(async () => {
    if (!gmailApi || !userEmail) return;

    try {
      console.log('[useEmailSync] Starting historical import for last 90 days');
      await syncStatusService.current.markHistoricalImportStarted(userEmail);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - HISTORICAL_DAYS);

      const emails = await gmailApi.getMessagesByDateRange(startDate, endDate, 500);
      console.log(`[useEmailSync] Retrieved ${emails.length} historical emails`);

      if (emails.length > 0) {
        const emailRecords = emails.map(email => ({
          messageId: email.id,
          labelIds: email.labelIds,
          receivedDate: new Date(email.date)
        }));

        const result = await labelEmailsService.current.bulkSaveLabelEmails(
          userEmail,
          emailRecords,
          labelNamesCache.current
        );

        console.log(`[useEmailSync] Historical import completed: ${result.savedCount} records saved`);
      }

      await syncStatusService.current.markHistoricalImportCompleted(userEmail);
    } catch (error) {
      console.error('Failed to perform historical import:', error);
      await syncStatusService.current.recordHistoricalImportError(
        userEmail,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }, [gmailApi, userEmail]);

  const syncSLAEmails = useCallback(async (force: boolean = false) => {
    if (!gmailApi || !userEmail || !slaSyncService.current) return { synced: 0, errors: 0 };
    if (slaInitialized.current && !force) return { synced: 0, errors: 0 };

    try {
      console.log('[useEmailSync] Starting SLA email sync');
      const result = await slaSyncService.current.syncSLAEmails(userEmail);
      console.log(`[useEmailSync] SLA sync completed: ${result.synced} synced, ${result.errors} errors`);
      slaInitialized.current = true;
      return result;
    } catch (error) {
      console.error('[useEmailSync] Failed to sync SLA emails:', error);
      return { synced: 0, errors: 1 };
    }
  }, [gmailApi, userEmail]);

  const initializeSync = useCallback(async () => {
    if (!gmailApi || !userEmail || isInitialized.current) return;

    try {
      await cacheService.current.initialize();

      const accessToken = (gmailApi as any).accessToken;
      historyService.current = new GmailHistoryService(accessToken);
      slaSyncService.current = new SLASyncService(gmailApi);

      const profile = await historyService.current.getProfile();
      const syncStatus = await syncStatusService.current.getSyncStatus(userEmail);

      if (!syncStatus) {
        await syncStatusService.current.upsertSyncStatus(userEmail, profile.historyId);
      }

      const labels = await gmailApi.getLabels();
      labels.forEach(label => {
        labelNamesCache.current.set(label.id, label.name);
      });

      const needsImport = await syncStatusService.current.needsHistoricalImport(userEmail);
      if (needsImport) {
        setTimeout(() => performHistoricalImport(), 2000);
      }

      if (!slaInitialized.current) {
        console.log('[useEmailSync] ==========================================');
        console.log('[useEmailSync] Scheduling SLA sync in 3 seconds...');
        console.log('[useEmailSync] ==========================================');
        setTimeout(async () => {
          console.log('[useEmailSync] ==========================================');
          console.log('[useEmailSync] Executing scheduled SLA sync...');
          console.log('[useEmailSync] ==========================================');
          try {
            await syncSLAEmails(false);
          } catch (error) {
            console.error('[useEmailSync] SLA sync failed:', error);
          }
        }, 3000);
      }

      isInitialized.current = true;
    } catch (error) {
      console.error('Failed to initialize sync:', error);
    }
  }, [gmailApi, userEmail, performHistoricalImport, syncSLAEmails]);

  const checkForNewEmails = useCallback(async () => {
    if (!gmailApi || !userEmail || !historyService.current) return;

    try {
      const syncStatus = await syncStatusService.current.getSyncStatus(userEmail);

      if (!syncStatus) {
        await initializeSync();
        return;
      }

      const changes = await historyService.current.getIncrementalChanges(syncStatus.history_id);

      if (changes.newHistoryId) {
        await syncStatusService.current.updateHistoryId(userEmail, changes.newHistoryId);
      }

      if (changes.added.length > 0) {
        const unreadNew = changes.added.filter(email => !email.isRead);
        if (unreadNew.length > 0 && onNewEmails) {
          onNewEmails(unreadNew.length);
        }

        await cacheService.current.cacheEmails(userEmail, changes.added);

        for (const email of changes.added) {
          const receivedDate = new Date(email.date);
          if (isNaN(receivedDate.getTime())) {
            continue;
          }
          await labelEmailsService.current.saveLabelEmails(
            userEmail,
            email.id,
            email.labelIds,
            labelNamesCache.current,
            receivedDate
          );
        }

        if (onEmailsUpdated) {
          onEmailsUpdated(changes.added);
        }
      }

      if (changes.modified.length > 0) {
        console.log(`[useEmailSync] Processing ${changes.modified.length} modified emails for label updates`);

        for (const email of changes.modified) {
          await cacheService.current.updateCachedEmail(email);

          await labelEmailsService.current.deleteLabelEmailsByMessageId(userEmail, email.id);

          const receivedDate = new Date(email.date);
          if (!isNaN(receivedDate.getTime())) {
            await labelEmailsService.current.saveLabelEmails(
              userEmail,
              email.id,
              email.labelIds,
              labelNamesCache.current,
              receivedDate
            );
            console.log(`[useEmailSync] Updated labels for message ${email.id}: [${email.labelIds.join(', ')}]`);
          }
        }
      }

      if (changes.deleted.length > 0) {
        for (const emailId of changes.deleted) {
          await cacheService.current.removeCachedEmail(emailId);
          await labelEmailsService.current.deleteLabelEmailsByMessageId(userEmail, emailId);
        }
      }

      lastCheckRef.current = Date.now();
    } catch (error) {
      console.error('Failed to check for new emails:', error);
      await syncStatusService.current.recordSyncError(userEmail, error instanceof Error ? error.message : 'Unknown error');
    }
  }, [gmailApi, userEmail, onNewEmails, onEmailsUpdated, initializeSync]);

  useEffect(() => {
    if (!gmailApi || !userEmail) return;

    initializeSync();

    intervalRef.current = window.setInterval(checkForNewEmails, SYNC_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [gmailApi, userEmail, checkForNewEmails, initializeSync]);

  return { checkForNewEmails, syncSLAEmails };
}
