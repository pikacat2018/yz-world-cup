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
