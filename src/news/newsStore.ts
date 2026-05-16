import { extractRedditPostId, fetchRedditNews } from "./adapters/redditAdapter";
import { fetchXNews } from "./adapters/xAdapter";
import { fetchZhibo8News } from "./adapters/zhibo8Adapter";
import type { NewsFeedState, NewsItem } from "./types";

export const PINNED_NEWS_STORAGE_KEY = "yz-world-cup-pinned-news";
export const READ_NEWS_STORAGE_KEY = "yz-world-cup-read-news";
export const UNREAD_NEWS_STORAGE_KEY = "yz-world-cup-unread-news";
export const NEWS_ITEMS_STORAGE_KEY = "yz-world-cup-news-items-v6";
export const NEWS_FEED_CONFIG = {
  initialVisibleCount: 40,
  loadMoreCount: 20,
  maxStoredItems: 10_000,
  pinnedLimit: 30,
};
export const SOURCE_REFRESH_CONFIG = {
  zhibo8: 90_000,
  redditNew: 120_000,
  redditHot: 600_000,
};
export const MAX_PINNED_NEWS = NEWS_FEED_CONFIG.pinnedLimit;
const SOURCE_FETCH_TIMEOUT_MS = {
  zhibo8: 30_000,
  x: 4_000,
  reddit: 15_000,
};

const parseSortTime = (value?: string) => {
  if (!value) return 0;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const getSortTime = (item: NewsItem) => parseSortTime(item.publishedAt) || parseSortTime(item.fetchedAt);

const getSortPriority = (item: NewsItem) => item.priority ?? 0;

const isDateOnlyPublishedAt = (value?: string) => {
  if (!value) return false;

  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getUTCHours() === 16 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
};

const mergeRedditSourceVariant = (existing?: NewsItem["sourceVariant"], incoming?: NewsItem["sourceVariant"]) => {
  const variants = new Set([...(existing?.split(",") ?? []), ...(incoming?.split(",") ?? [])]);
  const hasHot = variants.has("hot");
  const hasNew = variants.has("new");

  if (hasHot && hasNew) return "hot,new";
  if (hasHot) return "hot";
  if (hasNew) return "new";
  return existing ?? incoming;
};

const mergeStableNewsItem = (existing: NewsItem, incoming: NewsItem): NewsItem => {
  if (existing.source === "reddit" && incoming.source === "reddit") {
    const sourceVariant = mergeRedditSourceVariant(existing.sourceVariant, incoming.sourceVariant);

    return {
      ...existing,
      sourceVariant,
      score: Math.max(existing.score ?? 0, incoming.score ?? 0) || existing.score || incoming.score,
      comments: Math.max(existing.comments ?? 0, incoming.comments ?? 0) || existing.comments || incoming.comments,
      priority: Math.max(existing.priority ?? 0, incoming.priority ?? 0),
      fetchedAt: parseSortTime(incoming.fetchedAt) > parseSortTime(existing.fetchedAt) ? incoming.fetchedAt : existing.fetchedAt,
    };
  }

  if (isDateOnlyPublishedAt(existing.publishedAt) && incoming.publishedAt && !isDateOnlyPublishedAt(incoming.publishedAt)) {
    return {
      ...existing,
      publishedAt: incoming.publishedAt,
    };
  }

  return existing;
};

const getDedupeKey = (item: NewsItem) => {
  if (item.source === "reddit" && item.id.startsWith("reddit:")) return item.id;

  if (item.source === "reddit" && item.url) {
    const postId = extractRedditPostId(item.url);
    if (postId) return `reddit:${postId}`;
  }

  return item.url ? `${item.source}:${item.title}:${item.url}` : `${item.source}:${item.title}`;
};

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> =>
  new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} fetch timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });

const isRetiredMockNewsItem = (item: NewsItem) =>
  item.id.startsWith("reddit:mock") ||
  item.id.startsWith("fallback-") ||
  item.rawCategory === "fallback" ||
  Boolean(item.url?.includes("/mock_reddit_soccer_item_"));

