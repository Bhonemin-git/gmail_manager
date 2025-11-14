# Enhanced Gmail Sync Features

This document describes the enhanced Gmail synchronization features implemented in this application.

## Overview

The application now features a sophisticated, multi-layered synchronization system that provides near-real-time email updates with significantly improved performance and reliability.

## Key Improvements

### 1. Incremental Sync with Gmail History API

Instead of fetching all messages on each sync, the system now uses Gmail's History API to track only changes since the last sync:

- **Reduced API Calls**: Only fetches changes (new, modified, deleted emails) since last sync
- **Faster Updates**: Processes only delta changes instead of full message lists
- **History Tracking**: Maintains `historyId` in Supabase to track sync state
- **Automatic Recovery**: Falls back to full sync if history is unavailable

### 2. Increased Sync Frequency

Polling intervals have been optimized for more responsive updates:

- **Email Sync**: Reduced from 60s to 15s (4x more frequent)
- **Stats Refresh**: Reduced from 30s to 10s (3x more frequent)
- **Configurable**: Easily adjustable via `CONFIG.EMAIL_SYNC_INTERVAL` and `CONFIG.STATS_REFRESH_INTERVAL`

### 3. IndexedDB Caching Layer

Local caching provides instant access and offline support:

- **Fast Access**: Cached emails load instantly without API calls
- **Smart Storage**: Maintains up to 1000 most recent emails locally
- **Automatic Cleanup**: Old cache entries are automatically removed
- **Offline Support**: View cached emails when offline
- **Cache-First Strategy**: Shows cached data immediately, then updates from server

### 4. Real-time Sync Status

Visual feedback keeps users informed of sync state:

- **Live Status Indicator**: Shows current sync status in the header
- **Last Sync Time**: Displays how long ago the last sync occurred
- **Network Status**: Shows online/offline state
- **Manual Sync**: One-click button to trigger immediate sync
- **Error Tracking**: Displays sync error count when issues occur

### 5. Gmail Push Notifications (Webhook Support)

Infrastructure for real-time push notifications from Gmail:

- **Supabase Edge Function**: Endpoint ready to receive Gmail webhook notifications
- **Automatic Updates**: Can trigger immediate sync when Gmail pushes new email notifications
- **Watch API Integration**: Service methods to setup and maintain Gmail watch subscriptions

### 6. Enhanced Database Schema

New `sync_status` table tracks synchronization state per user:

```sql
- user_email: User's Gmail address
- history_id: Current Gmail historyId for incremental sync
- last_sync_at: Timestamp of last successful sync
- sync_errors: Count of consecutive sync failures
- last_error: Description of last error
- watch_expiration: When Gmail push subscription expires
```

## Architecture

### Services

1. **GmailHistoryService** (`src/services/gmailHistoryService.ts`)
   - Interfaces with Gmail History API
   - Fetches incremental changes since last historyId
   - Manages Gmail Watch API subscriptions

2. **SyncStatusService** (`src/services/syncStatusService.ts`)
   - Manages sync state in Supabase
   - Tracks historyId and error states
   - Provides real-time sync updates via Supabase subscriptions

3. **EmailCacheService** (`src/services/emailCacheService.ts`)
   - Manages IndexedDB cache for email metadata
   - Implements cache-first strategy
   - Handles automatic cleanup and offline support

### Hooks

1. **useEmailSync** (`src/hooks/useEmailSync.ts`)
   - Orchestrates email synchronization
   - Polls for changes every 15 seconds
   - Notifies on new emails
   - Updates cache automatically

2. **useStatsAutoRefresh** (`src/hooks/useStatsAutoRefresh.ts`)
   - Refreshes Gmail statistics every 10 seconds
   - Saves stats to Supabase
   - Implements retry logic with exponential backoff

### Components

1. **SyncStatusIndicator** (`src/components/SyncStatusIndicator.tsx`)
   - Displays sync status in header
   - Shows network connectivity
   - Provides manual sync button
   - Updates time ago dynamically

## Setup Instructions

