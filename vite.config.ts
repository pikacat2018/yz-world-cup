import { defineConfig, loadEnv, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import axios, { type AxiosRequestConfig } from "axios";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { XMLParser } from "fast-xml-parser";
import { HttpsProxyAgent } from "https-proxy-agent";

type RedditVariant = "hot" | "new";

type ServerNewsItem = {
  id: string;
  source: "reddit";
  sourceVariant: RedditVariant | "hot,new";
  title: string;
  url?: string;
  externalUrl?: string;
  publishedAt?: string;
  fetchedAt: string;
  pinned: false;
  category: "football";
  rawCategory?: string;
  score?: number;
  comments?: number;
  priority?: number;
};

const DEFAULT_REDDIT_SUBREDDIT = "soccer";
const DEFAULT_REDDIT_PROXY_URL = "http://127.0.0.1:7897";
const REQUEST_TIMEOUT_MS = 25_000;
const RETRY_DELAYS_MS = [0, 800, 1600];
const REDDIT_COLLECT_CACHE_MS = 75_000;
const REDDIT_JSON_FAILURE_COOLDOWN_MS = 5 * 60_000;
let redditJsonBlockedUntil = 0;
let redditCollectCache:
  | {
      timestamp: number;
      cacheKey: string;
      subreddit: string;
      result: { items: ServerNewsItem[]; source: string; proxyUrl: string };
    }
  | null = null;
let redditCollectInFlight: Promise<{ items: ServerNewsItem[]; source: string; proxyUrl: string }> | null = null;

const jsonHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) football-monitor/0.1",
  Accept: "application/json",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
};

const atomHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) football-monitor/0.1",
  Accept: "application/atom+xml,application/xml,text/xml,*/*",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
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

const priorityFlairs = ["official source", "news", "transfers"];

const normalizeProxyUrl = (value?: string) => {
  if (!value) return "";

  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  return /^https?:\/\//i.test(trimmedValue) ? trimmedValue : `http://${trimmedValue}`;
};

const parseWindowsProxyServer = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  const httpsEntry = trimmedValue
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith("https="));

  if (httpsEntry) return normalizeProxyUrl(httpsEntry.slice("https=".length));

  const httpEntry = trimmedValue
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith("http="));

  if (httpEntry) return normalizeProxyUrl(httpEntry.slice("http=".length));

  return normalizeProxyUrl(trimmedValue);
};

const readWindowsSystemProxy = () => {
  if (process.platform !== "win32") return "";

  try {
    const key = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings";
    const proxyEnable = execFileSync("reg", ["query", key, "/v", "ProxyEnable"], { encoding: "utf8" });

    if (!/\b0x1\b/i.test(proxyEnable)) return "";

    const proxyServer = execFileSync("reg", ["query", key, "/v", "ProxyServer"], { encoding: "utf8" });
    const match = proxyServer.match(/ProxyServer\s+REG_SZ\s+(.+)/i);

    return parseWindowsProxyServer(match?.[1] ?? "");
  } catch {
    return "";
  }
};

const getProxyUrl = () =>
  normalizeProxyUrl(process.env.REDDIT_PROXY_URL) ||
  normalizeProxyUrl(process.env.HTTPS_PROXY) ||
  normalizeProxyUrl(process.env.https_proxy) ||
  normalizeProxyUrl(process.env.HTTP_PROXY) ||
  normalizeProxyUrl(process.env.http_proxy) ||
  readWindowsSystemProxy() ||
  DEFAULT_REDDIT_PROXY_URL;

function buildProxyConfig(proxyUrl: string): Pick<AxiosRequestConfig, "proxy"> {
  if (!proxyUrl) return {};

  try {
    const parsed = new URL(proxyUrl);

    return {
      proxy: {
        protocol: parsed.protocol.replace(":", ""),
        host: parsed.hostname,
        port: Number(parsed.port || (parsed.protocol === "https:" ? 443 : 80)),
      },
    };
  } catch {
    console.warn("[reddit] invalid REDDIT_PROXY_URL, trying without proxy", proxyUrl);
    return {};
  }
}

