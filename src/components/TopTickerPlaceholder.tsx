import { useEffect, useMemo, useState } from "react";
import { allMatches } from "../data/mockWorldCup";
import { readPinnedNewsIds, readStoredNewsItems } from "../news/newsStore";
import { BOTTOM_TICKER_UPDATED_EVENT } from "../news/ticker";
import type { NewsItem } from "../news/types";
import type { AppTheme } from "./ThemeToggle";
import ThemeToggle from "./ThemeToggle";

const RECENT_WINDOW_MS = 6 * 60 * 60 * 1000;
const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "world",
  "cup",
  "世界杯",
  "比赛",
  "官方",
]);

const getItemTime = (item: NewsItem) => {
  const time = new Date(item.publishedAt || item.fetchedAt).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const getTrendingTerm = (items: NewsItem[]) => {
  const counts = new Map<string, number>();
  const recentThreshold = Date.now() - RECENT_WINDOW_MS;

  items
    .filter((item) => getItemTime(item) >= recentThreshold)
    .flatMap((item) => (item.translatedTitle || item.title).match(/[\p{L}\p{N}]{2,}/gu) ?? [])
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token.toLowerCase()))
    .forEach((token) => counts.set(token, (counts.get(token) ?? 0) + 1));

  const [topTerm] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  return topTerm ?? "sampling";
};

const buildStatusItems = () => {
  const pinnedIds = new Set(readPinnedNewsIds());
  const storedItems = readStoredNewsItems();
  const recentThreshold = Date.now() - RECENT_WINDOW_MS;
  const recentItems = storedItems.filter((item) => getItemTime(item) >= recentThreshold);
  const redditItems = recentItems.filter((item) => item.source === "reddit").length;
  const zhibo8Items = recentItems.filter((item) => item.source === "zhibo8").length;
  const xItems = recentItems.filter((item) => item.source === "x").length;
  const pinnedCount = storedItems.filter((item) => pinnedIds.has(item.id)).length;
  const liveCount = allMatches.filter((match) => match.status === "live").length;
  const nextMatch = allMatches.find((match) => match.status !== "finished") ?? allMatches[0];

  return [
    `MATCHDAY ${nextMatch?.date.slice(5) ?? "--"}`,
    `LIVE ${liveCount}`,
    `HOT ${recentItems.length}`,
    `REDDIT ${redditItems}`,
    `ZB8 ${zhibo8Items}`,
    `X ${xItems}`,
    `PIN ${pinnedCount}`,
    `TRENDING: ${getTrendingTerm(storedItems)}`,
  ];
};

type TopTickerPlaceholderProps = {
  onThemeChange: (theme: AppTheme) => void;
  theme: AppTheme;
};

export default function TopTickerPlaceholder({ onThemeChange, theme }: TopTickerPlaceholderProps) {
  const [statusItems, setStatusItems] = useState<string[]>(buildStatusItems);
  const statusCopy = useMemo(() => statusItems.join(" / "), [statusItems]);

  useEffect(() => {
    const refreshTicker = () => setStatusItems(buildStatusItems());

    window.addEventListener(BOTTOM_TICKER_UPDATED_EVENT, refreshTicker);
    window.addEventListener("storage", refreshTicker);

    const intervalId = window.setInterval(refreshTicker, 60_000);

    return () => {
      window.removeEventListener(BOTTOM_TICKER_UPDATED_EVENT, refreshTicker);
      window.removeEventListener("storage", refreshTicker);
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <header className="top-ticker top-live-bar" aria-label="System status ticker">
      <div className="ticker-label top-flash-label">STATUS</div>
      <div className="system-ticker-content" title={statusCopy}>
        {statusItems.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <ThemeToggle onThemeChange={onThemeChange} theme={theme} />
    </header>
  );
}
