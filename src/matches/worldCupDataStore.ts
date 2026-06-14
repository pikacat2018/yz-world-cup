import { useEffect, useState } from "react";
import { safeSetLocalStorage } from "../shared/safeStorage";
import {
  allMatches as fallbackMatches,
  groups as fallbackGroups,
  teams as fallbackTeams,
  type Group,
  type Match,
  type Team,
} from "../data/mockWorldCup";

type WorldCupApiPayload = {
  competitionId: string;
  eventEnhancement?: {
    provider?: string;
    status?: string;
  };
  fetchedAt?: string;
  groups?: Group[];
  matches?: Match[];
  seasonId?: string;
  source?: string;
};

type WorldCupSnapshot = {
  allMatches: Match[];
  competitionId?: string;
  eventEnhancementProvider?: string;
  eventEnhancementStatus?: string;
  fetchedAt?: string;
  groups: Group[];
  isFallback: boolean;
  seasonId?: string;
  source: string;
  teams: Team[];
};

const WORLD_CUP_API_URL = "/api/world-cup";
const WORLD_CUP_STORAGE_KEY = "yz-world-cup-live-snapshot-v4";
const WORLD_CUP_UPDATED_EVENT = "yz-world-cup-live-updated";
const REQUEST_TTL_MS = 5 * 60 * 1000;

const fallbackSnapshot: WorldCupSnapshot = {
  allMatches: fallbackMatches,
  eventEnhancementProvider: "fifa",
  eventEnhancementStatus: "ready",
  groups: fallbackGroups,
  isFallback: true,
  source: "mock",
  teams: fallbackTeams,
};

let currentSnapshot = readCachedSnapshot() ?? fallbackSnapshot;
let currentRequest: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(WORLD_CUP_UPDATED_EVENT));
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readCachedSnapshot(): WorldCupSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(WORLD_CUP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorldCupSnapshot & { cachedAt?: string };
    if (!Array.isArray(parsed.allMatches) || !Array.isArray(parsed.groups) || !Array.isArray(parsed.teams)) {
      return null;
    }
    if (parsed.cachedAt && Date.now() - new Date(parsed.cachedAt).getTime() > REQUEST_TTL_MS) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveCachedSnapshot(snapshot: WorldCupSnapshot) {
  if (typeof window === "undefined") return;
  const cachedSnapshot = JSON.stringify({
    ...snapshot,
    cachedAt: new Date().toISOString(),
  });
  safeSetLocalStorage(WORLD_CUP_STORAGE_KEY, cachedSnapshot);
}

function normalizePayload(payload: WorldCupApiPayload): WorldCupSnapshot {
  if (!Array.isArray(payload.matches) || !Array.isArray(payload.groups) || payload.matches.length === 0) {
    throw new Error("world_cup_payload_invalid");
  }

  return {
    allMatches: payload.matches,
    competitionId: payload.competitionId,
    eventEnhancementProvider: payload.eventEnhancement?.provider ?? "fifa",
    eventEnhancementStatus: payload.eventEnhancement?.status ?? "ready",
    fetchedAt: payload.fetchedAt,
    groups: payload.groups,
    isFallback: false,
    seasonId: payload.seasonId,
    source: payload.source ?? "fifa-official",
    teams: fallbackTeams,
  };
}

async function fetchWorldCupSnapshot() {
  const response = await fetch(WORLD_CUP_API_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`world_cup_fetch_failed:${response.status}`);
  return normalizePayload((await response.json()) as WorldCupApiPayload);
}

export function readWorldCupSnapshot() {
  return currentSnapshot;
}

export async function hydrateWorldCupSnapshot(force = false) {
  if (!force && currentRequest) return currentRequest;

  currentRequest = fetchWorldCupSnapshot()
    .then((snapshot) => {
      currentSnapshot = snapshot;
      saveCachedSnapshot(snapshot);
      notifyListeners();
    })
    .catch((error) => {
      console.warn("[world-cup] hydrate failed", error);
    })
    .finally(() => {
      currentRequest = null;
    });

  return currentRequest;
}

export function useWorldCupData() {
  const [snapshot, setSnapshot] = useState(readWorldCupSnapshot);

  useEffect(() => {
    const unsubscribe = subscribe(() => setSnapshot(readWorldCupSnapshot()));
    void hydrateWorldCupSnapshot();
    return () => {
      unsubscribe();
    };
  }, []);

  return snapshot;
}

export { WORLD_CUP_UPDATED_EVENT };
