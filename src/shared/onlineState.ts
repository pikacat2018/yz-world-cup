export type SharedStateKey =
  | "news_items"
  | "pinned_news_ids"
  | "read_news_ids"
  | "unread_news_ids"
  | "reddit_hot_seen_keys"
  | "follow_up_items";

type SharedStateDocument = {
  key: SharedStateKey;
  value: unknown;
  updatedAt: string;
};

type SharedStateStatus = "disabled" | "locked" | "syncing" | "ready" | "error";

export class SharedStateError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "SharedStateError";
    this.code = code;
    this.status = status;
  }
}

const SHARED_EDITING_ENABLED = import.meta.env.VITE_SHARED_EDITING === "true";
const ACCESS_CODE_STORAGE_KEY = "yz-world-cup-editor-access-code";
const API_BASE = "/api/shared-state";
const POLL_INTERVAL_MS = 5_000;
const PUSH_DEBOUNCE_MS = 250;

const localStorageKeys: Record<SharedStateKey, string> = {
  news_items: "yz-world-cup-news-items-v7",
  pinned_news_ids: "yz-world-cup-pinned-news",
  read_news_ids: "yz-world-cup-read-news",
  unread_news_ids: "yz-world-cup-unread-news",
  reddit_hot_seen_keys: "yz-world-cup-reddit-hot-seen-v1",
  follow_up_items: "yz-world-cup-follow-up-items-v1",
};

const refreshEvents = ["yz-world-cup-bottom-ticker-updated", "yz-world-cup-follow-up-updated"];
const remoteUpdatedAt = new Map<SharedStateKey, string>();
const pushTimers = new Map<SharedStateKey, number>();
let applyingRemoteState = false;
let hasHydratedSharedState = false;

export function isSharedEditingEnabled() {
  return SHARED_EDITING_ENABLED;
}

export function getEditorAccessCode() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ACCESS_CODE_STORAGE_KEY) || "";
}

export function saveEditorAccessCode(code: string) {
  window.localStorage.setItem(ACCESS_CODE_STORAGE_KEY, code.trim());
}

export function clearEditorAccessCode() {
  window.localStorage.removeItem(ACCESS_CODE_STORAGE_KEY);
  hasHydratedSharedState = false;
  remoteUpdatedAt.clear();
}

export function isApplyingSharedState() {
  return applyingRemoteState;
}

export function hasCompletedInitialSharedHydration() {
  return !SHARED_EDITING_ENABLED || !getEditorAccessCode() || hasHydratedSharedState;
}

export function dispatchSharedStateRefresh() {
  for (const eventName of refreshEvents) window.dispatchEvent(new Event(eventName));
}

function getRequestHeaders() {
  const accessCode = getEditorAccessCode();

  return {
    "Content-Type": "application/json",
    "X-Editor-Access-Code": accessCode,
  };
}

async function requestSharedState(path = "", init?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...getRequestHeaders(),
      ...(init?.headers ?? {}),
    },
  });
  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  const errorCode =
    payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
      ? payload.error
      : `http_${response.status}`;
  const supabaseStatus =
    payload && typeof payload === "object" && "supabaseStatus" in payload && typeof payload.supabaseStatus === "number"
      ? ` supabase:${payload.supabaseStatus}`
      : "";
  const detail =
    payload && typeof payload === "object" && "detail" in payload && typeof payload.detail === "string" ? ` ${payload.detail}` : "";
  const debugCode = `${errorCode}${supabaseStatus}${detail}`.trim();

  if (response.status === 401 || response.status === 403) {
    clearEditorAccessCode();
    throw new SharedStateError("editor access denied", debugCode, response.status);
  }

  if (!response.ok) throw new SharedStateError(`shared state request failed: ${response.status}`, debugCode, response.status);
  return payload;
}

