import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { allMatches, getTeam, type Match } from "../data/mockWorldCup";
import { FOLLOW_UP_UPDATED_EVENT, getLocalDateKey, readFollowUpItems, type FollowUpItem } from "../news/followUpStore";
import { readStoredNewsItems } from "../news/newsStore";
import { BOTTOM_TICKER_UPDATED_EVENT } from "../news/ticker";
import type { AppTheme } from "./ThemeToggle";
import ThemeToggle from "./ThemeToggle";

type TopTickerItem = {
  id: string;
  label: string;
  text: string;
  url?: string;
};

const getMatchDateKey = (match: Match) => match.date.slice(0, 10);

const getMatchSideLabel = (match: Match, side: "home" | "away") => {
  const teamId = side === "home" ? match.homeTeamId : match.awayTeamId;
  const fallback = side === "home" ? match.homeLabel : match.awayLabel;
  return teamId ? getTeam(teamId).name : (fallback ?? "待定");
};

const formatFinishedMatch = (match: Match) => {
  const home = getMatchSideLabel(match, "home");
  const away = getMatchSideLabel(match, "away");
  return `${home} ${match.score ?? "完赛"} ${away}`;
};

const getFollowUpUrl = (item: FollowUpItem, newsUrlById: Map<string, string>) =>
  item.externalUrl ?? item.url ?? (item.sourceNewsId ? newsUrlById.get(item.sourceNewsId) : undefined);

const buildTopTickerItems = (): TopTickerItem[] => {
  const today = getLocalDateKey();
  const newsUrlById = new Map(
    readStoredNewsItems()
      .map((item) => [item.id, item.externalUrl ?? item.url] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
  );
  const matchItems: TopTickerItem[] = allMatches
    .filter((match) => match.status === "finished" && getMatchDateKey(match) === today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.matchNo - b.matchNo)
    .map((match) => ({
      id: `match-${match.id}`,
      label: "赛果",
      text: formatFinishedMatch(match),
    }));

  const followUpItems: TopTickerItem[] = readFollowUpItems()
    .filter((item) => item.date === today && item.status === "active")
    .map((item) => ({
      id: `follow-${item.id}`,
      label: "跟进",
      text: item.title,
      url: getFollowUpUrl(item, newsUrlById),
    }));

  return [
    ...(matchItems.length > 0 ? matchItems : [{ id: "match-empty", label: "赛果", text: "今日暂无已完赛" }]),
    ...(followUpItems.length > 0 ? followUpItems : [{ id: "follow-empty", label: "跟进", text: "今日暂无跟进" }]),
  ];
};

type TopTickerPlaceholderProps = {
  onThemeChange: (theme: AppTheme) => void;
  theme: AppTheme;
};

export default function TopTickerPlaceholder({ onThemeChange, theme }: TopTickerPlaceholderProps) {
  const [tickerItems, setTickerItems] = useState<TopTickerItem[]>(buildTopTickerItems);
  const statusCopy = useMemo(() => tickerItems.map((item) => `${item.label}: ${item.text}`).join(" / "), [tickerItems]);
  const animationDuration = useMemo(() => {
    const textLength = tickerItems.reduce((total, item) => total + item.text.length, 0);
    return `${Math.max(36, Math.min(112, textLength * 0.135))}s`;
  }, [tickerItems]);

  useEffect(() => {
    const refreshTicker = () => setTickerItems(buildTopTickerItems());

    window.addEventListener(BOTTOM_TICKER_UPDATED_EVENT, refreshTicker);
    window.addEventListener(FOLLOW_UP_UPDATED_EVENT, refreshTicker);
    window.addEventListener("storage", refreshTicker);

    const intervalId = window.setInterval(refreshTicker, 60_000);

    return () => {
      window.removeEventListener(BOTTOM_TICKER_UPDATED_EVENT, refreshTicker);
      window.removeEventListener(FOLLOW_UP_UPDATED_EVENT, refreshTicker);
      window.removeEventListener("storage", refreshTicker);
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <header className="top-ticker top-live-bar" aria-label="System status ticker">
      <div className="ticker-label top-flash-label">英足滚动</div>
      <div className="system-ticker-content" style={{ "--top-ticker-duration": animationDuration } as CSSProperties} title={statusCopy}>
        <div className="system-ticker-track">
          <TopTickerContent items={tickerItems} />
          <TopTickerContent isDuplicate items={tickerItems} />
          <TopTickerContent isDuplicate items={tickerItems} />
        </div>
      </div>
      <ThemeToggle onThemeChange={onThemeChange} theme={theme} />
    </header>
  );
}

type TopTickerContentProps = {
  isDuplicate?: boolean;
  items: TopTickerItem[];
};

function TopTickerContent({ isDuplicate = false, items }: TopTickerContentProps) {
  return (
    <div className="system-ticker-group" aria-hidden={isDuplicate || undefined}>
      {items.map((item) => {
        const copy = (
          <>
            <span className="system-ticker-text">{item.text}</span>
          </>
        );

        return item.url ? (
          <a
            className="system-ticker-item"
            href={item.url}
            key={item.id}
            rel="noopener noreferrer"
            tabIndex={isDuplicate ? -1 : undefined}
            target="_blank"
          >
            {copy}
          </a>
        ) : (
          <span className="system-ticker-item" key={item.id}>
            {copy}
          </span>
        );
      })}
    </div>
  );
}
