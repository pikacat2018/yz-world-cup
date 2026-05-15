import type { NewsItem, RedditSourceVariant } from "../types";

const REDDIT_SOCCER_HOT_JSON_URL = "https://www.reddit.com/r/soccer/hot.json?limit=25";
const REDDIT_SOCCER_NEW_JSON_URL = "https://www.reddit.com/r/soccer/new.json?limit=25";
const LOCAL_REDDIT_HOT_JSON_URL = "/api/reddit/hot";
const LOCAL_REDDIT_NEW_JSON_URL = "/api/reddit/new";
const LOCAL_REDDIT_COLLECT_URL = "/api/reddit/collect";
const OLD_REDDIT_SOCCER_HOT_URL = "https://old.reddit.com/r/soccer/";
const OLD_REDDIT_SOCCER_NEW_URL = "https://old.reddit.com/r/soccer/new/";
const REDDIT_BASE_URL = "https://www.reddit.com";
const OLD_REDDIT_BASE_URL = "https://old.reddit.com";
const REDDIT_FETCH_LIMIT = 20;

type RedditListingVariant = "hot" | "new";

const redditRequestHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 yz-world-cup-dashboard/1.0",
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
};

const excludedPatterns = [
  /daily discussion/i,
  /free talk/i,
  /meta thread/i,
  /prediction thread/i,
  /transfer thread/i,
  /^match thread/i,
  /\bmatch thread\b/i,
  /non-pl daily discussion/i,
];

const allowedFlairs = [
  "news",
  "transfers",
  "official source",
  "quotes",
  "stats",
  "media",
  "great goal",
  "post match thread",
];

const priorityFlairs = ["official source", "news", "transfers"];

type RedditJsonPost = {
  id?: unknown;
  title?: unknown;
  permalink?: unknown;
  url?: unknown;
  created_utc?: unknown;
  ups?: unknown;
  num_comments?: unknown;
  link_flair_text?: unknown;
  over_18?: unknown;
  stickied?: unknown;
  subreddit?: unknown;
};

const hashString = (value: string) => {
  let hash = 0;

  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return hash.toString(36);
};

const toRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const toStringValue = (value: unknown) => (typeof value === "string" ? value : "");

const toNumberValue = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);

const logRedditStatus = (message: string, detail?: unknown) => {
  if (detail === undefined) {
    console.info(`[reddit] ${message}`);
    return;
  }

  console.warn(`[reddit] ${message}`, detail);
};

export function normalizeRedditPermalink(permalink: string): string {
  const trimmedPermalink = permalink.trim();

  if (!trimmedPermalink) return "";
  if (trimmedPermalink.startsWith("http")) return trimmedPermalink;

  try {
    return new URL(trimmedPermalink, REDDIT_BASE_URL).toString();
  } catch {
    return "";
  }
}

export function normalizeRedditUrl(href: string): string {
  const trimmedHref = href.trim();

  if (!trimmedHref || trimmedHref.startsWith("#") || trimmedHref.startsWith("javascript:")) return "";

  try {
    const url = new URL(trimmedHref, OLD_REDDIT_BASE_URL);
    url.hostname = "old.reddit.com";
    return url.toString();
  } catch {
    return "";
  }
}

export function extractRedditPostId(url: string): string | null {
  try {
    const parsed = new URL(url, REDDIT_BASE_URL);
    const match = parsed.pathname.match(/\/r\/soccer\/comments\/([^/]+)/i);

    return match?.[1] ?? null;
  } catch {
    const match = url.match(/\/r\/soccer\/comments\/([^/]+)/i);
    return match?.[1] ?? null;
  }
}

const parseCompactNumber = (value: string) => {
  const compactMatch = value.trim().toLowerCase().match(/([\d,.]+)\s*([km])?/);
  if (!compactMatch) return undefined;

  const amount = Number(compactMatch[1].replace(/,/g, ""));
  if (Number.isNaN(amount)) return undefined;

  const multiplier = compactMatch[2] === "k" ? 1000 : compactMatch[2] === "m" ? 1_000_000 : 1;
  return Math.round(amount * multiplier);
};

const parseOldRedditPublishedAt = (row: Element, fetchedAt: string) => {
  const datetime =
    row.querySelector("time")?.getAttribute("datetime") ??
    row.querySelector(".live-timestamp")?.getAttribute("datetime") ??
    row.querySelector(".live-timestamp")?.getAttribute("title") ??
    row.getAttribute("data-timestamp");

  if (!datetime) return fetchedAt;

  const numericTimestamp = Number(datetime);
  const date = Number.isNaN(numericTimestamp)
    ? new Date(datetime)
    : new Date(numericTimestamp > 10_000_000_000 ? numericTimestamp : numericTimestamp * 1000);

  return Number.isNaN(date.getTime()) ? fetchedAt : date.toISOString();
};

