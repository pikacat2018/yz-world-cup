const ZHIBO8_NEWS_URL = "https://m.zhibo8.com/news.htm";

export const onRequestGet: PagesFunction = async () => {
  try {
    const response = await fetch(ZHIBO8_NEWS_URL, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 football-monitor/1.0",
      },
    });

    if (!response.ok) throw new Error(`zhibo8 news failed: ${response.status}`);

    return new Response(await response.text(), {
      headers: {
        "Cache-Control": "public, max-age=120, s-maxage=120",
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "zhibo8_news_failed",
        reason: error instanceof Error ? error.message : "unknown zhibo8 news error",
      }),
      {
        headers: { "Content-Type": "application/problem+json" },
        status: 502,
      },
    );
  }
};
