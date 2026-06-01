import { collectRedditForApi, type RedditVariant } from "./collectCore";

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    headers: {
      "Cache-Control": "public, max-age=120, s-maxage=120",
      "Content-Type": "application/json; charset=utf-8",
    },
    status,
  });

export const onRequestGet: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);
  const subreddit = url.searchParams.get("subreddit") || "soccer";
  const requestedVariant = url.searchParams.get("variant");
  const variants: RedditVariant[] = requestedVariant === "hot" || requestedVariant === "new" ? [requestedVariant] : ["hot", "new"];

  try {
    return json(await collectRedditForApi(subreddit, variants));
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