function buildAxiosProxyConfig(proxyUrl: string): Pick<AxiosRequestConfig, "httpAgent" | "httpsAgent" | "proxy"> {
  if (!proxyUrl) return {};

  try {
    const agent = new HttpsProxyAgent(proxyUrl);

    return {
      httpAgent: agent,
      httpsAgent: agent,
      proxy: false,
    };
  } catch {
    return buildProxyConfig(proxyUrl);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const shouldKeepPost = (title: string, flair = "") => {
  const normalizedTitle = title.trim();
  const normalizedFlair = flair.trim().toLowerCase();

  if (!normalizedTitle) return false;
  if (normalizedFlair === "post match thread") return true;
  if (excludedPatterns.some((pattern) => pattern.test(normalizedFlair) || pattern.test(normalizedTitle))) return false;

  return true;
};

const getPriority = (variant: RedditVariant, flair: string, score = 0, comments = 0) => {
  const basePriority = variant === "hot" ? 85 : 60;
  const heatPriority = score >= 500 || comments >= 100 ? 90 : 0;
  const flairPriority = priorityFlairs.includes(flair.trim().toLowerCase()) ? 75 : 0;

  return Math.max(basePriority, heatPriority, flairPriority);
};

const normalizeRedditPermalink = (permalink: string) => {
  if (!permalink) return "";
  if (permalink.startsWith("http")) return permalink;
  return new URL(permalink, "https://www.reddit.com").toString();
};

const extractRedditPostId = (value: string) => {
  const t3Match = value.match(/\bt3_([a-z0-9]+)\b/i);
  if (t3Match) return t3Match[1];

  const urlMatch = value.match(/\/r\/[^/]+\/comments\/([^/]+)/i);
  return urlMatch?.[1] ?? null;
};

const redditJsonUrls = (subreddit: string, variant: RedditVariant) => [
  `https://api.reddit.com/r/${subreddit}/${variant}?limit=50&raw_json=1`,
  `https://www.reddit.com/r/${subreddit}/${variant}.json?limit=50&raw_json=1`,
  `https://old.reddit.com/r/${subreddit}/${variant}.json?limit=50&raw_json=1`,
];

const redditAtomUrls = (subreddit: string, variant: RedditVariant) =>
  variant === "new"
    ? [`https://www.reddit.com/r/${subreddit}/new/.rss`, `https://old.reddit.com/r/${subreddit}/new/.rss`]
    : [`https://www.reddit.com/r/${subreddit}/.rss`, `https://old.reddit.com/r/${subreddit}/.rss`];

const zhibo8HtmlHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) football-monitor/0.1",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
};

const isAllowedZhibo8DetailUrl = (value: string) => {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.hostname === "news.zhibo8.com" &&
      /^\/zuqiu\/20\d{2}-\d{2}-\d{2}\/[^/]+\.htm$/i.test(url.pathname)
    );
  } catch {
    return false;
  }
};

const readLocalEnvFile = (root: string) => {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return {};

  return readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .reduce<Record<string, string>>((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return env;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) return env;

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      env[key] = value;
      return env;
    }, {});
};

const fetchTextWithRetry = async (
  url: string,
  headers: Record<string, string>,
  proxyUrl: string,
  label: string,
  retryDelays = RETRY_DELAYS_MS,
) => {
  let lastError = "";

  for (const [index, delay] of retryDelays.entries()) {
    if (delay) await sleep(delay);

    try {
      console.info(`[reddit] trying ${label}: ${url}`);
      const response = await axios.get<string>(url, {
        ...buildAxiosProxyConfig(proxyUrl),
        headers,
        responseType: "text",
        timeout: REQUEST_TIMEOUT_MS,
        transformResponse: [(data) => data],
        validateStatus: () => true,
      });

      if (response.status >= 200 && response.status < 300) return response.data;

      lastError =
        response.status === 403
          ? "403 Forbidden"
          : response.status === 429
            ? "429 Too Many Requests"
            : `HTTP ${response.status}`;
      console.warn(`[reddit] ${label} failed: ${lastError} attempt=${index + 1}`);

      if (response.status === 403 || response.status === 429) break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "unknown request error";
      console.warn(`[reddit] ${label} failed: ${lastError} attempt=${index + 1}`);
    }
  }

  throw new Error(lastError || `${label} failed`);
};

