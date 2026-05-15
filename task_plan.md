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