const shouldKeepPost = (title: string, flair: string) => {
  const normalizedTitle = title.trim();
  const normalizedFlair = flair.trim().toLowerCase();

  if (normalizedFlair === "post match thread") return true;
  if (excludedPatterns.some((pattern) => pattern.test(normalizedFlair) || pattern.test(normalizedTitle))) return false;
  if (normalizedFlair && allowedFlairs.includes(normalizedFlair)) return true;

  return normalizedTitle.length >= 8;
};

const getPriority = (variant: RedditListingVariant, flair: string, score?: number, comments?: number) => {
  const normalizedFlair = flair.trim().toLowerCase();
  const basePriority = variant === "hot" ? 85 : 60;
  const heatPriority = score !== undefined && score >= 500 || comments !== undefined && comments >= 100 ? 90 : 0;
  const flairPriority = priorityFlairs.includes(normalizedFlair) ? 75 : 0;

  return Math.max(basePriority, heatPriority, flairPriority);
};

export function normalizeRedditJsonPost(postData: RedditJsonPost, variant: RedditListingVariant): NewsItem | null {
  const subreddit = toStringValue(postData.subreddit).toLowerCase();
  const title = toStringValue(postData.title).replace(/\s+/g, " ").trim();
  const flair = toStringValue(postData.link_flair_text).replace(/\s+/g, " ").trim();
  const postId = toStringValue(postData.id);

  if (!title) return null;
  if (subreddit && subreddit !== "soccer") return null;
  if (postData.stickied === true || postData.over_18 === true) return null;
  if (!shouldKeepPost(title, flair)) return null;

  const permalink = normalizeRedditPermalink(toStringValue(postData.permalink));
  const externalUrl = toStringValue(postData.url) || undefined;
  const fetchedAt = new Date().toISOString();
  const createdUtc = toNumberValue(postData.created_utc);
  const publishedAt = createdUtc ? new Date(createdUtc * 1000).toISOString() : fetchedAt;
  const score = toNumberValue(postData.ups);
  const comments = toNumberValue(postData.num_comments);

  return {
    id: postId ? `reddit:${postId}` : `reddit-${hashString(`${title}:${permalink || (externalUrl ?? "")}`)}`,
    source: "reddit",
    sourceVariant: variant,
    title,
    url: permalink || externalUrl,
    externalUrl,
    publishedAt,
    fetchedAt,
    pinned: false,
    category: "football",
    rawCategory: flair || "r/soccer",
    score,
    comments,
    priority: getPriority(variant, flair, score, comments),
  };
}

export function parseRedditJsonListing(json: unknown, variant: RedditListingVariant): NewsItem[] {
  const listing = toRecord(json);
  const data = toRecord(listing?.data);
  const children = data?.children;

  if (!Array.isArray(children)) {
    throw new Error("reddit JSON parsing failed: data.children missing");
  }

  return children
    .map((child) => normalizeRedditJsonPost(toRecord(toRecord(child)?.data) ?? {}, variant))
    .filter((item): item is NewsItem => Boolean(item))
    .slice(0, REDDIT_FETCH_LIMIT);
}

export function parseOldRedditListing(html: string, variant: RedditListingVariant): NewsItem[] {
  const document = new DOMParser().parseFromString(html, "text/html");
  const fetchedAt = new Date().toISOString();
  const rows = Array.from(document.querySelectorAll(".thing.link, .thing[data-fullname]"));
  const items: NewsItem[] = [];

  for (const row of rows) {
    if (items.length >= REDDIT_FETCH_LIMIT) break;

    const titleLink = row.querySelector<HTMLAnchorElement>("a.title");
    const title = titleLink?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const flair = row.querySelector(".linkflairlabel")?.textContent?.replace(/\s+/g, " ").trim() ?? "";

    if (!title || !shouldKeepPost(title, flair)) continue;

    const commentsHref =
      row.getAttribute("data-permalink") ??
      row.querySelector<HTMLAnchorElement>("a.comments")?.getAttribute("href") ??
      "";
    const titleHref = titleLink?.getAttribute("href") ?? "";
    const permalink = normalizeRedditUrl(commentsHref);
    const titleUrl = normalizeRedditUrl(titleHref);
    const postUrl = permalink || (extractRedditPostId(titleUrl) ? titleUrl : "");
    const url = postUrl || titleUrl;
    const externalUrl = titleUrl && titleUrl !== url && !extractRedditPostId(titleUrl) ? titleUrl : row.getAttribute("data-url") ?? undefined;

    if (!url) continue;

    const postId = extractRedditPostId(url);
    const score =
      parseCompactNumber(row.getAttribute("data-score") ?? "") ??
      parseCompactNumber(row.querySelector(".score.unvoted")?.textContent ?? "");
    const comments = parseCompactNumber(row.querySelector("a.comments")?.textContent ?? "");

    items.push({
      id: postId ? `reddit:${postId}` : `reddit-${hashString(`${title}:${url}`)}`,
      source: "reddit",
      sourceVariant: variant,
      title,
      url,
      externalUrl,
      publishedAt: parseOldRedditPublishedAt(row, fetchedAt),
      fetchedAt,
      pinned: false,
      category: "football",
      rawCategory: flair || "r/soccer",
      score,
      comments,
      priority: getPriority(variant, flair, score, comments),
    });
  }

  return items;
}

