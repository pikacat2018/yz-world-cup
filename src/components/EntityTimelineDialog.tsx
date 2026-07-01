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

type EntityTimelineDialogProps = {
  onClose: () => void;
};

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

const getTypeLabel = (value: EntityType) => entityTypeOptions.find((option) => option.value === value)?.label ?? "其他";

export default function EntityTimelineDialog({ onClose }: EntityTimelineDialogProps) {
  const [recordsVersion, setRecordsVersion] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [draftEntityName, setDraftEntityName] = useState("");
  const [draftEntityType, setDraftEntityType] = useState<EntityType>("player");
  const [eventDraft, setEventDraft] = useState(createDefaultEventDraft);
  const [editingEventId, setEditingEventId] = useState("");

  const records = useMemo(() => readEntityTimelineRecords(), [recordsVersion]);
  const trimmedQuery = query.trim();
  const results = useMemo(() => searchEntityTimelineRecords(query), [query, recordsVersion]);
  const selectedRecord = records.find((record) => record.id === selectedEntityId);
  const editingEvent = selectedRecord?.events.find((event) => event.id === editingEventId);
  const hasExactMatch = results.some((record) => record.name.trim().toLowerCase() === trimmedQuery.toLowerCase());
  const canCreateEntity = trimmedQuery.length > 0 && !hasExactMatch;
  const isDetailView = Boolean(selectedRecord);

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

  const openEntityDetail = (record: EntityTimelineRecord) => {
    setSelectedEntityId(record.id);
    setDraftEntityName(record.name);
    setDraftEntityType(record.type);
    setEditingEventId("");
  };

  const handleCreateEntity = () => {
    if (!canCreateEntity) return;

    const nextRecord = createEntityTimelineRecord(trimmedQuery, draftEntityType);
    upsertEntityTimelineRecord(nextRecord);
    openEntityDetail(nextRecord);
  };

  const handleBackToSearch = () => {
    setSelectedEntityId("");
    setEditingEventId("");
    setEventDraft(createDefaultEventDraft());
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
      events: [...remainingEvents, nextEvent],
      type: draftEntityType,
      updatedAt: new Date().toISOString(),
    });
    setEditingEventId("");
    setEventDraft(createDefaultEventDraft());
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
    }
  };

  const handleDeleteEntity = () => {
    if (!selectedRecord) return;
    deleteEntityTimelineRecord(selectedRecord.id);
    handleBackToSearch();
    setQuery("");
  };

  return (
    <div className="selected-export-backdrop entity-timeline-backdrop" onClick={onClose} role="presentation">
      <div
        aria-label="主体档案"
        aria-modal="true"
        className={`selected-export-modal ${isDetailView ? "entity-timeline-modal" : "entity-timeline-search-modal"}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="selected-export-head">
          <div className={!isDetailView ? "entity-timeline-search-head" : undefined}>
            <h3>{isDetailView ? draftEntityName || selectedRecord?.name : "足球档案"}</h3>
            {isDetailView ? <span>左侧查看事迹时间线，右侧新增或编辑事迹。</span> : null}
          </div>
          <div className="selected-export-actions">
            {isDetailView ? (
              <button className="selected-export-copy-button entity-timeline-back-button" onClick={handleBackToSearch} type="button">
                返回搜索
              </button>
            ) : null}
            <button aria-label="关闭主体档案" onClick={onClose} type="button">
              ×
            </button>
          </div>
        </div>

        {!isDetailView ? (
          <div className="entity-timeline-search-screen">
            <label className="news-search entity-timeline-search entity-timeline-search-only" aria-label="搜索主体档案">
              <span className="news-search-icon" aria-hidden="true">
                ⌕
              </span>
              <input
                autoFocus
                onChange={(inputEvent) => setQuery(inputEvent.target.value)}
                placeholder="输入球员、裁判、球队、球场等主体名称"
                type="search"
                value={query}
              />
              <span className="news-search-count">{trimmedQuery ? results.length : records.length}</span>
            </label>

            {trimmedQuery ? (
              <div className="entity-timeline-result-list entity-timeline-search-results" role="list" aria-label="主体搜索结果">
                {results.length > 0 ? (
                  results.map((record) => (
                    <button className="entity-timeline-result" key={record.id} onClick={() => openEntityDetail(record)} type="button">
                      <strong>{record.name}</strong>
                      <span>{getTypeLabel(record.type)}</span>
                      <small>{record.events.length} 条事迹</small>
                    </button>
                  ))
                ) : null}

                {canCreateEntity ? (
                  <button className="entity-timeline-result entity-timeline-create-option" onClick={handleCreateEntity} type="button">
                    <strong>新建：{trimmedQuery}</strong>
                    <div className="entity-timeline-inline-create">
                      <span>没有找到现有主体，点击进入主体页面编辑。</span>
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
              </div>
            ) : null}
          </div>
        ) : selectedRecord ? (
          <div className="entity-timeline-layout">
            <section className="entity-timeline-main entity-timeline-main-left">
              <div className="entity-timeline-record-head">
                <div>
                  <h4>{selectedRecord.name}</h4>
                  <div className="entity-timeline-meta">
                    <span>{getTypeLabel(selectedRecord.type)}</span>
                    <span>{selectedRecord.events.length} 条事迹</span>
                  </div>
                </div>
                <button className="match-record-delete entity-timeline-record-delete" onClick={handleDeleteEntity} type="button">
                  删除主体
                </button>
              </div>

              <div className="entity-timeline-event-list" aria-label="主体时间线">
                {selectedRecord.events.length > 0 ? (
                  selectedRecord.events.map((item) => (
                    <article className="entity-timeline-event-row" key={item.id}>
                      <div className="entity-timeline-event-date">{item.date}</div>
                      <div className="entity-timeline-event-body">
                        <div className="entity-timeline-event-title-row">
                          <strong>{item.title}</strong>
                          <div className="entity-timeline-event-actions">
                            <button onClick={() => setEditingEventId(item.id)} type="button">
                              编辑
                            </button>
                            <button onClick={() => handleDeleteEvent(item)} type="button">
                              删除
                            </button>
                          </div>
                        </div>
                        {item.url ? (
                          <a href={item.url} rel="noopener noreferrer" target="_blank">
                            {item.url}
                          </a>
                        ) : null}
                        {item.note ? <p>{item.note}</p> : null}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="entity-timeline-empty">
                    <strong>还没有事迹</strong>
                    <span>在右栏填写后，系统会自动按时间编入时间线。</span>
                  </div>
                )}
              </div>
            </section>

            <aside className="entity-timeline-sidebar entity-timeline-editor-pane">
              <form className="entity-timeline-event-form" onSubmit={handleSubmitEvent}>
                <label>
                  <span>事迹简述</span>
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
                  {editingEvent ? (
                    <button
                      onClick={() => {
                        setEditingEventId("");
                        setEventDraft(createDefaultEventDraft());
                      }}
                      type="button"
                    >
                      取消编辑
                    </button>
                  ) : null}
                  <button type="submit">{editingEvent ? "更新" : "新增"}</button>
                </div>
              </form>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}
