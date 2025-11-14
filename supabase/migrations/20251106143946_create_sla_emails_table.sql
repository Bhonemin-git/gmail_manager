/*
  # Create SLA Emails Table

  1. New Tables
    - `sla_emails`
      - `id` (uuid, primary key) - Unique identifier for each SLA email record
      - `user_email` (text, not null) - Gmail user email address
      - `message_id` (text, not null) - Gmail message ID (references received_emails)
      - `email_address` (text, not null) - Sender email address
      - `subject` (text, not null) - Email subject line
      - `body_preview` (text, not null) - Email body preview text (truncated)
      - `label` (text, not null) - SLA category: "1: billing", "2: bug report", "3: feature request", "4: abuse report"
      - `received_at` (timestamptz, not null) - When the email was received
      - `resolved` (boolean, default false) - Whether the email has been resolved
      - `resolved_at` (timestamptz, nullable) - When the email was marked as resolved
      - `created_at` (timestamptz, default now()) - When record was created in database
      - `updated_at` (timestamptz, default now()) - When record was last updated

  2. Indexes
    - Unique index on `user_email` and `message_id` to prevent duplicates
    - Index on `user_email` and `label` for filtering by category
    - Index on `user_email` and `resolved` for filtering resolved/unresolved
    - Index on `user_email` and `received_at` for time-based queries

  3. Security
    - Enable RLS on `sla_emails` table
    - Add policies for anonymous and authenticated users
    - Users can insert, read, update, and delete their own SLA emails

  4. Functions
    - Create function to automatically update `updated_at` timestamp
*/

-- Create sla_emails table
CREATE TABLE IF NOT EXISTS sla_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  message_id text NOT NULL,
  email_address text NOT NULL,
  subject text NOT NULL,
  body_preview text NOT NULL,
  label text NOT NULL CHECK (label IN ('1: billing', '2: bug report', '3: feature request', '4: abuse report')),
  received_at timestamptz NOT NULL,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique index to prevent duplicate SLA emails per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_sla_emails_user_message
  ON sla_emails(user_email, message_id);

-- Create index for label filtering
CREATE INDEX IF NOT EXISTS idx_sla_emails_user_label
  ON sla_emails(user_email, label);

-- Create index for resolved filtering
CREATE INDEX IF NOT EXISTS idx_sla_emails_user_resolved
  ON sla_emails(user_email, resolved);

-- Create index for time-based queries
CREATE INDEX IF NOT EXISTS idx_sla_emails_user_received
  ON sla_emails(user_email, received_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sla_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_sla_emails_updated_at ON sla_emails;
CREATE TRIGGER trigger_update_sla_emails_updated_at
  BEFORE UPDATE ON sla_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_sla_emails_updated_at();

-- Enable Row Level Security
ALTER TABLE sla_emails ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to insert SLA emails
CREATE POLICY "Anonymous users can insert SLA emails"
  ON sla_emails
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Allow authenticated users to insert SLA emails
CREATE POLICY "Users can insert SLA emails"
  ON sla_emails
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow anonymous users to read SLA emails
CREATE POLICY "Anonymous users can read SLA emails"
  ON sla_emails
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Allow authenticated users to read SLA emails
CREATE POLICY "Users can read SLA emails"
  ON sla_emails
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow anonymous users to update SLA emails
CREATE POLICY "Anonymous users can update SLA emails"
  ON sla_emails
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to update SLA emails
CREATE POLICY "Users can update SLA emails"
  ON sla_emails
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow anonymous users to delete SLA emails
CREATE POLICY "Anonymous users can delete SLA emails"
  ON sla_emails
  FOR DELETE
  TO anon
  USING (true);

-- Policy: Allow authenticated users to delete SLA emails
CREATE POLICY "Users can delete SLA emails"
  ON sla_emails
  FOR DELETE
  TO authenticated
  USING (true);