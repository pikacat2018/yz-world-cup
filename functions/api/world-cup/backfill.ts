import { BACKFILL_BATCH_LIMIT, buildHistoricalEventBackfillBatch } from "./core";
import { readStoredMatchEventIds, upsertStoredMatchEvents } from "./eventStore";

type Env = {
  EDITOR_ACCESS_CODE?: string;
  EDITOR_ACCESS_CODES?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  FIFA_COMPETITION_ID?: string;
  FIFA_SEASON_ID?: string;
};

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
    status,
  });

const getAccessCode = (request: Request) => request.headers.get("X-Editor-Access-Code")?.trim() ?? "";

const getAllowedAccessCodes = (env: Env) => [
  ...(env.EDITOR_ACCESS_CODES ?? "")
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean),
  ...(env.EDITOR_ACCESS_CODE ? [env.EDITOR_ACCESS_CODE.trim()] : []),
];

const isAllowedAccessCode = (env: Env, request: Request) => {
  const accessCode = getAccessCode(request);
  return Boolean(accessCode && getAllowedAccessCodes(env).includes(accessCode));
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  if (!isAllowedAccessCode(env, request)) return json({ error: "access_denied" }, 403);

  try {
    const url = new URL(request.url);
    const requestedLimit = Number(url.searchParams.get("limit") ?? "");
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(Math.floor(requestedLimit), BACKFILL_BATCH_LIMIT)
      : BACKFILL_BATCH_LIMIT;
    const knownMatchIds = new Set(await readStoredMatchEventIds(env));
    const batch = await buildHistoricalEventBackfillBatch(env, knownMatchIds, limit);
    await upsertStoredMatchEvents(env, batch.rows);

    return json({
      limit,
      processed: batch.rows.length,
      remaining: batch.remaining,
      stored: batch.rows.map((row) => row.match_id),
    });
  } catch (error) {
    return json(
      {
        error: "world_cup_backfill_failed",
        reason: error instanceof Error ? error.message : "unknown_world_cup_backfill_error",
      },
      502,
    );
  }
};
