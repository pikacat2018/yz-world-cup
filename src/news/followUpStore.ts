import type { NewsItem, NewsSource, RedditSourceVariant } from "./types";
import { isApplyingSharedState, queueSharedStateSave } from "../shared/onlineState";

export type FollowUpItemType = "news" | "manual";
export type FollowUpStatus = "active" | "done";

export type FollowUpItem = {
  id: string;
  date: string;
  title: string;
  parentId?: string;
  sourceNewsId?: string;
  source?: NewsSource;
  sourceVariant?: RedditSourceVariant;
  url?: string;
  externalUrl?: string;
  note?: string;
  type: FollowUpItemType;
  status: FollowUpStatus;
  createdAt: string;
  updatedAt: string;
};

export const FOLLOW_UP_STORAGE_KEY = "yz-world-cup-follow-up-items-v1";
export const FOLLOW_UP_UPDATED_EVENT = "yz-world-cup-follow-up-updated";

const MAX_FOLLOW_UP_ITEMS = 5_000;

const pad = (value: number) => String(value).padStart(2, "0");

export function getLocalDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(dateKey: string, offset: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  date.setDate(date.getDate() + offset);
  return getLocalDateKey(date);
}

export function formatDateLabel(dateKey: string) {
  const [, month = "", day = ""] = dateKey.split("-");
  return `${month}-${day}`;
}

const isFollowUpStatus = (value: unknown): value is FollowUpStatus => value === "active" || value === "done";

const isFollowUpType = (value: unknown): value is FollowUpItemType => value === "news" || value === "manual";

const isFollowUpItem = (value: unknown): value is FollowUpItem => {
  if (!value || typeof value !== "object") return false;

  const item = value as Partial<FollowUpItem>;
  return (
    typeof item.id === "string" &&
    typeof item.date === "string" &&
    typeof item.title === "string" &&
    isFollowUpType(item.type) &&
    isFollowUpStatus(item.status) &&
    typeof item.createdAt === "string" &&
    typeof item.updatedAt === "string"
  );
};

const getSortTime = (item: FollowUpItem) => {
  const time = new Date(item.createdAt).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const sortFollowUpItems = (items: FollowUpItem[]) =>
  items
    .map((item, index) => ({ index, item }))
    .sort((a, b) => a.item.date.localeCompare(b.item.date) || getSortTime(a.item) - getSortTime(b.item) || a.index - b.index)
    .map(({ item }) => item);

export function readFollowUpItems(): FollowUpItem[] {
  try {
    const raw = window.localStorage.getItem(FOLLOW_UP_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed) ? sortFollowUpItems(parsed.filter(isFollowUpItem)).slice(0, MAX_FOLLOW_UP_ITEMS) : [];
  } catch {
    return [];
  }
}

export function saveFollowUpItems(items: FollowUpItem[]) {
  const nextItems = sortFollowUpItems(items).slice(0, MAX_FOLLOW_UP_ITEMS);

  window.localStorage.setItem(FOLLOW_UP_STORAGE_KEY, JSON.stringify(nextItems));
  if (!isApplyingSharedState()) queueSharedStateSave("follow_up_items", nextItems);
}

export function notifyFollowUpUpdated() {
  window.dispatchEvent(new Event(FOLLOW_UP_UPDATED_EVENT));
}

export function createFollowUpFromNews(newsItem: NewsItem, date: string): FollowUpItem {
  const now = new Date().toISOString();

  return {
    id: `follow-news-${newsItem.id}`,
    date,
    title: newsItem.translatedTitle || newsItem.title,
    sourceNewsId: newsItem.id,
    source: newsItem.source,
    sourceVariant: newsItem.sourceVariant,
    url: newsItem.url,
    externalUrl: newsItem.externalUrl,
    type: "news",
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

export function createManualFollowUp(title: string, date: string, url?: string): FollowUpItem {
  const now = new Date().toISOString();
  const normalizedUrl = url?.trim();

  return {
    id: `follow-manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date,
    title,
    url: normalizedUrl || undefined,
    type: "manual",
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

export function mergePinnedNewsIntoFollowUps(
  followUps: FollowUpItem[],
  newsItems: NewsItem[],
  targetDate: string,
): {
  items: FollowUpItem[];
  addedCount: number;
} {
  const existingNewsIds = new Set(followUps.map((item) => item.sourceNewsId).filter(Boolean));
  const incoming = newsItems
    .filter((item) => item.pinned && !existingNewsIds.has(item.id))
    .map((item) => createFollowUpFromNews(item, targetDate));

  return {
    addedCount: incoming.length,
    items: incoming.length > 0 ? sortFollowUpItems([...followUps, ...incoming]) : followUps,
  };
}
