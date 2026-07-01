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

const isAllowedAccessCode = (env: Env, request: Request) => {
  const accessCode = getAccessCode(request);
  const allowedCodes = getAllowedAccessCodes(env);

  return Boolean(accessCode && allowedCodes.includes(accessCode));
};

const getSupabaseHeaders = (env: Env) => ({
  apikey: env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
  "Content-Type": "application/json",
});

export const onRequest: PagesFunction<Env> = async ({ env, params, request }) => {
  if (!isAllowedAccessCode(env, request)) return json({ error: "access_denied" }, 403);

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "entity_timelines_not_configured" }, 503);
  }

  const rawEntityId = Array.isArray(params.entityId) ? params.entityId[0] : params.entityId;
  const entityId = typeof rawEntityId === "string" ? rawEntityId.trim() : "";
  if (!entityId) return json({ error: "missing_entity_id" }, 400);

  const endpoint = `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/entity_timeline_records`;

  if (request.method === "PUT") {
    const payload = (await request.json().catch(() => null)) as { record?: unknown } | null;
    if (!payload || !payload.record || typeof payload.record !== "object") return json({ error: "missing_record" }, 400);

    const response = await fetch(`${endpoint}?on_conflict=entity_id`, {
      body: JSON.stringify({
        entity_id: entityId,
        record_key: "shared",
        record: payload.record,
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
    const response = await fetch(`${endpoint}?entity_id=eq.${encodeURIComponent(entityId)}`, {
      headers: getSupabaseHeaders(env),
      method: "DELETE",
    });

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

    return json({ deleted: true, entityId });
  }

  return json({ error: "method_not_allowed" }, 405);
};
