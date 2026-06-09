import type { Match } from "../data/mockWorldCup";
import { getEditorAccessCode, isSharedEditingEnabled } from "../shared/onlineState";

export type MatchWatchStatus = "want" | "watched";
export type MatchWatchMethod = "live" | "replay" | "highlights";

export type MatchRecord = {
  matchId: string;
  matchNo: number;
  groupId: string;
  stage: string;
  homeLabel?: string;
  awayLabel?: string;
  matchDate: string;
  venue: string;
  watchStatus: MatchWatchStatus;
  rating?: number;
  comment?: string;
  tags: string[];
  watchedAt?: string;
  watchedPlace?: string;
  watchMethod?: MatchWatchMethod;
  isMemorable: boolean;
  createdAt: string;
  updatedAt: string;
};

export const MATCH_RECORD_STORAGE_KEY = "yz-world-cup-match-records-v1";
export const MATCH_RECORD_UPDATED_EVENT = "yz-world-cup-match-record-updated";

const API_BASE = "/api/match-records";
const MAX_MATCH_RECORDS = 500;
let hasHydratedRemoteRecords = false;

const isWatchStatus = (value: unknown): value is MatchWatchStatus => value === "want" || value === "watched";

const isWatchMethod = (value: unknown): value is MatchWatchMethod =>
  value === "live" || value === "replay" || value === "highlights";

const isMatchRecord = (value: unknown): value is MatchRecord => {
  if (!value || typeof value !== "object") return false;

  const record = value as Partial<MatchRecord>;
  return (
    typeof record.matchId === "string" &&
    typeof record.matchNo === "number" &&
    typeof record.groupId === "string" &&
    typeof record.stage === "string" &&
    typeof record.matchDate === "string" &&
    typeof record.venue === "string" &&
    isWatchStatus(record.watchStatus) &&
    Array.isArray(record.tags) &&
    typeof record.isMemorable === "boolean" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string"
  );
};

const sortMatchRecords = (records: MatchRecord[]) =>
  [...records].sort((a, b) => a.matchNo - b.matchNo || a.matchId.localeCompare(b.matchId));

