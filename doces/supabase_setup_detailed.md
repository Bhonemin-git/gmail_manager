# Supabase Setup (Detailed)

This application requires each user to set up their own Supabase instance. The database credentials in this repository are specific to the original developer's instance and will NOT work for your deployment. Follow these steps carefully to configure your own Supabase backend.

### Why You Need Your Own Supabase Instance

- **Data Privacy**: Your email statistics and metadata should be stored in your own database
- **Security**: Using your own credentials ensures your data is isolated and secure
- **Scalability**: Independent Supabase projects allow you to scale based on your usage
- **Control**: Full control over your database, migrations, and configurations

### Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up for a free account
2. Click on "New Project" in your dashboard
3. Fill in the project details:
   - **Name**: Choose a descriptive name (e.g., "gmail-integration")
   - **Database Password**: Create a strong password (save this securely)
   - **Region**: Select the region closest to your users for better performance
   - **Pricing Plan**: Free tier is sufficient for getting started
4. Click "Create new project" and wait 2-3 minutes for provisioning

### Step 2: Get Your Supabase Credentials

1. Once your project is ready, go to **Settings** (gear icon in sidebar)
2. Navigate to **API** section
3. You'll need two values:
   - **Project URL**: Something like `https://abcdefghijklmnop.supabase.co`
   - **anon/public key**: A long JWT token starting with `eyJ...`
4. Copy both values - you'll use them in your `.env` file

**Important**: Never share or commit these credentials to public repositories!

### Step 3: Apply Database Migrations

The application requires several database tables to function. You have two options to apply migrations:

#### Option A: Using Supabase SQL Editor (Recommended for Beginners)

1. In your Supabase dashboard, click on **SQL Editor** in the left sidebar
2. Click **New Query** button
3. Open each migration file from `supabase/migrations/` in this repository (in order by date)
4. Copy the entire SQL content from each file
5. Paste it into the SQL Editor
6. Click **Run** button
7. Repeat for all migration files in chronological order:
   - `20251102071928_create_email_preferences_and_drafts.sql`
   - `20251102154208_create_gmail_stats_table.sql`
   - `20251102174817_create_received_emails_table.sql`
   - `20251102181413_create_email_metadata_table.sql`
   - `20251103073811_create_starred_emails_table.sql`
   - `20251103074716_add_starred_trash_to_gmail_stats.sql`
   - `20251103100316_add_image_preferences_to_email_preferences.sql`
   - `20251103120000_create_sync_status_table.sql`
   - `20251103161439_create_label_emails_table.sql`
   - `20251103164008_create_sync_status_table.sql`
   - `20251103164025_add_historical_import_to_sync_status.sql`
   - `20251103170000_add_historical_import_to_sync_status.sql`
   - `20251104000000_add_week_filter_function.sql`
   - `20251104045459_add_week_filter_function.sql`
   - `20251105000000_create_sla_emails_table.sql`
   - `20251106143946_create_sla_emails_table.sql`

#### Option B: Using Supabase CLI (Advanced Users)

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project (you'll need your project reference from the URL):
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Push migrations:
   ```bash
   supabase db push
   ```

### Step 4: Verify Database Setup

After applying migrations, verify your database is set up correctly:

1. Go to **Table Editor** in your Supabase dashboard
2. You should see these tables:
   - `email_preferences`
   - `email_drafts`
   - `gmail_stats`
   - `received_emails`
   - `email_metadata`
   - `starred_emails`
   - `sync_status`
   - `label_emails`
   - `sla_emails`

3. Click on any table and verify it has columns and RLS policies

4. Test the connection by running this query in SQL Editor:
   ```sql
   SELECT COUNT(*) FROM gmail_stats;
   ```
   It should return 0 (since you haven't added any data yet)


### Step 5: Deploy Edge Function (Optional)

The `gmail-webhook` edge function handles Gmail push notifications:

1. In Supabase dashboard, go to **Edge Functions**
2. Click **Create Function**
3. Name it `gmail-webhook`
4. Copy the code from `supabase/functions/gmail-webhook/index.ts`
5. Paste it into the editor
6. Click **Deploy**

Alternatively, using Supabase CLI:
```bash
supabase functions deploy gmail-webhook
```

### Step 6: Configure Row Level Security (RLS)

RLS is already configured in the migration files. The policies allow:
- Anonymous users to perform operations (since Gmail OAuth handles authentication)
- Authenticated users to access their own data

To verify RLS is enabled:
1. Go to **Authentication** > **Policies**
2. Each table should show "RLS enabled"
3. Review the policies to ensure they match your security requirements

### Step 7: Security Best Practices

- **Never commit your `.env` file**: It's already in `.gitignore`, but double-check
- **Use environment variables in production**: Set them in your hosting platform (Vercel, Netlify, etc.)
- **Rotate keys if exposed**: If you accidentally expose your keys, regenerate them in Supabase settings
- **Monitor usage**: Check your Supabase dashboard regularly for unusual activity
- **Set up database backups**: Enable Point-in-Time Recovery in Supabase settings (paid plans)

### Troubleshooting Supabase Setup

**Problem**: "Failed to connect to Supabase"
- Verify your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Check that you copied the entire anon key (it's very long)
- Ensure there are no extra spaces or quotes in your `.env` file
- Restart your development server after changing `.env`

**Problem**: "Relation does not exist" errors
- Make sure you applied all migrations in order
- Check the SQL Editor for any errors during migration
- Verify tables exist in Table Editor

**Problem**: "Row level security policy violation"
- RLS is enabled but policies might not be working
- Check that policies were created in the migrations
- Review policies in Authentication > Policies section
- For development, you can temporarily disable RLS (not recommended for production)

**Problem**: Edge function not receiving requests
- Verify the function is deployed and active
- Check the function URL is correct
- Review function logs in Supabase dashboard
- Test the endpoint with curl or Postman

**Problem**: Database queries timing out
- Check your Supabase project is in an active state (not paused)
- Free tier projects pause after 1 week of inactivity
- Visit your Supabase dashboard to wake up the project
- Consider upgrading to a paid plan for always-on databases

### Understanding the Database Schema

Here's what each table does:

- **email_preferences**: Stores user UI preferences (sidebar width, selected folder, etc.)
- **email_drafts**: Temporary storage for draft emails being composed
- **gmail_stats**: Cached Gmail statistics (inbox count, unread count, etc.)
- **received_emails**: Metadata for emails fetched from Gmail
- **email_metadata**: Extended email information and label associations
- **starred_emails**: Quick access table for starred/important emails
- **sync_status**: Tracks synchronization state and history for incremental updates
- **label_emails**: Many-to-many relationship between emails and Gmail labels
- **sla_emails**: Tracks emails for Service Level Agreement monitoring

All tables include:
- Row Level Security (RLS) enabled
- Automatic timestamps (`created_at`, `updated_at`)
- Indexes for efficient queries
- Policies for both anonymous and authenticated access