const getRedditDedupeKey = (item: NewsItem) => {
  if (item.id.startsWith("reddit:")) return item.id;

  const postId = item.url ? extractRedditPostId(item.url) : null;
  return postId ? `reddit:${postId}` : `reddit:${item.title}:${item.url ?? ""}`;
};

const mergeVariant = (a?: RedditSourceVariant, b?: RedditSourceVariant): RedditSourceVariant => {
  const variants = new Set([...(a?.split(",") ?? []), ...(b?.split(",") ?? [])]);
  const hasHot = variants.has("hot");
  const hasNew = variants.has("new");

  return hasHot && hasNew ? "hot,new" : hasNew ? "new" : "hot";
};

export function mergeRedditHotAndNew(items: NewsItem[]): NewsItem[] {
  const byPost = new Map<string, NewsItem>();

  for (const item of items) {
    const key = getRedditDedupeKey(item);
    const existing = byPost.get(key);

    if (!existing) {
      byPost.set(key, item);
      continue;
    }

    const sourceVariant = mergeVariant(existing.sourceVariant, item.sourceVariant);
    const existingPublishedAt = new Date(existing.publishedAt ?? existing.fetchedAt).getTime();
    const itemPublishedAt = new Date(item.publishedAt ?? item.fetchedAt).getTime();

    byPost.set(key, {
      ...existing,
      sourceVariant,
      score: Math.max(existing.score ?? 0, item.score ?? 0) || undefined,
      comments: Math.max(existing.comments ?? 0, item.comments ?? 0) || undefined,
      priority: sourceVariant === "hot,new" ? 95 : Math.max(existing.priority ?? 0, item.priority ?? 0),
      publishedAt: itemPublishedAt < existingPublishedAt ? item.publishedAt : existing.publishedAt,
      fetchedAt: item.fetchedAt > existing.fetchedAt ? item.fetchedAt : existing.fetchedAt,
    });
  }

  return Array.from(byPost.values());
}

const describeFetchFailure = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return "unknown error";
};

const isNewsItem = (value: unknown): value is NewsItem => {
  const item = value && typeof value === "object" ? (value as Partial<NewsItem>) : null;

  return Boolean(
    item &&
      typeof item.id === "string" &&
      item.source === "reddit" &&
      typeof item.title === "string" &&
      typeof item.fetchedAt === "string",
  );
};

export async function collectReddit(subreddit = "soccer"): Promise<NewsItem[]> {
  const response = await fetch(`${LOCAL_REDDIT_COLLECT_URL}?subreddit=${encodeURIComponent(subreddit)}`, {
    mode: "same-origin",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`reddit axios collector failed: ${response.status} ${body.slice(0, 180)}`);
  }

  const payload = (await response.json()) as { items?: unknown; source?: string; proxy?: string };
  const items = Array.isArray(payload.items) ? payload.items.filter(isNewsItem) : [];

  logRedditStatus(`axios collector ${payload.source ?? "unknown"} success`, `${items.length} items`);
  return items;
}

const isBrowser = () => typeof window !== "undefined" && typeof window.fetch === "function";

const fetchRedditJsonListing = async (
  urls: string[],
  variant: RedditListingVariant,
  label: string,
): Promise<NewsItem[]> => {
  const errors: string[] = [];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: url.startsWith("/") ? undefined : redditRequestHeaders,
        mode: url.startsWith("/") ? "same-origin" : "cors",
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        const reason =
          response.status === 403
            ? "403 HTML or Forbidden response; Reddit blocked this request path"
            : response.status === 429
              ? "429 Too Many Requests; Reddit rate limited this request path"
            : `${response.status} ${response.statusText}`;

        throw new Error(`${reason}${body ? ` (${body.slice(0, 180)})` : ""}`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType && !contentType.includes("json")) {
        const body = await response.text().catch(() => "");
        throw new Error(`reddit ${label} ${variant} returned non-JSON content (${contentType}): ${body.slice(0, 180)}`);
      }

      return parseRedditJsonListing(await response.json(), variant);
    } catch (error) {
      errors.push(`${url}: ${describeFetchFailure(error)}`);
    }
  }

  throw new Error(`reddit ${label} JSON ${variant} failed: ${errors.join(" | ")}`);
};