const parseJsonItems = (payload: string, variant: RedditVariant, subreddit: string): ServerNewsItem[] => {
  const parsed = JSON.parse(payload) as {
    data?: {
      children?: Array<{
        data?: {
          id?: string;
          title?: string;
          author?: string;
          selftext?: string;
          permalink?: string;
          created_utc?: number;
          score?: number;
          ups?: number;
          num_comments?: number;
          link_flair_text?: string;
          url?: string;
          stickied?: boolean;
          over_18?: boolean;
          subreddit?: string;
        };
      }>;
    };
  };
  const fetchedAt = new Date().toISOString();

  return (parsed.data?.children ?? [])
    .map((child) => child.data)
    .filter((data): data is NonNullable<typeof data> => Boolean(data))
    .filter((data) => data.subreddit?.toLowerCase() === subreddit.toLowerCase() || !data.subreddit)
    .filter((data) => !data.stickied && !data.over_18 && shouldKeepPost(data.title ?? "", data.link_flair_text ?? ""))
    .map((data) => {
      const postId = data.id || extractRedditPostId(data.permalink ?? "") || extractRedditPostId(data.url ?? "");
      const score = data.score ?? data.ups ?? 0;
      const comments = data.num_comments ?? 0;
      const rawCategory = data.link_flair_text ?? "";

      return {
        id: `reddit:${postId || Buffer.from(`${data.title ?? ""}:${data.url ?? ""}`).toString("base64url").slice(0, 16)}`,
        source: "reddit" as const,
        sourceVariant: variant,
        title: data.title ?? "",
        url: normalizeRedditPermalink(data.permalink ?? ""),
        externalUrl: data.url ?? "",
        publishedAt: data.created_utc ? new Date(data.created_utc * 1000).toISOString() : fetchedAt,
        fetchedAt,
        pinned: false as const,
        category: "football" as const,
        rawCategory,
        score,
        comments,
        priority: getPriority(variant, rawCategory, score, comments),
      };
    })
    .filter((item) => Boolean(item.title && item.url));
};

const getFirst = <T,>(value: T | T[] | undefined): T | undefined => (Array.isArray(value) ? value[0] : value);

const parseAtomItems = (payload: string, variant: RedditVariant): ServerNewsItem[] => {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
  const parsed = parser.parse(payload) as {
    feed?: {
      entry?: Array<{
        id?: string;
        title?: string;
        updated?: string;
        content?: string;
        author?: { name?: string };
        link?: { href?: string } | Array<{ href?: string }>;
      }> | {
        id?: string;
        title?: string;
        updated?: string;
        content?: string;
        author?: { name?: string };
        link?: { href?: string } | Array<{ href?: string }>;
      };
    };
  };
  const entries = parsed.feed?.entry ? (Array.isArray(parsed.feed.entry) ? parsed.feed.entry : [parsed.feed.entry]) : [];
  const fetchedAt = new Date().toISOString();

  return entries
    .map((entry) => {
      const title = stripHtml(String(entry.title ?? ""));
      const link = getFirst(entry.link);
      const url = normalizeRedditPermalink(link?.href ?? "");
      const postId = extractRedditPostId(entry.id ?? "") || extractRedditPostId(url);
      const publishedAt = entry.updated && !Number.isNaN(new Date(entry.updated).getTime()) ? new Date(entry.updated).toISOString() : fetchedAt;

      return {
        id: `reddit:${postId || Buffer.from(`${title}:${url}`).toString("base64url").slice(0, 16)}`,
        source: "reddit" as const,
        sourceVariant: variant,
        title,
        url,
        externalUrl: "",
        publishedAt,
        fetchedAt,
        pinned: false as const,
        category: "football" as const,
        rawCategory: "reddit-atom",
        score: 0,
        comments: 0,
        priority: variant === "hot" ? 85 : 60,
      };
    })
    .filter((item) => Boolean(item.title && item.url && shouldKeepPost(item.title)));
};

