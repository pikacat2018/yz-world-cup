export type NewsSource = "zhibo8" | "x" | "reddit";
export type RedditSourceVariant = "hot" | "new" | "hot,new";

export type NewsItem = {
  id: string;
  source: NewsSource;
  sourceVariant?: RedditSourceVariant;
  title: string;
  translatedTitle?: string;
  translatedAt?: string;
  url?: string;
  externalUrl?: string;
  publishedAt?: string;
  fetchedAt: string;
  pinned: boolean;
  category?: "football";
  rawCategory?: string;
  isNew?: boolean;
  isRead?: boolean;
  feedSection?: "latest" | "recommended";
  sourcePinned?: boolean;
  score?: number;
  comments?: number;
  priority?: number;
};

export type NewsFeedState = {
  items: NewsItem[];
  /**
   * Deprecated. Kept false for compatibility; News Feed no longer injects mock news.
   */
  usingMock: boolean;
  errors: string[];
};

export type TickerSource = "pinned_news" | "latest_news" | "match_event" | "system";

export type TickerItem = {
  id: string;
  source: TickerSource;
  text: string;
  url?: string;
  priority: number;
  createdAt: string;
};
