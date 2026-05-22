import { type CSSProperties, type UIEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchLatestNews,
  loadNewsFeed,
  markRedditHotSeen,
  markNewsIdRead,
  MAX_PINNED_NEWS,
  mergeNewsItems,
  NEWS_FEED_CONFIG,
  readStoredNewsItems,
  saveNewsItems,
  savePinnedNewsIds,
} from "../news/newsStore";
import { RECENT_KEYWORD_SEARCH_EVENT, type RecentKeywordSearchDetail } from "../news/recentKeywords";
import { sourceColors } from "../news/sourceColors";
import { BOTTOM_TICKER_UPDATED_EVENT, notifyBottomTickerUpdated } from "../news/ticker";
import type { NewsItem } from "../news/types";

const AUTO_SYNC_INTERVAL_MS = 90_000;
const MANUAL_COOLDOWN_MS = 30_000;
const LOAD_MORE_THRESHOLD_PX = 80;
const LOAD_MORE_DELAY_MS = 120;

type FetchStatus = "idle" | "fetching" | "added" | "empty" | "failed";

const normalizeSearchText = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

const getSearchText = (item: NewsItem) =>
  [item.title, item.translatedTitle, item.rawCategory, item.source, item.sourceVariant, item.url, item.externalUrl]
    .filter(Boolean)
    .join(" ");

const splitNews = (items: NewsItem[]) => ({
  normal: items.filter((item) => !item.feedSection || item.feedSection === "latest"),
  pinned: items.filter((item) => item.pinned).slice(0, MAX_PINNED_NEWS),
});

const formatNewsTime = (item: NewsItem) => {
  const date = new Date(item.publishedAt || item.fetchedAt);
  if (Number.isNaN(date.getTime())) return "--:-- --";

  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
};

function RefreshIcon() {
  return (
    <svg aria-hidden="true" className="news-refresh-icon" viewBox="0 0 24 24">
      <path d="M4.5 8.5A7.5 7.5 0 1 1 6.7 17" />
      <path d="M4.5 8.5V3.8" />
      <path d="M4.5 8.5H9.2" />
    </svg>
  );
}

type NewsRowProps = {
  item: NewsItem;
  isUnreadNew: boolean;
  onMarkRead: (item: NewsItem) => void;
  onTogglePinned: (item: NewsItem) => void;
};

