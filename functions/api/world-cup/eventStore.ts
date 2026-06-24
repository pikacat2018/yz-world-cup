type Env = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

export type StoredMatchEventRow = {
  goals?: unknown;
  match_id: string;
  match_no: number;
  penalty_shootout?: unknown;
  red_cards?: unknown;
  updated_at?: string;
  utc_date?: string;
};

export type StoredMatchEventUpsert = {
  goals: unknown;
  match_id: string;
  match_no: number;
  penalty_shootout: unknown;
  red_cards: unknown;
  utc_date: string | null;
};

const getSupabaseHeaders = (env: Env) => ({
  apikey: env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
  "Content-Type": "application/json",
});

const getEndpoint = (env: Env) => `${env.SUPABASE_URL?.replace(/\/$/, "")}/rest/v1/world_cup_match_events`;

export function isWorldCupEventStoreConfigured(env: Env) {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function readStoredMatchEvents(env: Env, matchIds: string[]) {
  if (!isWorldCupEventStoreConfigured(env) || matchIds.length === 0) return [];

  const endpoint = getEndpoint(env);
  const response = await fetch(
    `${endpoint}?match_id=in.(${matchIds.map((id) => `"${id}"`).join(",")})&select=match_id,match_no,utc_date,goals,red_cards,penalty_shootout,updated_at`,
    {
      headers: getSupabaseHeaders(env),
    },
  );

  if (!response.ok) {
    throw new Error(`stored_match_events_read_failed:${response.status}`);
  }

  return (await response.json()) as StoredMatchEventRow[];
}

export async function readStoredMatchEventIds(env: Env) {
  if (!isWorldCupEventStoreConfigured(env)) return [];

  const endpoint = getEndpoint(env);
  const response = await fetch(`${endpoint}?select=match_id`, {
    headers: getSupabaseHeaders(env),
  });

  if (!response.ok) {
    throw new Error(`stored_match_event_ids_read_failed:${response.status}`);
  }

  const rows = (await response.json()) as Array<{ match_id: string }>;
  return rows.map((row) => row.match_id);
}

export async function upsertStoredMatchEvents(env: Env, rows: StoredMatchEventUpsert[]) {
  if (!isWorldCupEventStoreConfigured(env) || rows.length === 0) return;

  const endpoint = getEndpoint(env);
  const response = await fetch(endpoint, {
    body: JSON.stringify(rows),
    headers: {
      ...getSupabaseHeaders(env),
      Prefer: "resolution=merge-duplicates",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`stored_match_events_upsert_failed:${response.status}`);
  }
}
