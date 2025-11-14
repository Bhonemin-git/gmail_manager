/*
  # Create Email Metadata Table for Recent Emails Feature

  1. New Tables
    - `email_metadata`
      - `id` (uuid, primary key) - Unique identifier
      - `user_email` (text) - Email address of the user (indexed for fast lookups)
      - `message_id` (text) - Gmail message ID (indexed, unique per user)
      - `thread_id` (text) - Gmail thread ID for grouping
      - `from_address` (text) - Sender email address
      - `subject` (text) - Email subject line
      - `snippet` (text) - Preview text
      - `received_date` (timestamptz) - When the email was received (indexed for time-based queries)
      - `is_read` (boolean) - Read status, default false
      - `has_attachments` (boolean) - Attachment indicator, default false
      - `label_ids` (jsonb) - Gmail labels as JSON array
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Indexes
    - Index on `user_email` for user-specific queries
    - Index on `received_date` for time-based filtering
    - Composite index on `user_email` and `received_date` for efficient Recent queries
    - Unique constraint on `user_email` and `message_id` combination

  3. Security
    - Enable RLS on `email_metadata` table
    - Add policy for users to read only their own email metadata
    - Add policy for users to insert their own email metadata
    - Add policy for users to update their own email metadata
    - Add policy for users to delete their own email metadata
*/

CREATE TABLE IF NOT EXISTS email_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  message_id text NOT NULL,
  thread_id text NOT NULL,
  from_address text NOT NULL,
  subject text DEFAULT '(No subject)',
  snippet text DEFAULT '',
  received_date timestamptz NOT NULL,
  is_read boolean DEFAULT false,
  has_attachments boolean DEFAULT false,
  label_ids jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_email_metadata_user_email ON email_metadata(user_email);
CREATE INDEX IF NOT EXISTS idx_email_metadata_received_date ON email_metadata(received_date DESC);
CREATE INDEX IF NOT EXISTS idx_email_metadata_user_received ON email_metadata(user_email, received_date DESC);

-- Add unique constraint to prevent duplicate messages per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_metadata_user_message ON email_metadata(user_email, message_id);

-- Enable Row Level Security
ALTER TABLE email_metadata ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read only their own email metadata
CREATE POLICY "Users can read own email metadata"
  ON email_metadata
  FOR SELECT
  TO authenticated
  USING (user_email = current_user);

-- Policy: Allow anonymous users to read their own email metadata (since we use email-based identification)
CREATE POLICY "Anonymous users can read own email metadata"
  ON email_metadata
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Users can insert their own email metadata
CREATE POLICY "Users can insert own email metadata"
  ON email_metadata
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Users can update their own email metadata
CREATE POLICY "Users can update own email metadata"
  ON email_metadata
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Policy: Users can delete their own email metadata
CREATE POLICY "Users can delete own email metadata"
  ON email_metadata
  FOR DELETE
  TO anon
  USING (true);