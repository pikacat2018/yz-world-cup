import { simplifyNewsTitle } from "./titleSimplifier";
import type { NewsItem, TickerItem, TickerSource } from "./types";

export const BOTTOM_TICKER_UPDATED_EVENT = "yz-world-cup-bottom-ticker-updated";
export const MAX_BOTTOM_TICKER_ITEMS = 30;

const sourceRank: Record<TickerSource, number> = {
  pinned_news: 4,
  latest_news: 3,
  match_event: 2,
  system: 1,
};

export const tickerSourceLabels: Record<TickerSource, string> = {
  pinned_news: "置顶",
  latest_news: "快讯",
  match_event: "比赛",
  system: "快讯",
};

export const mockTickerItems: TickerItem[] = [
  {
    id: "mock-ticker-club-world-cup-city",
    source: "system",
    text: "曼城公布世俱杯参赛名单",
    priority: 10,
    createdAt: "2026-05-15T00:00:00.000Z",
  },
  {
    id: "mock-ticker-england-squad",
    source: "system",
    text: "英格兰公布最新一期国家队名单",
    priority: 10,
    createdAt: "2026-05-15T00:00:00.000Z",
  },
  {
    id: "mock-ticker-argentina-media",
    source: "match_event",
    text: "阿根廷训练营今日开放媒体采访",
    priority: 20,
    createdAt: "2026-05-15T00:00:00.000Z",
  },
  {
    id: "mock-ticker-brazil-plan",
    source: "system",
    text: "巴西队确认世界杯备战计划",
    priority: 10,
    createdAt: "2026-05-15T00:00:00.000Z",
  },
  {
    id: "mock-ticker-uefa-schedule",
    source: "system",
    text: "欧足联公布新赛季欧冠赛程安排",
    priority: 10,
    createdAt: "2026-05-15T00:00:00.000Z",
  },
];

const normalizeDedupeValue = (value?: string) => value?.trim().replace(/\s+/g, "").toLowerCase();

const getTickerSortTime = (item: TickerItem) => {
  const time = new Date(item.createdAt).getTime();
  return Number.isNaN(time) ? 0 : time;
};

export function createTickerItemFromPinnedNews(item: NewsItem): TickerItem {
  return {
    id: `pinned-news-${item.id}`,
    source: "pinned_news",
    text: simplifyNewsTitle(item.translatedTitle || item.title),
    url: item.url,
    priority: 100,
    createdAt: item.publishedAt || item.fetchedAt,
  };
}

export function composeBottomTickerItems(newsItems: NewsItem[], fallbackItems = mockTickerItems): TickerItem[] {
  const pinnedItems = newsItems.filter((item) => item.pinned).slice(0, 10).map(createTickerItemFromPinnedNews);
  const seenText = new Set<string>();
  const seenUrl = new Set<string>();

  return [...pinnedItems, ...fallbackItems]
    .filter((item) => {
      const textKey = normalizeDedupeValue(item.text);
      const urlKey = normalizeDedupeValue(item.url);

      if (!textKey) return false;
      if (seenText.has(textKey)) return false;
      if (urlKey && seenUrl.has(urlKey)) return false;

      seenText.add(textKey);
      if (urlKey) seenUrl.add(urlKey);
      return true;
    })
    .sort(
      (a, b) =>
        sourceRank[b.source] - sourceRank[a.source] ||
        b.priority - a.priority ||
        getTickerSortTime(b) - getTickerSortTime(a),
    )
    .slice(0, MAX_BOTTOM_TICKER_ITEMS);
}

export function notifyBottomTickerUpdated() {
  window.dispatchEvent(new Event(BOTTOM_TICKER_UPDATED_EVENT));
}
