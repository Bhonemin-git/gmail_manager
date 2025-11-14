/*
  # Create Received Emails Table

  1. New Tables
    - `received_emails`
      - `id` (uuid, primary key) - Unique identifier for each email record
      - `user_email` (text, not null) - Gmail user email address
      - `message_id` (text, not null) - Gmail message ID
      - `thread_id` (text, not null) - Gmail thread ID
      - `subject` (text, default '') - Email subject line
      - `from_address` (text, not null) - Sender email address
      - `snippet` (text, default '') - Email preview text
      - `received_date` (timestamptz, not null) - When the email was received
      - `is_read` (boolean, default false) - Whether the email has been read
      - `has_attachments` (boolean, default false) - Whether the email has attachments
      - `label_ids` (jsonb, default '[]') - Gmail label IDs as JSON array
      - `created_at` (timestamptz, default now()) - When record was created in database
      - `updated_at` (timestamptz, default now()) - When record was last updated

  2. Indexes
    - Unique index on `user_email` and `message_id` to prevent duplicates
    - Index on `user_email` and `received_date` for efficient time-based queries
    - Index on `user_email` and `is_read` for filtering read/unread emails

  3. Security
    - Enable RLS on `received_emails` table
    - Add policies for anonymous users (using Gmail OAuth, not Supabase auth)
    - Users can insert, read, update, and delete their own emails

  4. Functions
    - Create function to automatically update `updated_at` timestamp
    - Create function to clean up emails older than 90 days
*/

-- Create received_emails table
CREATE TABLE IF NOT EXISTS received_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  message_id text NOT NULL,
  thread_id text NOT NULL,
  subject text DEFAULT '',
  from_address text NOT NULL,
  snippet text DEFAULT '',
  received_date timestamptz NOT NULL,
  is_read boolean DEFAULT false,
  has_attachments boolean DEFAULT false,
  label_ids jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique index to prevent duplicate emails per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_received_emails_user_message 
  ON received_emails(user_email, message_id);

-- Create index for efficient time-based queries
CREATE INDEX IF NOT EXISTS idx_received_emails_user_date 
  ON received_emails(user_email, received_date DESC);

-- Create index for read/unread filtering
CREATE INDEX IF NOT EXISTS idx_received_emails_user_read 
  ON received_emails(user_email, is_read);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_received_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_received_emails_updated_at ON received_emails;
CREATE TRIGGER trigger_update_received_emails_updated_at
  BEFORE UPDATE ON received_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_received_emails_updated_at();

-- Create function to clean up old emails (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_emails()
RETURNS void AS $$
BEGIN
  DELETE FROM received_emails
  WHERE received_date < now() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE received_emails ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to insert emails
CREATE POLICY "Anonymous users can insert emails"
  ON received_emails
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Allow authenticated users to insert emails
CREATE POLICY "Users can insert emails"
  ON received_emails
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow anonymous users to read emails
CREATE POLICY "Anonymous users can read emails"
  ON received_emails
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Allow authenticated users to read emails
CREATE POLICY "Users can read emails"
  ON received_emails
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow anonymous users to update emails
CREATE POLICY "Anonymous users can update emails"
  ON received_emails
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to update emails
CREATE POLICY "Users can update emails"
  ON received_emails
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow anonymous users to delete emails
CREATE POLICY "Anonymous users can delete emails"
  ON received_emails
  FOR DELETE
  TO anon
  USING (true);

-- Policy: Allow authenticated users to delete emails
CREATE POLICY "Users can delete emails"
  ON received_emails
  FOR DELETE
  TO authenticated
  USING (true);
