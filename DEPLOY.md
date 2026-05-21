# Deploying the Shared Editor Desk

This project is set up for Cloudflare Pages + Supabase Free.

## 1. Create Supabase Project

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. Copy these values from Project Settings:
   - Project URL
   - `service_role` key

Do not put the `service_role` key in frontend `.env` files.

## 2. Deploy to Cloudflare Pages

1. Connect this repository to Cloudflare Pages.
2. Build command:

```bash
npm run build
```

3. Build output directory:

```text
dist
```

4. Add Cloudflare Pages environment variables:

```text
VITE_SHARED_EDITING=true
EDITOR_ACCESS_CODE=choose-a-private-editor-code
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`VITE_SHARED_EDITING` is visible to the browser and only turns on the access-code screen. The other three variables are read by Cloudflare Functions only.

## 3. Share With Editors

Give editors:

1. The Cloudflare Pages site URL.
2. The editor access code.

The browser stores the access code locally and uses it only when calling `/api/shared-state`. Supabase credentials stay on the server.

## 4. What Syncs

These editor states are shared:

- fetched news cache
- pinned news
- read and unread markers
- Reddit hot seen markers
- follow-up items

The app polls shared state every 5 seconds. A local edit is applied immediately in that editor's browser and then pushed to Supabase through Cloudflare Functions.

## 5. Production API Routes

Cloudflare Pages Functions provide:

- `/api/shared-state`
- `/api/shared-state/:key`
- `/api/reddit/collect`
- `/api/zhibo8/detail`

The old Vite development middleware can still run locally through `npm run dev`.