const isNewsItem = (value: unknown): value is NewsItem => {
  if (!value || typeof value !== "object") return false;

  const item = value as Partial<NewsItem>;
  return typeof item.id === "string" && typeof item.source === "string" && typeof item.title === "string" && typeof item.fetchedAt === "string";
};

const readIdList = (key: string, limit?: number): string[] => {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const ids = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];

    return typeof limit === "number" ? ids.slice(0, limit) : ids;
  } catch {
    return [];
  }
};

const saveIdList = (key: string, ids: string[], limit?: number) => {
  const uniqueIds = Array.from(new Set(ids));

  window.localStorage.setItem(key, JSON.stringify(typeof limit === "number" ? uniqueIds.slice(0, limit) : uniqueIds));
};

export function readPinnedNewsIds(): string[] {
  return readIdList(PINNED_NEWS_STORAGE_KEY, MAX_PINNED_NEWS);
}

export function savePinnedNewsIds(ids: string[]) {
  saveIdList(PINNED_NEWS_STORAGE_KEY, ids, MAX_PINNED_NEWS);
}

export function readReadNewsIds(): string[] {
  return readIdList(READ_NEWS_STORAGE_KEY);
}

export function saveReadNewsIds(ids: string[]) {
  saveIdList(READ_NEWS_STORAGE_KEY, ids);
}

export function readUnreadNewsIds(): string[] {
  return readIdList(UNREAD_NEWS_STORAGE_KEY);
}

export function saveUnreadNewsIds(ids: string[]) {
  saveIdList(UNREAD_NEWS_STORAGE_KEY, ids);
}

export function readStoredNewsItems(): NewsItem[] {
  try {
    const raw = window.localStorage.getItem(NEWS_ITEMS_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed) ? parsed.filter(isNewsItem).filter((item) => !isRetiredMockNewsItem(item)) : [];
  } catch {
    return [];
  }
}

export function saveNewsItems(items: NewsItem[]) {
  window.localStorage.setItem(NEWS_ITEMS_STORAGE_KEY, JSON.stringify(limitNewsItems(items)));
}

export function markNewsIdRead(id: string) {
  saveReadNewsIds([...readReadNewsIds(), id]);
  saveUnreadNewsIds(readUnreadNewsIds().filter((newsId) => newsId !== id));
}

export function dedupeNewsItems(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = getDedupeKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function applyPinnedState(items: NewsItem[], pinnedIds: string[]): NewsItem[] {
  const pinnedSet = new Set(pinnedIds);

  return items.map((item) => ({
    ...item,
    pinned: pinnedSet.has(item.id),
  }));
}

export function applyReadState(items: NewsItem[], readIds: string[]): NewsItem[] {
  const readSet = new Set(readIds);

  return items.map((item) => ({
    ...item,
    isRead: item.isRead || readSet.has(item.id),
  }));
}

export function applyUnreadState(items: NewsItem[], unreadIds: string[], readIds: string[]): NewsItem[] {
  const unreadSet = new Set(unreadIds);
  const readSet = new Set(readIds);

  return items.map((item) => ({
    ...item,
    isNew: item.isNew || (unreadSet.has(item.id) && !readSet.has(item.id)),
  }));
}

export function applyStoredNewsState(items: NewsItem[]): NewsItem[] {
  const readIds = readReadNewsIds();

  return applyReadState(
    applyUnreadState(applyPinnedState(items, readPinnedNewsIds()), readUnreadNewsIds(), readIds),
    readIds,
  );
}

export function sortNewsItems(items: NewsItem[]): NewsItem[] {
  return items
    .map((item, index) => ({ index, item }))
    .sort((a, b) => {
      return getSortTime(b.item) - getSortTime(a.item) || getSortPriority(b.item) - getSortPriority(a.item) || a.index - b.index;
    })
    .map(({ item }) => item);
}

export function limitNewsItems(items: NewsItem[]): NewsItem[] {
  return sortNewsItems(items).slice(0, NEWS_FEED_CONFIG.maxStoredItems);
}

export async function fetchLatestNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled([
    withTimeout(fetchZhibo8News(), SOURCE_FETCH_TIMEOUT_MS.zhibo8, "zhibo8"),
    withTimeout(fetchXNews(), SOURCE_FETCH_TIMEOUT_MS.x, "x"),
    withTimeout(fetchRedditNews(), SOURCE_FETCH_TIMEOUT_MS.reddit, "reddit"),
  ]);
  const items = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const hasAnySuccess = results.some((result) => result.status === "fulfilled");

  if (!hasAnySuccess) {
    const message =
      results.find((result) => result.status === "rejected")?.reason instanceof Error
        ? (results.find((result) => result.status === "rejected")?.reason as Error).message
        : "news request failed";

    throw new Error(message);
  }

  if (items.length === 0) {
    throw new Error("no football news parsed");
  }

  return sortNewsItems(dedupeNewsItems(items));
}

