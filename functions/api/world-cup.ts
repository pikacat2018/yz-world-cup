import { fetchWorldCupPayload } from "./world-cup/core";
import { mergeStoredEventsIntoMatches } from "./world-cup/core";
import { readStoredMatchEvents } from "./world-cup/eventStore";

export const onRequestGet: PagesFunction = async ({ env }) => {
  try {
    const payload = await fetchWorldCupPayload(env as Record<string, string | undefined>);
    const storedRows = await readStoredMatchEvents(
      env as Record<string, string | undefined>,
      payload.matches.map((match) => match.id),
    );
    const storedByMatchId = new Map(
      storedRows.map((row) => [
        row.match_id,
        {
          goals: row.goals as typeof payload.matches[number]["goals"],
          penaltyShootout: row.penalty_shootout as typeof payload.matches[number]["penaltyShootout"],
          redCards: row.red_cards as typeof payload.matches[number]["redCards"],
        },
      ]),
    );
    const mergedMatches = mergeStoredEventsIntoMatches(payload.matches, storedByMatchId);
    const mergedByMatchId = new Map(mergedMatches.map((match) => [match.id, match]));
    const mergedPayload = {
      ...payload,
      groups: payload.groups.map((group) => ({
        ...group,
        matches: group.matches.map((match) => mergedByMatchId.get(match.id) ?? match),
      })),
      matches: mergedMatches,
    };

    return new Response(JSON.stringify(mergedPayload), {
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
