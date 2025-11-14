/*
  # Add Starred and Trash Fields to Gmail Stats

  1. Changes
    - Add `starred` column (integer, default 0) - Number of starred emails
    - Add `trash` column (integer, default 0) - Number of emails in trash
  
  2. Notes
    - These fields track additional Gmail label statistics
    - Default values ensure backward compatibility
    - No data loss or migration required for existing records
*/

-- Add starred column to gmail_stats table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmail_stats' AND column_name = 'starred'
  ) THEN
    ALTER TABLE gmail_stats ADD COLUMN starred integer DEFAULT 0;
  END IF;
END $$;

-- Add trash column to gmail_stats table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmail_stats' AND column_name = 'trash'
  ) THEN
    ALTER TABLE gmail_stats ADD COLUMN trash integer DEFAULT 0;
  END IF;
END $$;