export function mergeNewsItems(
  existing: NewsItem[],
  incoming: NewsItem[],
): {
  items: NewsItem[];
  addedCount: number;
} {
  const existingKeys = new Set(existing.map(getDedupeKey));
  const readIds = readReadNewsIds();
  const readSet = new Set(readIds);
  const unreadIds = readUnreadNewsIds();
  const newUnreadIds = incoming
    .filter((item) => !existingKeys.has(getDedupeKey(item)) && !readSet.has(item.id))
    .map((item) => item.id);
  const nextUnreadIds = [...unreadIds, ...newUnreadIds];
  const normalizedIncoming = incoming.map((item) => {
    const isExisting = existingKeys.has(getDedupeKey(item));

    return {
      ...item,
      isNew: !isExisting || unreadIds.includes(item.id),
      isRead: readSet.has(item.id),
    };
  });
  const pinnedIds = existing.filter((item) => item.pinned).map((item) => item.id);
  const incomingByKey = new Map(normalizedIncoming.map((item) => [getDedupeKey(item), item]));
  const mergedExisting = existing.map((item) => {
    const incomingItem = incomingByKey.get(getDedupeKey(item));
    return incomingItem ? mergeStableNewsItem(item, incomingItem) : item;
  });
  const merged = dedupeNewsItems([...mergedExisting, ...normalizedIncoming]);
  const items = limitNewsItems(
    applyUnreadState(applyReadState(applyPinnedState(merged, pinnedIds), readIds), nextUnreadIds, readIds),
  );

  if (newUnreadIds.length > 0) {
    saveUnreadNewsIds(nextUnreadIds);
  }

  saveNewsItems(items);

  return { addedCount: newUnreadIds.length, items };
}

export async function loadNewsItems(): Promise<NewsItem[]> {
  const stored = readStoredNewsItems().map((item) => ({ ...item, isNew: false }));
  const latest = await fetchLatestNews();
  const latestAsHistory = latest.map((item) => ({ ...item, isNew: false }));
  const items = limitNewsItems(applyStoredNewsState(dedupeNewsItems([...latestAsHistory, ...stored])));

  saveNewsItems(items);
  return items;
}

export async function loadNewsFeed(): Promise<NewsFeedState> {
  const errors: string[] = [];
  const stored = limitNewsItems(applyStoredNewsState(readStoredNewsItems().map((item) => ({ ...item, isNew: false }))));

  if (stored.length > 0) {
    return {
      items: stored,
      usingMock: false,
      errors,
    };
  }

  try {
    const items = await loadNewsItems();

    return {
      items,
      usingMock: false,
      errors,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "news request failed");
  }

  return {
    items: [],
    usingMock: false,
    errors,
  };
}