function NewsRow({ isUnreadNew, item, onMarkRead, onTogglePinned }: NewsRowProps) {
  const displayTitle = item.translatedTitle || item.title;
  const variantLabel = item.source === "reddit" && item.sourceVariant?.includes("hot") ? "热" : "";
  const title = item.url ? (
    <a
      className="news-title"
      href={item.url}
      onClick={() => onMarkRead(item)}
      rel="noopener noreferrer"
      target="_blank"
      title={item.translatedTitle ? item.title : undefined}
    >
      {displayTitle}
    </a>
  ) : (
    <span className="news-title" title={item.translatedTitle ? item.title : undefined}>
      {displayTitle}
    </span>
  );

  return (
    <li className={`news-row ${isUnreadNew ? "unread-new" : ""} ${item.pinned ? "pinned" : ""}`}>
      <span
        aria-label={item.source}
        className="news-source-dot"
        style={{ "--source-color": sourceColors[item.source] } as CSSProperties}
      />
      <span className="news-title-cell">
        {variantLabel && <span className={`news-variant-badge ${variantLabel === "热" ? "hot" : "new"}`}>[{variantLabel}]</span>}
        {title}
      </span>
      <time className="news-row-time" dateTime={item.publishedAt || item.fetchedAt}>
        {formatNewsTime(item)}
      </time>
      <button
        aria-label={item.pinned ? "取消精选" : "加入精选"}
        className={`news-pin-button ${item.pinned ? "active" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          onTogglePinned(item);
        }}
        type="button"
      >
        {item.pinned ? "★" : "☆"}
      </button>
    </li>
  );
}

export default function MessagePanel() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetchError, setHasFetchError] = useState(false);
  const [notice, setNotice] = useState("");
  const [visibleCount, setVisibleCount] = useState(NEWS_FEED_CONFIG.initialVisibleCount);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [externalSearchTerms, setExternalSearchTerms] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>("idle");
  const [lastAddedCount, setLastAddedCount] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownNow, setCooldownNow] = useState(Date.now());
  const isFetchingRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const itemsRef = useRef<NewsItem[]>([]);
  const lastAutoSyncAtRef = useRef(0);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const refreshStoredItems = () => {
      setItems(readStoredNewsItems());
    };

    window.addEventListener(BOTTOM_TICKER_UPDATED_EVENT, refreshStoredItems);
    window.addEventListener("storage", refreshStoredItems);

    return () => {
      window.removeEventListener(BOTTOM_TICKER_UPDATED_EVENT, refreshStoredItems);
      window.removeEventListener("storage", refreshStoredItems);
    };
  }, []);

  useEffect(() => {
    const handleKeywordSearch = (event: Event) => {
      const { keyword, terms } = (event as CustomEvent<RecentKeywordSearchDetail>).detail;
      setSearchQuery(keyword);
      setExternalSearchTerms(terms);
    };

    window.addEventListener(RECENT_KEYWORD_SEARCH_EVENT, handleKeywordSearch);

    return () => window.removeEventListener(RECENT_KEYWORD_SEARCH_EVENT, handleKeywordSearch);
  }, []);

  const syncNews = useCallback(async (mode: "auto" | "manual" | "initial") => {
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsFetching(true);
    setHasFetchError(false);
    if (mode === "manual") {
      setFetchStatus("fetching");
      setNotice("");
    }

    try {
      if (mode === "initial") {
        const feed = await loadNewsFeed();
        setItems(feed.items);
        notifyBottomTickerUpdated();
        setHasFetchError(feed.errors.length > 0);
        setFetchStatus(feed.usingMock ? "failed" : "idle");
        setLastAddedCount(0);
        setVisibleCount(NEWS_FEED_CONFIG.initialVisibleCount);
        if (!feed.usingMock) setLastUpdatedAt(new Date());
        if (feed.usingMock) setNotice("拉取失败，稍后重试");
        return;
      }

      setLastUpdatedAt(new Date());
      const incoming = await fetchLatestNews();
      setItems((current) => {
        const merged = mergeNewsItems(current, incoming);
        setLastAddedCount(merged.addedCount);
        setFetchStatus(merged.addedCount > 0 ? "added" : "empty");
        notifyBottomTickerUpdated();
        return merged.items;
      });
    } catch {
      setFetchStatus("failed");
      setNotice("拉取失败，稍后重试");
      setHasFetchError(true);
    } finally {
      isFetchingRef.current = false;
      setIsFetching(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void syncNews("initial");
  }, [syncNews]);

  useEffect(() => {
    const runAutoSync = () => {
      if (document.hidden) return;
      const now = Date.now();
      if (now - lastAutoSyncAtRef.current < AUTO_SYNC_INTERVAL_MS) return;

      lastAutoSyncAtRef.current = now;
      void syncNews("auto");
    };
    const handleVisibilityChange = () => {
      if (!document.hidden) runAutoSync();
    };
    const intervalId = window.setInterval(runAutoSync, AUTO_SYNC_INTERVAL_MS);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [syncNews]);

  useEffect(() => {
    if (!cooldownUntil) return undefined;

    const intervalId = window.setInterval(() => {
      const now = Date.now();
      setCooldownNow(now);
      if (now >= cooldownUntil) {
        setCooldownUntil(0);
        setFetchStatus("idle");
      }
    }, 500);

    return () => window.clearInterval(intervalId);
  }, [cooldownUntil]);

  const { normal, pinned } = useMemo(() => splitNews(items), [items]);
  const normalizedSearchQuery = normalizeSearchText(searchQuery);
  const isSearching = normalizedSearchQuery.length > 0;
  const normalizedExternalSearchTerms = useMemo(
    () => externalSearchTerms.map(normalizeSearchText).filter(Boolean),
    [externalSearchTerms],
  );
  const searchResults = useMemo(() => {
    if (!normalizedSearchQuery) return [];

    const searchTerms = normalizedExternalSearchTerms.length > 0 ? normalizedExternalSearchTerms : [normalizedSearchQuery];
    return items.filter((item) => {
      const searchText = normalizeSearchText(getSearchText(item));
      return searchTerms.some((term) => searchText.includes(term));
    });
  }, [items, normalizedExternalSearchTerms, normalizedSearchQuery]);
  const visibleNormal = normal.slice(0, visibleCount);
  const hasMoreNormal = visibleCount < normal.length;
  const hasNews = isSearching ? searchResults.length > 0 : normal.length > 0;

  useEffect(() => {
    if (!hasFetchError || hasNews) return;
    setNotice("拉取失败，稍后重试");
  }, [hasFetchError, hasNews]);

  const handleManualFetch = () => {
    const now = Date.now();
    if (isFetching || now < cooldownUntil) return;

    setCooldownUntil(now + MANUAL_COOLDOWN_MS);
    setCooldownNow(now);
    void syncNews("manual");
  };

  const handleFeedScroll = (event: UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const isNearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - LOAD_MORE_THRESHOLD_PX;

    if (isSearching || !isNearBottom || !hasMoreNormal || isLoadingMoreRef.current) return;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    window.setTimeout(() => {
      setVisibleCount((count) => Math.min(count + NEWS_FEED_CONFIG.loadMoreCount, normal.length));
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }, LOAD_MORE_DELAY_MS);
  };

  const togglePinned = (target: NewsItem) => {
    setNotice("");

    if (!target.pinned && pinned.length >= MAX_PINNED_NEWS) {
      setNotice(`精选最多 ${MAX_PINNED_NEWS} 条，请先取消一条。`);
      return;
    }

    const nextItems = items.map((item) =>
      item.id === target.id
        ? {
            ...item,
            pinned: !item.pinned,
            sourcePinned: item.pinned ? false : item.sourcePinned,
          }
        : item,
    );
    const nextPinnedIds = nextItems.filter((item) => item.pinned).map((item) => item.id);

    if (target.pinned) markRedditHotSeen(target);
    savePinnedNewsIds(nextPinnedIds);
    saveNewsItems(nextItems);
    notifyBottomTickerUpdated();
    setItems(nextItems);
  };

  const markRead = (target: NewsItem) => {
    if (!target.url) return;

    markNewsIdRead(target.id);
    setItems((current) => current.map((item) => (item.id === target.id ? { ...item, isRead: true } : item)));
  };

  const isUnreadNew = (item: NewsItem) => {
    if (!item.isNew || item.isRead) return false;

    const fetchedTime = new Date(item.fetchedAt).getTime();
    if (Number.isNaN(fetchedTime)) return false;

    return Date.now() - fetchedTime <= 24 * 60 * 60 * 1000;
  };

  const formatTime = (date: Date | null) => {
    if (!date) return "--:--:--";

    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };
  const feedDateLabel = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const isCoolingDown = cooldownUntil > cooldownNow;
  const fetchStatusText =
    fetchStatus === "fetching"
      ? "拉取中..."
      : fetchStatus === "added"
        ? `新增 ${lastAddedCount} 条`
        : fetchStatus === "empty"
          ? "暂无新消息"
          : fetchStatus === "failed"
            ? "拉取失败"
            : "";
  const fetchButtonText = isFetching ? "拉取中..." : isCoolingDown ? "请稍后" : "拉取";
  const isFetchButtonDisabled = isFetching || isCoolingDown;
  const feedStatusText = notice || (isLoading ? "加载中..." : "");

  return (
    <section className={feedStatusText ? "message-panel has-feed-status" : "message-panel"} aria-label="实时消息流">
      <div className="message-title">
        <div className="message-title-copy">
          <span className="eyebrow">{feedDateLabel}</span>
          <h2>新闻抓取</h2>
        </div>
        <div className="news-sync-tools">
          <span className={`news-sync-status ${fetchStatus === "failed" ? "failed" : ""}`}>{fetchStatusText}</span>
          <button aria-label={fetchButtonText} disabled={isFetchButtonDisabled} onClick={handleManualFetch} title={fetchButtonText} type="button">
            <RefreshIcon />
          </button>
          <span className="news-sync-time">上次更新 {formatTime(lastUpdatedAt)}</span>
        </div>
      </div>
      <label className="news-search" aria-label="搜索已抓取消息">
        <span className="news-search-icon" aria-hidden="true">
          ⌕
        </span>
        <input
          aria-label="搜索已抓取消息"
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setExternalSearchTerms([]);
          }}
          placeholder="搜索全部已抓取消息"
          type="search"
          value={searchQuery}
        />
        <span className="news-search-count">
          {isSearching ? `${searchResults.length}/${items.length}` : `${items.length}`}
        </span>
      </label>
      {feedStatusText ? (
        <div className="news-feed-status" aria-live="polite">
          {feedStatusText}
        </div>
      ) : null}
      <div className="news-feed-scroll" onScroll={handleFeedScroll}>
        {isSearching ? (
          <section className="news-feed-section news-search-results" aria-label="搜索结果">
            <div className="news-search-results-header">
              <h3>搜索结果</h3>
              <span>
                {searchResults.length} 条匹配 · {searchQuery.trim()}
              </span>
            </div>
            {searchResults.length > 0 ? (
              <ul className="news-list">
                {searchResults.map((item) => (
                  <NewsRow
                    isUnreadNew={isUnreadNew(item)}
                    item={item}
                    key={item.id}
                    onMarkRead={markRead}
                    onTogglePinned={togglePinned}
                  />
                ))}
              </ul>
            ) : (
              <div className="news-empty-state">没有匹配消息</div>
            )}
          </section>
        ) : null}

        {normal.length > 0 && (
          <section className="news-feed-section" aria-label="普通消息" hidden={isSearching}>
            <ul className="news-list">
              {visibleNormal.map((item) => (
                <NewsRow
                  isUnreadNew={isUnreadNew(item)}
                  item={item}
                  key={item.id}
                  onMarkRead={markRead}
                  onTogglePinned={togglePinned}
                />
              ))}
            </ul>
          </section>
        )}
        {isLoading && !isSearching && <div className="news-feed-tail">加载中...</div>}
        {!isLoading && hasNews && !isSearching && (
          <div className="news-feed-tail">
            {isLoadingMore ? "加载中..." : hasMoreNormal ? "继续下滑加载更多" : "没有更多消息"}
          </div>
        )}
        {!isLoading && !hasNews && !isSearching && <div className="news-empty-state">暂无消息</div>}
      </div>
    </section>
  );
}
