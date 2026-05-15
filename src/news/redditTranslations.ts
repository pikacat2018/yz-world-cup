import type { NewsItem } from "./types";

const REDDIT_TRANSLATION_CACHE_KEY = "yz-world-cup-reddit-translation-cache-v2";
const MAX_TRANSLATION_CACHE_ITEMS = 500;
const MAX_CONCURRENT_TRANSLATIONS = 2;

type TranslationCacheEntry = {
  translatedTitle: string;
  translatedAt: string;
};

type TranslationCache = Record<string, TranslationCacheEntry>;

const isRedditItem = (item: NewsItem) => item.source === "reddit";

const isUsableTranslation = (title: string, translatedTitle: string) => {
  const compactTranslation = translatedTitle.trim().replace(/\s+/g, "");
  const cjkLength = (compactTranslation.match(/[\u4e00-\u9fff]/g) ?? []).length;

  if (compactTranslation.length < 4 || cjkLength < 2) return false;
  if (title.length >= 40 && compactTranslation.length < 10) return false;
  if (title.length >= 35 && compactTranslation.length < 14 && /[\u4e00-\u9fff]$/.test(compactTranslation)) return false;

  return true;
};

function readTranslationCache(): TranslationCache {
  try {
    const raw = window.localStorage.getItem(REDDIT_TRANSLATION_CACHE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};

    if (!parsed || typeof parsed !== "object") return {};

    return Object.fromEntries(
      Object.entries(parsed as Record<string, Partial<TranslationCacheEntry>>).filter(
        ([, value]) => typeof value.translatedTitle === "string" && typeof value.translatedAt === "string",
      ),
    ) as TranslationCache;
  } catch {
    return {};
  }
}

function saveTranslationCache(cache: TranslationCache) {
  const trimmedEntries = Object.entries(cache)
    .sort(([, a], [, b]) => new Date(b.translatedAt).getTime() - new Date(a.translatedAt).getTime())
    .slice(0, MAX_TRANSLATION_CACHE_ITEMS);

  window.localStorage.setItem(REDDIT_TRANSLATION_CACHE_KEY, JSON.stringify(Object.fromEntries(trimmedEntries)));
}

export function applyCachedRedditTranslations(items: NewsItem[]): NewsItem[] {
  const cache = readTranslationCache();

  return items.map((item) => {
    const cached = isRedditItem(item) ? cache[item.id] : undefined;
    const itemTranslation =
      item.translatedTitle && isUsableTranslation(item.title, item.translatedTitle)
        ? { translatedTitle: item.translatedTitle, translatedAt: item.translatedAt }
        : undefined;

    if (cached && isUsableTranslation(item.title, cached.translatedTitle)) {
      return { ...item, translatedTitle: cached.translatedTitle, translatedAt: cached.translatedAt };
    }

    return itemTranslation
      ? { ...item, translatedTitle: itemTranslation.translatedTitle, translatedAt: itemTranslation.translatedAt }
      : { ...item, translatedTitle: undefined, translatedAt: undefined };
  });
}

async function translateRedditTitle(title: string): Promise<string | null> {
  try {
    const response = await fetch("/api/reddit/translate-title", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as { translatedTitle?: unknown };
    return typeof payload.translatedTitle === "string" && payload.translatedTitle.trim()
      ? payload.translatedTitle.trim()
      : null;
  } catch (error) {
    console.warn("[reddit] title translation request failed", error instanceof Error ? error.message : "unknown error");
    return null;
  }
}

async function translateWithLimit(items: NewsItem[], cache: TranslationCache) {
  let cursor = 0;
  const translated = [...items];

  const worker = async () => {
    while (cursor < translated.length) {
      const index = cursor;
      cursor += 1;

      const item = translated[index];
      if (!item || item.translatedTitle || !isRedditItem(item)) continue;

      const cached = cache[item.id];
      if (cached) {
        translated[index] = { ...item, translatedTitle: cached.translatedTitle, translatedAt: cached.translatedAt };
        continue;
      }

      const translatedTitle = await translateRedditTitle(item.title);
      if (!translatedTitle || !isUsableTranslation(item.title, translatedTitle)) continue;

      const translatedAt = new Date().toISOString();
      cache[item.id] = { translatedTitle, translatedAt };
      translated[index] = { ...item, translatedTitle, translatedAt };
    }
  };

  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT_TRANSLATIONS, items.length) }, worker));
  saveTranslationCache(cache);

  return translated;
}

export async function translateNewRedditItems(incoming: NewsItem[], existing: NewsItem[]): Promise<NewsItem[]> {
  const cache = readTranslationCache();
  const existingIds = new Set(existing.map((item) => item.id));
  const withCachedTranslations = applyCachedRedditTranslations(incoming);
  const newRedditItems = withCachedTranslations.filter((item) => isRedditItem(item) && !existingIds.has(item.id));

  if (newRedditItems.length === 0) return withCachedTranslations;

  const translatedNewItems = await translateWithLimit(newRedditItems, cache);
  const translatedById = new Map(translatedNewItems.map((item) => [item.id, item]));

  return withCachedTranslations.map((item) => translatedById.get(item.id) ?? item);
}

export async function translateMissingRedditItems(items: NewsItem[], limit = 20): Promise<NewsItem[]> {
  const cache = readTranslationCache();
  const withCachedTranslations = applyCachedRedditTranslations(items);
  const missingRedditItems = withCachedTranslations
    .filter((item) => isRedditItem(item) && !item.translatedTitle)
    .sort((a, b) => {
      const priorityDelta = (b.priority ?? 0) - (a.priority ?? 0);
      if (priorityDelta !== 0) return priorityDelta;

      return (
        new Date(b.publishedAt || b.fetchedAt).getTime() - new Date(a.publishedAt || a.fetchedAt).getTime()
      );
    })
    .slice(0, limit);

  if (missingRedditItems.length === 0) return withCachedTranslations;

  const translatedMissingItems = await translateWithLimit(missingRedditItems, cache);
  const translatedById = new Map(translatedMissingItems.map((item) => [item.id, item]));

  return withCachedTranslations.map((item) => translatedById.get(item.id) ?? item);
}
