import { defineConfig, loadEnv, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import axios from "axios";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { HttpsProxyAgent } from "https-proxy-agent";
import { collectRedditForApi, type RedditFetchJson, type RedditFetchText, type RedditVariant } from "./functions/api/reddit/collectCore";
import { fetchWorldCupPayload } from "./functions/api/world-cup/core";

const DEFAULT_REDDIT_SUBREDDIT = "soccer";
const REQUEST_TIMEOUT_MS = 25_000;

const normalizeProxyUrl = (value?: string) => {
  if (!value) return "";

  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  return /^https?:\/\//i.test(trimmedValue) ? trimmedValue : `http://${trimmedValue}`;
};

const createProxyFetchJson = (proxyUrl: string): RedditFetchJson => {
  const agent = new HttpsProxyAgent(proxyUrl);

  return async (url) => {
    const response = await axios.get(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) football-monitor/1.0",
      },
      httpAgent: agent,
      httpsAgent: agent,
      proxy: false,
      responseType: "json",
      timeout: REQUEST_TIMEOUT_MS,
      validateStatus: () => true,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return response.data;
  };
};

const createProxyFetchText = (proxyUrl: string): RedditFetchText => {
  const agent = new HttpsProxyAgent(proxyUrl);

  return async (url, headers) => {
    const response = await axios.get<string>(url, {
      headers,
      httpAgent: agent,
      httpsAgent: agent,
      proxy: false,
      responseType: "text",
      timeout: REQUEST_TIMEOUT_MS,
      transformResponse: [(data) => data],
      validateStatus: () => true,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return response.data;
  };
};

const zhibo8HtmlHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) football-monitor/0.1",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
};

const isAllowedZhibo8DetailUrl = (value: string) => {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.hostname === "news.zhibo8.com" &&
      /^\/zuqiu\/20\d{2}-\d{2}-\d{2}\/[^/]+\.htm$/i.test(url.pathname)
    );
  } catch {
    return false;
  }
};

const readLocalEnvFile = (root: string) => {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return {};

  return readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .reduce<Record<string, string>>((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return env;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) return env;

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      env[key] = value;
      return env;
    }, {});
};

const redditProxyPlugin = () => ({
  name: "reddit-axios-proxy",
  configureServer(server: ViteDevServer) {
    server.middlewares.use("/api/reddit/collect", async (request, response) => {
      const url = new URL(request.url ?? "", "http://localhost");
      const subreddit = url.searchParams.get("subreddit") || process.env.REDDIT_SUBREDDIT || DEFAULT_REDDIT_SUBREDDIT;
      const requestedVariant = url.searchParams.get("variant");
      const mode = url.searchParams.get("mode");
      const proxyUrl = normalizeProxyUrl(process.env.REDDIT_PROXY_URL);
      const variants: RedditVariant[] =
        requestedVariant === "hot" || requestedVariant === "new" ? [requestedVariant] : ["new", "hot"];

      try {
        const useLocalProxy = mode !== "production" && proxyUrl;
        const result = await collectRedditForApi(subreddit, variants, {
          fetchJson: useLocalProxy ? createProxyFetchJson(proxyUrl) : undefined,
          fetchText: useLocalProxy ? createProxyFetchText(proxyUrl) : undefined,
          proxy: useLocalProxy ? "configured" : "not_configured",
        });

        response.setHeader("Content-Type", "application/json");
        response.statusCode = 200;
        response.end(JSON.stringify(result));
      } catch (error) {
        response.setHeader("Content-Type", "application/problem+json");
        response.statusCode = 502;
        response.end(
          JSON.stringify({
            error: "reddit_collect_failed",
            reason: error instanceof Error ? error.message : "unknown reddit collect error",
          }),
        );
      }
    });
    server.middlewares.use("/api/zhibo8/news", async (_request, response) => {
      try {
        const result = await axios.get<string>("https://m.zhibo8.com/news.htm", {
          headers: zhibo8HtmlHeaders,
          responseType: "text",
          timeout: REQUEST_TIMEOUT_MS,
        });

        response.statusCode = 200;
        response.setHeader("Cache-Control", "public, max-age=120, s-maxage=120");
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.end(result.data);
      } catch (error) {
        response.statusCode = 502;
        response.setHeader("Content-Type", "application/problem+json");
        response.end(
          JSON.stringify({
            error: "zhibo8_news_failed",
            reason: error instanceof Error ? error.message : "unknown zhibo8 news error",
          }),
        );
      }
    });
    server.middlewares.use("/api/zhibo8/detail", async (request, response) => {
      const url = new URL(request.url ?? "", "http://localhost");
      const detailUrl = url.searchParams.get("url") ?? "";

      if (!isAllowedZhibo8DetailUrl(detailUrl)) {
        response.statusCode = 400;
        response.setHeader("Content-Type", "application/problem+json");
        response.end(JSON.stringify({ error: "invalid_zhibo8_detail_url" }));
        return;
      }

      try {
        const result = await axios.get<string>(detailUrl, {
          headers: zhibo8HtmlHeaders,
          responseType: "text",
          timeout: REQUEST_TIMEOUT_MS,
        });

        response.statusCode = 200;
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.end(result.data);
      } catch (error) {
        response.statusCode = 502;
        response.setHeader("Content-Type", "application/problem+json");
        response.end(
          JSON.stringify({
            error: "zhibo8_detail_failed",
            reason: error instanceof Error ? error.message : "unknown zhibo8 detail error",
          }),
        );
      }
    });
    server.middlewares.use("/api/world-cup", async (_request, response) => {
      try {
        const payload = await fetchWorldCupPayload(process.env);
        response.statusCode = 200;
        response.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.end(JSON.stringify(payload));
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown_world_cup_fetch_error";
        response.statusCode = reason === "football_data_api_key_missing" ? 503 : 502;
        response.setHeader("Content-Type", "application/problem+json");
        response.end(JSON.stringify({ error: "world_cup_fetch_failed", reason }));
      }
    });
  },
});

export default defineConfig(({ mode }) => {
  const root = process.cwd();
  Object.assign(process.env, loadEnv(mode, root, ""), readLocalEnvFile(root));

  return {
    plugins: [react(), redditProxyPlugin()],
  };
});
