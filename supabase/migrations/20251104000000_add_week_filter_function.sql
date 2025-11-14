/*
  # Add Week-Based Label Filtering Function

  1. New Functions
    - `get_user_custom_labels_by_date_range` - Get custom labels filtered by date range
      - Parameters:
        - `p_user_email` (text) - User's email address
        - `p_start_date` (timestamptz) - Start of date range
        - `p_end_date` (timestamptz) - End of date range
      - Returns: Table with label_id, label_name, and email_count
      - Filters out system labels (INBOX, SENT, etc.)
      - Groups by label and counts distinct messages
      - Orders by email count descending

  2. Important Notes
    - Enables filtering chart data by current week or any date range
    - Reuses existing label_emails table and indexes
    - Efficient query using existing date range index
    - Compatible with existing RLS policies
*/

-- Create function to get custom labels filtered by date range
CREATE OR REPLACE FUNCTION get_user_custom_labels_by_date_range(
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
    AND le.label_id NOT IN ('INBOX', 'UNREAD', 'STARRED', 'DRAFT', 'SPAM', 'TRASH', 'SENT', 'IMPORTANT', 'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS')
    AND le.label_id NOT LIKE 'Label_%'
  GROUP BY le.label_id, le.label_name
  ORDER BY email_count DESC;
END;
$$ LANGUAGE plpgsql;
