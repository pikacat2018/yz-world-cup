import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  createEntityTimelineEvent,
  createEntityTimelineRecord,
  deleteEntityTimelineRecord,
  ENTITY_TIMELINE_UPDATED_EVENT,
  hydrateEntityTimelineRecords,
  readEntityTimelineRecords,
  searchEntityTimelineRecords,
  type EntityTimelineEvent,
  type EntityTimelineRecord,
  type EntityType,
  upsertEntityTimelineRecord,
} from "../entities/entityTimelineStore";

type DetailPane = "profile" | "event" | null;
type TimelineViewMode = "asc" | "desc" | "select";

const entityTypeOptions: Array<{ label: string; value: EntityType }> = [
  { label: "球员", value: "player" },
  { label: "球队", value: "team" },
  { label: "裁判", value: "referee" },
  { label: "官员", value: "official" },
  { label: "球迷", value: "fan" },
  { label: "球场", value: "stadium" },
  { label: "地点", value: "place" },
  { label: "其他", value: "other" },
];

const createDefaultEventDraft = () => ({
  date: new Date().toISOString().slice(0, 10),
  note: "",
  title: "",
  url: "",
});

const createDefaultProfileDraft = () => ({
  bio: "",
  englishName: "",
  name: "",
  type: "player" as EntityType,
});

const getTypeLabel = (value: EntityType) => entityTypeOptions.find((option) => option.value === value)?.label ?? "其他";

const formatDateTime = (value?: string) => {
  if (!value) return "未更新";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未更新";
  return date.toLocaleString("zh-CN", { hour12: false });
};

const sortEventsAsc = (events: EntityTimelineEvent[]) =>
  [...events].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));

