const fs = require("node:fs");
const path = require("node:path");

const envPath = path.resolve(__dirname, "..", ".env");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((env, line) => {
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
}

function maskSecret(value) {
  if (!value) return "";
  if (value.length <= 8) return `${value.slice(0, 2)}***${value.slice(-2)}`;
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

function normalizeDeepSeekBaseUrl(value) {
  const rawValue = (value || "https://api.deepseek.com").trim();
  let normalized = rawValue.replace(/\/+$/, "");

  normalized = normalized.replace(/\/chat\/completions$/i, "");
  normalized = normalized.replace(/\/v1$/i, "");

  return normalized || "https://api.deepseek.com";
}

async function main() {
  const fileEnv = loadEnvFile(envPath);
  const hasShellApiKey = Boolean(process.env.DEEPSEEK_API_KEY);
  const apiKey = (fileEnv.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY || "").trim();
  const baseUrl = normalizeDeepSeekBaseUrl(fileEnv.DEEPSEEK_BASE_URL || process.env.DEEPSEEK_BASE_URL);
  const model = (fileEnv.DEEPSEEK_MODEL || process.env.DEEPSEEK_MODEL || "deepseek-chat").trim();
  const requestUrl = `${baseUrl}/chat/completions`;

  console.log(`[deepseek:test] env path: ${envPath}`);
  console.log(`[deepseek:test] shell env DEEPSEEK_API_KEY present: ${hasShellApiKey}`);
  console.log(
    `[deepseek:test] api key loaded: ${Boolean(apiKey)}, length: ${apiKey.length}, masked: ${maskSecret(apiKey)}`,
  );
  console.log(`[deepseek:test] base url: ${baseUrl}`);
  console.log(`[deepseek:test] model: ${model}`);
  console.log(`[deepseek:test] request url: ${requestUrl}`);

  if (!apiKey) {
    console.warn("[deepseek:test] missing DEEPSEEK_API_KEY, skip request");
    process.exitCode = 1;
    return;
  }

  const response = await fetch(requestUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: "Translate this football title into Chinese: Arsenal beat Chelsea 2-1",
        },
      ],
      temperature: 0.2,
      max_tokens: 80,
    }),
  });

  const body = await response.text();

  console.log(`[deepseek:test] http status: ${response.status}`);
  console.log(`[deepseek:test] response body preview: ${body.slice(0, 500)}`);

  if (!response.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error("[deepseek:test] request failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
