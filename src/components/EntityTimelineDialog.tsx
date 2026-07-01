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

type DetailPane = "profile" | "event" | null;

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

export default function EntityTimelineDialog({ onClose }: EntityTimelineDialogProps) {
  const [recordsVersion, setRecordsVersion] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [draftEntityType, setDraftEntityType] = useState<EntityType>("player");
  const [eventDraft, setEventDraft] = useState(createDefaultEventDraft);
  const [profileDraft, setProfileDraft] = useState(createDefaultProfileDraft);
  const [editingEventId, setEditingEventId] = useState("");
  const [detailPane, setDetailPane] = useState<DetailPane>(null);

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
    if (!selectedRecord) {
      setProfileDraft(createDefaultProfileDraft());
      return;
    }

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

  const openEntityDetail = (record: EntityTimelineRecord) => {
    setSelectedEntityId(record.id);
    setEditingEventId("");
    setDetailPane(null);
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
    setDetailPane(null);
    setEventDraft(createDefaultEventDraft());
    setProfileDraft(createDefaultProfileDraft());
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
    setDetailPane(null);
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
    setDetailPane(null);
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
      setDetailPane(null);
    }
  };

  const handleSelectEvent = (targetEvent: EntityTimelineEvent) => {
    setEditingEventId(targetEvent.id);
    setDetailPane("event");
  };

  const handleOpenProfile = () => {
    setEditingEventId("");
    setDetailPane("profile");
  };

  const handleCloseDetailPane = () => {
    setEditingEventId("");
    setDetailPane(null);
    setEventDraft(createDefaultEventDraft());
    if (selectedRecord) {
      setProfileDraft({
        bio: selectedRecord.bio ?? "",
        englishName: selectedRecord.englishName ?? "",
        name: selectedRecord.name,
        type: selectedRecord.type,
      });
    }
  };

  const handleCreateFirstEvent = () => {
    setEditingEventId("");
    setEventDraft(createDefaultEventDraft());
    setDetailPane("event");
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
        onClick={(dialogEvent) => dialogEvent.stopPropagation()}
        role="dialog"
      >
        <div className="selected-export-head">
          <div className={!isDetailView ? "entity-timeline-search-head" : undefined}>
            <h3>{isDetailView ? selectedRecord?.name : "足球档案"}</h3>
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
                <button className="entity-timeline-record-summary" onClick={handleOpenProfile} type="button">
                  <strong>
                    {selectedRecord.name}
                    <span className="entity-timeline-record-summary-meta">
                      {getTypeLabel(selectedRecord.type)} {selectedRecord.events.length} 条事迹
                    </span>
                  </strong>
                </button>
                <button className="entity-timeline-add-event-button" onClick={handleCreateFirstEvent} type="button">
                  新增事迹
                </button>
              </div>

              <div className="entity-timeline-event-list" aria-label="主体时间线">
                {selectedRecord.events.length > 0 ? (
                  selectedRecord.events.map((item) => (
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
                    <strong>还没有事迹</strong>
                    <span>点击下方按钮新增第一条事迹，保存后会自动进入时间线。</span>
                    <button className="entity-timeline-empty-action" onClick={handleCreateFirstEvent} type="button">
                      新增第一条事迹
                    </button>
                  </div>
                )}
              </div>
            </section>

            {detailPane ? (
              <aside className="entity-timeline-sidebar entity-timeline-editor-pane">
                {detailPane === "profile" ? (
                <form className="entity-timeline-event-form" onSubmit={handleSubmitProfile}>
                  <label>
                    <span>主体名字</span>
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
                      <span>主体类别</span>
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
                      placeholder="可选，记录这个主体的简介或说明"
                      value={profileDraft.bio}
                    />
                  </label>

                  <div className="follow-up-add-actions entity-timeline-form-actions">
                    <button onClick={handleCloseDetailPane} type="button">
                      关闭
                    </button>
                    <button className="match-record-delete entity-timeline-editor-delete" onClick={handleDeleteEntity} type="button">
                      删除主体
                    </button>
                    <button type="submit">保存主体信息</button>
                  </div>
                </form>
              ) : (
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
                    <button onClick={handleCloseDetailPane} type="button">
                      {editingEvent ? "取消编辑" : "关闭"}
                    </button>
                    {editingEvent ? (
                      <button
                        className="match-record-delete entity-timeline-editor-delete"
                        onClick={() => handleDeleteEvent(editingEvent)}
                        type="button"
                      >
                        删除
                      </button>
                    ) : null}
                    <button type="submit">{editingEvent ? "更新事迹" : "新增事迹"}</button>
                  </div>
                </form>
              )}
              </aside>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
