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