### 1. Database Migration

The sync_status table is automatically created via migration:
```bash
# Migration is applied automatically when Supabase is connected
supabase/migrations/20251103120000_create_sync_status_table.sql
```

### 2. Gmail Push Notifications (Optional)

To enable real-time push notifications from Gmail:

1. **Deploy the Edge Function**:
   ```bash
   # The edge function is ready at:
   supabase/functions/gmail-webhook/index.ts
   ```

2. **Setup Google Cloud Pub/Sub** (requires Google Cloud project):
   - Create a Pub/Sub topic
   - Configure Gmail API to publish to the topic
   - Subscribe the Supabase edge function to the topic

3. **Setup Gmail Watch**:
   ```javascript
   // The GmailHistoryService provides methods to setup watch:
   await historyService.setupWatch('projects/YOUR_PROJECT/topics/gmail-notifications');
   ```

## Configuration

Adjust sync intervals in `src/config.ts`:

```typescript
export const CONFIG = {
  // ... other config
  STATS_REFRESH_INTERVAL: 10000,  // Stats refresh every 10 seconds
  EMAIL_SYNC_INTERVAL: 15000       // Email sync every 15 seconds
};
```

## Performance Metrics

### Before Enhancement
- Email sync: Every 60 seconds
- Full message list fetch on each sync
- No caching
- No offline support

### After Enhancement
- Email sync: Every 15 seconds
- Incremental changes only (History API)
- IndexedDB cache with up to 1000 emails
- Full offline read access to cached emails
- Real-time sync status visibility

## API Usage Optimization

The new system significantly reduces Gmail API quota usage:

1. **History API**: ~5-10 quota units per sync vs ~100+ for full message list
2. **Conditional Fetching**: Only fetches message details for new/changed emails
3. **Cache-First**: Reduces redundant API calls for recently viewed emails
4. **Intelligent Polling**: Pauses when tab is not visible

## Future Enhancements

Potential improvements for even better sync:

1. **Service Worker**: Background sync when tab is closed
2. **Periodic Background Sync**: Check emails even when browser is inactive
3. **WebSocket Connection**: Real-time updates via WebSocket instead of polling
4. **Adaptive Polling**: Adjust frequency based on user activity patterns
5. **Conflict Resolution**: Handle concurrent updates from multiple devices
6. **Delta Compression**: Further reduce data transfer for large inboxes

## Troubleshooting

### Sync Status Shows Errors

Check browser console for detailed error messages. Common issues:
- Invalid or expired Gmail access token
- Gmail API quota exceeded
- Network connectivity issues
- Supabase connection problems

### Cache Not Working

Verify IndexedDB is available in your browser:
```javascript
// Check in browser console:
console.log('IndexedDB available:', !!window.indexedDB);
```

### Slow Sync Performance

If syncs are slow:
1. Check network connection speed
2. Verify Gmail API quotas haven't been exceeded
3. Consider increasing `SYNC_INTERVAL` if you have a slow connection
4. Check browser DevTools Network tab for bottlenecks

## Technical Details

### History API Flow

1. App initializes and fetches current `historyId` from Gmail profile
2. `historyId` is stored in Supabase `sync_status` table
3. On each sync interval:
   - Fetch history changes since last `historyId`
   - Process added, modified, and deleted messages
   - Update cache with changes
   - Store new `historyId` for next sync

### Cache Strategy

1. **Read**: Check cache first, return immediately if available
2. **Write**: Always update cache after fetching from API
3. **Update**: Modify cache entries when emails are marked read/starred/etc
4. **Delete**: Remove from cache when emails are deleted
5. **Cleanup**: Automatically maintain cache size limit

### Error Handling

The system implements robust error handling:

- **Retry Logic**: Up to 3 retries with exponential backoff
- **Error Tracking**: Consecutive errors are counted in database
- **User Notification**: Critical errors trigger user-visible notifications
- **Graceful Degradation**: Falls back to polling if push notifications fail
- **Recovery**: Automatically recovers after network reconnection
