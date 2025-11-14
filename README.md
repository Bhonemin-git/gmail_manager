# Gmail N8N Integration
**Gmail N8N Integration** is a modern web dashboard that connects your Gmail with n8n workflows — enabling real-time email analytics, seamless automation, and effortless email management from one place.

### Screenshots

**Email Inbox View**
![Email Inbox View](https://github.com/Bhonemin-git/gmail-n8n-webapp/blob/main/public/Screenshot%202025-11-14%20150800.png)

**SLA Tracking Dashboard**
![SLA Tracking Dashboard](https://github.com/Bhonemin-git/gmail-n8n-webapp/blob/main/public/Screenshot%202025-11-14%20150820.png)

## 🚀 Overview
**Gmail n8n Integration** is a full-stack platform that bridges your Gmail account and n8n automation workflows with a real-time dashboard, email analytics, and direct Gmail controls, you can visualize, automate, and manage your inbox like never before.

## ✨ Core Features
- 🔐**Gmail OAuth Authentication** - Secure OAuth 2.0 login with Google
- 📊**Real-time Email Statistics** - Live dashboard showing inbox, unread, sent, drafts, starred, and trash counts
- 🏷️**Custom Label Analytics** - Visualize email distribution across custom Gmail labels with interactive bar charts
- 📬**Email Browser** - Browse and read emails from all folders including custom labels
- ✉️**Email Composition** - Draft and send emails directly from the app
- ⚙️**n8n Workflow Integration** - Trigger custom n8n workflows with Gmail data
- ♻️**Auto-refresh** - Stats update every 10 seconds, emails sync every 15 seconds

## 🧰 Tech Stack
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **APIs**: Gmail API, n8n Webhooks

## 🧩 Prerequisites
- Node.js 18+ and npm
- Google Cloud Console account (for Gmail API)
- n8n instance with webhook access
- Supabase account (free tier works fine)

## ⚙️ Getting Started

### 1️⃣ Clone and Install
```bash
git clone <repository-url>
cd gmail-n8n-integration
npm install
```

### 2️⃣ Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable Gmail API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs:
   - `http://localhost:5173` (development)
   - Your production URL
6. Copy the Client ID

You can follow along this [Video Tutorial](https://youtu.be/tgO_ADSvY1I?si=i0JxuhgesCDLvPnX) for OAuth configuration.

### 3️⃣ Setup N8N Workflow

Import the [register.json](https://github.com/Bhonemin-git/gmail-n8n-webapp/blob/main/workflow/register.json) file and [gmail_triage.json](https://github.com/Bhonemin-git/gmail-n8n-webapp/blob/main/workflow/gmail_triage.json) file as separate n8n workflows.

Create data table with the name `sessions` and with the following columns : 
- `email` (string)
- `token` (string)
- `billing_email` (string)
- `bug_report_email` (string)
- `feature_request_email` (string)
- `abuse_report_email` (string)


**Example row**

| email                                                         | token                                                                                                                                                                                                                                                                                                                                              | billing_email                                     | bug_report_email                                  | feature_request_email                   | abuse_report_email                                  |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------- | --------------------------------------- | --------------------------------------------------- |
| [aignitionteam26@gmail.com](mailto:aignitionteam26@gmail.com) | ya29.A0ATi6K2tpEA4y63MAv-7yDummyWdOhMW3HtSUX50E8BAKLyeBcmkq1KYMEj8BjFUDMXT40NqMcE_Wfy90wFZp6ZSDummyodq66yuLgHBnzfPPEoV5_5hxrAD8N9R6z2QdQDHvcGCKKgy2YY-DYGW4yfD-zbmGGjTRziQDiOuj7mvob0mNoHQyboEiAJBqe79D2v0h9kFE-qLtPNPUOih4UziJVhl1fjTquRxhmxRe8sOH48TMdXDemkHnaQuE1JQ8ZBHREgyPFLzeKMe42QENhNf3haCgYKAfkSARUSFQHGX2MiwXsmNMvFkmHt-ioToPRq7g0291 | [finance@company.com](mailto:finance@company.com) | [bug_fix@company.com](mailto:bug_fix@company.com) | [IT@company.com](mailto:IT@company.com) | [security@company.com](mailto:security@company.com) |


Open the webhook node in the `gmail_triage.json` workflow. Copy the webhook link to update the value of `VITE_N8N_WEBHOOK_URL` in `.env` file (more on section 5).

### 4️⃣ Setup Supabase

**Important**: You MUST complete the [Supabase Setup (Detailed)](https://github.com/Bhonemin-git/gmail-n8n-webapp/blob/main/doces/supabase_setup_detailed.md) below before proceeding. This step cannot be skipped.

Quick summary:
1. Create your own Supabase project
2. Apply all database migrations from `supabase/migrations/`
3. Get your project URL and anon key from Settings > API
4. Save these credentials for the next step


### 5️⃣ Configure Environment Variables

Create a `.env` file in the project root (use `.env.example` as a template):

```bash
# Copy the example file
cp .env.example .env

# Then edit .env with your actual credentials
```

Your `.env` file should contain:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_N8N_WEBHOOK_URL=your_n8n_webhook_url_here
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 💖 Credits
Built with ❤️ by Aignition Team-26



