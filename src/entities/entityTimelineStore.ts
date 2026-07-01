import { getEditorAccessCode, isSharedEditingEnabled } from "../shared/onlineState";

export type EntityType = "player" | "referee" | "official" | "fan" | "stadium" | "place" | "team" | "other";

export type EntityTimelineEvent = {
  id: string;
  entityId: string;
  date: string;
  title: string;
  url?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type EntityProfile = {
  id: string;
  name: string;
  type: EntityType;
  aliases?: string[];
  createdAt: string;
  updatedAt: string;
};

export type EntityTimelineRecord = EntityProfile & {
  events: EntityTimelineEvent[];
};

export const ENTITY_TIMELINE_UPDATED_EVENT = "yz-world-cup-entity-timeline-updated";

const API_BASE = "/api/entity-timelines";
const MAX_ENTITY_TIMELINE_RECORDS = 5000;
let hasHydratedRemoteEntityTimelines = false;
let entityTimelineMemoryCache: EntityTimelineRecord[] = [];

const entityTypes = new Set<EntityType>(["player", "referee", "official", "fan", "stadium", "place", "team", "other"]);

const isEntityType = (value: unknown): value is EntityType => typeof value === "string" && entityTypes.has(value as EntityType);

const normalizeText = (value: string) => value.trim().toLowerCase();

const slugifyEntityName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

const getRecordTime = (record: Pick<EntityTimelineRecord, "updatedAt">) => {
  const time = new Date(record.updatedAt).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const getEventTime = (event: Pick<EntityTimelineEvent, "createdAt">) => {
  const time = new Date(event.createdAt).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const sanitizeAliases = (aliases?: string[]) =>
  Array.from(
    new Set(
      (aliases ?? [])
        .map((alias) => alias.trim())
        .filter(Boolean)
        .slice(0, 20),
    ),
  );

const isEntityTimelineEvent = (value: unknown): value is EntityTimelineEvent => {
  if (!value || typeof value !== "object") return false;

  const event = value as Partial<EntityTimelineEvent>;
  return (
    typeof event.id === "string" &&
    typeof event.entityId === "string" &&
    typeof event.date === "string" &&
    typeof event.title === "string" &&
    typeof event.createdAt === "string" &&
    typeof event.updatedAt === "string"
  );
};

const sortEntityTimelineEvents = (events: EntityTimelineEvent[]) =>
  [...events]
    .filter(isEntityTimelineEvent)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        getEventTime(a) - getEventTime(b) ||
        a.id.localeCompare(b.id),
    );

const isEntityTimelineRecord = (value: unknown): value is EntityTimelineRecord => {
  if (!value || typeof value !== "object") return false;

  const record = value as Partial<EntityTimelineRecord>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    isEntityType(record.type) &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" &&
    Array.isArray(record.events)
  );
};

const sanitizeEntityTimelineRecord = (record: EntityTimelineRecord): EntityTimelineRecord => ({
  ...record,
  aliases: sanitizeAliases(record.aliases),
  events: sortEntityTimelineEvents(record.events),
});

const sortEntityTimelineRecords = (records: EntityTimelineRecord[]) =>
  [...records]
    .filter(isEntityTimelineRecord)
    .map((record) => sanitizeEntityTimelineRecord(record))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN") || getRecordTime(b) - getRecordTime(a));

const getRequestHeaders = () => ({
  "Content-Type": "application/json",
  "X-Editor-Access-Code": getEditorAccessCode(),
});

const canUseRemoteEntityTimelines = () => isSharedEditingEnabled() && Boolean(getEditorAccessCode());

function saveEntityTimelineRecordsLocal(records: EntityTimelineRecord[]) {
  const deduped = new Map<string, EntityTimelineRecord>();
  for (const record of records) deduped.set(record.id, sanitizeEntityTimelineRecord(record));
  entityTimelineMemoryCache = sortEntityTimelineRecords(Array.from(deduped.values())).slice(0, MAX_ENTITY_TIMELINE_RECORDS);
}

async function pushEntityTimelineRecordRemote(record: EntityTimelineRecord) {
  if (!canUseRemoteEntityTimelines()) return;

  const response = await fetch(`${API_BASE}/${encodeURIComponent(record.id)}`, {
    body: JSON.stringify({ record }),
    headers: getRequestHeaders(),
    method: "PUT",
  });

  if (!response.ok) throw new Error(`entity_timeline_write_failed:${response.status}`);
}

async function deleteEntityTimelineRecordRemote(entityId: string) {
  if (!canUseRemoteEntityTimelines()) return;

  const response = await fetch(`${API_BASE}/${encodeURIComponent(entityId)}`, {
    headers: getRequestHeaders(),
    method: "DELETE",
  });

  if (!response.ok) throw new Error(`entity_timeline_delete_failed:${response.status}`);
}

export function notifyEntityTimelineUpdated() {
  window.dispatchEvent(new Event(ENTITY_TIMELINE_UPDATED_EVENT));
}

export function resetEntityTimelineHydration() {
  hasHydratedRemoteEntityTimelines = false;
  entityTimelineMemoryCache = [];
}

export function readEntityTimelineRecords(): EntityTimelineRecord[] {
  return entityTimelineMemoryCache;
}

export function saveEntityTimelineRecords(records: EntityTimelineRecord[]) {
  saveEntityTimelineRecordsLocal(records);
}

export function hydrateEntityTimelineRecordsFromRemote(records: EntityTimelineRecord[]) {
  const merged = new Map(readEntityTimelineRecords().map((record) => [record.id, record]));

  for (const remoteRecord of records) {
    const localRecord = merged.get(remoteRecord.id);
    if (!localRecord || getRecordTime(remoteRecord) >= getRecordTime(localRecord)) {
      merged.set(remoteRecord.id, sanitizeEntityTimelineRecord(remoteRecord));
    }
  }

  saveEntityTimelineRecordsLocal(Array.from(merged.values()));
  notifyEntityTimelineUpdated();
}

export async function hydrateEntityTimelineRecords(force = false) {
  if (!canUseRemoteEntityTimelines() || (hasHydratedRemoteEntityTimelines && !force)) return;

  const response = await fetch(API_BASE, {
    headers: getRequestHeaders(),
  });

  if (!response.ok) throw new Error(`entity_timeline_read_failed:${response.status}`);

  const payload = (await response.json().catch(() => null)) as { records?: unknown[] } | null;
  const remoteRecords = Array.isArray(payload?.records) ? payload.records.filter(isEntityTimelineRecord) : [];
  hydrateEntityTimelineRecordsFromRemote(remoteRecords);
  hasHydratedRemoteEntityTimelines = true;
}

export function findEntityTimelineRecordByName(name: string) {
  const normalizedName = normalizeText(name);
  if (!normalizedName) return undefined;

  return readEntityTimelineRecords().find((record) => normalizeText(record.name) === normalizedName);
}

export function searchEntityTimelineRecords(query: string) {
  const normalizedQuery = normalizeText(query);
  const records = readEntityTimelineRecords();

  if (!normalizedQuery) return records;

  return records.filter((record) => {
    const haystacks = [record.name, ...(record.aliases ?? [])].map(normalizeText);
    return haystacks.some((value) => value.includes(normalizedQuery));
  });
}

export function createEntityTimelineRecord(name: string, type: EntityType, aliases?: string[]) {
  const normalizedName = name.trim();
  const existing = findEntityTimelineRecordByName(normalizedName);
  if (existing) return existing;

  const now = new Date().toISOString();
  const slug = slugifyEntityName(normalizedName) || "entity";

  return {
    id: `entity-${slug}-${Date.now().toString(36)}`,
    name: normalizedName,
    type,
    aliases: sanitizeAliases(aliases),
    createdAt: now,
    updatedAt: now,
    events: [],
  } satisfies EntityTimelineRecord;
}

export function createEntityTimelineEvent(
  entityId: string,
  values: {
    date: string;
    title: string;
    url?: string;
    note?: string;
  },
  existing?: EntityTimelineEvent,
) {
  const now = new Date().toISOString();

  return {
    id: existing?.id ?? `entity-event-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    entityId,
    date: values.date,
    title: values.title.trim(),
    url: values.url?.trim() || undefined,
    note: values.note?.trim() || undefined,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  } satisfies EntityTimelineEvent;
}

export function upsertEntityTimelineRecord(record: EntityTimelineRecord) {
  const records = readEntityTimelineRecords();
  const nextRecords = records.filter((item) => item.id !== record.id);
  nextRecords.push(sanitizeEntityTimelineRecord(record));
  saveEntityTimelineRecordsLocal(nextRecords);
  notifyEntityTimelineUpdated();
  void pushEntityTimelineRecordRemote(record).catch((error) => {
    console.warn("[entity-timelines] remote save failed", error);
  });
}

export function deleteEntityTimelineRecord(entityId: string) {
  saveEntityTimelineRecordsLocal(readEntityTimelineRecords().filter((record) => record.id !== entityId));
  notifyEntityTimelineUpdated();
  void deleteEntityTimelineRecordRemote(entityId).catch((error) => {
    console.warn("[entity-timelines] remote delete failed", error);
  });
}
