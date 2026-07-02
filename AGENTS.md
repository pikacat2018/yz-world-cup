# Project Overview

- This is a Vite + React + TypeScript editorial workbench for World Cup data, schedules, news screening, Reddit/zhibo8 ingestion, and shared editor state.
- Production API endpoints are Cloudflare Pages Functions under `functions/api`; local development mirrors key API behavior through middleware in `vite.config.ts`.
- Shared editor state uses Supabase via `functions/api/shared-state` and `supabase/schema.sql`.

# Product Intent

- The product helps users efficiently collect, screen, organize, edit, and follow up on World Cup-related information.
- It prioritizes information acquisition, information filtering, follow-up, editing, and durable information capture.
- It is not a social product, content community, media portal, or long-form reading platform.
- New features should improve editing efficiency, information density, discoverability, workflow continuity, or multi-source integration.
- Treat the product as an information workbench and editorial workbench, not as a news website or community product.

# Editorial Philosophy

- Help users discover important information before polishing presentation.
- Reduce information noise and make new items, follow-ups, state changes, and key time points easy to notice.
- Avoid duplicated content, low-value content, information flooding, and meaningless ordering changes.
- News, fixtures, follow-up items, and editorial state should be organized around one continuous editing workflow.
- New features should serve editorial decisions and follow-up continuity before secondary browsing or display goals.

# Directory Guide

- `src/components/`: React workbench UI, schedule/group views, editor access, message and news panels.
- `src/news/`: news adapters, stores, follow-up state, fallback news, keyword filtering, title simplification, source styling, and ticker logic.
- `src/data/mockWorldCup.ts`: local World Cup data used by the UI; treat it as project data, not proof of live facts.
- `src/shared/`: cross-cutting browser state helpers such as shared online state and single active tab control.
- `src/services/`: service helpers such as FIFA schedule sync.
- `functions/api/`: Cloudflare Pages Function routes for Reddit, zhibo8, and shared editor state.
- `supabase/schema.sql`: Supabase schema for persisted editor state.
- `scripts/`: one-off or diagnostic Node scripts. Verify intent before treating them as normal test commands.
- `dist/`: build output; do not edit by hand.
- `task_plan.md`, `findings.md`, `progress.md`: planning and investigation notes; read them when they are relevant, but do not treat them as source code.

# Commands

- `npm run dev`: start the Vite dev server with local API middleware from `vite.config.ts`.
- `npm run build`: run `tsc -b` and create a production Vite build in `dist`.
- `npm run preview`: serve the production build locally with Vite preview.
- `node test-reddit-playwright.cjs`: diagnostic Reddit browser fetch script; requires local Chrome path and proxy assumptions, so results are environment-dependent.
- `node scripts/test-deepseek.cjs`: diagnostic DeepSeek API check; requires `DEEPSEEK_API_KEY` in `.env` or shell environment.
- Automated unit/integration test command: 不确定，需确认.

# Development Rules

- Read the current module, related data flow, and relevant planning notes before editing.
- Keep changes narrow and compatible with existing routes, state keys, API response shapes, localStorage keys, and Supabase document keys.
- For news or Reddit behavior, trace the full path: fetch/adapter, store, cache/persistence, filtering, rendering, and user actions.
- Keep automatic imports, manually pinned items, read/unread markers, follow-up items, and shared-state sync behavior distinct.
- Do not move production-only secrets into frontend `VITE_*` variables. `SUPABASE_SERVICE_ROLE_KEY` and `EDITOR_ACCESS_CODE` belong on the server side.
- When Chinese UI text or news parsing is involved, read and write files as UTF-8.
- Avoid unrelated rewrites of `src/styles.css` or large components unless the task requires it.
- Preserve the single-active-tab behavior that prevents duplicate syncing and repeated request consumption.

# Shared State Rules

- Preserve the single-active-tab mechanism for request control and state consistency.
- Avoid duplicate sync, duplicate polling, duplicate fetches, and cross-tab state conflicts.
- For `shared-state`, polling, cache, sync, and Supabase state changes, evaluate request count, consistency, multi-tab behavior, and Cloudflare request consumption.
- Do not break existing throttling, cache, or synchronization behavior for a local feature change.
- Shared editor state must remain compatible with manual edits, automatic feed imports, read/unread markers, pinned items, and follow-up items.

# UI Rules

- Preserve the four-column workbench structure and continuity of the main information flow unless a larger layout change is explicitly requested.
- Prioritize discoverability of news, fixtures, follow-up items, and editorial state.
- Keep information density and editing efficiency ahead of decorative presentation.
- Avoid meaningless whitespace in workbench views: do not leave large empty bands between title rows, toolbars, detail rows, and primary content when real content can be shown in that space.
- For detail panels, timelines, lists, and editors, default to top-aligned compact stacking. Do not use flexible spacer rows or oversized containers that visually push active content into the middle of the panel.
- Keep header rows, summary rows, and primary action rows close to text height unless a larger control is functionally required.
- When changing one area, check whether adjacent columns, shared controls, scrolling, and editing actions are affected.
- For large layout changes, analyze workflow impact before implementation.
- Detailed visual-method guidance belongs in the `workbench-ui-review` Skill, not in this project file.

# Data / Mock / Fallback Rules

- Do not present `src/data/mockWorldCup.ts`, cached feed data, or fallback news as live truth.
- Keep fallback paths explicit and non-misleading; if live fetch fails, surface failure state or cached/fallback status honestly.
- For sports/news conclusions, separate fetched facts, local cached state, fallback data, and editorial inference.
- Treat media outlet names as keyword noise when working on recent keyword extraction; update filtering at candidate generation/retention points, not only display text.
- Preserve de-duplication and suppression behavior so removed automatic Reddit items are not repeatedly re-imported.
- Do not invent API responses, Supabase rows, standings, schedules, or news items.

# Validation

- For most code changes, run `npm run build`.
- For local UI/API behavior, run `npm run dev` and verify the affected route or endpoint in a browser when practical.
- For production-build behavior, run `npm run preview` after `npm run build` when the risk is routing, asset output, or deployed UI behavior.
- For Cloudflare Pages Function changes, at minimum run `npm run build`; full local Pages function validation is 不确定，需确认.
- For scripts depending on external APIs, only run them when credentials/network/proxy requirements are available, and report skipped checks clearly.
- If validation cannot be run, state the exact command that was skipped and why.