const fetchOldRedditListing = async (url: string, variant: RedditListingVariant): Promise<NewsItem[]> => {
  const response = await fetch(url, { mode: "cors" });

  if (!response.ok) {
    throw new Error(`old reddit HTML ${variant} failed: ${response.status} ${response.statusText}`);
  }

  return parseOldRedditListing(await response.text(), variant);
};

export async function fetchRedditJsonHot(): Promise<NewsItem[]> {
  return fetchRedditJsonListing([REDDIT_SOCCER_HOT_JSON_URL], "hot", "browser");
}

export async function fetchRedditJsonNew(): Promise<NewsItem[]> {
  return fetchRedditJsonListing([REDDIT_SOCCER_NEW_JSON_URL], "new", "browser");
}

export async function fetchRedditBrowserHot(): Promise<NewsItem[]> {
  if (!isBrowser()) throw new Error("browser JSON hot skipped: window.fetch unavailable");

  return fetchRedditJsonHot();
}

export async function fetchRedditBrowserNew(): Promise<NewsItem[]> {
  if (!isBrowser()) throw new Error("browser JSON new skipped: window.fetch unavailable");

  return fetchRedditJsonNew();
}

export async function fetchRedditLocalProxyJsonHot(): Promise<NewsItem[]> {
  return fetchRedditJsonListing([LOCAL_REDDIT_HOT_JSON_URL], "hot", "local proxy");
}

export async function fetchRedditLocalProxyJsonNew(): Promise<NewsItem[]> {
  return fetchRedditJsonListing([LOCAL_REDDIT_NEW_JSON_URL], "new", "local proxy");
}

export async function fetchRedditHot(): Promise<NewsItem[]> {
  return fetchOldRedditListing(OLD_REDDIT_SOCCER_HOT_URL, "hot");
}

export async function fetchRedditNew(): Promise<NewsItem[]> {
  return fetchOldRedditListing(OLD_REDDIT_SOCCER_NEW_URL, "new");
}

const collectFulfilledItems = (results: PromiseSettledResult<NewsItem[]>[]) =>
  results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));

const logSettledResults = (label: string, variants: RedditListingVariant[], results: PromiseSettledResult<NewsItem[]>[]) => {
  results.forEach((result, index) => {
    const variant = variants[index];

    if (result.status === "fulfilled") {
      logRedditStatus(`${label} ${variant} success`, `${result.value.length} items`);
      return;
    }

    logRedditStatus(`${label} ${variant} failed`, describeFetchFailure(result.reason));
  });
};

const fetchRedditStage = async (
  label: string,
  hotFetcher: () => Promise<NewsItem[]>,
  newFetcher: () => Promise<NewsItem[]>,
) => {
  const variants: RedditListingVariant[] = ["hot", "new"];
  const results = await Promise.allSettled([hotFetcher(), newFetcher()]);
  const items = collectFulfilledItems(results);

  logSettledResults(label, variants, results);

  if (items.length > 0) {
    logRedditStatus(`${label} selected`, `${items.length} items before merge`);
    return mergeRedditHotAndNew(items);
  }

  return [];
};

export async function fallbackToOldRedditHtml(): Promise<NewsItem[]> {
  const results = await Promise.allSettled([fetchRedditHot(), fetchRedditNew()]);
  const items = collectFulfilledItems(results);

  if (items.length > 0) {
    logRedditStatus("old.reddit HTML fallback success");
    return mergeRedditHotAndNew(items);
  }

  logSettledResults("old.reddit HTML", ["hot", "new"], results);
  logRedditStatus("old.reddit HTML fallback failed");
  return [];
}

export function fallbackToMockReddit(): NewsItem[] {
  logRedditStatus("reddit mock fallback disabled; keeping only real fetched reddit items");
  return [];
}

export async function fetchRedditSoccer(): Promise<NewsItem[]> {
  try {
    const collectedItems = await collectReddit();
    if (collectedItems.length > 0) return mergeRedditHotAndNew(collectedItems);
  } catch (error) {
    logRedditStatus("axios collector failed", describeFetchFailure(error));
  }

  const localProxyJsonItems = await fetchRedditStage("local proxy JSON", fetchRedditLocalProxyJsonHot, fetchRedditLocalProxyJsonNew);
  if (localProxyJsonItems.length > 0) return localProxyJsonItems;

  logRedditStatus("local proxy JSON failed, maybe Node request still blocked by Reddit");
  const htmlItems = await fallbackToOldRedditHtml();
  return htmlItems.length > 0 ? htmlItems : fallbackToMockReddit();
}

export async function fetchRedditNews(): Promise<NewsItem[]> {
  return fetchRedditSoccer();
}
