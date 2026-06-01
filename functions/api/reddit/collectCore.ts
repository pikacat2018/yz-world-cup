import { XMLParser } from "fast-xml-parser";

export type RedditVariant = "hot" | "new";
export type RedditSourceVariant = RedditVariant | "hot,new";

type RedditPost = {
  created_utc?: number;
  id?: string;
  link_flair_text?: string;
  num_comments?: number;
  permalink?: string;
  score?: number;
  subreddit?: string;
  title?: string;
  url?: string;
  url_overridden_by_dest?: string;
};

export type RedditCollectResult = {
  items: RedditNewsItem[];
  proxy: "configured" | "not_configured";
  source: "atom" | "json";
};

export type RedditNewsItem = {
  category: "football";
  comments: number;
  externalUrl?: string;
  fetchedAt: string;
  id: string;
  pinned: false;
  priority: number;
  publishedAt: string;
  rawCategory: string;
  score: number;
  source: "reddit";
  sourceVariant: RedditSourceVariant;
  title: string;
  url: string;
};

export type RedditJsonPayload = {
  data?: {
    children?: Array<{
      data?: RedditPost;
    }>;
  };
};

export type RedditFetchJson = (url: string) => Promise<RedditJsonPayload>;
export type RedditFetchText = (url: string, headers: Record<string, string>) => Promise<string>;

const normalizePermalink = (permalink: string) => {
  if (!permalink) return "";
  if (/^https?:\/\//i.test(permalink)) return permalink;
  return `https://www.reddit.com${permalink}`;
};

const hashString = (value: string) => {
  let hash = 0;

  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return hash.toString(36);
};

const getPriority = (variant: RedditVariant, flair: string, score = 0, comments = 0) => {
  const basePriority = variant === "hot" ? 85 : 60;
  const heatPriority = score >= 500 || comments >= 100 ? 90 : 0;
  const flairPriority = ["official source", "news", "transfers"].includes(flair.trim().toLowerCase()) ? 75 : 0;

  return Math.max(basePriority, heatPriority, flairPriority);
};

const shouldKeepPost = (title: string, flair = "") => {
  const normalizedTitle = title.trim();
  const normalizedFlair = flair.trim().toLowerCase();
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

  if (!normalizedTitle) return false;
  if (normalizedFlair === "post match thread") return true;
  return !excludedPatterns.some((pattern) => pattern.test(normalizedFlair) || pattern.test(normalizedTitle));
};

const redditListingUrls = (subreddit: string, variant: RedditVariant) => [
  `https://api.reddit.com/r/${subreddit}/${variant}?limit=30&raw_json=1`,
  `https://www.reddit.com/r/${subreddit}/${variant}.json?limit=30&raw_json=1`,
  `https://old.reddit.com/r/${subreddit}/${variant}.json?limit=30&raw_json=1`,
];

const redditAtomUrls = (subreddit: string, variant: RedditVariant) =>
  variant === "new"
    ? [`https://www.reddit.com/r/${subreddit}/new/.rss`, `https://old.reddit.com/r/${subreddit}/new/.rss`]
    : [`https://www.reddit.com/r/${subreddit}/.rss`, `https://old.reddit.com/r/${subreddit}/.rss`];

const mergeRedditVariant = (a: RedditSourceVariant, b: RedditSourceVariant): RedditSourceVariant => {
  const variants = new Set([...a.split(","), ...b.split(",")]);
  return variants.has("hot") && variants.has("new") ? "hot,new" : variants.has("hot") ? "hot" : "new";
};

const mergeRedditItem = (existing: RedditNewsItem, incoming: RedditNewsItem): RedditNewsItem => ({
  ...existing,
  comments: Math.max(existing.comments, incoming.comments),
  externalUrl: existing.externalUrl || incoming.externalUrl,
  fetchedAt: incoming.fetchedAt > existing.fetchedAt ? incoming.fetchedAt : existing.fetchedAt,
  priority: Math.max(existing.priority, incoming.priority),
  rawCategory: existing.rawCategory || incoming.rawCategory,
  score: Math.max(existing.score, incoming.score),
  sourceVariant: mergeRedditVariant(existing.sourceVariant, incoming.sourceVariant),
  title: existing.title || incoming.title,
  url: existing.url || incoming.url,
});

const atomHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) football-monitor/0.1",
  Accept: "application/atom+xml,application/xml,text/xml,*/*",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
};

async function fetchRedditJson(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) football-monitor/1.0",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${response.status} ${response.statusText}${body ? ` ${body.slice(0, 120)}` : ""}`);
  }

  return (await response.json()) as RedditJsonPayload;
}

