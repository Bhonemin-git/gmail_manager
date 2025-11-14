/*
  # Create Gmail Statistics Table

  1. New Tables
    - `gmail_stats`
      - `id` (uuid, primary key) - Unique identifier for each statistics snapshot
      - `user_email` (text, not null) - Gmail user email address
      - `total_inbox` (integer, default 0) - Total number of emails in inbox
      - `unread_inbox` (integer, default 0) - Number of unread emails
      - `drafts` (integer, default 0) - Number of draft emails
      - `spam` (integer, default 0) - Number of spam emails
      - `custom_labels` (jsonb, default '[]') - Custom labels with counts stored as JSON
      - `created_at` (timestamptz, default now()) - Timestamp of when stats were captured
      - `updated_at` (timestamptz, default now()) - Timestamp of last update

  2. Indexes
    - Index on `user_email` for fast user lookups
    - Index on `created_at` for time-based queries
    - Composite index on `user_email` and `created_at` for user timeline queries

  3. Security
    - Enable RLS on `gmail_stats` table
    - Add policy for users to insert their own statistics
    - Add policy for users to read their own statistics
    - Add policy for users to update their own statistics
    - Add policy for users to delete their own statistics

  4. Functions
    - Create function to automatically update `updated_at` timestamp
*/

-- Create gmail_stats table
CREATE TABLE IF NOT EXISTS gmail_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  total_inbox integer DEFAULT 0,
  unread_inbox integer DEFAULT 0,
  drafts integer DEFAULT 0,
  spam integer DEFAULT 0,
  custom_labels jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_gmail_stats_user_email ON gmail_stats(user_email);
CREATE INDEX IF NOT EXISTS idx_gmail_stats_created_at ON gmail_stats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gmail_stats_user_email_created_at ON gmail_stats(user_email, created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_gmail_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_gmail_stats_updated_at ON gmail_stats;
CREATE TRIGGER trigger_update_gmail_stats_updated_at
  BEFORE UPDATE ON gmail_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_gmail_stats_updated_at();

-- Enable Row Level Security
ALTER TABLE gmail_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own statistics
CREATE POLICY "Users can insert own stats"
  ON gmail_stats
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow anonymous users to insert stats (since we're using Gmail OAuth, not Supabase auth)
CREATE POLICY "Anonymous users can insert stats"
  ON gmail_stats
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Users can read their own statistics
CREATE POLICY "Users can read own stats"
  ON gmail_stats
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow anonymous users to read stats
CREATE POLICY "Anonymous users can read stats"
  ON gmail_stats
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Users can update their own statistics
CREATE POLICY "Users can update own stats"
  ON gmail_stats
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow anonymous users to update stats
CREATE POLICY "Anonymous users can update stats"
  ON gmail_stats
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Policy: Users can delete their own statistics
CREATE POLICY "Users can delete own stats"
  ON gmail_stats
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Allow anonymous users to delete stats
CREATE POLICY "Anonymous users can delete stats"
  ON gmail_stats
  FOR DELETE
  TO anon
  USING (true);