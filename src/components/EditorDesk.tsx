import { type CSSProperties, type MouseEvent, type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  createManualFollowUp,
  FOLLOW_UP_UPDATED_EVENT,
  formatDateLabel,
  getFollowUpPlacement,
  getLocalDateKey,
  getNextFollowUpDisplayOrder,
  mergePinnedNewsIntoFollowUps,
  notifyFollowUpUpdated,
  readFollowUpItems,
  saveFollowUpItems,
  type FollowUpItem,
} from "../news/followUpStore";
import {
  fetchLatestRedditHotNews,
  markRedditHotSeen,
  mergeManualRedditHotItems,
  readStoredNewsItems,
  saveNewsItems,
  savePinnedNewsIds,
} from "../news/newsStore";
import {
  dispatchRecentKeywordSearch,
  getRecentKeywords,
  recentKeywordWindowOptions,
  type RecentKeywordWindowHours,
} from "../news/recentKeywords";
import { sourceColors } from "../news/sourceColors";
import { BOTTOM_TICKER_UPDATED_EVENT, notifyBottomTickerUpdated } from "../news/ticker";
import type { NewsItem } from "../news/types";

const MAX_NESTING_LEVEL = 2;

const getOriginalLink = (item: FollowUpItem) => item.url || item.externalUrl || "";

type FollowUpTreeRow = {
  item: FollowUpItem;
  level: number;
  childCount: number;
};

type TouchDropTarget = {
  id: string;
  mode: "before" | "after" | "inside";
};

type TouchDragState = {
  id: string;
  isDragging: boolean;
  pointerId: number;
  startX: number;
  startY: number;
};

const buildChildrenMap = (items: FollowUpItem[]) => {
  const itemIds = new Set(items.map((item) => item.id));
  const children = new Map<string, FollowUpItem[]>();

  for (const item of items) {
    if (!item.parentId || !itemIds.has(item.parentId)) continue;

    children.set(item.parentId, [...(children.get(item.parentId) ?? []), item]);
  }

  return children;
};

const getItemLevel = (item: FollowUpItem, itemsById: Map<string, FollowUpItem>) => {
  let level = 0;
  let current = item;
  const seen = new Set<string>();

  while (current.parentId) {
    const parent = itemsById.get(current.parentId);
    if (!parent || seen.has(parent.id)) break;

    seen.add(parent.id);
    current = parent;
    level += 1;
  }

  return level;
};

const getSubtreeIds = (itemId: string, children: Map<string, FollowUpItem[]>): Set<string> => {
  const ids = new Set([itemId]);

  for (const child of children.get(itemId) ?? []) {
    for (const id of getSubtreeIds(child.id, children)) ids.add(id);
  }

  return ids;
};

const getSubtreeDepth = (itemId: string, children: Map<string, FollowUpItem[]>): number => {
  const childItems = children.get(itemId) ?? [];
  if (childItems.length === 0) return 0;

  return 1 + Math.max(...childItems.map((child) => getSubtreeDepth(child.id, children)));
};

const flattenVisibleItems = (items: FollowUpItem[], collapsedIds: Set<string>): FollowUpTreeRow[] => {
  const itemIds = new Set(items.map((item) => item.id));
  const children = buildChildrenMap(items);
  const rows: FollowUpTreeRow[] = [];
  const visit = (item: FollowUpItem, level: number) => {
    const childItems = children.get(item.id) ?? [];

    rows.push({ item, level, childCount: childItems.length });
    if (collapsedIds.has(item.id)) return;

    for (const child of childItems) visit(child, level + 1);
  };

  for (const item of items) {
    if (!item.parentId || !itemIds.has(item.parentId)) visit(item, 0);
  }

  return rows;
};

const buildExportText = (date: string, items: FollowUpItem[]) => {
  const rows = flattenVisibleItems(items, new Set());

  if (rows.length === 0) return `${date} 今日跟进\n\n暂无事项`;

  return [
    `${date} 今日跟进`,
    "",
    ...rows.flatMap(({ item, level }, index) => {
      const indent = "  ".repeat(level);
      const link = getOriginalLink(item);
      const note = item.note?.trim();
      const lines = [`${indent}${index + 1}. ${item.title}`];

      if (link) lines.push(`${indent}链接：${link}`);
      if (note) lines.push(`${indent}备注：${note}`);
      return [...lines, ""];
    }),
  ].join("\n").trimEnd();
};

