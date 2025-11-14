/*
  # Fix Security and Performance Issues

  ## Overview
  This migration addresses multiple security and performance issues identified by Supabase:
  
  ## Changes

  ### 1. RLS Policy Optimization
  Fixes all RLS policies to use `(select auth.uid())` and `(select current_setting(...))` 
  instead of directly calling these functions. This prevents re-evaluation for each row,
  significantly improving query performance at scale.
  
  Tables affected:
  - email_preferences (3 policies)
  - email_drafts (4 policies)
  - starred_emails (3 policies)

  ### 2. Unused Index Removal
  Drops indexes that are not being used by any queries. Unused indexes consume storage
  and slow down write operations without providing any benefit.
  
  Indexes removed:
  - email_preferences: idx_email_preferences_user_email
  - email_drafts: idx_email_drafts_user_email, idx_email_drafts_created_at
  - gmail_stats: idx_gmail_stats_user_email, idx_gmail_stats_created_at, idx_gmail_stats_user_email_created_at
  - received_emails: idx_received_emails_user_date, idx_received_emails_user_read
  - email_metadata: idx_email_metadata_user_email, idx_email_metadata_received_date, idx_email_metadata_user_received
  - starred_emails: idx_starred_emails_user_email, idx_starred_emails_message_id
  - sync_status: idx_sync_status_last_sync, idx_sync_status_watch_expiration
  - label_emails: idx_label_emails_user_label_date, idx_label_emails_user_date, idx_label_emails_user_label
  - sla_emails: idx_sla_emails_user_label, idx_sla_emails_user_resolved

  ### 3. Duplicate Index Removal
  Removes duplicate index on sync_status table. The unique constraint already creates
  an index, so the additional index is redundant.
  
  Removed: idx_sync_status_user_email (keeping sync_status_user_email_key from unique constraint)

  ### 4. Function Search Path Security
  Sets explicit search_path on all functions to prevent search_path hijacking attacks.
  This is a security best practice that prevents malicious users from creating tables
  with names that match system tables.
  
  Functions fixed:
  - count_emails_by_label
  - update_sla_emails_updated_at
  - update_gmail_stats_updated_at
  - update_received_emails_updated_at
  - cleanup_old_emails
  - update_sync_status_updated_at
  - cleanup_old_label_emails
  - get_user_custom_labels
*/

-- ============================================================================
-- 1. DROP AND RECREATE RLS POLICIES WITH OPTIMIZED AUTH CHECKS
-- ============================================================================

-- email_preferences policies
DROP POLICY IF EXISTS "Users can view own email preferences" ON email_preferences;
DROP POLICY IF EXISTS "Users can insert own email preferences" ON email_preferences;
DROP POLICY IF EXISTS "Users can update own email preferences" ON email_preferences;

CREATE POLICY "Users can view own email preferences"
  ON email_preferences
  FOR SELECT
  TO authenticated
  USING (user_email = (select current_setting('request.jwt.claims', true)::json->>'email'));

CREATE POLICY "Users can insert own email preferences"
  ON email_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_email = (select current_setting('request.jwt.claims', true)::json->>'email'));

CREATE POLICY "Users can update own email preferences"
  ON email_preferences
  FOR UPDATE
  TO authenticated
  USING (user_email = (select current_setting('request.jwt.claims', true)::json->>'email'))
  WITH CHECK (user_email = (select current_setting('request.jwt.claims', true)::json->>'email'));

-- email_drafts policies
DROP POLICY IF EXISTS "Users can view own email drafts" ON email_drafts;
DROP POLICY IF EXISTS "Users can insert own email drafts" ON email_drafts;
DROP POLICY IF EXISTS "Users can update own email drafts" ON email_drafts;
DROP POLICY IF EXISTS "Users can delete own email drafts" ON email_drafts;

CREATE POLICY "Users can view own email drafts"
  ON email_drafts
  FOR SELECT
  TO authenticated
  USING (user_email = (select current_setting('request.jwt.claims', true)::json->>'email'));

CREATE POLICY "Users can insert own email drafts"
  ON email_drafts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_email = (select current_setting('request.jwt.claims', true)::json->>'email'));

CREATE POLICY "Users can update own email drafts"
  ON email_drafts
  FOR UPDATE
  TO authenticated
  USING (user_email = (select current_setting('request.jwt.claims', true)::json->>'email'))
  WITH CHECK (user_email = (select current_setting('request.jwt.claims', true)::json->>'email'));

CREATE POLICY "Users can delete own email drafts"
  ON email_drafts
  FOR DELETE
  TO authenticated
  USING (user_email = (select current_setting('request.jwt.claims', true)::json->>'email'));

-- starred_emails policies
DROP POLICY IF EXISTS "Users can view own starred emails" ON starred_emails;
DROP POLICY IF EXISTS "Users can insert own starred emails" ON starred_emails;
DROP POLICY IF EXISTS "Users can delete own starred emails" ON starred_emails;

