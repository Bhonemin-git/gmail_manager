/*
  # Create starred_emails table

  1. New Tables
    - `starred_emails`
      - `id` (uuid, primary key) - Unique identifier for each starred email record
      - `user_email` (text, not null) - Email address of the user who starred the email
      - `message_id` (text, not null) - Gmail message ID that was starred
      - `created_at` (timestamptz) - Timestamp when the email was starred
      
  2. Indexes
    - Index on `user_email` for efficient queries by user
    - Index on `message_id` for efficient lookups
    - Unique constraint on `user_email` and `message_id` combination to prevent duplicates
    
  3. Security
    - Enable RLS on `starred_emails` table
    - Add policy for authenticated users to read their own starred emails
    - Add policy for authenticated users to insert their own starred emails
    - Add policy for authenticated users to delete their own starred emails
    
  4. Important Notes
    - This table tracks which emails users have starred in the application
    - Data is scoped per user_email to ensure privacy
    - The combination of user_email and message_id must be unique
    - No foreign keys to auth.users since we're using Gmail email addresses
*/

CREATE TABLE IF NOT EXISTS starred_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  message_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_email, message_id)
);

CREATE INDEX IF NOT EXISTS idx_starred_emails_user_email ON starred_emails(user_email);
CREATE INDEX IF NOT EXISTS idx_starred_emails_message_id ON starred_emails(message_id);

ALTER TABLE starred_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own starred emails"
  ON starred_emails
  FOR SELECT
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can insert own starred emails"
  ON starred_emails
  FOR INSERT
  WITH CHECK (user_email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can delete own starred emails"
  ON starred_emails
  FOR DELETE
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');