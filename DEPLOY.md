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

`VITE_SHARED_EDITING` is visible to the browser and only turns on the access-code screen. The other variables are read by Cloudflare Functions only. `EDITOR_ACCESS_CODE` can be a shared internal access code. `EDITOR_ACCESS_CODES` is still supported for comma-separated extra valid access codes, but is optional.

## 3. Share With Editors

Give editors:

1. The Cloudflare Pages site URL.
2. The shared editor access code.

The browser stores the access code locally and uses it when calling editor APIs. Shared editorial state stays shared across valid codes. For match records, each editor sets a separate personal record code in the app; that code is hashed and used only for match-record ownership. Supabase credentials stay on the server.

## 4. What Syncs

These editor states are shared:

- fetched news cache
- pinned news
- read and unread markers
- Reddit hot seen markers
- follow-up items

Match records sync across devices for the same personal record code, but do not sync between different personal record codes. If a personal record code is forgotten, it cannot be recovered from the stored hash.

The app polls shared state every 5 seconds. A local edit is applied immediately in that editor's browser and then pushed to Supabase through Cloudflare Functions.

## 5. Production API Routes

Cloudflare Pages Functions provide:

- `/api/shared-state`
- `/api/shared-state/:key`
- `/api/match-records`
- `/api/match-records/:matchId`
- `/api/reddit/collect`
- `/api/zhibo8/detail`

The old Vite development middleware can still run locally through `npm run dev`.
