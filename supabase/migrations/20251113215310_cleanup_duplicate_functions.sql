/*
  # Cleanup Duplicate Functions

  ## Overview
  Removes old function definitions that don't have proper search_path configuration.
  These are causing the security warnings about mutable search_path.

  ## Changes
  - Drops old versions of cleanup_old_emails() with no parameters
  - Drops old versions of cleanup_old_label_emails() with no parameters  
  - Drops old version of count_emails_by_label with different signature
  
  The correct versions with search_path configuration remain intact.
*/

-- Drop old parameterless versions that don't have search_path set
DROP FUNCTION IF EXISTS cleanup_old_emails();
DROP FUNCTION IF EXISTS cleanup_old_label_emails();

-- Drop old version with different signature
DROP FUNCTION IF EXISTS count_emails_by_label(text, timestamp with time zone, timestamp with time zone);
