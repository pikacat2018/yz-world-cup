import type { NewsItem } from "../types";
import { isZhibo8FootballByUrl } from "../footballFilter";

const ZHIBO8_NEWS_URL = "https://m.zhibo8.com/news.htm";
const ZHIBO8_BASE_URL = "https://m.zhibo8.com";
const ZHIBO8_WEB_NEWS_BASE_URL = "https://news.zhibo8.com";
const ZHIBO8_LATEST_NEWS_LIMIT = 60;
const ZHIBO8_DETAIL_TIME_CONCURRENCY = 8;

export function normalizeZhibo8Url(href: string): string {
  const trimmedHref = href.trim();

  if (!trimmedHref || trimmedHref.startsWith("javascript:")) return "";
  if (trimmedHref.startsWith("http")) return trimmedHref;

  try {
    return new URL(trimmedHref, ZHIBO8_BASE_URL).toString();
  } catch {
    return "";
  }
}

export function toZhibo8WebUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/^\/news\/web\/zuqiu\/(.+)$/);

    if (!match) return "";

    return `${ZHIBO8_WEB_NEWS_BASE_URL}/zuqiu/${match[1]}`;
  } catch {
    return "";
  }
}

const createNewsId = (source: NewsItem["source"], title: string, url?: string) => {
  const key = `${source}:${title}:${url ?? ""}`;
  let hash = 0;

  for (const char of key) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return `${source}-${hash.toString(36)}`;
};

const parsePublishedAtFromUrl = (url: string) => {
  const match = url.match(/(?:^|\/)(20\d{2})[-/]?(\d{2})[-/]?(\d{2})(?:\/|$)/);
  if (!match) return "";

  const [, year, month, day] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00`);

  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

const parseChineseLocalTime = (value: string, fetchedAt: string) => {
  const normalized = value.trim().replace(/[/.]/g, "-").replace(/\s+/, "T");
  const date = new Date(`${normalized}+08:00`);

  return Number.isNaN(date.getTime()) ? fetchedAt : date.toISOString();
};

const parsePublishedAt = (text: string, fetchedAt: string, url = "") => {
  const fullDateMatch = text.match(/20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\s+\d{1,2}:\d{2}/);
  const shortDateMatch = text.match(/\b\d{1,2}[-/.]\d{1,2}\s+\d{1,2}:\d{2}\b/);
  const relativeMinuteMatch = text.match(/(\d+)\s*分钟/);
  const relativeHourMatch = text.match(/(\d+)\s*小时/);
  const urlDate = parsePublishedAtFromUrl(url);
  const toRelativeIso = (amount: number, unitMs: number) => {
    const fetchedTime = new Date(fetchedAt).getTime();

    return Number.isNaN(fetchedTime) ? fetchedAt : new Date(fetchedTime - amount * unitMs).toISOString();
  };

  if (fullDateMatch) {
    return parseChineseLocalTime(fullDateMatch[0], fetchedAt);
  }

  if (shortDateMatch) {
    const year = new Date(fetchedAt).getFullYear();
    return parseChineseLocalTime(`${year}-${shortDateMatch[0]}`, fetchedAt);
  }

  if (relativeMinuteMatch) return toRelativeIso(Number(relativeMinuteMatch[1]), 60 * 1000);
  if (relativeHourMatch) return toRelativeIso(Number(relativeHourMatch[1]), 60 * 60 * 1000);
  if (text.includes("刚刚")) return fetchedAt;
  if (urlDate) return urlDate;

  return fetchedAt;
};

const parseDetailPublishedAt = (html: string, fetchedAt: string) => {
  const text = new DOMParser().parseFromString(html, "text/html").body.textContent ?? html;
  const fullDateMatch = text.match(/20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?/);

  return fullDateMatch ? parseChineseLocalTime(fullDateMatch[0], fetchedAt) : "";
};

const isDateOnlyTimestamp = (value: string) => {
  const date = new Date(value);

  return !Number.isNaN(date.getTime()) && date.getUTCHours() === 16 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
};

const fetchZhibo8DetailPublishedAt = async (url: string, fetchedAt: string) => {
  try {
    const response = await fetch(`/api/zhibo8/detail?url=${encodeURIComponent(url)}`);

    if (response.ok) return parseDetailPublishedAt(await response.text(), fetchedAt);
  } catch {}

  try {
    const response = await fetch(url, {
      headers: {
        accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) return "";

    return parseDetailPublishedAt(await response.text(), fetchedAt);
  } catch {
    return "";
  }
};

const applyDetailPublishedTimes = async (items: NewsItem[]) => {
  const nextItems = [...items];
  let cursor = 0;

  const worker = async () => {
    while (cursor < nextItems.length) {
      const index = cursor;
      cursor += 1;

      const item = nextItems[index];
      if (!item.url || !item.publishedAt || !isDateOnlyTimestamp(item.publishedAt)) continue;

      const detailPublishedAt = await fetchZhibo8DetailPublishedAt(item.url, item.fetchedAt);
      if (!detailPublishedAt) continue;

      nextItems[index] = {
        ...item,
        publishedAt: detailPublishedAt,
      };
    }
  };

  await Promise.all(Array.from({ length: Math.min(ZHIBO8_DETAIL_TIME_CONCURRENCY, nextItems.length) }, worker));
  return nextItems;
};

const getLatestNewsLinks = (document: Document) => {
  const latestSection = document.querySelector("#news_new");

  if (!latestSection) {
    throw new Error("zhibo8 latest section not found");
  }

  return Array.from(latestSection.querySelectorAll("li.lite"));
};

export async function fetchZhibo8News(): Promise<NewsItem[]> {
  const response = await fetch(ZHIBO8_NEWS_URL, { mode: "cors" });

  if (!response.ok) {
    throw new Error(`zhibo8 request failed: ${response.status}`);
  }

  const html = await response.text();
  const document = new DOMParser().parseFromString(html, "text/html");
  const latestRows = getLatestNewsLinks(document);
  const fetchedAt = new Date().toISOString();

  const items: NewsItem[] = [];

  for (const row of latestRows) {
    const link = row.querySelector("h2 a") ?? row.querySelector("a[href]");
    if (!link) continue;

    const type = row.getAttribute("type") ?? "";
    const title = link.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const href = link.getAttribute("href") ?? "";
    const url = normalizeZhibo8Url(href) || undefined;
    const surroundingText = row.textContent?.replace(/\s+/g, " ").trim() ?? title;

    if (title.length >= 8) {
      if (!url) continue;
      if (type !== "zuqiu" && !url.includes("/news/web/zuqiu/")) continue;

      const webUrl = toZhibo8WebUrl(url);
      if (!webUrl || !isZhibo8FootballByUrl(webUrl)) continue;
      const publishedAt = parsePublishedAt(surroundingText, fetchedAt, webUrl);

      items.push({
        id: createNewsId("zhibo8", title, webUrl),
        source: "zhibo8",
        title,
        url: webUrl,
        publishedAt,
        fetchedAt,
        category: "football",
        rawCategory: "足球资讯",
        feedSection: "latest",
        sourcePinned: false,
        pinned: false,
      });
    }
  }

  return applyDetailPublishedTimes(items.slice(0, ZHIBO8_LATEST_NEWS_LIMIT));
}