const getMonthDays = (dateKey: string) => {
  const [yearValue, monthValue] = dateKey.split("-").map(Number);
  const year = yearValue || new Date().getFullYear();
  const month = monthValue || new Date().getMonth() + 1;
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingBlankCount = firstDay.getDay();
  const blanks = Array.from({ length: leadingBlankCount }, (_, index) => `blank-${index}`);
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  });

  return { blanks, days, monthLabel: `${year}-${String(month).padStart(2, "0")}` };
};

function RefreshIcon() {
  return (
    <svg aria-hidden="true" className="news-refresh-icon" viewBox="0 0 24 24">
      <path d="M4.5 8.5A7.5 7.5 0 1 1 6.7 17" />
      <path d="M4.5 8.5V3.8" />
      <path d="M4.5 8.5H9.2" />
    </svg>
  );
}

export default function EditorDesk() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [selectedDate, setSelectedDate] = useState(getLocalDateKey);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState("");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dateEditItem, setDateEditItem] = useState<FollowUpItem | null>(null);
  const [exportDraft, setExportDraft] = useState("");
  const [manualTitleDraft, setManualTitleDraft] = useState("");
  const [manualLinkDraft, setManualLinkDraft] = useState("");
  const [manualDateDraft, setManualDateDraft] = useState(getLocalDateKey);
  const [itemDateDraft, setItemDateDraft] = useState(getLocalDateKey);
  const [copyStatus, setCopyStatus] = useState("");
  const [keywordWindowHours, setKeywordWindowHours] = useState<RecentKeywordWindowHours>(12);
  const [refreshStatus, setRefreshStatus] = useState<"idle" | "fetching" | "updated" | "empty" | "failed">("idle");
  const [touchDropTarget, setTouchDropTarget] = useState<TouchDropTarget | null>(null);
  const touchDragRef = useRef<TouchDragState | null>(null);
  const touchDropTargetRef = useRef<TouchDropTarget | null>(null);
  const suppressNextTitleClickRef = useRef(false);

  const persistFollowUps = useCallback((nextItems: FollowUpItem[]) => {
    saveFollowUpItems(nextItems);
    setFollowUps(nextItems);
    notifyFollowUpUpdated();
  }, []);

  const refreshSelection = useCallback(() => {
    const nextNewsItems = readStoredNewsItems();
    const merged = mergePinnedNewsIntoFollowUps(readFollowUpItems(), nextNewsItems, selectedDate);

    if (merged.addedCount > 0) {
      saveFollowUpItems(merged.items);
      notifyFollowUpUpdated();
    }

    setNewsItems(nextNewsItems);
    setFollowUps(merged.items);
  }, [selectedDate]);

  useEffect(() => {
    refreshSelection();
  }, [refreshSelection]);

  useEffect(() => {
    window.addEventListener(BOTTOM_TICKER_UPDATED_EVENT, refreshSelection);
    window.addEventListener(FOLLOW_UP_UPDATED_EVENT, refreshSelection);
    window.addEventListener("storage", refreshSelection);

    return () => {
      window.removeEventListener(BOTTOM_TICKER_UPDATED_EVENT, refreshSelection);
      window.removeEventListener(FOLLOW_UP_UPDATED_EVENT, refreshSelection);
      window.removeEventListener("storage", refreshSelection);
    };
  }, [refreshSelection]);

  const selectedItems = useMemo(() => followUps.filter((item) => item.date === selectedDate && item.status === "active"), [followUps, selectedDate]);
  const visibleRows = useMemo(() => flattenVisibleItems(selectedItems, collapsedIds), [collapsedIds, selectedItems]);
  const exportText = useMemo(() => buildExportText(selectedDate, selectedItems), [selectedDate, selectedItems]);
  const markedDates = useMemo(
    () => new Set(followUps.filter((item) => item.status === "active").map((item) => item.date)),
    [followUps],
  );
  const monthDays = useMemo(() => getMonthDays(selectedDate), [selectedDate]);
  const recentKeywordResult = useMemo(() => getRecentKeywords(newsItems, keywordWindowHours), [newsItems, keywordWindowHours]);
  const hasRecentKeywords = recentKeywordResult.keywords.length > 0;

  const openExport = () => {
    setExportDraft(exportText);
    setCopyStatus("");
    setIsExportOpen(true);
  };

  const copyExportDraft = async () => {
    try {
      await navigator.clipboard.writeText(exportDraft);
      setCopyStatus("已复制");
    } catch {
      setCopyStatus("复制失败");
    }
  };

  const refreshSelectedItems = async () => {
    if (refreshStatus === "fetching") return;

    setRefreshStatus("fetching");

    try {
      const currentNewsItems = readStoredNewsItems();
      const incoming = await fetchLatestRedditHotNews();
      const mergedNews = mergeManualRedditHotItems(currentNewsItems, incoming);
      const mergedFollowUps = mergePinnedNewsIntoFollowUps(readFollowUpItems(), mergedNews.items, selectedDate);

      if (mergedFollowUps.addedCount > 0) saveFollowUpItems(mergedFollowUps.items);
      setNewsItems(mergedNews.items);
      setFollowUps(mergedFollowUps.items);
      notifyBottomTickerUpdated();
      notifyFollowUpUpdated();
      setRefreshStatus(mergedNews.addedCount > 0 || mergedFollowUps.addedCount > 0 ? "updated" : "empty");
      window.setTimeout(() => setRefreshStatus("idle"), 1600);
    } catch {
      refreshSelection();
      notifyBottomTickerUpdated();
      setRefreshStatus("failed");
      window.setTimeout(() => setRefreshStatus("idle"), 2200);
    }
  };

  const openAddManualItem = () => {
    setManualTitleDraft("");
    setManualLinkDraft("");
    setManualDateDraft(selectedDate);
    setIsAddOpen(true);
  };

  const addManualItem = () => {
    const normalizedTitle = manualTitleDraft.trim();
    const date = manualDateDraft || selectedDate;

    if (!normalizedTitle) return;

    const displayOrder = getNextFollowUpDisplayOrder(followUps, date, "manual", "top");

    persistFollowUps([...followUps, createManualFollowUp(normalizedTitle, date, manualLinkDraft, displayOrder)]);
    setSelectedDate(date);
    setIsAddOpen(false);
  };

  const removeFollowUpItem = (target: FollowUpItem) => {
    const children = buildChildrenMap(followUps);
    const childItems = children.get(target.id) ?? [];
    const removedNewsIds = new Set(target.sourceNewsId ? [target.sourceNewsId] : []);
    const now = new Date().toISOString();
    const nextFollowUps = followUps
      .filter((item) => item.id !== target.id)
      .map((item) =>
        item.parentId === target.id
          ? {
              ...item,
              parentId: target.parentId,
              updatedAt: now,
            }
          : item,
      );
    const nextNewsItems = newsItems.map((item) => {
      if (!removedNewsIds.has(item.id)) return item;

      markRedditHotSeen(item);
      return { ...item, pinned: false, sourcePinned: false };
    });

    savePinnedNewsIds(nextNewsItems.filter((item) => item.pinned).map((item) => item.id));
    saveNewsItems(nextNewsItems);
    setNewsItems(nextNewsItems);
    persistFollowUps(nextFollowUps);
    if (childItems.length > 0) {
      setCollapsedIds((current) => {
        const next = new Set(current);
        next.delete(target.id);
        return next;
      });
    }
    notifyBottomTickerUpdated();
  };

  const toggleCollapsed = (itemId: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const moveItemUnderParent = (draggedId: string, targetId: string) => {
    if (!draggedId || draggedId === targetId) return;

    const dateItems = followUps.filter((item) => item.date === selectedDate);
    const itemsById = new Map(dateItems.map((item) => [item.id, item]));
    const dragged = itemsById.get(draggedId);
    const target = itemsById.get(targetId);
    if (!dragged || !target) return;

    const children = buildChildrenMap(dateItems);
    const draggedSubtreeIds = getSubtreeIds(dragged.id, children);
    if (draggedSubtreeIds.has(target.id)) return;

    const targetLevel = getItemLevel(target, itemsById);
    const draggedDepth = getSubtreeDepth(dragged.id, children);
    if (targetLevel + 1 + draggedDepth > MAX_NESTING_LEVEL) return;

    const now = new Date().toISOString();
    persistFollowUps(followUps.map((item) => (item.id === dragged.id ? { ...item, parentId: target.id, updatedAt: now } : item)));
    setCollapsedIds((current) => {
      const next = new Set(current);
      next.delete(target.id);
      return next;
    });
  };

  const moveItemNearTarget = (draggedId: string, targetId: string, position: "before" | "after") => {
    if (!draggedId || draggedId === targetId) return;

    const dateItems = followUps.filter((item) => item.date === selectedDate);
    const itemsById = new Map(dateItems.map((item) => [item.id, item]));
    const dragged = itemsById.get(draggedId);
    const target = itemsById.get(targetId);
    if (!dragged || !target) return;
    if (getFollowUpPlacement(dragged) !== getFollowUpPlacement(target)) return;

    const children = buildChildrenMap(dateItems);
    const draggedSubtreeIds = getSubtreeIds(dragged.id, children);
    if (draggedSubtreeIds.has(target.id)) return;

    const nextParentId = target.parentId;
    const nextLevel = nextParentId ? getItemLevel(target, itemsById) : 0;
    const draggedDepth = getSubtreeDepth(dragged.id, children);
    if (nextLevel + draggedDepth > MAX_NESTING_LEVEL) return;

    const now = new Date().toISOString();
    const placement = getFollowUpPlacement(target);
    const siblings = dateItems
      .filter((item) => item.id !== dragged.id && item.parentId === nextParentId && getFollowUpPlacement(item) === placement)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const targetIndex = siblings.findIndex((item) => item.id === target.id);
    const insertIndex = targetIndex < 0 ? siblings.length : targetIndex + (position === "after" ? 1 : 0);
    const reorderedSiblings = [...siblings.slice(0, insertIndex), { ...dragged, parentId: nextParentId }, ...siblings.slice(insertIndex)];
    const orderById = new Map(reorderedSiblings.map((item, index) => [item.id, (index + 1) * 1000]));

    persistFollowUps(
      followUps.map((item) => {
        const displayOrder = orderById.get(item.id);
        if (item.id === dragged.id) {
          return {
            ...item,
            parentId: nextParentId,
            displayOrder,
            updatedAt: now,
          };
        }
        if (displayOrder !== undefined) return { ...item, displayOrder };
        return item;
      }),
    );
  };

  const moveItemToRoot = (draggedId: string) => {
    if (!draggedId) return;

    const dragged = followUps.find((item) => item.id === draggedId && item.date === selectedDate);
    if (!dragged || !dragged.parentId) return;

    const now = new Date().toISOString();
    persistFollowUps(followUps.map((item) => (item.id === dragged.id ? { ...item, parentId: undefined, updatedAt: now } : item)));
  };

  const getTouchDropTarget = (clientX: number, clientY: number, draggedId: string): TouchDropTarget | null => {
    const element = document.elementFromPoint(clientX, clientY);
    const row = element?.closest<HTMLElement>("[data-follow-up-id]");
    const targetId = row?.dataset.followUpId;

    if (!row || !targetId || targetId === draggedId) return null;

    const rect = row.getBoundingClientRect();
    const relativeY = (clientY - rect.top) / Math.max(rect.height, 1);
    const mode = relativeY < 0.25 ? "before" : relativeY > 0.75 ? "after" : "inside";

    return { id: targetId, mode };
  };

  const handleTouchDragStart = (itemId: string, event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" || event.button !== 0) return;

    touchDragRef.current = {
      id: itemId,
      isDragging: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleTouchDragMove = (event: PointerEvent<HTMLElement>) => {
    const drag = touchDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.isDragging && distance < 9) return;

    drag.isDragging = true;
    suppressNextTitleClickRef.current = true;
    setDraggingId(drag.id);
    touchDropTargetRef.current = getTouchDropTarget(event.clientX, event.clientY, drag.id);
    setTouchDropTarget(touchDropTargetRef.current);
    event.preventDefault();
  };

  const handleTouchDragEnd = (event: PointerEvent<HTMLElement>) => {
    const drag = touchDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const target = touchDropTargetRef.current;

    if (drag.isDragging) {
      if (target) {
        if (target.mode === "inside") moveItemUnderParent(drag.id, target.id);
        else moveItemNearTarget(drag.id, target.id, target.mode);
      }
      window.setTimeout(() => {
        suppressNextTitleClickRef.current = false;
      }, 250);
    }

    touchDragRef.current = null;
    touchDropTargetRef.current = null;
    setDraggingId("");
    setTouchDropTarget(null);
  };

  const handleTitleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!suppressNextTitleClickRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    suppressNextTitleClickRef.current = false;
  };

  const openDateEdit = (item: FollowUpItem) => {
    setDateEditItem(item);
    setItemDateDraft(item.date);
  };

  const applyItemDateEdit = () => {
    if (!dateEditItem || !itemDateDraft) return;

    const children = buildChildrenMap(followUps);
    const moveIds = getSubtreeIds(dateEditItem.id, children);
    const now = new Date().toISOString();
    const nextItems = followUps.map((item) =>
      moveIds.has(item.id)
        ? {
            ...item,
            date: itemDateDraft,
            updatedAt: now,
          }
        : item,
    );

    persistFollowUps(nextItems);
    setSelectedDate(itemDateDraft);
    setDateEditItem(null);
  };

  const renderFollowUpRow = ({ childCount, item, level }: FollowUpTreeRow, index: number) => {
    const isParent = childCount > 0;
    const link = getOriginalLink(item);
    const sourceColor = item.source ? sourceColors[item.source] : "var(--theme-accent-display)";

    return (
      <li
        className={`selected-item follow-up-item level-${level} ${isParent ? "parent" : ""} ${draggingId === item.id ? "dragging" : ""} ${
          touchDropTarget?.id === item.id ? `touch-drop-${touchDropTarget.mode}` : ""
        }`}
        data-follow-up-id={item.id}
        draggable
        key={item.id}
        onDragEnd={() => setDraggingId("")}
        onDragOver={(event) => event.preventDefault()}
        onDragStart={(event) => {
          setDraggingId(item.id);
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", item.id);
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const draggedItemId = event.dataTransfer.getData("text/plain") || draggingId;
          if (event.altKey) {
            moveItemUnderParent(draggedItemId, item.id);
          } else {
            const rect = event.currentTarget.getBoundingClientRect();
            moveItemNearTarget(draggedItemId, item.id, event.clientY > rect.top + rect.height / 2 ? "after" : "before");
          }
          setDraggingId("");
        }}
        style={{ "--follow-up-level": level } as CSSProperties}
      >
        <span className="selected-index">{String(index + 1).padStart(2, "0")}</span>
        <span
          aria-label={item.source ?? "manual"}
          className="selected-source-block"
          style={{ "--source-color": sourceColor } as CSSProperties}
        />
        <span className={`follow-up-main ${isParent ? "has-toggle" : ""}`}>
          {isParent ? (
            <button
              aria-label={collapsedIds.has(item.id) ? "展开主题" : "收起主题"}
              className="follow-up-collapse"
              onClick={() => toggleCollapsed(item.id)}
              type="button"
            >
              {collapsedIds.has(item.id) ? "▸" : "▾"}
            </button>
          ) : null}
          {link ? (
            <a
              className="selected-title follow-up-drag-handle"
              href={link}
              onClick={handleTitleClick}
              onPointerCancel={handleTouchDragEnd}
              onPointerDown={(event) => handleTouchDragStart(item.id, event)}
              onPointerMove={handleTouchDragMove}
              onPointerUp={handleTouchDragEnd}
              rel="noopener noreferrer"
              target="_blank"
            >
              {item.title}
            </a>
          ) : (
            <span
              className="selected-title follow-up-drag-handle"
              onPointerCancel={handleTouchDragEnd}
              onPointerDown={(event) => handleTouchDragStart(item.id, event)}
              onPointerMove={handleTouchDragMove}
              onPointerUp={handleTouchDragEnd}
            >
              {item.title}
            </span>
          )}
        </span>
        <button
          aria-label="调整显示日期"
          className="follow-up-more-button"
          onClick={() => openDateEdit(item)}
          title="调整显示日期"
          type="button"
        >
          ...
        </button>
        <button
          aria-label="移除跟进事项"
          className="selected-star-button active"
          onClick={() => removeFollowUpItem(item)}
          title="移除跟进事项"
          type="button"
        >
          ★
        </button>
      </li>
    );
  };

  const fetchStatusText =
    refreshStatus === "fetching"
      ? "刷新中..."
      : refreshStatus === "updated"
        ? "已更新"
        : refreshStatus === "empty"
          ? "暂无新增"
          : refreshStatus === "failed"
            ? "刷新失败"
            : "";

  return (
    <aside className="panel editor-desk selected-desk" aria-label="今日跟进">
      <div className="panel-title-row selected-title-row follow-up-title-row">
        <div className="follow-up-heading">
          <h2>今日跟进</h2>
        </div>
        <div className="selected-title-actions follow-up-actions">
          <div className="follow-up-date-switcher" aria-label="选择跟进日期">
            <button onClick={() => setSelectedDate((date) => addDays(date, -1))} type="button">
              ←
            </button>
            <span className="follow-up-date-field">
              <button
                aria-label={`选择跟进日期 ${selectedDate}`}
                className="follow-up-date-display"
                onClick={() => setIsCalendarOpen((open) => !open)}
                type="button"
              >
                {formatDateLabel(selectedDate)}
              </button>
              {isCalendarOpen && (
                <div className="follow-up-calendar" role="dialog" aria-label="选择跟进日期">
                  <div className="follow-up-calendar-head">
                    <button onClick={() => setSelectedDate((date) => addDays(date.slice(0, 8) + "01", -1))} type="button">
                      ←
                    </button>
                    <strong>{monthDays.monthLabel}</strong>
                    <button onClick={() => setSelectedDate((date) => addDays(date.slice(0, 8) + "28", 4))} type="button">
                      →
                    </button>
                  </div>
                  <div className="follow-up-calendar-weekdays" aria-hidden="true">
                    {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>
                  <div className="follow-up-calendar-grid">
                    {monthDays.blanks.map((blank) => (
                      <span className="follow-up-calendar-blank" key={blank} />
                    ))}
                    {monthDays.days.map((date) => (
                      <button
                        className={`${date === selectedDate ? "selected" : ""} ${markedDates.has(date) ? "has-items" : ""}`}
                        key={date}
                        onClick={() => {
                          setSelectedDate(date);
                          setIsCalendarOpen(false);
                        }}
                        title={markedDates.has(date) ? "有跟进事项" : date}
                        type="button"
                      >
                        <span className="follow-up-calendar-day-number">{Number(date.slice(-2))}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </span>
            <button onClick={() => setSelectedDate((date) => addDays(date, 1))} type="button">
              →
            </button>
          </div>
          {fetchStatusText && <span className={`follow-up-refresh-status ${refreshStatus}`}>{fetchStatusText}</span>}
          <button
            aria-busy={refreshStatus === "fetching"}
            aria-label="刷新今日跟进"
            className={`selected-refresh-button follow-up-refresh-button ${refreshStatus !== "idle" ? refreshStatus : ""}`}
            disabled={refreshStatus === "fetching"}
            onClick={refreshSelectedItems}
            title="刷新第三栏并抓取新的 Reddit 热门"
            type="button"
          >
            <RefreshIcon />
          </button>
          <button disabled={selectedItems.length === 0} onClick={openExport} type="button">
            导出
          </button>
          <button onClick={openAddManualItem} type="button">
            +事项
          </button>
        </div>
      </div>

      <div
        className="editor-desk-scroll selected-scroll follow-up-scroll"
        onDragOver={(event) => {
          if (draggingId) event.preventDefault();
        }}
        onDrop={(event) => {
          if (!draggingId) return;

          event.preventDefault();
          moveItemToRoot(event.dataTransfer.getData("text/plain") || draggingId);
          setDraggingId("");
        }}
      >
        {visibleRows.length > 0 ? (
          <>
            <ol className="selected-list follow-up-list">{visibleRows.map(renderFollowUpRow)}</ol>
            {draggingId && <div className="follow-up-root-drop">拖到这里移出主题，恢复平级</div>}
          </>
        ) : (
          <div className="selected-empty">
            <strong>等待跟进</strong>
            <span>第四栏星标新闻会进入这里；也可以用 +事项 新建一个选题。</span>
          </div>
        )}
      </div>
      <section className="recent-keywords-panel" aria-label="近期关键词">
        <div className="recent-keywords-head">
          <div>
            <h3>
              {keywordWindowHours}小时关键词
              <span className="recent-keywords-sample">{recentKeywordResult.recentItemCount} 条样本</span>
            </h3>
          </div>
          <div className="recent-keywords-tools" aria-label="关键词统计时间范围">
            {recentKeywordWindowOptions.map((hours) => (
              <button
                aria-pressed={keywordWindowHours === hours}
                className={keywordWindowHours === hours ? "active" : ""}
                key={hours}
                onClick={() => setKeywordWindowHours(hours)}
                type="button"
              >
                {hours}h
              </button>
            ))}
          </div>
        </div>
        {hasRecentKeywords ? (
          <ol className="recent-keywords-list">
            {recentKeywordResult.keywords.map((item) => (
              <li className="recent-keyword-item" key={item.keyword}>
                <button
                  className="recent-keyword-name"
                  onClick={() => dispatchRecentKeywordSearch(item.keyword)}
                  title={`在第四栏搜索 ${item.keyword}`}
                  type="button"
                >
                  {item.keyword}
                </button>
                <span className="recent-keyword-count">{item.count}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="recent-keywords-empty">
            <strong>样本不足</strong>
            <span>继续监听中</span>
          </div>
        )}
      </section>
      {isExportOpen && (
        <div className="selected-export-backdrop" role="presentation" onClick={() => setIsExportOpen(false)}>
          <section
            aria-label="导出今日跟进"
            aria-modal="true"
            className="selected-export-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="selected-export-head">
              <div>
                <h3>导出今日跟进</h3>
                <span>
                  {selectedDate} · {selectedItems.length} 条 · 按层级
                </span>
              </div>
              <div className="selected-export-actions">
                {copyStatus && <span className="selected-export-copy-status">{copyStatus}</span>}
                <button className="selected-export-copy-button" onClick={copyExportDraft} type="button">
                  复制
                </button>
                <button aria-label="关闭导出窗口" onClick={() => setIsExportOpen(false)} type="button">
                  ×
                </button>
              </div>
            </div>
            <textarea aria-label="编辑导出内容" onChange={(event) => setExportDraft(event.target.value)} value={exportDraft} />
          </section>
        </div>
      )}
      {isAddOpen && (
        <div className="selected-export-backdrop" role="presentation" onClick={() => setIsAddOpen(false)}>
          <form
            aria-label="新建跟进事项"
            aria-modal="true"
            className="selected-export-modal follow-up-add-modal"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              addManualItem();
            }}
            role="dialog"
          >
            <div className="selected-export-head">
              <div>
                <h3>新建跟进事项</h3>
                <span>填写事项名和出现日期</span>
              </div>
              <div className="selected-export-actions">
                <button aria-label="关闭新建窗口" onClick={() => setIsAddOpen(false)} type="button">
                  ×
                </button>
              </div>
            </div>
            <div className="follow-up-add-fields">
              <label>
                <span>事项名</span>
                <input
                  autoFocus
                  onChange={(event) => setManualTitleDraft(event.target.value)}
                  placeholder="例如：阿森纳夺冠后续"
                  value={manualTitleDraft}
                />
              </label>
              <label>
                <span>链接</span>
                <input
                  onChange={(event) => setManualLinkDraft(event.target.value)}
                  placeholder="https://..."
                  type="url"
                  value={manualLinkDraft}
                />
              </label>
              <label>
                <span>日期</span>
                <input onChange={(event) => setManualDateDraft(event.target.value)} type="date" value={manualDateDraft} />
              </label>
            </div>
            <div className="follow-up-add-actions">
              <button onClick={() => setIsAddOpen(false)} type="button">
                取消
              </button>
              <button disabled={!manualTitleDraft.trim()} type="submit">
                新建
              </button>
            </div>
          </form>
        </div>
      )}
      {dateEditItem && (
        <div className="selected-export-backdrop" role="presentation" onClick={() => setDateEditItem(null)}>
          <form
            aria-label="调整显示日期"
            aria-modal="true"
            className="selected-export-modal follow-up-add-modal"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              applyItemDateEdit();
            }}
            role="dialog"
          >
            <div className="selected-export-head">
              <div>
                <h3>调整显示日期</h3>
                <span>{dateEditItem.title}</span>
              </div>
              <div className="selected-export-actions">
                <button aria-label="关闭日期调整窗口" onClick={() => setDateEditItem(null)} type="button">
                  ×
                </button>
              </div>
            </div>
            <div className="follow-up-add-fields">
              <label>
                <span>日期</span>
                <input onChange={(event) => setItemDateDraft(event.target.value)} type="date" value={itemDateDraft} />
              </label>
            </div>
            <div className="follow-up-add-actions">
              <button onClick={() => setDateEditItem(null)} type="button">
                取消
              </button>
              <button disabled={!itemDateDraft} type="submit">
                保存
              </button>
            </div>
          </form>
        </div>
      )}
    </aside>
  );
}
