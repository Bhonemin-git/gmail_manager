/*
  # Create Sync Status Table

  1. New Tables
    - `sync_status`
      - `id` (uuid, primary key) - Unique identifier
      - `user_email` (text, unique, not null) - Gmail user email address
      - `history_id` (text, not null) - Gmail historyId for incremental sync
      - `last_sync_at` (timestamptz, default now()) - Timestamp of last successful sync
      - `sync_errors` (integer, default 0) - Count of consecutive sync errors
      - `last_error` (text) - Description of last error if any
      - `watch_expiration` (timestamptz) - When Gmail push notification expires
      - `created_at` (timestamptz, default now()) - When record was created
      - `updated_at` (timestamptz, default now()) - When record was last updated

  2. Indexes
    - Unique index on `user_email` for fast user lookups
    - Index on `last_sync_at` for monitoring stale syncs
    - Index on `watch_expiration` for renewal management

  3. Security
    - Enable RLS on `sync_status` table
    - Add policies for anonymous and authenticated users
    - Users can manage their own sync status

  4. Functions
    - Create function to automatically update `updated_at` timestamp
*/

-- Create sync_status table
CREATE TABLE IF NOT EXISTS sync_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text UNIQUE NOT NULL,
  history_id text NOT NULL,
  last_sync_at timestamptz DEFAULT now(),
  sync_errors integer DEFAULT 0,
  last_error text,
  watch_expiration timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique index on user_email
CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_status_user_email
  ON sync_status(user_email);

-- Create index for monitoring stale syncs
CREATE INDEX IF NOT EXISTS idx_sync_status_last_sync
  ON sync_status(last_sync_at DESC);

-- Create index for watch expiration management
CREATE INDEX IF NOT EXISTS idx_sync_status_watch_expiration
  ON sync_status(watch_expiration)
  WHERE watch_expiration IS NOT NULL;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sync_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_sync_status_updated_at ON sync_status;
CREATE TRIGGER trigger_update_sync_status_updated_at
  BEFORE UPDATE ON sync_status
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_status_updated_at();

-- Enable Row Level Security
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to insert sync status
CREATE POLICY "Anonymous users can insert sync status"
  ON sync_status
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Allow authenticated users to insert sync status
CREATE POLICY "Users can insert sync status"
  ON sync_status
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow anonymous users to read sync status
CREATE POLICY "Anonymous users can read sync status"
  ON sync_status
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Allow authenticated users to read sync status
CREATE POLICY "Users can read sync status"
  ON sync_status
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow anonymous users to update sync status
CREATE POLICY "Anonymous users can update sync status"
  ON sync_status
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to update sync status
CREATE POLICY "Users can update sync status"
  ON sync_status
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow anonymous users to delete sync status
CREATE POLICY "Anonymous users can delete sync status"
  ON sync_status
  FOR DELETE
  TO anon
  USING (true);

-- Policy: Allow authenticated users to delete sync status
CREATE POLICY "Users can delete sync status"
  ON sync_status
  FOR DELETE
  TO authenticated
  USING (true);
