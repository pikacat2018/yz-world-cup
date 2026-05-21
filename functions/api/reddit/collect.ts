type RedditVariant = "hot" | "new";

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
    status,
  });

const normalizePermalink = (permalink: string) => {
  if (!permalink) return "";
  if (/^https?:\/\//i.test(permalink)) return permalink;
  return `https://www.reddit.com${permalink}`;
};

const getPriority = (variant: RedditVariant, flair: string, score = 0, comments = 0) => {
  const basePriority = variant === "hot" ? 85 : 60;
  const heatPriority = score >= 500 || comments >= 100 ? 90 : 0;
  const flairPriority = ["official source", "news", "transfers"].includes(flair.trim().toLowerCase()) ? 75 : 0;

  return Math.max(basePriority, heatPriority, flairPriority);
};

const shouldKeepPost = (title: string, flair = "") => {
  const normalizedTitle = title.trim();
  const normalizedFlair = flair.trim().toLowerCase();
  const excludedPatterns = [
    /daily discussion/i,
    /free talk/i,
    /meta thread/i,
    /prediction thread/i,
    /transfer thread/i,
    /^match thread/i,
    /\bmatch thread\b/i,
    /non-pl daily discussion/i,
  ];

  if (!normalizedTitle) return false;
  if (normalizedFlair === "post match thread") return true;
  return !excludedPatterns.some((pattern) => pattern.test(normalizedFlair) || pattern.test(normalizedTitle));
};

async function fetchRedditListing(subreddit: string, variant: RedditVariant) {
  const response = await fetch(`https://www.reddit.com/r/${subreddit}/${variant}.json?limit=50&raw_json=1`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 football-monitor/1.0",
    },
  });

  if (!response.ok) throw new Error(`reddit ${variant} failed: ${response.status}`);

  const payload = (await response.json()) as {
    data?: {
      children?: Array<{
        data?: {
          created_utc?: number;
          id?: string;
          link_flair_text?: string;
          num_comments?: number;
          permalink?: string;
          score?: number;
          title?: string;
          url_overridden_by_dest?: string;
        };
      }>;
    };
  };

  return (payload.data?.children ?? [])
    .map((child) => child.data)
    .filter((post): post is NonNullable<typeof post> => Boolean(post?.id && post.title))
    .filter((post) => shouldKeepPost(post.title ?? "", post.link_flair_text ?? ""))
    .map((post) => {
      const fetchedAt = new Date().toISOString();
      const score = post.score ?? 0;
      const comments = post.num_comments ?? 0;
      const flair = post.link_flair_text ?? "";

      return {
        category: "football",
        comments,
        externalUrl: post.url_overridden_by_dest,
        fetchedAt,
        id: `reddit:${post.id}`,
        pinned: false,
        priority: getPriority(variant, flair, score, comments),
        publishedAt: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : fetchedAt,
        rawCategory: flair,
        score,
        source: "reddit",
        sourceVariant: variant,
        title: post.title ?? "",
        url: normalizePermalink(post.permalink ?? ""),
      };
    });
}

export const onRequestGet: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);
  const subreddit = url.searchParams.get("subreddit") || "soccer";
  const requestedVariant = url.searchParams.get("variant");
  const variants: RedditVariant[] = requestedVariant === "hot" || requestedVariant === "new" ? [requestedVariant] : ["new", "hot"];

  try {
    const results = await Promise.allSettled(variants.map((variant) => fetchRedditListing(subreddit, variant)));
    const items = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
    const seenIds = new Set<string>();
    const merged = items.filter((item) => {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    });

    if (merged.length === 0 && results.some((result) => result.status === "rejected")) {
      const error = results.find((result) => result.status === "rejected");
      throw new Error(error?.status === "rejected" ? String(error.reason) : "reddit request failed");
    }

    return json({ items: merged, proxy: "not_configured", source: "json" });
  } catch (error) {
    return json(
      {
        error: "reddit_collect_failed",
        reason: error instanceof Error ? error.message : "unknown reddit collect error",
      },
      502,
    );
  }
};
