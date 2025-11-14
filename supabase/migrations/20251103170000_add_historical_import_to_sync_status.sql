/*
  # Add Historical Import Tracking to Sync Status

  1. Changes
    - Add `historical_import_completed` (boolean, default false) - Tracks if initial historical email import has been completed
    - Add `historical_import_started_at` (timestamptz) - When historical import was started
    - Add `historical_import_completed_at` (timestamptz) - When historical import completed successfully
    - Add `historical_import_error` (text) - Last error during historical import if any

  2. Important Notes
    - This enables one-time historical data import for label activity tracking
    - Prevents duplicate imports by tracking completion status
    - Allows users to see historical email data in charts immediately after login
*/

-- Add columns for historical import tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sync_status' AND column_name = 'historical_import_completed'
  ) THEN
    ALTER TABLE sync_status ADD COLUMN historical_import_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sync_status' AND column_name = 'historical_import_started_at'
  ) THEN
    ALTER TABLE sync_status ADD COLUMN historical_import_started_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sync_status' AND column_name = 'historical_import_completed_at'
  ) THEN
    ALTER TABLE sync_status ADD COLUMN historical_import_completed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sync_status' AND column_name = 'historical_import_error'
  ) THEN
    ALTER TABLE sync_status ADD COLUMN historical_import_error text;
  END IF;
END $$;

-- Create index for efficient querying of import status
CREATE INDEX IF NOT EXISTS idx_sync_status_historical_import
  ON sync_status(user_email, historical_import_completed)
  WHERE historical_import_completed = false;