CREATE POLICY "Users can view own starred emails"
  ON starred_emails
  FOR SELECT
  TO authenticated
  USING (user_email = (select current_setting('request.jwt.claims', true)::json->>'email'));

CREATE POLICY "Users can insert own starred emails"
  ON starred_emails
  FOR INSERT
  TO authenticated
  WITH CHECK (user_email = (select current_setting('request.jwt.claims', true)::json->>'email'));

CREATE POLICY "Users can delete own starred emails"
  ON starred_emails
  FOR DELETE
  TO authenticated
  USING (user_email = (select current_setting('request.jwt.claims', true)::json->>'email'));

-- ============================================================================
-- 2. DROP UNUSED INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_email_preferences_user_email;
DROP INDEX IF EXISTS idx_email_drafts_user_email;
DROP INDEX IF EXISTS idx_email_drafts_created_at;
DROP INDEX IF EXISTS idx_gmail_stats_user_email;
DROP INDEX IF EXISTS idx_gmail_stats_created_at;
DROP INDEX IF EXISTS idx_gmail_stats_user_email_created_at;
DROP INDEX IF EXISTS idx_received_emails_user_date;
DROP INDEX IF EXISTS idx_received_emails_user_read;
DROP INDEX IF EXISTS idx_email_metadata_user_email;
DROP INDEX IF EXISTS idx_email_metadata_received_date;
DROP INDEX IF EXISTS idx_email_metadata_user_received;
DROP INDEX IF EXISTS idx_starred_emails_user_email;
DROP INDEX IF EXISTS idx_starred_emails_message_id;
DROP INDEX IF EXISTS idx_sync_status_last_sync;
DROP INDEX IF EXISTS idx_sync_status_watch_expiration;
DROP INDEX IF EXISTS idx_label_emails_user_label_date;
DROP INDEX IF EXISTS idx_label_emails_user_date;
DROP INDEX IF EXISTS idx_label_emails_user_label;
DROP INDEX IF EXISTS idx_sla_emails_user_label;
DROP INDEX IF EXISTS idx_sla_emails_user_resolved;

-- ============================================================================
-- 3. DROP DUPLICATE INDEX
-- ============================================================================

DROP INDEX IF EXISTS idx_sync_status_user_email;

-- ============================================================================
-- 4. FIX FUNCTION SEARCH PATH MUTABILITY
-- ============================================================================

-- count_emails_by_label
DROP FUNCTION IF EXISTS count_emails_by_label(text, text);
CREATE OR REPLACE FUNCTION count_emails_by_label(
  p_user_email text,
  p_label_name text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  email_count integer;
BEGIN
  SELECT COUNT(*)
  INTO email_count
  FROM label_emails
  WHERE user_email = p_user_email
    AND label_name = p_label_name;
  
  RETURN COALESCE(email_count, 0);
END;
$$;

-- update_sla_emails_updated_at
DROP FUNCTION IF EXISTS update_sla_emails_updated_at() CASCADE;
CREATE OR REPLACE FUNCTION update_sla_emails_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_sla_emails_updated_at_trigger
  BEFORE UPDATE ON sla_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_sla_emails_updated_at();

-- update_gmail_stats_updated_at
DROP FUNCTION IF EXISTS update_gmail_stats_updated_at() CASCADE;
CREATE OR REPLACE FUNCTION update_gmail_stats_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_gmail_stats_updated_at_trigger
  BEFORE UPDATE ON gmail_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_gmail_stats_updated_at();

-- update_received_emails_updated_at
DROP FUNCTION IF EXISTS update_received_emails_updated_at() CASCADE;
CREATE OR REPLACE FUNCTION update_received_emails_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_received_emails_updated_at_trigger
  BEFORE UPDATE ON received_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_received_emails_updated_at();

-- cleanup_old_emails
DROP FUNCTION IF EXISTS cleanup_old_emails(integer);
CREATE OR REPLACE FUNCTION cleanup_old_emails(days_to_keep integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM received_emails
  WHERE received_at < now() - (days_to_keep || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- update_sync_status_updated_at
DROP FUNCTION IF EXISTS update_sync_status_updated_at() CASCADE;
CREATE OR REPLACE FUNCTION update_sync_status_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_sync_status_updated_at_trigger
  BEFORE UPDATE ON sync_status
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_status_updated_at();

-- cleanup_old_label_emails
DROP FUNCTION IF EXISTS cleanup_old_label_emails(integer);
CREATE OR REPLACE FUNCTION cleanup_old_label_emails(days_to_keep integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM label_emails
  WHERE received_date < now() - (days_to_keep || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- get_user_custom_labels
DROP FUNCTION IF EXISTS get_user_custom_labels(text);
CREATE OR REPLACE FUNCTION get_user_custom_labels(p_user_email text)
RETURNS TABLE (
  label_name text,
  email_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    le.label_name,
    COUNT(*) as email_count
  FROM label_emails le
  WHERE le.user_email = p_user_email
  GROUP BY le.label_name
  ORDER BY le.label_name;
END;
$$;
