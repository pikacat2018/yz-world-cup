type Env = {
  EDITOR_ACCESS_CODE?: string;
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

const getSupabaseHeaders = (env: Env) => ({
  apikey: env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
  "Content-Type": "application/json",
});

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  if (!env.EDITOR_ACCESS_CODE || getAccessCode(request) !== env.EDITOR_ACCESS_CODE) {
    return json({ error: "access_denied" }, 403);
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "shared_state_not_configured" }, 503);
  }

  const endpoint = `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/editor_state`;
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
};
