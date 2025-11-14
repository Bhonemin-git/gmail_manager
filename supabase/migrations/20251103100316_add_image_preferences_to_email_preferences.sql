/*
  # Add image loading preferences

  1. Changes
    - Add `load_external_images` column to email_preferences table
      - Boolean flag to control whether external images should be loaded
      - Defaults to false for security and privacy
    
  2. Notes
    - Users can opt-in to loading external images
    - Inline images (attachments) are always loaded
    - Setting respects user privacy preferences
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_preferences' AND column_name = 'load_external_images'
  ) THEN
    ALTER TABLE email_preferences ADD COLUMN load_external_images boolean DEFAULT false;
  END IF;
END $$;
