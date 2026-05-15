import type { NewsItem } from "./types";

const createFallbackNews = (id: string, title: string, minutesAgo: number, url?: string): NewsItem => {
  const fetchedAt = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();

  return {
    id,
    source: "zhibo8",
    title,
    url,
    publishedAt: fetchedAt,
    fetchedAt,
    pinned: false,
    category: "football",
    rawCategory: "fallback",
  };
};

export const fallbackNews: NewsItem[] = [
  createFallbackNews("fallback-zhibo8-football-1", "直播吧足球新闻暂不可用，稍后将自动重试", 2),
  createFallbackNews("fallback-zhibo8-football-2", "固定消息区已保留自动同步与手动拉取能力", 8),
  createFallbackNews("fallback-zhibo8-football-3", "网络恢复后将优先展示直播吧真实足球新闻", 15),
];
