# Deployment Guide

## Prerequisites
- **Node.js**: v18+
- **Supabase Project**: Create a new project at [supabase.com](https://supabase.com).
- **Redis**: A Redis instance (e.g., Upstash or Railway Redis).
- **WhatsApp Cloud API**: A Meta Developer account with a configured App and Phone Number.

## 1. Database Setup
1. Go to your Supabase SQL Editor.
2. Copy the content of `docs/schema.sql`.
3. Run the SQL to create tables and policies.
4. Go to **Storage** in Supabase and create a public bucket named `assets` and another named `invitations`.

## 2. Environment Variables
Create a `.env` file in the root or for each service based on `.env.example`.

```env
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
REDIS_HOST=...
REDIS_PORT=...
WHATSAPP_PHONE_ID=...
WHATSAPP_ACCESS_TOKEN=...
```

## 3. Deploying Backend (API & Worker)
You can deploy both `apps/api` and `apps/worker` to platforms like **Railway** or **Render**.

### Railway (Recommended)
1. Connect your GitHub repository.
2. Create two services:
   - **Service 1 (API)**: Root directory `apps/api`. Command: `npm start`.
   - **Service 2 (Worker)**: Root directory `apps/worker`. Command: `npm start`.
3. Add the Environment Variables to the Railway project.
4. Add a Redis service within Railway and link it.

## 4. Deploying Frontend
Deploy `apps/web` to **Vercel**.

1. Import git repository to Vercel.
2. Set Root Directory to `apps/web`.
3. Framework Preset: Next.js.
4. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL`: The URL of your deployed API service.

## 5. WhatsApp Configuration
1. In Meta Developers Portal, configure the webhook if you want to receive delivery status updates (requires adding a webhook endpoint to the API).
2. Create a Message Template named `wedding_invitation` with a header type "Document" and body text "Dear {{1}}, ...".
3. Verify the template is approved.

## 6. Local Development
1. Install dependencies:
   ```bash
   npm install
   cd apps/api && npm install
   cd ../worker && npm install
   cd ../web && npm install
   ```
2. Start services:
   - Terminal 1: `cd apps/api && npm run dev`
   - Terminal 2: `cd apps/worker && npm run dev`
   - Terminal 3: `cd apps/web && npm run dev`
