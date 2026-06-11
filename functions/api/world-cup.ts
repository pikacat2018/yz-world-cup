import { fetchWorldCupPayload } from "./world-cup/core";

export const onRequestGet: PagesFunction = async ({ env }) => {
  try {
    const payload = await fetchWorldCupPayload(env as Record<string, string | undefined>);

    return new Response(JSON.stringify(payload), {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown_world_cup_fetch_error";

    return new Response(JSON.stringify({ error: "world_cup_fetch_failed", reason }), {
      headers: { "Content-Type": "application/problem+json" },
      status: 502,
    });
  }
};
