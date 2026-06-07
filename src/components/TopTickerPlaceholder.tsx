import { type CSSProperties, type Ref, useEffect, useMemo, useRef, useState } from "react";
import { allMatches, getTeam, type Match } from "../data/mockWorldCup";
import { FOLLOW_UP_UPDATED_EVENT, getLocalDateKey, readFollowUpItems, type FollowUpItem } from "../news/followUpStore";
import { readStoredNewsItems } from "../news/newsStore";
import { BOTTOM_TICKER_UPDATED_EVENT } from "../news/ticker";
import type { AppTheme } from "./ThemeToggle";
import ThemeToggle from "./ThemeToggle";

const TOP_TICKER_FALLBACK_DURATION = "180s";
const TOP_TICKER_SPEED_PX_PER_SECOND = 100;

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
  isColumnSettingsOpen: boolean;
  onToggleColumnSettings: () => void;
  onThemeChange: (theme: AppTheme) => void;
  theme: AppTheme;
};

export default function TopTickerPlaceholder({
  isColumnSettingsOpen,
  onToggleColumnSettings,
  onThemeChange,
  theme,
}: TopTickerPlaceholderProps) {
  const [tickerItems, setTickerItems] = useState<TopTickerItem[]>(buildTopTickerItems);
  const tickerContentRef = useRef<HTMLDivElement>(null);
  const [animationDuration, setAnimationDuration] = useState(TOP_TICKER_FALLBACK_DURATION);
  const statusCopy = useMemo(() => tickerItems.map((item) => `${item.label}: ${item.text}`).join(" / "), [tickerItems]);

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

  useEffect(() => {
    const updateDuration = () => {
      const width = tickerContentRef.current?.scrollWidth ?? 0;
      if (width > 0) setAnimationDuration(`${(width / TOP_TICKER_SPEED_PX_PER_SECOND).toFixed(2)}s`);
    };

    updateDuration();

    const tickerContent = tickerContentRef.current;
    const resizeObserver =
      tickerContent && typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateDuration) : undefined;

    if (tickerContent) resizeObserver?.observe(tickerContent);
    window.addEventListener("resize", updateDuration);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateDuration);
    };
  }, [tickerItems]);

  return (
    <header className="top-ticker top-live-bar" aria-label="System status ticker">
      <div className="ticker-label top-flash-label">英足滚动</div>
      <div className="system-ticker-content" style={{ "--top-ticker-duration": animationDuration } as CSSProperties} title={statusCopy}>
        <div className="system-ticker-track">
          <TopTickerContent contentRef={tickerContentRef} items={tickerItems} />
          <TopTickerContent isDuplicate items={tickerItems} />
          <TopTickerContent isDuplicate items={tickerItems} />
        </div>
      </div>
      <div className="top-bar-controls">
        <button
          aria-expanded={isColumnSettingsOpen}
          aria-label={isColumnSettingsOpen ? "收起栏目顺序" : "打开栏目顺序"}
          className="desktop-column-layout-toggle top-bar-layout-toggle"
          onClick={onToggleColumnSettings}
          title={isColumnSettingsOpen ? "收起栏目顺序" : "栏目顺序"}
          type="button"
        >
          <span>序</span>
        </button>
        <ThemeToggle onThemeChange={onThemeChange} theme={theme} />
      </div>
    </header>
  );
}

type TopTickerContentProps = {
  contentRef?: Ref<HTMLDivElement>;
  isDuplicate?: boolean;
  items: TopTickerItem[];
};

function TopTickerContent({ contentRef, isDuplicate = false, items }: TopTickerContentProps) {
  return (
    <div className="system-ticker-group" aria-hidden={isDuplicate || undefined} ref={contentRef}>
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
