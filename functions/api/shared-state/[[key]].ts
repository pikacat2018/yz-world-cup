type Env = {
  EDITOR_ACCESS_CODE?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

const allowedKeys = new Set([
  "news_items",
  "pinned_news_ids",
  "read_news_ids",
  "unread_news_ids",
  "reddit_hot_seen_keys",
  "follow_up_items",
]);

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
    status,
  });

const getAccessCode = (request: Request) => request.headers.get("X-Editor-Access-Code")?.trim() ?? "";

const getSupabaseHeaders = (env: Env) => ({
  apikey: env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
  "Content-Type": "application/json",
});

export const onRequest: PagesFunction<Env> = async ({ env, params, request }) => {
  if (!env.EDITOR_ACCESS_CODE || getAccessCode(request) !== env.EDITOR_ACCESS_CODE) {
    return json({ error: "access_denied" }, 403);
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "shared_state_not_configured" }, 503);
  }

  const rawKey = Array.isArray(params.key) ? params.key[0] : params.key;
  const key = typeof rawKey === "string" ? rawKey : "";
  const endpoint = `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/editor_state`;

  if (request.method === "GET" && !key) {
    const response = await fetch(`${endpoint}?select=key,value,updated_at`, {
      headers: getSupabaseHeaders(env),
    });

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

    const rows = (await response.json()) as Array<{ key: string; value: unknown; updated_at: string }>;
    return json({
      documents: rows.map((row) => ({
        key: row.key,
        updatedAt: row.updated_at,
        value: row.value,
      })),
    });
  }

  if (!allowedKeys.has(key)) return json({ error: "invalid_shared_state_key" }, 400);

  if (request.method === "GET") {
    const response = await fetch(`${endpoint}?key=eq.${encodeURIComponent(key)}&select=key,value,updated_at`, {
      headers: getSupabaseHeaders(env),
    });

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

    const rows = (await response.json()) as Array<{ key: string; value: unknown; updated_at: string }>;
    const row = rows[0];
    return json(row ? { key: row.key, updatedAt: row.updated_at, value: row.value } : { key, value: null, updatedAt: "" });
  }

  if (request.method === "PUT") {
    const payload = (await request.json().catch(() => null)) as { value?: unknown } | null;

    if (!payload || !("value" in payload)) return json({ error: "missing_value" }, 400);

    const response = await fetch(endpoint, {
      body: JSON.stringify({
        key,
        updated_at: new Date().toISOString(),
        value: payload.value,
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

    const rows = (await response.json()) as Array<{ key: string; value: unknown; updated_at: string }>;
    const row = rows[0];
    return json({ key: row.key, updatedAt: row.updated_at, value: row.value });
  }

  return json({ error: "method_not_allowed" }, 405);
};
