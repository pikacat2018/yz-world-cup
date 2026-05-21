# News Feed v1 Findings

- Design skill guidance: dark dashboard, compact readable rows, strong hover/focus, avoid bulky cards.
- User requires the fixed message area to remain in the current homepage position and scroll internally.
- Current layout imports `MessagePanelPlaceholder` once from `Layout.tsx`; replacing that import avoids duplicate message components.
- Existing `.message-panel` already sits in the third column, so styles should preserve grid height and use internal scrolling.
- News Feed v2.1 requires zhibo8 football detection to prefer `/news/web/zuqiu/` URLs before title keywords.
- Pagination should use a one-time candidate pool plus `visibleCount`, not repeated fetches at scroll bottom.

# Bottom Ticker v1 Findings

- Existing `BottomTickerPlaceholder` renders static `tickerItems.bottom` spans from `mockWorldCup`.
- `Layout.tsx` owns the bottom ticker slot, while `MessagePanel` owns current news state and pin/unpin actions.
- `savePinnedNewsIds` persists pinned ids, but pin/unpin currently does not save the updated `NewsItem.pinned` values to `NEWS_ITEMS_STORAGE_KEY`; a same-tab event is needed because browser `storage` events do not fire in the same tab that writes localStorage.
- Existing app shell is fixed at `48px / main / 40px`; bottom ticker must stay inside the existing 40px row.

# Today Follow-Up v1 Findings

- `EditorDesk` currently reads pinned `NewsItem`s directly from `readStoredNewsItems()` and removes selections by clearing `pinned`/`sourcePinned`.
- `MessagePanel` already saves pinned news items and emits `BOTTOM_TICKER_UPDATED_EVENT`; the third column can listen to the same event and migrate newly pinned items into follow-up storage.
- The existing `BottomTicker` component exists but is not mounted in `App.tsx`/`Layout.tsx`; this task should not depend on it.
- Existing CSS already has third-column selected-list/source-strip/export styles that can be extended rather than replacing the dashboard layout.

# Shared Online Editing v1 Findings

- Current collaboration-critical data lives in `localStorage`: news items, pinned/read/unread ids, Reddit hot seen keys, follow-up items, and theme.
- The Vite-only `/api/reddit/collect` and `/api/zhibo8/detail` middleware is not suitable as a production backend; production shared state needs Cloudflare Pages Functions or another server layer.
- A server-side API can use Supabase service-role credentials while the browser only knows an editor access code.
- Four editors do not need high-frequency realtime infrastructure for v1; short polling plus optimistic local writes is enough and simpler on the free plan.