function applyDocument(document: SharedStateDocument) {
  const storageKey = localStorageKeys[document.key];
  const knownUpdatedAt = remoteUpdatedAt.get(document.key);

  if (!storageKey || (knownUpdatedAt && knownUpdatedAt >= document.updatedAt)) return false;

  remoteUpdatedAt.set(document.key, document.updatedAt);
  window.localStorage.setItem(storageKey, JSON.stringify(document.value));
  return true;
}

function readLocalSharedValue(key: SharedStateKey) {
  const storageKey = localStorageKeys[key];
  const raw = window.localStorage.getItem(storageKey);

  if (!raw) return { hasValue: false, value: null };

  try {
    const value = JSON.parse(raw) as unknown;
    const hasValue = Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined;

    return { hasValue, value };
  } catch {
    return { hasValue: false, value: null };
  }
}

function seedMissingRemoteDocuments(documents: SharedStateDocument[]) {
  const remoteKeys = new Set(documents.map((document) => document.key));

  for (const key of Object.keys(localStorageKeys) as SharedStateKey[]) {
    if (remoteKeys.has(key)) continue;

    const local = readLocalSharedValue(key);
    if (local.hasValue) queueSharedStateSave(key, local.value);
  }
}

export async function hydrateSharedState() {
  if (!SHARED_EDITING_ENABLED || !getEditorAccessCode()) return "disabled" satisfies SharedStateStatus;

  const payload = (await requestSharedState()) as { documents?: SharedStateDocument[] };
  const documents = payload.documents ?? [];
  let changed = false;

  applyingRemoteState = true;
  try {
    for (const document of documents) changed = applyDocument(document) || changed;
  } finally {
    applyingRemoteState = false;
  }

  hasHydratedSharedState = true;
  seedMissingRemoteDocuments(documents);
  if (changed) dispatchSharedStateRefresh();
  return "ready" satisfies SharedStateStatus;
}

export function startSharedStatePolling(onStatus?: (status: SharedStateStatus) => void) {
  if (!SHARED_EDITING_ENABLED || !getEditorAccessCode()) return () => undefined;

  let isStopped = false;
  let timeoutId = 0;

  const tick = async () => {
    if (isStopped) return;

    try {
      onStatus?.("syncing");
      await hydrateSharedState();
      onStatus?.("ready");
    } catch {
      onStatus?.(getEditorAccessCode() ? "error" : "locked");
    } finally {
      if (!isStopped) timeoutId = window.setTimeout(tick, POLL_INTERVAL_MS);
    }
  };

  void tick();

  return () => {
    isStopped = true;
    window.clearTimeout(timeoutId);
  };
}

export function queueSharedStateSave(key: SharedStateKey, value: unknown) {
  if (!SHARED_EDITING_ENABLED || !getEditorAccessCode() || applyingRemoteState || !hasHydratedSharedState) return;

  const existingTimer = pushTimers.get(key);
  if (existingTimer) window.clearTimeout(existingTimer);

  const timerId = window.setTimeout(() => {
    pushTimers.delete(key);
    void requestSharedState(`/${encodeURIComponent(key)}`, {
      body: JSON.stringify({ value }),
      headers: {
        "X-Shared-State-Base-Updated-At": remoteUpdatedAt.get(key) ?? "",
      },
      method: "PUT",
    })
      .then((document) => {
        const updatedAt =
          document && typeof document === "object" && "updatedAt" in document && typeof document.updatedAt === "string"
            ? document.updatedAt
            : "";
        if (updatedAt) remoteUpdatedAt.set(key, updatedAt);
      })
      .catch((error) => {
        console.warn("[shared-state] save failed", key, error);
        if (error instanceof SharedStateError && error.status === 409) {
          void hydrateSharedState().catch((hydrateError) => {
            console.warn("[shared-state] conflict refresh failed", hydrateError);
          });
        }
      });
  }, PUSH_DEBOUNCE_MS);

  pushTimers.set(key, timerId);
}
