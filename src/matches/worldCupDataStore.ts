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
const WORLD_CUP_EVENT_CACHE_KEY = "yz-world-cup-match-events-v1";
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

function readEventCache() {
  if (typeof window === "undefined") return new Map<string, Pick<Match, "goals" | "penaltyShootout" | "redCards">>();

  try {
    const raw = window.localStorage.getItem(WORLD_CUP_EVENT_CACHE_KEY);
    if (!raw) return new Map<string, Pick<Match, "goals" | "penaltyShootout" | "redCards">>();
    const parsed = JSON.parse(raw) as Array<[string, Pick<Match, "goals" | "penaltyShootout" | "redCards">]>;
    return new Map(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Map<string, Pick<Match, "goals" | "penaltyShootout" | "redCards">>();
  }
}

function saveEventCache(matches: Match[]) {
  if (typeof window === "undefined") return;

  const eventCache = new Map<string, Pick<Match, "goals" | "penaltyShootout" | "redCards">>(readEventCache());
  for (const match of matches) {
    if (match.goals?.length || match.redCards?.length || match.penaltyShootout) {
      eventCache.set(match.id, {
        goals: match.goals,
        penaltyShootout: match.penaltyShootout,
        redCards: match.redCards,
      });
    }
  }

  safeSetLocalStorage(WORLD_CUP_EVENT_CACHE_KEY, JSON.stringify([...eventCache.entries()]));
}

function mergeMatchEvents(matches: Match[], previousMatches: Match[]) {
  const previousById = new Map(previousMatches.map((match) => [match.id, match]));
  const eventCache = readEventCache();

  return matches.map((match) => {
    const previous = previousById.get(match.id);
    const cached = eventCache.get(match.id);
    const goals = match.goals?.length ? match.goals : previous?.goals?.length ? previous.goals : cached?.goals;
    const redCards = match.redCards?.length
      ? match.redCards
      : previous?.redCards?.length
        ? previous.redCards
        : cached?.redCards;
    const penaltyShootout = match.penaltyShootout ?? previous?.penaltyShootout ?? cached?.penaltyShootout;

    return {
      ...match,
      goals,
      penaltyShootout,
      redCards,
    };
  });
}

function normalizePayload(payload: WorldCupApiPayload, previousSnapshot: WorldCupSnapshot): WorldCupSnapshot {
  if (!Array.isArray(payload.matches) || !Array.isArray(payload.groups) || payload.matches.length === 0) {
    throw new Error("world_cup_payload_invalid");
  }

  const mergedMatches = mergeMatchEvents(payload.matches, previousSnapshot.allMatches);
  const mergedMatchesById = new Map(mergedMatches.map((match) => [match.id, match]));
  const mergedGroups = payload.groups.map((group) => ({
    ...group,
    matches: group.matches.map((match) => mergedMatchesById.get(match.id) ?? match),
  }));

  return {
    allMatches: mergedMatches,
    competitionId: payload.competitionId,
    eventEnhancementProvider: payload.eventEnhancement?.provider ?? "fifa",
    eventEnhancementStatus: payload.eventEnhancement?.status ?? "ready",
    fetchedAt: payload.fetchedAt,
    groups: mergedGroups,
    isFallback: false,
    seasonId: payload.seasonId,
    source: payload.source ?? "fifa-official",
    teams: fallbackTeams,
  };
}

async function fetchWorldCupSnapshot() {
  const response = await fetch(WORLD_CUP_API_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`world_cup_fetch_failed:${response.status}`);
  return normalizePayload((await response.json()) as WorldCupApiPayload, currentSnapshot);
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
      saveEventCache(snapshot.allMatches);
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