export default function EntityTimelinePage() {
  const [recordsVersion, setRecordsVersion] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [draftEntityType, setDraftEntityType] = useState<EntityType>("player");
  const [eventDraft, setEventDraft] = useState(createDefaultEventDraft);
  const [profileDraft, setProfileDraft] = useState(createDefaultProfileDraft);
  const [editingEventId, setEditingEventId] = useState("");
  const [detailPane, setDetailPane] = useState<DetailPane>("profile");
  const [timelineViewMode, setTimelineViewMode] = useState<TimelineViewMode>("asc");
  const [selectedTimelineEventIds, setSelectedTimelineEventIds] = useState<string[]>([]);

  const records = useMemo(() => readEntityTimelineRecords(), [recordsVersion]);
  const trimmedQuery = query.trim();
  const results = useMemo(() => searchEntityTimelineRecords(query), [query, recordsVersion]);
  const visibleRecords = trimmedQuery ? results : records;
  const selectedRecord =
    visibleRecords.find((record) => record.id === selectedEntityId) ??
    records.find((record) => record.id === selectedEntityId) ??
    visibleRecords[0] ??
    records[0];
  const editingEvent = selectedRecord?.events.find((event) => event.id === editingEventId);
  const hasExactMatch = results.some((record) => record.name.trim().toLowerCase() === trimmedQuery.toLowerCase());
  const canCreateEntity = trimmedQuery.length > 0 && !hasExactMatch;

  const selectedRecordEvents = useMemo(() => (selectedRecord ? sortEventsAsc(selectedRecord.events) : []), [selectedRecord]);

  const visibleTimelineEvents = useMemo(() => {
    const base = timelineViewMode === "desc" ? [...selectedRecordEvents].reverse() : selectedRecordEvents;
    if (timelineViewMode !== "select") return base;
    const selectedIds = new Set(selectedTimelineEventIds);
    return base.filter((event) => selectedIds.has(event.id));
  }, [selectedRecordEvents, selectedTimelineEventIds, timelineViewMode]);

  useEffect(() => {
    const syncRecords = () => setRecordsVersion((version) => version + 1);
    window.addEventListener(ENTITY_TIMELINE_UPDATED_EVENT, syncRecords);
    window.addEventListener("storage", syncRecords);

    void hydrateEntityTimelineRecords(true).catch((error) => {
      console.warn("[entity-timelines] hydrate failed", error);
    });

    const intervalId = window.setInterval(() => {
      void hydrateEntityTimelineRecords(true).catch(() => undefined);
    }, 60_000);

    return () => {
      window.removeEventListener(ENTITY_TIMELINE_UPDATED_EVENT, syncRecords);
      window.removeEventListener("storage", syncRecords);
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!selectedRecord) {
      setSelectedEntityId("");
      setEditingEventId("");
      setDetailPane(null);
      setProfileDraft(createDefaultProfileDraft());
      setEventDraft(createDefaultEventDraft());
      return;
    }

    if (selectedEntityId !== selectedRecord.id) {
      setSelectedEntityId(selectedRecord.id);
      setEditingEventId("");
      setDetailPane("profile");
    }
  }, [selectedEntityId, selectedRecord]);

  useEffect(() => {
    if (!selectedRecord) return;

    setProfileDraft({
      bio: selectedRecord.bio ?? "",
      englishName: selectedRecord.englishName ?? "",
      name: selectedRecord.name,
      type: selectedRecord.type,
    });
  }, [selectedRecord]);

  useEffect(() => {
    if (!editingEvent) {
      setEventDraft(createDefaultEventDraft());
      return;
    }

    setEventDraft({
      date: editingEvent.date,
      note: editingEvent.note ?? "",
      title: editingEvent.title,
      url: editingEvent.url ?? "",
    });
  }, [editingEvent]);

  useEffect(() => {
    setSelectedTimelineEventIds(selectedRecordEvents.map((event) => event.id));
  }, [selectedRecord?.id, selectedRecordEvents]);

  const openEntityDetail = (record: EntityTimelineRecord) => {
    setSelectedEntityId(record.id);
    setEditingEventId("");
    setDetailPane("profile");
  };

  const handleCreateEntity = () => {
    if (!canCreateEntity) return;

    const nextRecord = createEntityTimelineRecord(trimmedQuery, draftEntityType);
    upsertEntityTimelineRecord(nextRecord);
    openEntityDetail(nextRecord);
  };

  const handleSubmitEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRecord) return;

    const normalizedTitle = eventDraft.title.trim();
    const normalizedDate = eventDraft.date.trim();
    if (!normalizedTitle || !normalizedDate) return;

    const nextEvent = createEntityTimelineEvent(
      selectedRecord.id,
      {
        date: normalizedDate,
        note: eventDraft.note,
        title: normalizedTitle,
        url: eventDraft.url,
      },
      editingEvent,
    );
    const remainingEvents = selectedRecord.events.filter((item) => item.id !== nextEvent.id);

    upsertEntityTimelineRecord({
      ...selectedRecord,
      bio: profileDraft.bio.trim() || undefined,
      englishName: profileDraft.englishName.trim() || undefined,
      events: [...remainingEvents, nextEvent],
      name: profileDraft.name.trim() || selectedRecord.name,
      type: profileDraft.type,
      updatedAt: new Date().toISOString(),
    });
    setEditingEventId("");
    setEventDraft(createDefaultEventDraft());
    setDetailPane("event");
  };

  const handleSubmitProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRecord) return;

    const normalizedName = profileDraft.name.trim();
    if (!normalizedName) return;

    upsertEntityTimelineRecord({
      ...selectedRecord,
      bio: profileDraft.bio.trim() || undefined,
      englishName: profileDraft.englishName.trim() || undefined,
      name: normalizedName,
      type: profileDraft.type,
      updatedAt: new Date().toISOString(),
    });
    setDetailPane("profile");
  };

  const handleDeleteEvent = (targetEvent: EntityTimelineEvent) => {
    if (!selectedRecord) return;

    upsertEntityTimelineRecord({
      ...selectedRecord,
      events: selectedRecord.events.filter((event) => event.id !== targetEvent.id),
      updatedAt: new Date().toISOString(),
    });
    if (editingEventId === targetEvent.id) {
      setEditingEventId("");
      setEventDraft(createDefaultEventDraft());
      setDetailPane("event");
    }
  };

  const handleDeleteEntity = () => {
    if (!selectedRecord) return;
    deleteEntityTimelineRecord(selectedRecord.id);
    setSelectedEntityId("");
    setEditingEventId("");
    setDetailPane(null);
  };

  const handleOpenProfile = () => {
    setEditingEventId("");
    setDetailPane("profile");
  };

  const handleSelectEvent = (targetEvent: EntityTimelineEvent) => {
    setEditingEventId(targetEvent.id);
    setDetailPane("event");
  };

  const handleCreateFirstEvent = () => {
    setEditingEventId("");
    setEventDraft(createDefaultEventDraft());
    setDetailPane("event");
  };

  const toggleTimelineEventSelection = (eventId: string) => {
    setSelectedTimelineEventIds((current) => (current.includes(eventId) ? current.filter((id) => id !== eventId) : [...current, eventId]));
  };

  const handleSelectAllTimelineEvents = () => {
    setSelectedTimelineEventIds(selectedRecordEvents.map((event) => event.id));
  };

  const handleClearTimelineEvents = () => {
    setSelectedTimelineEventIds([]);
  };

  return (
    <main className="entity-timeline-page">
      <header className="entity-timeline-page-head">
        <div>
          <span className="entity-timeline-page-kicker">FOOTBALL ARCHIVE</span>
          <h1>全部词条</h1>
          <p>左侧选词条，中间看词条信息与时间线，右侧直接编辑。</p>
        </div>
        <div className="entity-timeline-page-actions">
          <button onClick={() => window.history.back()} type="button">
            返回
          </button>
          <button className="entity-timeline-page-primary" onClick={() => (window.location.href = "/")} type="button">
            回到工作台
          </button>
        </div>
      </header>

      <section className="entity-timeline-page-grid">
        <aside className="entity-timeline-page-panel entity-timeline-page-list">
          <div className="entity-timeline-page-panel-head">
            <strong>词条栏</strong>
            <span>{trimmedQuery ? `${visibleRecords.length}/${records.length}` : `${records.length}`}</span>
          </div>
          <label className="news-search entity-timeline-search entity-timeline-page-search" aria-label="搜索全部词条">
            <span className="news-search-icon" aria-hidden="true">
              🔎
            </span>
            <input
              onChange={(inputEvent) => setQuery(inputEvent.target.value)}
              placeholder="搜索球员、球队、裁判、球场"
              type="search"
              value={query}
            />
            <span className="news-search-count">{trimmedQuery ? visibleRecords.length : records.length}</span>
          </label>

          {canCreateEntity ? (
            <button className="entity-timeline-result entity-timeline-create-option" onClick={handleCreateEntity} type="button">
              <strong>新建：{trimmedQuery}</strong>
              <div className="entity-timeline-inline-create">
                <span>当前没有精确匹配词条，点击后直接进入编辑。</span>
                <select
                  onChange={(changeEvent) => setDraftEntityType(changeEvent.target.value as EntityType)}
                  onClick={(clickEvent) => clickEvent.stopPropagation()}
                  value={draftEntityType}
                >
                  {entityTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </button>
          ) : null}

          <div className="entity-timeline-result-list entity-timeline-page-records" role="list" aria-label="全部词条列表">
            {visibleRecords.length > 0 ? (
              visibleRecords.map((record) => (
                <button
                  className={`entity-timeline-result entity-timeline-page-record-item ${selectedRecord?.id === record.id ? "active" : ""}`}
                  key={record.id}
                  onClick={() => openEntityDetail(record)}
                  type="button"
                >
                  <strong>{record.name}</strong>
                  <small>
                    {getTypeLabel(record.type)} · {record.events.length} 条事迹 · {formatDateTime(record.updatedAt)}
                  </small>
                </button>
              ))
            ) : (
              <div className="entity-timeline-empty entity-timeline-page-empty">
                <strong>没有匹配词条</strong>
                <span>可以修改搜索词，或直接新建当前搜索词条。</span>
              </div>
            )}
          </div>
        </aside>

        <section className="entity-timeline-page-panel entity-timeline-main entity-timeline-main-left">
          {selectedRecord ? (
            <>
              <div className="entity-timeline-page-panel-head">
                <strong>词条信息与时间线</strong>
                <span>{visibleTimelineEvents.length}/{selectedRecord.events.length} 条事迹</span>
              </div>
              <div className="entity-timeline-record-head entity-timeline-page-record-head">
                <button className="entity-timeline-record-summary" onClick={handleOpenProfile} type="button">
                  <strong>
                    {selectedRecord.name}
                    <span className="entity-timeline-record-summary-meta">
                      {getTypeLabel(selectedRecord.type)} · 更新于 {formatDateTime(selectedRecord.updatedAt)}
                    </span>
                  </strong>
                </button>
                <button className="entity-timeline-add-event-button" onClick={handleCreateFirstEvent} type="button">
                  新增事迹
                </button>
              </div>

              <div className="entity-timeline-toolbar" aria-label="时间线视图控制">
                <div className="entity-timeline-view-modes">
                  <button
                    className={timelineViewMode === "asc" ? "is-active" : ""}
                    onClick={() => setTimelineViewMode("asc")}
                    type="button"
                  >
                    正序
                  </button>
                  <button
                    className={timelineViewMode === "desc" ? "is-active" : ""}
                    onClick={() => setTimelineViewMode("desc")}
                    type="button"
                  >
                    倒序
                  </button>
                  <button
                    className={timelineViewMode === "select" ? "is-active" : ""}
                    onClick={() => setTimelineViewMode("select")}
                    type="button"
                  >
                    选择
                  </button>
                </div>
                {timelineViewMode === "select" ? (
                  <div className="entity-timeline-selection-actions">
                    <button onClick={handleSelectAllTimelineEvents} type="button">
                      全选
                    </button>
                    <button onClick={handleClearTimelineEvents} type="button">
                      清空
                    </button>
                  </div>
                ) : null}
              </div>

              {timelineViewMode === "select" ? (
                <div className="entity-timeline-selection-panel">
                  {selectedRecordEvents.length > 0 ? (
                    selectedRecordEvents.map((item) => (
                      <label className="entity-timeline-selection-item" key={item.id}>
                        <input
                          checked={selectedTimelineEventIds.includes(item.id)}
                          onChange={() => toggleTimelineEventSelection(item.id)}
                          type="checkbox"
                        />
                        <span>{item.date}</span>
                        <strong>{item.title}</strong>
                      </label>
                    ))
                  ) : (
                    <div className="entity-timeline-empty entity-timeline-page-empty">
                      <strong>还没有事迹</strong>
                      <span>先新增事迹，之后这里才能做展示筛选。</span>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="entity-timeline-event-list" aria-label="词条时间线">
                {visibleTimelineEvents.length > 0 ? (
                  visibleTimelineEvents.map((item) => (
                    <button
                      className={`entity-timeline-event-row ${editingEventId === item.id && detailPane === "event" ? "is-active" : ""}`}
                      key={item.id}
                      onClick={() => handleSelectEvent(item)}
                      type="button"
                    >
                      <span className="entity-timeline-event-date">{item.date}</span>
                      <span className="entity-timeline-event-body">
                        <strong>{item.title}</strong>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="entity-timeline-empty">
                    <strong>{selectedRecord.events.length > 0 ? "当前没有可展示事迹" : "还没有事迹"}</strong>
                    <span>{selectedRecord.events.length > 0 ? "调整选择条件后，这里会刷新展示结果。" : "点击“新增事迹”后，第三栏会进入编辑。"}</span>
                    {selectedRecord.events.length === 0 ? (
                      <button className="entity-timeline-empty-action" onClick={handleCreateFirstEvent} type="button">
                        新增第一条事迹
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="entity-timeline-empty entity-timeline-empty-main">
              <strong>还没有词条</strong>
              <span>先在左侧搜索并新建一个词条，再继续补资料和时间线。</span>
            </div>
          )}
        </section>

        <aside className="entity-timeline-page-panel entity-timeline-sidebar entity-timeline-editor-pane">
          <div className="entity-timeline-page-panel-head">
            <strong>编辑栏</strong>
            <span>{detailPane === "event" ? (editingEvent ? "编辑事件" : "新增事件") : "编辑词条"}</span>
          </div>

          {!selectedRecord ? (
            <div className="entity-timeline-empty entity-timeline-empty-main">
              <strong>暂无可编辑内容</strong>
              <span>先从左侧选择词条。</span>
            </div>
          ) : detailPane === "event" ? (
            <form className="entity-timeline-event-form" onSubmit={handleSubmitEvent}>
              <label>
                <span>事迹标题</span>
                <input
                  onChange={(inputEvent) => setEventDraft((current) => ({ ...current, title: inputEvent.target.value }))}
                  placeholder="例如：宣布退役、确认执法、球场启用"
                  value={eventDraft.title}
                />
              </label>

              <div className="entity-timeline-form-grid">
                <label>
                  <span>时间</span>
                  <input
                    onChange={(inputEvent) => setEventDraft((current) => ({ ...current, date: inputEvent.target.value }))}
                    type="date"
                    value={eventDraft.date}
                  />
                </label>
                <label>
                  <span>相关链接</span>
                  <input
                    onChange={(inputEvent) => setEventDraft((current) => ({ ...current, url: inputEvent.target.value }))}
                    placeholder="https://..."
                    value={eventDraft.url}
                  />
                </label>
              </div>

              <label>
                <span>备注</span>
                <textarea
                  onChange={(inputEvent) => setEventDraft((current) => ({ ...current, note: inputEvent.target.value }))}
                  placeholder="补充背景、细节或后续线索"
                  value={eventDraft.note}
                />
              </label>

              <div className="follow-up-add-actions entity-timeline-form-actions">
                <button onClick={handleOpenProfile} type="button">
                  切到词条信息
                </button>
                {editingEvent ? (
                  <button className="match-record-delete entity-timeline-editor-delete" onClick={() => handleDeleteEvent(editingEvent)} type="button">
                    删除
                  </button>
                ) : null}
                <button type="submit">{editingEvent ? "更新事迹" : "新增事迹"}</button>
              </div>
            </form>
          ) : (
            <form className="entity-timeline-event-form" onSubmit={handleSubmitProfile}>
              <label>
                <span>词条名称</span>
                <input
                  onChange={(inputEvent) => setProfileDraft((current) => ({ ...current, name: inputEvent.target.value }))}
                  value={profileDraft.name}
                />
              </label>

              <div className="entity-timeline-form-grid">
                <label>
                  <span>英文名</span>
                  <input
                    onChange={(inputEvent) => setProfileDraft((current) => ({ ...current, englishName: inputEvent.target.value }))}
                    placeholder="可选"
                    value={profileDraft.englishName}
                  />
                </label>
                <label>
                  <span>词条类别</span>
                  <select
                    onChange={(changeEvent) => setProfileDraft((current) => ({ ...current, type: changeEvent.target.value as EntityType }))}
                    value={profileDraft.type}
                  >
                    {entityTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                <span>简介</span>
                <textarea
                  onChange={(inputEvent) => setProfileDraft((current) => ({ ...current, bio: inputEvent.target.value }))}
                  placeholder="记录这个词条的简介、身份说明或编辑备注"
                  value={profileDraft.bio}
                />
              </label>

              <div className="follow-up-add-actions entity-timeline-form-actions">
                <button className="match-record-delete entity-timeline-editor-delete" onClick={handleDeleteEntity} type="button">
                  删除词条
                </button>
                <button onClick={handleCreateFirstEvent} type="button">
                  去写时间线
                </button>
                <button type="submit">保存词条信息</button>
              </div>
            </form>
          )}
        </aside>
      </section>
    </main>
  );
}