const mergeRedditItems = (items: ServerNewsItem[]) => {
  const byId = new Map<string, ServerNewsItem>();

  for (const item of items) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      continue;
    }

    const hasHot = existing.sourceVariant.includes("hot") || item.sourceVariant.includes("hot");
    const hasNew = existing.sourceVariant.includes("new") || item.sourceVariant.includes("new");
    const sourceVariant = hasHot && hasNew ? "hot,new" : hasHot ? "hot" : "new";

    byId.set(item.id, {
      ...existing,
      sourceVariant,
      score: Math.max(existing.score ?? 0, item.score ?? 0),
      comments: Math.max(existing.comments ?? 0, item.comments ?? 0),
      priority: sourceVariant === "hot,new" ? 95 : Math.max(existing.priority ?? 0, item.priority ?? 0),
      fetchedAt: item.fetchedAt > existing.fetchedAt ? item.fetchedAt : existing.fetchedAt,
    });
  }

  return Array.from(byId.values());
};

async function collectReddit(
  subreddit = DEFAULT_REDDIT_SUBREDDIT,
  options: { proxyUrl?: string | null; forceRefresh?: boolean; variants?: RedditVariant[] } = {},
) {
  const now = Date.now();
  const cacheKey = `${subreddit}:${options.variants?.join(",") || "new,hot"}`;
  if (
    !options.forceRefresh &&
    redditCollectCache &&
    redditCollectCache.cacheKey === cacheKey &&
    redditCollectCache.subreddit === subreddit &&
    now - redditCollectCache.timestamp < REDDIT_COLLECT_CACHE_MS
  ) {
    console.info(`[reddit] using cached collect result: ${redditCollectCache.result.items.length} items`);
    return redditCollectCache.result;
  }

  if (!options.forceRefresh && redditCollectInFlight) {
    console.info("[reddit] joining in-flight collect request");
    return redditCollectInFlight;
  }

  redditCollectInFlight = collectRedditUncached(subreddit, options)
    .then((result) => {
      if (result.items.length > 0) {
        redditCollectCache = { timestamp: Date.now(), cacheKey, subreddit, result };
      }

      return result;
    })
    .finally(() => {
      redditCollectInFlight = null;
    });

  return redditCollectInFlight;
}