async function fetchRedditText(url: string, headers: Record<string, string>) {
  const response = await fetch(url, { headers });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${response.status} ${response.statusText}${body ? ` ${body.slice(0, 120)}` : ""}`);
  }

  return response.text();
}

function parseRedditItems(payload: RedditJsonPayload, subreddit: string, variant: RedditVariant) {
  const normalizedSubreddit = subreddit.toLowerCase();

  return (payload.data?.children ?? [])
    .map((child) => child.data)
    .filter((post): post is NonNullable<typeof post> => Boolean(post?.id && post.title))
    .filter((post) => !post.subreddit || post.subreddit.toLowerCase() === normalizedSubreddit)
    .filter((post) => shouldKeepPost(post.title ?? "", post.link_flair_text ?? ""))
    .map((post): RedditNewsItem => {
      const fetchedAt = new Date().toISOString();
      const score = post.score ?? 0;
      const comments = post.num_comments ?? 0;
      const flair = post.link_flair_text ?? "";

      return {
        category: "football",
        comments,
        externalUrl: post.url_overridden_by_dest ?? post.url,
        fetchedAt,
        id: `reddit:${post.id}`,
        pinned: false,
        priority: getPriority(variant, flair, score, comments),
        publishedAt: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : fetchedAt,
        rawCategory: flair,
        score,
        source: "reddit",
        sourceVariant: variant,
        title: post.title ?? "",
        url: normalizePermalink(post.permalink ?? ""),
      };
    });
}

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const getFirst = <T,>(value: T | T[] | undefined): T | undefined => (Array.isArray(value) ? value[0] : value);

function parseAtomItems(payload: string, variant: RedditVariant) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
  const parsed = parser.parse(payload) as {
    feed?: {
      entry?:
        | Array<{
            id?: string;
            title?: string;
            updated?: string;
            link?: { href?: string } | Array<{ href?: string }>;
          }>
        | {
            id?: string;
            title?: string;
            updated?: string;
            link?: { href?: string } | Array<{ href?: string }>;
          };
    };
  };
  const entries = parsed.feed?.entry ? (Array.isArray(parsed.feed.entry) ? parsed.feed.entry : [parsed.feed.entry]) : [];
  const fetchedAt = new Date().toISOString();

  return entries
    .map((entry): RedditNewsItem => {
      const title = stripHtml(String(entry.title ?? ""));
      const link = getFirst(entry.link);
      const url = normalizePermalink(link?.href ?? "");
      const publishedAt = entry.updated && !Number.isNaN(new Date(entry.updated).getTime()) ? new Date(entry.updated).toISOString() : fetchedAt;
      const postId = entry.id?.match(/\/comments\/([^/]+)/i)?.[1] ?? url.match(/\/comments\/([^/]+)/i)?.[1];

      return {
        category: "football",
        comments: 0,
        externalUrl: "",
        fetchedAt,
        id: `reddit:${postId || hashString(`${title}:${url}`)}`,
        pinned: false,
        priority: variant === "hot" ? 85 : 60,
        publishedAt,
        rawCategory: "reddit-atom",
        score: 0,
        source: "reddit",
        sourceVariant: variant,
        title,
        url,
      };
    })
    .filter((item) => Boolean(item.title && item.url && shouldKeepPost(item.title)));
}

async function fetchRedditListing(subreddit: string, variant: RedditVariant, fetchJson: RedditFetchJson) {
  const errors: string[] = [];

  for (const listingUrl of redditListingUrls(subreddit, variant)) {
    try {
      const payload = await fetchJson(listingUrl);
      const items = parseRedditItems(payload, subreddit, variant);
      if (items.length > 0) return items;
      errors.push(`${listingUrl}: 0 parsed items`);
    } catch (error) {
      errors.push(`${listingUrl}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  throw new Error(`reddit ${variant} failed: ${errors.join(" | ")}`);
}

async function fetchRedditAtomListing(subreddit: string, variant: RedditVariant, fetchText: RedditFetchText) {
  const errors: string[] = [];

  for (const listingUrl of redditAtomUrls(subreddit, variant)) {
    try {
      const payload = await fetchText(listingUrl, atomHeaders);
      const items = parseAtomItems(payload, variant);
      if (items.length > 0) return items;
      errors.push(`${listingUrl}: 0 parsed items`);
    } catch (error) {
      errors.push(`${listingUrl}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  throw new Error(`reddit atom ${variant} failed: ${errors.join(" | ")}`);
}

export async function collectRedditForApi(
  subreddit: string,
  variants: RedditVariant[],
  options: { fetchJson?: RedditFetchJson; fetchText?: RedditFetchText; proxy?: RedditCollectResult["proxy"] } = {},
): Promise<RedditCollectResult> {
  const fetchJson = options.fetchJson ?? fetchRedditJson;
  const fetchText = options.fetchText ?? fetchRedditText;
  const jsonResults = await Promise.allSettled(variants.map((variant) => fetchRedditListing(subreddit, variant, fetchJson)));
  const jsonItems = jsonResults.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const source = jsonItems.length > 0 ? "json" : "atom";
  const atomResults =
    jsonItems.length > 0 ? [] : await Promise.allSettled(variants.map((variant) => fetchRedditAtomListing(subreddit, variant, fetchText)));
  const items = jsonItems.length > 0 ? jsonItems : atomResults.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const byId = new Map<string, RedditNewsItem>();
  for (const item of items) {
    const existing = byId.get(item.id);
    byId.set(item.id, existing ? mergeRedditItem(existing, item) : item);
  }
  const merged = [...byId.values()];

  if (merged.length === 0) {
    const rejectedJson = jsonResults.find((result) => result.status === "rejected");
    const rejectedAtom = atomResults.find((result) => result.status === "rejected");
    const reason = rejectedAtom?.status === "rejected" ? rejectedAtom.reason : rejectedJson?.status === "rejected" ? rejectedJson.reason : "reddit request failed";
    throw new Error(String(reason));
  }

  return { items: merged, proxy: options.proxy ?? "not_configured", source };
}
