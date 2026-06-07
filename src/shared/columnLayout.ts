export type DesktopColumnId = "rail" | "radar" | "editor" | "news";

export const DESKTOP_COLUMN_ORDER_STORAGE_KEY = "yz-world-cup:desktop-column-order";

export const DEFAULT_DESKTOP_COLUMN_ORDER: DesktopColumnId[] = ["rail", "radar", "editor", "news"];

const DESKTOP_COLUMN_ID_SET = new Set<DesktopColumnId>(DEFAULT_DESKTOP_COLUMN_ORDER);

export function isValidDesktopColumnOrder(value: unknown): value is DesktopColumnId[] {
  if (!Array.isArray(value) || value.length !== DEFAULT_DESKTOP_COLUMN_ORDER.length) return false;

  const seen = new Set<DesktopColumnId>();
  for (const item of value) {
    if (typeof item !== "string" || !DESKTOP_COLUMN_ID_SET.has(item as DesktopColumnId)) return false;
    if (seen.has(item as DesktopColumnId)) return false;
    seen.add(item as DesktopColumnId);
  }

  return seen.size === DEFAULT_DESKTOP_COLUMN_ORDER.length;
}

export function normalizeDesktopColumnOrder(value: unknown): DesktopColumnId[] {
  return isValidDesktopColumnOrder(value) ? [...value] : [...DEFAULT_DESKTOP_COLUMN_ORDER];
}

export function readDesktopColumnOrder(): DesktopColumnId[] {
  if (typeof window === "undefined") return [...DEFAULT_DESKTOP_COLUMN_ORDER];

  try {
    const raw = window.localStorage.getItem(DESKTOP_COLUMN_ORDER_STORAGE_KEY);
    if (!raw) return [...DEFAULT_DESKTOP_COLUMN_ORDER];

    return normalizeDesktopColumnOrder(JSON.parse(raw));
  } catch {
    return [...DEFAULT_DESKTOP_COLUMN_ORDER];
  }
}

export function saveDesktopColumnOrder(order: DesktopColumnId[]) {
  if (typeof window === "undefined") return;

  const normalized = normalizeDesktopColumnOrder(order);
  window.localStorage.setItem(DESKTOP_COLUMN_ORDER_STORAGE_KEY, JSON.stringify(normalized));
}