const getRecordTime = (record: Pick<MatchRecord, "updatedAt">) => {
  const time = new Date(record.updatedAt).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const getScopedStorageKey = () => {
  const accessCode = getEditorAccessCode();
  return accessCode ? `${MATCH_RECORD_STORAGE_KEY}:${accessCode}` : MATCH_RECORD_STORAGE_KEY;
};

const getRequestHeaders = () => ({
  "Content-Type": "application/json",
  "X-Editor-Access-Code": getEditorAccessCode(),
});

const canUseRemoteRecords = () => isSharedEditingEnabled() && Boolean(getEditorAccessCode());

function saveMatchRecordsLocal(records: MatchRecord[]) {
  const byMatchId = new Map<string, MatchRecord>();
  for (const record of records) byMatchId.set(record.matchId, record);
  const nextRecords = sortMatchRecords(Array.from(byMatchId.values())).slice(0, MAX_MATCH_RECORDS);
  window.localStorage.setItem(getScopedStorageKey(), JSON.stringify(nextRecords));
}

async function pushMatchRecordRemote(record: MatchRecord) {
  if (!canUseRemoteRecords()) return;

  const response = await fetch(`${API_BASE}/${encodeURIComponent(record.matchId)}`, {
    body: JSON.stringify({ record }),
    headers: getRequestHeaders(),
    method: "PUT",
  });

  if (!response.ok) throw new Error(`match_record_write_failed:${response.status}`);
}

async function deleteMatchRecordRemote(matchId: string) {
  if (!canUseRemoteRecords()) return;

  const response = await fetch(`${API_BASE}/${encodeURIComponent(matchId)}`, {
    headers: getRequestHeaders(),
    method: "DELETE",
  });

  if (!response.ok) throw new Error(`match_record_delete_failed:${response.status}`);
}

export function readMatchRecords(): MatchRecord[] {
  try {
    const raw = window.localStorage.getItem(getScopedStorageKey());
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? sortMatchRecords(parsed.filter(isMatchRecord)).slice(0, MAX_MATCH_RECORDS) : [];
  } catch {
    return [];
  }
}

export function readMatchRecord(matchId: string): MatchRecord | undefined {
  return readMatchRecords().find((record) => record.matchId === matchId);
}

export function saveMatchRecords(records: MatchRecord[]) {
  saveMatchRecordsLocal(records);
}

export function notifyMatchRecordsUpdated() {
  window.dispatchEvent(new Event(MATCH_RECORD_UPDATED_EVENT));
}

export async function hydrateMatchRecords() {
  if (!canUseRemoteRecords() || hasHydratedRemoteRecords) return;

  const response = await fetch(API_BASE, {
    headers: getRequestHeaders(),
  });

  if (!response.ok) throw new Error(`match_record_read_failed:${response.status}`);

  const payload = (await response.json().catch(() => null)) as { records?: unknown[] } | null;
  const remoteRecords = Array.isArray(payload?.records) ? payload.records.filter(isMatchRecord) : [];
  const mergedRecords = new Map(readMatchRecords().map((record) => [record.matchId, record]));

  for (const remoteRecord of remoteRecords) {
    const localRecord = mergedRecords.get(remoteRecord.matchId);
    if (!localRecord || getRecordTime(remoteRecord) >= getRecordTime(localRecord)) {
      mergedRecords.set(remoteRecord.matchId, remoteRecord);
    }
  }

  saveMatchRecordsLocal(Array.from(mergedRecords.values()));
  hasHydratedRemoteRecords = true;
  notifyMatchRecordsUpdated();
}

export function resetMatchRecordHydration() {
  hasHydratedRemoteRecords = false;
}

export function deleteMatchRecord(matchId: string) {
  saveMatchRecordsLocal(readMatchRecords().filter((record) => record.matchId !== matchId));
  notifyMatchRecordsUpdated();
  void deleteMatchRecordRemote(matchId).catch((error) => {
    console.warn("[match-records] remote delete failed", error);
  });
}

export function createMatchRecordSnapshot(
  match: Match,
  values: {
    watchStatus: MatchWatchStatus;
    rating?: number;
    comment?: string;
    tags: string[];
    watchedAt?: string;
    watchedPlace?: string;
    watchMethod?: MatchWatchMethod;
    isMemorable: boolean;
  },
  existing?: MatchRecord,
): MatchRecord {
  const now = new Date().toISOString();

  return {
    matchId: match.id,
    matchNo: match.matchNo,
    groupId: match.groupId,
    stage: match.stage,
    homeLabel: match.homeLabel,
    awayLabel: match.awayLabel,
    matchDate: match.date,
    venue: match.venue,
    watchStatus: values.watchStatus,
    rating: values.rating,
    comment: values.comment,
    tags: values.tags,
    watchedAt: values.watchedAt,
    watchedPlace: values.watchedPlace,
    watchMethod: isWatchMethod(values.watchMethod) ? values.watchMethod : undefined,
    isMemorable: values.isMemorable,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function upsertMatchRecord(record: MatchRecord) {
  const records = readMatchRecords();
  const nextRecords = records.filter((item) => item.matchId !== record.matchId);
  nextRecords.push(record);
  saveMatchRecordsLocal(nextRecords);
  notifyMatchRecordsUpdated();
  void pushMatchRecordRemote(record).catch((error) => {
    console.warn("[match-records] remote save failed", error);
  });
}

export function getMatchRecordBadge(record?: MatchRecord) {
  if (!record) return "";
  if (record.watchStatus === "want") return "想看";
  if (typeof record.rating === "number") return `★${record.rating}`;
  if (record.comment?.trim()) return "评";
  return "已看";
}
