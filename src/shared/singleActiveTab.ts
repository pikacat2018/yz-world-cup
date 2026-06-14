import { useCallback, useEffect, useRef, useState } from "react";
import { safeRemoveLocalStorage, safeSetLocalStorage } from "./safeStorage";

type ActiveTabRecord = {
  id: string;
  updatedAt: number;
};

export type SingleActiveTabStatus = "checking" | "active" | "passive";

const ACTIVE_TAB_STORAGE_KEY = "yz-world-cup-active-tab";
const ACTIVE_TAB_CHANNEL = "yz-world-cup-active-tab";
const HEARTBEAT_INTERVAL_MS = 5_000;
const HEARTBEAT_TIMEOUT_MS = 15_000;
const PASSIVE_CHECK_INTERVAL_MS = 2_500;

const createTabId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

const readActiveTabRecord = (): ActiveTabRecord | null => {
  try {
    const raw = window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ActiveTabRecord>;
    if (typeof parsed.id !== "string" || typeof parsed.updatedAt !== "number") return null;
    return { id: parsed.id, updatedAt: parsed.updatedAt };
  } catch {
    return null;
  }
};

const writeActiveTabRecord = (id: string) => {
  safeSetLocalStorage(ACTIVE_TAB_STORAGE_KEY, JSON.stringify({ id, updatedAt: Date.now() }));
};

const isRecordExpired = (record: ActiveTabRecord | null) => !record || Date.now() - record.updatedAt > HEARTBEAT_TIMEOUT_MS;

export function useSingleActiveTab() {
  const tabIdRef = useRef(createTabId());
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [status, setStatus] = useState<SingleActiveTabStatus>("checking");

  const releaseIfOwner = useCallback(() => {
    const current = readActiveTabRecord();
    if (current?.id === tabIdRef.current) safeRemoveLocalStorage(ACTIVE_TAB_STORAGE_KEY);
  }, []);

  const claimActive = useCallback(() => {
    writeActiveTabRecord(tabIdRef.current);
    channelRef.current?.postMessage({ id: tabIdRef.current, type: "active" });
    setStatus("active");
  }, []);

  const checkActive = useCallback(
    (force = false) => {
      const current = readActiveTabRecord();

      if (force || current?.id === tabIdRef.current || isRecordExpired(current)) {
        claimActive();
        return;
      }

      setStatus("passive");
    },
    [claimActive],
  );

  useEffect(() => {
    channelRef.current = "BroadcastChannel" in window ? new BroadcastChannel(ACTIVE_TAB_CHANNEL) : null;
    checkActive();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== "active" || event.data?.id === tabIdRef.current) return;
      const current = readActiveTabRecord();
      if (current?.id !== tabIdRef.current) setStatus("passive");
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === ACTIVE_TAB_STORAGE_KEY) checkActive();
    };

    const handleUnload = () => {
      releaseIfOwner();
      channelRef.current?.postMessage({ id: tabIdRef.current, type: "closed" });
    };

    channelRef.current?.addEventListener("message", handleMessage);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("pagehide", handleUnload);

    return () => {
      releaseIfOwner();
      channelRef.current?.postMessage({ id: tabIdRef.current, type: "closed" });
      channelRef.current?.removeEventListener("message", handleMessage);
      channelRef.current?.close();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("pagehide", handleUnload);
      channelRef.current = null;
    };
  }, [checkActive, releaseIfOwner]);

  useEffect(() => {
    if (status !== "active") return undefined;

    writeActiveTabRecord(tabIdRef.current);
    const intervalId = window.setInterval(() => {
      writeActiveTabRecord(tabIdRef.current);
    }, HEARTBEAT_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [status]);

  useEffect(() => {
    if (status !== "passive") return undefined;

    const intervalId = window.setInterval(() => checkActive(), PASSIVE_CHECK_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [checkActive, status]);

  return {
    status,
    tryTakeover: () => checkActive(),
  };
}
