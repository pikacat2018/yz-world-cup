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

export const onRequestGet: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);
  const detailUrl = url.searchParams.get("url") ?? "";

  if (!isAllowedZhibo8DetailUrl(detailUrl)) {
    return new Response(JSON.stringify({ error: "invalid_zhibo8_detail_url" }), {
      headers: { "Content-Type": "application/problem+json" },
      status: 400,
    });
  }

  try {
    const response = await fetch(detailUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 football-monitor/1.0",
      },
    });

    if (!response.ok) throw new Error(`zhibo8 detail failed: ${response.status}`);

    return new Response(await response.text(), {
      headers: {
        "Cache-Control": "public, max-age=120, s-maxage=120",
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "zhibo8_detail_failed",
        reason: error instanceof Error ? error.message : "unknown zhibo8 detail error",
      }),
      {
        headers: { "Content-Type": "application/problem+json" },
        status: 502,
      },
    );
  }
};
