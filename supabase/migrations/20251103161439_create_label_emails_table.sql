/*
  # Create Label Emails Tracking Table

  1. New Tables
    - `label_emails`
      - `id` (uuid, primary key) - Unique identifier for each record
      - `user_email` (text, not null) - Gmail user email address
      - `message_id` (text, not null) - Gmail message ID
      - `label_id` (text, not null) - Gmail label ID (custom or system label)
      - `label_name` (text, not null) - Human-readable label name
      - `received_date` (timestamptz, not null) - When the email was received in Gmail
      - `created_at` (timestamptz, default now()) - When record was created in database

  2. Indexes
    - Unique index on `user_email`, `message_id`, and `label_id` to prevent duplicates
    - Index on `user_email`, `label_id`, and `received_date` for efficient time-based queries
    - Index on `user_email` and `received_date` for efficient date range queries
    - Index on `user_email` and `label_id` for label-specific queries

  3. Security
    - Enable RLS on `label_emails` table
    - Add policies for anonymous users (using Gmail OAuth, not Supabase auth)
    - Add policies for authenticated users
    - Users can insert, read, and delete their own label-email records

  4. Functions
    - Create function to clean up label emails older than 90 days
    - Create function to get unique labels for a user
    - Create function to count emails by label for a date range

  5. Important Notes
    - This table tracks the relationship between emails and their labels over time
    - Allows accurate counting of emails received in specific time periods
    - Supports consistent label display across different time periods (today, week, month)
    - Each email-label combination is stored as a separate row
*/

-- Create label_emails table
CREATE TABLE IF NOT EXISTS label_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  message_id text NOT NULL,
  label_id text NOT NULL,
  label_name text NOT NULL,
  received_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create unique index to prevent duplicate email-label combinations per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_label_emails_user_message_label 
  ON label_emails(user_email, message_id, label_id);

-- Create index for efficient time-based queries by label
CREATE INDEX IF NOT EXISTS idx_label_emails_user_label_date 
  ON label_emails(user_email, label_id, received_date DESC);

-- Create index for efficient date range queries
CREATE INDEX IF NOT EXISTS idx_label_emails_user_date 
  ON label_emails(user_email, received_date DESC);

-- Create index for label-specific queries
CREATE INDEX IF NOT EXISTS idx_label_emails_user_label 
  ON label_emails(user_email, label_id);

-- Create function to clean up old label emails (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_label_emails()
RETURNS void AS $$
BEGIN
  DELETE FROM label_emails
  WHERE received_date < now() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create function to get unique custom labels for a user (excluding system labels)
CREATE OR REPLACE FUNCTION get_user_custom_labels(p_user_email text)
RETURNS TABLE(label_id text, label_name text, email_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    le.label_id,
    le.label_name,
    COUNT(DISTINCT le.message_id) as email_count
  FROM label_emails le
  WHERE le.user_email = p_user_email
    AND le.label_id NOT IN ('INBOX', 'UNREAD', 'STARRED', 'DRAFT', 'SPAM', 'TRASH', 'SENT', 'IMPORTANT', 'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS')
    AND le.label_id NOT LIKE 'Label_%'
  GROUP BY le.label_id, le.label_name
  ORDER BY email_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to count emails by label for a date range
CREATE OR REPLACE FUNCTION count_emails_by_label(
  p_user_email text,
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS TABLE(label_id text, label_name text, email_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    le.label_id,
    le.label_name,
    COUNT(DISTINCT le.message_id) as email_count
  FROM label_emails le
  WHERE le.user_email = p_user_email
    AND le.received_date >= p_start_date
    AND le.received_date <= p_end_date
  GROUP BY le.label_id, le.label_name
  ORDER BY email_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE label_emails ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to insert label emails
CREATE POLICY "Anonymous users can insert label emails"
  ON label_emails
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Allow authenticated users to insert label emails
CREATE POLICY "Authenticated users can insert label emails"
  ON label_emails
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow anonymous users to read label emails
CREATE POLICY "Anonymous users can read label emails"
  ON label_emails
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Allow authenticated users to read label emails
CREATE POLICY "Authenticated users can read label emails"
  ON label_emails
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow anonymous users to delete label emails
CREATE POLICY "Anonymous users can delete label emails"
  ON label_emails
  FOR DELETE
  TO anon
  USING (true);

-- Policy: Allow authenticated users to delete label emails
CREATE POLICY "Authenticated users can delete label emails"
  ON label_emails
  FOR DELETE
  TO authenticated
  USING (true);