async function collectRedditUncached(
  subreddit = DEFAULT_REDDIT_SUBREDDIT,
  options: { proxyUrl?: string | null; variants?: RedditVariant[] } = {},
) {
  const proxyUrl = normalizeProxyUrl(options.proxyUrl ?? undefined) || getProxyUrl();
  const variants: RedditVariant[] = options.variants?.length ? options.variants : ["new", "hot"];
  const jsonItems: ServerNewsItem[] = [];

  if (Date.now() < redditJsonBlockedUntil) {
    console.info("[reddit] json skipped: recent JSON failures, using atom/rss first");
  } else {
    for (const variant of variants) {
      for (const url of redditJsonUrls(subreddit, variant)) {
        try {
          const payload = await fetchTextWithRetry(url, jsonHeaders, proxyUrl, "json", [0]);
          const items = parseJsonItems(payload, variant, subreddit);
          console.info(`[reddit] json success: ${items.length}`);
          if (items.length > 0) {
            jsonItems.push(...items);
            break;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "unknown json error";
          console.warn(`[reddit] json failed: ${message}`);
          if (message.includes("403")) console.warn("[reddit] json rejected with 403, fallback to atom/rss");
        }
      }
    }
  }

  if (jsonItems.length > 0) return { items: mergeRedditItems(jsonItems), source: "json", proxyUrl };
  redditJsonBlockedUntil = Date.now() + REDDIT_JSON_FAILURE_COOLDOWN_MS;

  const atomItems: ServerNewsItem[] = [];

  for (const variant of variants) {
    for (const url of redditAtomUrls(subreddit, variant)) {
      try {
        const payload = await fetchTextWithRetry(url, atomHeaders, proxyUrl, "atom");
        const items = parseAtomItems(payload, variant);
        console.info(`[reddit] atom success: ${items.length}`);
        if (items.length > 0) {
          atomItems.push(...items);
          break;
        }
      } catch (error) {
        console.warn(`[reddit] atom failed: ${error instanceof Error ? error.message : "unknown atom error"}`);
      }
    }
  }

  if (atomItems.length > 0) {
    console.info("[reddit] atom fallback success");
    return { items: mergeRedditItems(atomItems), source: "atom", proxyUrl };
  }

  console.info("[reddit] using mock fallback");
  return { items: [], source: "mock", proxyUrl };
}

const redditProxyPlugin = () => ({
  name: "reddit-axios-proxy",
  configureServer(server: ViteDevServer) {
    server.middlewares.use("/api/reddit/collect", async (request, response) => {
      const url = new URL(request.url ?? "", "http://localhost");
      const subreddit = url.searchParams.get("subreddit") || process.env.REDDIT_SUBREDDIT || DEFAULT_REDDIT_SUBREDDIT;
      const forceRefresh = ["1", "true", "yes"].includes((url.searchParams.get("force") ?? "").toLowerCase());
      const requestedVariant = url.searchParams.get("variant");
      const variants: RedditVariant[] =
        requestedVariant === "hot" || requestedVariant === "new" ? [requestedVariant] : ["new", "hot"];

      try {
        const result = await collectReddit(subreddit, { forceRefresh, proxyUrl: process.env.REDDIT_PROXY_URL, variants });

        response.setHeader("Content-Type", "application/json");
        response.statusCode = 200;
        response.end(JSON.stringify({ ...result, proxy: result.proxyUrl ? "configured" : "not_configured" }));
      } catch (error) {
        response.setHeader("Content-Type", "application/problem+json");
        response.statusCode = 502;
        response.end(
          JSON.stringify({
            error: "reddit_collect_failed",
            reason: error instanceof Error ? error.message : "unknown reddit collect error",
          }),
        );
      }
    });
    server.middlewares.use("/api/zhibo8/detail", async (request, response) => {
      const url = new URL(request.url ?? "", "http://localhost");
      const detailUrl = url.searchParams.get("url") ?? "";

      if (!isAllowedZhibo8DetailUrl(detailUrl)) {
        response.statusCode = 400;
        response.setHeader("Content-Type", "application/problem+json");
        response.end(JSON.stringify({ error: "invalid_zhibo8_detail_url" }));
        return;
      }

      try {
        const result = await axios.get<string>(detailUrl, {
          headers: zhibo8HtmlHeaders,
          responseType: "text",
          timeout: REQUEST_TIMEOUT_MS,
        });

        response.statusCode = 200;
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.end(result.data);
      } catch (error) {
        response.statusCode = 502;
        response.setHeader("Content-Type", "application/problem+json");
        response.end(
          JSON.stringify({
            error: "zhibo8_detail_failed",
            reason: error instanceof Error ? error.message : "unknown zhibo8 detail error",
          }),
        );
      }
    });
  },
});

export default defineConfig(({ mode }) => {
  const root = process.cwd();
  Object.assign(process.env, loadEnv(mode, root, ""), readLocalEnvFile(root));

  return {
    plugins: [react(), redditProxyPlugin()],
  };
});
