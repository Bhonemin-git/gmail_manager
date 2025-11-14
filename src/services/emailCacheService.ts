import { EmailListItem } from '../types/gmail';

const DB_NAME = 'GmailAppCache';
const DB_VERSION = 1;
const EMAIL_STORE = 'emails';
const METADATA_STORE = 'metadata';
const MAX_CACHED_EMAILS = 1000;

export class EmailCacheService {
  private db: IDBDatabase | null = null;

  async initialize(): Promise<boolean> {
    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        resolve(false);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(EMAIL_STORE)) {
          const emailStore = db.createObjectStore(EMAIL_STORE, { keyPath: 'id' });
          emailStore.createIndex('userEmail', 'userEmail', { unique: false });
          emailStore.createIndex('date', 'timestamp', { unique: false });
          emailStore.createIndex('userEmail_date', ['userEmail', 'timestamp'], { unique: false });
        }

        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
        }
      };
    });
  }

  async cacheEmails(userEmail: string, emails: EmailListItem[]): Promise<boolean> {
    if (!this.db) {
      await this.initialize();
    }

    if (!this.db) return false;

    try {
      const transaction = this.db.transaction([EMAIL_STORE], 'readwrite');
      const store = transaction.objectStore(EMAIL_STORE);

      for (const email of emails) {
        const cachedEmail = {
          ...email,
          userEmail,
          timestamp: new Date().getTime(),
          cachedAt: new Date().toISOString()
        };
        store.put(cachedEmail);
      }

      await this.cleanOldCache(userEmail);

      return new Promise((resolve) => {
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => resolve(false);
      });
    } catch (error) {
      console.error('Failed to cache emails:', error);
      return false;
    }
  }

  async getCachedEmails(userEmail: string, limit: number = 100): Promise<EmailListItem[]> {
    if (!this.db) {
      await this.initialize();
    }

    if (!this.db) return [];

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([EMAIL_STORE], 'readonly');
      const store = transaction.objectStore(EMAIL_STORE);
      const index = store.index('userEmail_date');
      const range = IDBKeyRange.bound([userEmail, 0], [userEmail, Date.now()]);

      const request = index.openCursor(range, 'prev');
      const emails: EmailListItem[] = [];
      let count = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && count < limit) {
          const email = cursor.value;
          emails.push({
            id: email.id,
            threadId: email.threadId,
            snippet: email.snippet,
            from: email.from,
            subject: email.subject,
            date: email.date,
            isRead: email.isRead,
            hasAttachments: email.hasAttachments,
            labelIds: email.labelIds,
            isStarred: email.isStarred
          });
          count++;
          cursor.continue();
        } else {
          resolve(emails);
        }
      };

      request.onerror = () => resolve([]);
    });
  }

  async getCachedEmail(emailId: string): Promise<EmailListItem | null> {
    if (!this.db) {
      await this.initialize();
    }

    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([EMAIL_STORE], 'readonly');
      const store = transaction.objectStore(EMAIL_STORE);
      const request = store.get(emailId);

      request.onsuccess = () => {
        const email = request.result;
        if (email) {
          resolve({
            id: email.id,
            threadId: email.threadId,
            snippet: email.snippet,
            from: email.from,
            subject: email.subject,
            date: email.date,
            isRead: email.isRead,
            hasAttachments: email.hasAttachments,
            labelIds: email.labelIds,
            isStarred: email.isStarred
          });
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    });
  }

  async updateCachedEmail(email: EmailListItem): Promise<boolean> {
    if (!this.db) {
      await this.initialize();
    }

    if (!this.db) return false;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([EMAIL_STORE], 'readwrite');
      const store = transaction.objectStore(EMAIL_STORE);
      const getRequest = store.get(email.id);

      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (existing) {
          const updated = {
            ...existing,
            ...email,
            timestamp: new Date().getTime(),
            cachedAt: new Date().toISOString()
          };
          store.put(updated);
        }
      };

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
    });
  }

  async removeCachedEmail(emailId: string): Promise<boolean> {
    if (!this.db) {
      await this.initialize();
    }

    if (!this.db) return false;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([EMAIL_STORE], 'readwrite');
      const store = transaction.objectStore(EMAIL_STORE);
      store.delete(emailId);

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
    });
  }

  private async cleanOldCache(userEmail: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([EMAIL_STORE], 'readwrite');
      const store = transaction.objectStore(EMAIL_STORE);
      const index = store.index('userEmail_date');
      const range = IDBKeyRange.bound([userEmail, 0], [userEmail, Date.now()]);

      const countRequest = index.count(range);

      countRequest.onsuccess = () => {
        const count = countRequest.result;
        if (count <= MAX_CACHED_EMAILS) {
          resolve();
          return;
        }

        const toDelete = count - MAX_CACHED_EMAILS;
        let deleted = 0;

        const cursorRequest = index.openCursor(range, 'next');
        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor && deleted < toDelete) {
            cursor.delete();
            deleted++;
            cursor.continue();
          } else {
            resolve();
          }
        };
      };

      countRequest.onerror = () => resolve();
    });
  }

  async setMetadata(key: string, value: any): Promise<boolean> {
    if (!this.db) {
      await this.initialize();
    }

    if (!this.db) return false;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([METADATA_STORE], 'readwrite');
      const store = transaction.objectStore(METADATA_STORE);
      store.put({ key, value, timestamp: new Date().toISOString() });

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
    });
  }

  async getMetadata(key: string): Promise<any> {
    if (!this.db) {
      await this.initialize();
    }

    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([METADATA_STORE], 'readonly');
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result?.value || null);
      };

      request.onerror = () => resolve(null);
    });
  }

  async clearCache(userEmail?: string): Promise<boolean> {
    if (!this.db) {
      await this.initialize();
    }

    if (!this.db) return false;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([EMAIL_STORE], 'readwrite');
      const store = transaction.objectStore(EMAIL_STORE);

      if (userEmail) {
        const index = store.index('userEmail');
        const request = index.openCursor(IDBKeyRange.only(userEmail));

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
      } else {
        store.clear();
      }

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
    });
  }
}
