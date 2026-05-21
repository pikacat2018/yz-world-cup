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
}

export function isApplyingSharedState() {
  return applyingRemoteState;
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

  if (response.status === 401 || response.status === 403) {
    clearEditorAccessCode();
    throw new Error("editor access denied");
  }

  if (!response.ok) throw new Error(`shared state request failed: ${response.status}`);
  return response.json() as Promise<unknown>;
}

function applyDocument(document: SharedStateDocument) {
  const storageKey = localStorageKeys[document.key];
  const knownUpdatedAt = remoteUpdatedAt.get(document.key);

  if (!storageKey || (knownUpdatedAt && knownUpdatedAt >= document.updatedAt)) return false;

  remoteUpdatedAt.set(document.key, document.updatedAt);
  window.localStorage.setItem(storageKey, JSON.stringify(document.value));
  return true;
}

export async function hydrateSharedState() {
  if (!SHARED_EDITING_ENABLED || !getEditorAccessCode()) return "disabled" satisfies SharedStateStatus;

  const payload = (await requestSharedState()) as { documents?: SharedStateDocument[] };
  let changed = false;

  applyingRemoteState = true;
  try {
    for (const document of payload.documents ?? []) changed = applyDocument(document) || changed;
  } finally {
    applyingRemoteState = false;
  }

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
  if (!SHARED_EDITING_ENABLED || !getEditorAccessCode() || applyingRemoteState) return;

  const existingTimer = pushTimers.get(key);
  if (existingTimer) window.clearTimeout(existingTimer);

  const timerId = window.setTimeout(() => {
    pushTimers.delete(key);
    void requestSharedState(`/${encodeURIComponent(key)}`, {
      body: JSON.stringify({ value }),
      method: "PUT",
    }).catch((error) => {
      console.warn("[shared-state] save failed", key, error);
    });
  }, PUSH_DEBOUNCE_MS);

  pushTimers.set(key, timerId);
}
