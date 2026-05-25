# Bottom Ticker v1 Plan

## Goal
Implement a real bottom ticker that scrolls right-to-left, uses pinned news summaries first, and falls back to mock quick updates without disturbing the existing dashboard.

## Phases
1. Inspect existing layout, message pinning, storage, and ticker styles. - complete
2. Add ticker data types, title simplifier, mock ticker items, sorting, and dedupe. - complete
3. Replace bottom placeholder with an animated, clickable ticker component. - complete
4. Wire MessagePanel pin/unpin changes to bottom ticker updates. - complete
5. Run install/build/dev checks and summarize modified files. - complete

## Decisions
- Keep top ticker placeholder unchanged.
- Use localStorage plus a same-tab custom event so BottomTicker updates immediately when MessagePanel pins or unpins news.
- Do not mutate `NewsItem.title`; generate ticker-only text with `simplifyNewsTitle`.

## Errors Encountered
| Error | Attempt | Resolution |
| --- | --- | --- |
| `git diff`/`git status` unavailable | Tried checking changed files with Git | Directory is not a Git repository; used build, targeted source reads, and grep verification instead |

# Recent Keywords v1 Plan

## Goal
Add a compact "12小时关键词 / RECENT KEYWORDS" module at the bottom of the third column using existing News Feed data only.

## Phases
1. Inspect third-column component, NewsItem contract, and existing compact styles. - complete
2. Add a pure recent keyword statistics utility over stored NewsItem data. - complete
3. Render the keyword module at the bottom of the third column. - complete
4. Add compact styles without changing column widths or the four-column layout. - complete
5. Run build/dev checks and summarize modified files. - complete

## Decisions
- Use existing stored News Feed items from `readStoredNewsItems()`.
- Do not add fetchers, AI calls, comment ingestion, or crawler changes.
- Keep the first version as a simple list with honest empty state.

# Today Follow-Up v1 Plan

## Goal
Upgrade the third-column selected-news desk into a date-based "今日跟进" editor workspace with manual items, drag-to-nest themes, two-level nesting, future scheduling, and structured export while keeping the fourth-column news feed unchanged.

## Phases
1. Inspect existing third-column selection, pin storage, and styles. - complete
2. Add localStorage-backed follow-up item storage and migration from existing pinned news. - complete
3. Rebuild `EditorDesk` around date filtering, manual items, drag nesting, collapse, date movement, removal, and export. - complete
4. Add compact third-column styles matching the existing dashboard and refresh icon button. - complete
5. Build and summarize modified files. - complete

## Decisions
- Keep the fourth-column news feed UI unchanged; stars remain the only initial selection entry.
- Treat manual themes and selected news as the same follow-up item type, with `parentId` creating hierarchy.
- Allow at most two child levels below a root item.

# Shared Online Editing v1 Plan

## Goal
Move editor-facing state from single-browser localStorage into a Cloudflare Pages Function + Supabase shared store so four editors can open the same website and see star/follow-up changes from each other while server keys remain hidden.

## Phases
1. Inspect current localStorage write/read points and deployment shape. - complete
2. Add shared-state API contract, Cloudflare Function, and Supabase table SQL. - complete
3. Add frontend access-code gate plus shared-state polling/hydration client. - complete
4. Wire existing news/follow-up save helpers to push shared changes without breaking local fallback. - complete
5. Build and document deployment environment variables. - complete

## Decisions
- Use a server-side Cloudflare Pages Function to keep the Supabase service-role key off the client.
- Use a simple editor access code for the first four-person deployment.
- Store shared editor data as keyed JSON documents so the existing frontend can migrate incrementally.
- Keep localStorage as the offline/local development fallback.
- Use 5-second polling rather than browser-side Supabase Realtime so no Supabase key is exposed to editors.

# Follow-Up Ordering v1 Plan

## Goal
Make the third-column follow-up desk place manually starred/manual items above auto-captured Reddit hot items, and allow editors to drag rows to adjust display order.

## Phases
1. Inspect follow-up storage, Reddit auto-pin flow, manual add flow, and existing drag behavior. - complete
2. Add follow-up ordering metadata and manual-vs-auto grouping in storage helpers. - complete
3. Update third-column manual add, pinned migration, and drag handlers to persist row order. - complete
4. Build and summarize modified files. - complete

## Decisions
- Treat manual follow-up items and manually starred news as the upper group.
- Treat `sourcePinned` news, including auto Reddit hot entries, as the lower automatic group.
- Keep existing hierarchy support by using row-center drops for nesting and row-edge drops for ordering.

# Top Ticker Today Feed v1 Plan

## Goal
Replace the top status ticker content with today's finished match pairings plus today's follow-up news, with link-capable news items and continuous horizontal scrolling.

## Phases
1. Inspect top ticker data/rendering, match data, follow-up storage, and existing ticker animation styles. - complete
2. Rebuild top ticker items from today's finished matches and today's active follow-up items. - complete
3. Render duplicated ticker content with anchors for items that have `url`/`externalUrl` or can be backfilled from source news. - complete
4. Add top ticker scroll animation and hover/focus pause styles. - complete
5. Build and browser-check the top ticker behavior. - complete

## Decisions
- Use `getLocalDateKey()` as the definition of "today" so the top ticker matches the follow-up editor date model.
- Show compact empty states for missing match results or follow-up items instead of reverting to the old status metrics.
- Backfill follow-up news links through `sourceNewsId` and `readStoredNewsItems()` when older follow-up records do not store URL fields directly.

# Shared State Safety v1 Plan

## Goal
Guarantee shared-editing pages hydrate from the cloud before rendering editable state, and prevent stale clients from overwriting newer cloud documents.

## Phases
1. Inspect shared-state hydration, polling, save queue, and Cloudflare write endpoint. - complete
2. Gate app rendering until initial cloud hydrate succeeds. - complete
3. Add client and server version checks for shared-state writes. - complete
4. Build and summarize behavior. - complete

## Decisions
- Do not render the editor dashboard while shared editing is enabled and the first cloud hydrate has not completed.
- Do not queue cloud writes before initial hydrate.
- Require each PUT to include the cloud `updatedAt` version it was based on; reject stale writes with 409.

# Follow-Up Completion/Edit v1 Plan

## Goal
Let third-column manual follow-up items edit title/link/date from the existing edit modal, and let every row be checked off while staying visible and deduped.

## Phases
1. Inspect current follow-up status, sorting, row rendering, and edit modal. - complete
2. Add status-aware follow-up sorting and keep done items visible. - complete
3. Add per-row checkbox with dimmed strikethrough done state. - complete
4. Extend manual item edit modal to update title, link, and date. - complete
5. Build and summarize behavior. - complete

## Decisions
- Keep done items in `follow_up_items` so `sourceNewsId` dedupe still prevents repeated auto capture.
- Preserve manual priority over auto items, with done items sorted after active items within each placement group.
