import { extractRedditPostId, fetchRedditNews } from "./adapters/redditAdapter";
import { fetchXNews } from "./adapters/xAdapter";
import { fetchZhibo8News } from "./adapters/zhibo8Adapter";
import type { NewsFeedState, NewsItem } from "./types";

export const PINNED_NEWS_STORAGE_KEY = "yz-world-cup-pinned-news";
export const READ_NEWS_STORAGE_KEY = "yz-world-cup-read-news";
export const UNREAD_NEWS_STORAGE_KEY = "yz-world-cup-unread-news";
export const NEWS_ITEMS_STORAGE_KEY = "yz-world-cup-news-items-v7";
export const REDDIT_HOT_SEEN_STORAGE_KEY = "yz-world-cup-reddit-hot-seen-v1";
export const NEWS_FEED_CONFIG = {
  initialVisibleCount: 40,
  loadMoreCount: 20,
  maxStoredItems: 10_000,
  pinnedLimit: 120,
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

const isRedditHotItem = (item: NewsItem) => item.source === "reddit" && item.sourceVariant?.includes("hot");

const isDateOnlyPublishedAt = (value?: string) => {
  if (!value) return false;

  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getUTCHours() === 16 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
};

const isProbablyFetchTime = (item: NewsItem, value?: string) => {
  const publishedTime = parseSortTime(value);
  const fetchedTime = parseSortTime(item.fetchedAt);

  return publishedTime > 0 && fetchedTime > 0 && Math.abs(publishedTime - fetchedTime) <= 5_000;
};

const choosePublishedAt = (existing: NewsItem, incoming: NewsItem) => {
  if (!incoming.publishedAt) return existing.publishedAt;
  if (!existing.publishedAt) return incoming.publishedAt;

  const existingIsDateOnly = isDateOnlyPublishedAt(existing.publishedAt);
  const incomingIsDateOnly = isDateOnlyPublishedAt(incoming.publishedAt);
  const existingIsFetchTime = isProbablyFetchTime(existing, existing.publishedAt);
  const incomingIsFetchTime = isProbablyFetchTime(incoming, incoming.publishedAt);

  if ((existingIsDateOnly || existingIsFetchTime) && !incomingIsDateOnly && !incomingIsFetchTime) return incoming.publishedAt;
  if (!existingIsDateOnly && !existingIsFetchTime && (incomingIsDateOnly || incomingIsFetchTime)) return existing.publishedAt;

  return incoming.publishedAt;
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

const mergeUpdatedNewsItem = (existing: NewsItem, incoming: NewsItem): NewsItem => ({
  ...existing,
  title: incoming.title || existing.title,
  translatedTitle: incoming.translatedTitle ?? existing.translatedTitle,
  rawCategory: incoming.rawCategory ?? existing.rawCategory,
  sourceVariant: incoming.sourceVariant ?? existing.sourceVariant,
  score: incoming.score ?? existing.score,
  comments: incoming.comments ?? existing.comments,
  priority: Math.max(existing.priority ?? 0, incoming.priority ?? 0),
  publishedAt: choosePublishedAt(existing, incoming),
  fetchedAt: incoming.fetchedAt || existing.fetchedAt,
  url: incoming.url || existing.url,
  externalUrl: incoming.externalUrl ?? existing.externalUrl,
});

const mergeStableNewsItem = (existing: NewsItem, incoming: NewsItem): NewsItem => {
  if (existing.source === "reddit" && incoming.source === "reddit") {
    const sourceVariant = mergeRedditSourceVariant(existing.sourceVariant, incoming.sourceVariant);

    return {
      ...mergeUpdatedNewsItem(existing, incoming),
      sourceVariant,
      score: Math.max(existing.score ?? 0, incoming.score ?? 0) || existing.score || incoming.score,
      comments: Math.max(existing.comments ?? 0, incoming.comments ?? 0) || existing.comments || incoming.comments,
      priority: Math.max(existing.priority ?? 0, incoming.priority ?? 0),
    };
  }

  if (isDateOnlyPublishedAt(existing.publishedAt) && incoming.publishedAt && !isDateOnlyPublishedAt(incoming.publishedAt)) {
    return {
      ...mergeUpdatedNewsItem(existing, incoming),
      publishedAt: incoming.publishedAt,
    };
  }

  return mergeUpdatedNewsItem(existing, incoming);
};

const normalizeDedupeUrl = (value?: string) => {
  if (!value) return "";

  try {
    const url = new URL(value, window.location.origin);
    url.hash = "";
    url.searchParams.sort();
    const normalized = url.toString().replace(/\/$/, "");
    return normalized.toLowerCase();
  } catch {
    return value.trim().replace(/#.*$/, "").replace(/\/$/, "").toLowerCase();
  }
};

const getDedupeKey = (item: NewsItem) => {
  if (item.source === "reddit" && item.id.startsWith("reddit:")) return item.id;

  if (item.source === "reddit" && item.url) {
    const postId = extractRedditPostId(item.url);
    if (postId) return `reddit:${postId}`;
  }

  const stableUrl = normalizeDedupeUrl(item.url || item.externalUrl);
  return stableUrl ? `${item.source}:${stableUrl}` : `${item.source}:${item.title}`;
};

const getRedditHotSeenKey = (item: NewsItem) => (item.source === "reddit" ? getDedupeKey(item) : "");

const getAutoPinnedNewsItem = (item: NewsItem, existing?: NewsItem, seenKeys = new Set<string>()): NewsItem => {
  if (!isRedditHotItem(item)) return item;
  if (seenKeys.has(getDedupeKey(item))) return item;
  if (existing?.sourcePinned === false && !existing.pinned) return item;

  return {
    ...item,
    pinned: true,
    sourcePinned: true,
  };
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

export function readRedditHotSeenKeys(): string[] {
  return readIdList(REDDIT_HOT_SEEN_STORAGE_KEY);
}

export function saveRedditHotSeenKeys(keys: string[]) {
  saveIdList(REDDIT_HOT_SEEN_STORAGE_KEY, keys);
}

export function markRedditHotSeen(item: NewsItem) {
  const key = getRedditHotSeenKey(item);
  if (!key) return;

  saveRedditHotSeenKeys([...readRedditHotSeenKeys(), key]);
  savePinnedNewsIds(readPinnedNewsIds().filter((id) => id !== item.id));
}

export function readStoredNewsItems(): NewsItem[] {
  try {
    const raw = window.localStorage.getItem(NEWS_ITEMS_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const redditHotSeenKeys = new Set(readRedditHotSeenKeys());
    const pinnedSet = new Set(readPinnedNewsIds());

    if (!Array.isArray(parsed)) return [];

    return dedupeNewsItems(parsed.filter(isNewsItem).filter((item) => !isRetiredMockNewsItem(item))).map((item) =>
      isRedditHotItem(item) && redditHotSeenKeys.has(getDedupeKey(item)) && !pinnedSet.has(item.id)
        ? { ...item, pinned: false, sourcePinned: false }
        : item,
    );
  } catch {
    return [];
  }
}

export function reconcileRedditHotSeenState(): NewsItem[] {
  const currentItems = readStoredNewsItems();
  const pinnedSet = new Set(readPinnedNewsIds());
  const nextRedditHotSeenKeys = new Set([
    ...readRedditHotSeenKeys(),
    ...currentItems.filter((item) => isRedditHotItem(item) && !pinnedSet.has(item.id)).map(getDedupeKey),
  ]);
  const nextItems = currentItems.map((item) =>
    isRedditHotItem(item) && nextRedditHotSeenKeys.has(getDedupeKey(item)) && !pinnedSet.has(item.id)
      ? { ...item, pinned: false, sourcePinned: false }
      : item,
  );

  saveRedditHotSeenKeys([...nextRedditHotSeenKeys]);
  savePinnedNewsIds(nextItems.filter((item) => item.pinned).map((item) => item.id));
  saveNewsItems(nextItems);

  return nextItems;
}

export function saveNewsItems(items: NewsItem[]) {
  window.localStorage.setItem(NEWS_ITEMS_STORAGE_KEY, JSON.stringify(limitNewsItems(items)));
}

export function markNewsIdRead(id: string) {
  saveReadNewsIds([...readReadNewsIds(), id]);
  saveUnreadNewsIds(readUnreadNewsIds().filter((newsId) => newsId !== id));
}

export function dedupeNewsItems(items: NewsItem[]): NewsItem[] {
  const byKey = new Map<string, NewsItem>();

  for (const item of items) {
    const key = getDedupeKey(item);
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, item);
      continue;
    }

    const mergedItem = mergeStableNewsItem(existing, item);
    byKey.set(key, {
      ...mergedItem,
      pinned: existing.pinned || item.pinned,
      sourcePinned: existing.sourcePinned || item.sourcePinned,
      isNew: existing.isNew || item.isNew,
      isRead: existing.isRead || item.isRead,
    });
  }

  return Array.from(byKey.values());
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

export async function fetchLatestRedditHotNews(): Promise<NewsItem[]> {
  const items = await withTimeout(
    fetchRedditNews({ forceRefresh: true, variant: "hot" }),
    SOURCE_FETCH_TIMEOUT_MS.reddit,
    "reddit hot",
  );
  return sortNewsItems(dedupeNewsItems(items.filter(isRedditHotItem)));
}

export function mergeNewsItems(
  existing: NewsItem[],
  incoming: NewsItem[],
): {
  items: NewsItem[];
  addedCount: number;
} {
  const existingByKey = new Map(existing.map((item) => [getDedupeKey(item), item]));
  const existingKeys = new Set(existingByKey.keys());
  const readIds = readReadNewsIds();
  const readSet = new Set(readIds);
  const unreadIds = readUnreadNewsIds();
  const redditHotSeenKeys = new Set(readRedditHotSeenKeys());
  const nextRedditHotSeenKeys = new Set(redditHotSeenKeys);
  const newUnreadIds = incoming
    .filter((item) => !existingKeys.has(getDedupeKey(item)) && !readSet.has(item.id))
    .map((item) => item.id);
  const nextUnreadIds = [...unreadIds, ...newUnreadIds];
  const normalizedIncoming = incoming.map((item) => {
    const key = getDedupeKey(item);
    const existingItem = existingByKey.get(key);
    const isExisting = Boolean(existingItem);
    const autoPinnedItem = getAutoPinnedNewsItem(item, existingItem, redditHotSeenKeys);

    if (autoPinnedItem.pinned && autoPinnedItem.sourcePinned) {
      const seenKey = getRedditHotSeenKey(autoPinnedItem);
      if (seenKey) nextRedditHotSeenKeys.add(seenKey);
    }

    return {
      ...autoPinnedItem,
      isNew: !isExisting || unreadIds.includes(item.id),
      isRead: readSet.has(item.id),
    };
  });
  const pinnedIds = [
    ...existing.filter((item) => item.pinned).map((item) => item.id),
    ...normalizedIncoming.filter((item) => item.pinned).map((item) => item.id),
  ];
  const incomingByKey = new Map(normalizedIncoming.map((item) => [getDedupeKey(item), item]));
  const mergedExisting = existing.map((item) => {
    const incomingItem = incomingByKey.get(getDedupeKey(item));
    if (!incomingItem) return item;

    const mergedItem = mergeStableNewsItem(item, incomingItem);
    return incomingItem.pinned && !(item.sourcePinned === false && !item.pinned)
      ? { ...mergedItem, pinned: true, sourcePinned: true }
      : mergedItem;
  });
  const merged = dedupeNewsItems([...mergedExisting, ...normalizedIncoming]);
  const items = limitNewsItems(
    applyUnreadState(
      applyReadState(applyPinnedState(merged, pinnedIds), readIds),
      nextUnreadIds,
      readIds,
    ),
  );

  if (newUnreadIds.length > 0) {
    saveUnreadNewsIds(nextUnreadIds);
  }

  saveRedditHotSeenKeys([...nextRedditHotSeenKeys]);
  savePinnedNewsIds(items.filter((item) => item.pinned).map((item) => item.id));
  saveNewsItems(items);

  return { addedCount: newUnreadIds.length, items };
}

export function mergeManualRedditHotItems(
  existing: NewsItem[],
  incoming: NewsItem[],
): {
  items: NewsItem[];
  addedCount: number;
} {
  const incomingHotItems = incoming.filter(isRedditHotItem);
  const existingByKey = new Map(existing.map((item) => [getDedupeKey(item), item]));
  const currentlyPinnedKeys = new Set(existing.filter((item) => item.pinned).map(getDedupeKey));
  const forcedHotItems = incomingHotItems.map((item) => ({
    ...item,
    pinned: true,
    sourcePinned: true,
    isNew: !existingByKey.has(getDedupeKey(item)),
  }));
  const incomingByKey = new Map(forcedHotItems.map((item) => [getDedupeKey(item), item]));
  const mergedExisting = existing.map((item) => {
    const incomingItem = incomingByKey.get(getDedupeKey(item));
    if (!incomingItem) return item;

    return {
      ...mergeStableNewsItem(item, incomingItem),
      pinned: true,
      sourcePinned: true,
    };
  });
  const items = limitNewsItems(dedupeNewsItems([...mergedExisting, ...forcedHotItems]));
  const addedCount = items.filter((item) => isRedditHotItem(item) && item.pinned && !currentlyPinnedKeys.has(getDedupeKey(item))).length;

  savePinnedNewsIds(items.filter((item) => item.pinned).map((item) => item.id));
  saveNewsItems(items);

  return { addedCount, items };
}

export async function loadNewsItems(): Promise<NewsItem[]> {
  reconcileRedditHotSeenState();

  const latest = await fetchLatestNews();
  const redditHotSeenKeys = new Set(readRedditHotSeenKeys());
  const nextRedditHotSeenKeys = new Set(redditHotSeenKeys);
  const latestAsHistory = latest.map((item) => {
    const autoPinnedItem = getAutoPinnedNewsItem(item, undefined, redditHotSeenKeys);

    if (autoPinnedItem.pinned && autoPinnedItem.sourcePinned) {
      const seenKey = getRedditHotSeenKey(autoPinnedItem);
      if (seenKey) nextRedditHotSeenKeys.add(seenKey);
    }

    return { ...autoPinnedItem, isNew: false };
  });
  const pinnedIds = [
    ...readPinnedNewsIds(),
    ...latestAsHistory.filter((item) => item.pinned).map((item) => item.id),
  ];

  saveRedditHotSeenKeys([...nextRedditHotSeenKeys]);
  savePinnedNewsIds(pinnedIds);
  const items = limitNewsItems(applyStoredNewsState(dedupeNewsItems(latestAsHistory)));
  saveNewsItems(items);
  return items;
}

export async function loadNewsFeed(): Promise<NewsFeedState> {
  const errors: string[] = [];

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
