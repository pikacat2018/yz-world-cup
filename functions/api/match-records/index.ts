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

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const recordUserId = await getRecordUserId(env, request);
  if (!recordUserId) return json({ error: "access_denied" }, 403);

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "match_records_not_configured" }, 503);
  }

  const endpoint = `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/match_records`;
  const response = await fetch(
    `${endpoint}?record_user_id=eq.${encodeURIComponent(recordUserId)}&select=match_id,record,updated_at&order=match_id.asc`,
    { headers: getSupabaseHeaders(env) },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");

    return json(
      {
        detail: detail.slice(0, 220),
        error: "supabase_read_failed",
        supabaseStatus: response.status,
      },
      502,
    );
  }

  const rows = (await response.json()) as Array<{ match_id: string; record: unknown; updated_at: string }>;
  return json({
    records: rows.map((row) => row.record),
    updatedAt: rows.reduce((latest, row) => (row.updated_at > latest ? row.updated_at : latest), ""),
  });
};
