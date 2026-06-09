type Env = {
  EDITOR_ACCESS_CODE?: string;
  EDITOR_ACCESS_CODES?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
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

const toHex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const getRecordUserId = async (env: Env, request: Request) => {
  const accessCode = getAccessCode(request);
  const allowedCodes = getAllowedAccessCodes(env);

  if (!accessCode || !allowedCodes.includes(accessCode)) return "";

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(accessCode));
  return toHex(digest);
};

const getSupabaseHeaders = (env: Env) => ({
  apikey: env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
  "Content-Type": "application/json",
});

export const onRequest: PagesFunction<Env> = async ({ env, params, request }) => {
  const recordUserId = await getRecordUserId(env, request);
  if (!recordUserId) return json({ error: "access_denied" }, 403);

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "match_records_not_configured" }, 503);
  }

  const rawMatchId = Array.isArray(params.matchId) ? params.matchId[0] : params.matchId;
  const matchId = typeof rawMatchId === "string" ? rawMatchId.trim() : "";
  if (!matchId) return json({ error: "missing_match_id" }, 400);

  const endpoint = `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/match_records`;

  if (request.method === "PUT") {
    const payload = (await request.json().catch(() => null)) as { record?: unknown } | null;
    if (!payload || !payload.record || typeof payload.record !== "object") return json({ error: "missing_record" }, 400);

    const response = await fetch(`${endpoint}?on_conflict=record_user_id,match_id`, {
      body: JSON.stringify({
        match_id: matchId,
        record: payload.record,
        record_user_id: recordUserId,
        updated_at: new Date().toISOString(),
      }),
      headers: {
        ...getSupabaseHeaders(env),
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      method: "POST",
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");

      return json(
        {
          detail: detail.slice(0, 220),
          error: "supabase_write_failed",
          supabaseStatus: response.status,
        },
        502,
      );
    }

    const rows = (await response.json()) as Array<{ record: unknown; updated_at: string }>;
    return json({ record: rows[0]?.record ?? payload.record, updatedAt: rows[0]?.updated_at ?? "" });
  }

  if (request.method === "DELETE") {
    const response = await fetch(
      `${endpoint}?record_user_id=eq.${encodeURIComponent(recordUserId)}&match_id=eq.${encodeURIComponent(matchId)}`,
      {
        headers: getSupabaseHeaders(env),
        method: "DELETE",
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");

      return json(
        {
          detail: detail.slice(0, 220),
          error: "supabase_delete_failed",
          supabaseStatus: response.status,
        },
        502,
      );
    }

    return json({ deleted: true, matchId });
  }

  return json({ error: "method_not_allowed" }, 405);
};
