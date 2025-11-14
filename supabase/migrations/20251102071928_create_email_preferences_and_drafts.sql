-- Email Preferences and Drafts Schema
--
-- 1. New Tables
--    - email_preferences: Stores user sidebar and UI preferences
--    - email_drafts: Stores draft emails for later editing
--
-- 2. Security
--    - RLS enabled on both tables
--    - Users can only access their own data
--
-- 3. Indexes
--    - Optimized for user_email lookups
--    - Draft ordering by creation date

CREATE TABLE IF NOT EXISTS email_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text UNIQUE NOT NULL,
  sidebar_width integer DEFAULT 600,
  sidebar_open boolean DEFAULT false,
  selected_folder text DEFAULT 'INBOX',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  to_address text NOT NULL,
  cc_address text,
  bcc_address text,
  subject text DEFAULT '',
  body text DEFAULT '',
  reply_to_message_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email preferences"
  ON email_preferences
  FOR SELECT
  TO authenticated
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can insert own email preferences"
  ON email_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can update own email preferences"
  ON email_preferences
  FOR UPDATE
  TO authenticated
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email')
  WITH CHECK (user_email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can view own email drafts"
  ON email_drafts
  FOR SELECT
  TO authenticated
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can insert own email drafts"
  ON email_drafts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can update own email drafts"
  ON email_drafts
  FOR UPDATE
  TO authenticated
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email')
  WITH CHECK (user_email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can delete own email drafts"
  ON email_drafts
  FOR DELETE
  TO authenticated
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE INDEX IF NOT EXISTS idx_email_preferences_user_email ON email_preferences(user_email);
CREATE INDEX IF NOT EXISTS idx_email_drafts_user_email ON email_drafts(user_email);
CREATE INDEX IF NOT EXISTS idx_email_drafts_created_at ON email_drafts(created_at DESC);
