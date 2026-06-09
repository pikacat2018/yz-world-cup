import { useEffect, useState } from "react";
import EditorDesk from "./EditorDesk";
import GroupRadar from "./GroupRadar";
import MatchRecordCodeDialog from "./MatchRecordCodeDialog";
import MatchRecordDialog from "./MatchRecordDialog";
import MessagePanel from "./MessagePanel";
import RightRail from "./RightRail";
import type { AppTheme } from "./ThemeToggle";
import TopTickerPlaceholder from "./TopTickerPlaceholder";
import type { Match } from "../data/mockWorldCup";
import { hasMatchRecordCode } from "../matches/matchRecordStore";
import {
  type DesktopColumnId,
  readDesktopColumnOrder,
  saveDesktopColumnOrder,
} from "../shared/columnLayout";

type LayoutProps = {
  onThemeChange: (theme: AppTheme) => void;
  selectedGroupId: string;
  theme: AppTheme;
  onSelectGroup: (groupId: string) => void;
};

type MobileColumn = DesktopColumnId;

const mobileColumns: Array<{ id: MobileColumn; label: string }> = [
  { id: "news", label: "新闻" },
  { id: "editor", label: "今日跟进" },
  { id: "rail", label: "赛程数据" },
  { id: "radar", label: "小组" },
];

const desktopColumns: Array<{ id: DesktopColumnId; label: string }> = [
  { id: "rail", label: "赛程数据" },
  { id: "radar", label: "小组" },
  { id: "editor", label: "今日跟进" },
  { id: "news", label: "新闻" },
];

const DESKTOP_COLUMN_WIDTHS: Record<DesktopColumnId, string> = {
  rail: "minmax(238px, 0.78fr)",
  radar: "minmax(310px, 0.97fr)",
  editor: "minmax(332px, 1.04fr)",
  news: "548px",
};

function getDesktopGridTemplateColumns(order: DesktopColumnId[]) {
  return order
    .map((columnId) => DESKTOP_COLUMN_WIDTHS[columnId])
    .join(" ");
}

export default function Layout({ onThemeChange, selectedGroupId, theme, onSelectGroup }: LayoutProps) {
  const [activeMobileColumn, setActiveMobileColumn] = useState<MobileColumn>("news");
  const [selectedMatch, setSelectedMatch] = useState<Match | undefined>();
  const [recordMatch, setRecordMatch] = useState<Match | undefined>();
  const [pendingRecordMatch, setPendingRecordMatch] = useState<Match | undefined>();
  const [isRecordCodeOpen, setIsRecordCodeOpen] = useState(false);
  const [desktopColumnOrder, setDesktopColumnOrder] = useState<DesktopColumnId[]>(readDesktopColumnOrder);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);

  useEffect(() => {
    saveDesktopColumnOrder(desktopColumnOrder);
  }, [desktopColumnOrder]);

  const selectGroupFromRail = (groupId: string) => {
    setSelectedMatch(undefined);
    onSelectGroup(groupId);
    setActiveMobileColumn("radar");
  };

  const selectGroupFromRadar = (groupId: string) => {
    setSelectedMatch(undefined);
    onSelectGroup(groupId);
  };

  const selectMatchFromSchedule = (match: Match) => {
    setSelectedMatch(match);
    if (match.groupId !== "KO") onSelectGroup(match.groupId);
    setActiveMobileColumn("radar");
  };

  const openMatchRecord = (match: Match) => {
    if (hasMatchRecordCode()) {
      setRecordMatch(match);
      return;
    }

    setPendingRecordMatch(match);
    setIsRecordCodeOpen(true);
  };

  const moveDesktopColumn = (columnId: DesktopColumnId, direction: -1 | 1) => {
    setDesktopColumnOrder((current) => {
      const currentIndex = current.indexOf(columnId);
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= current.length) return current;

      const nextOrder = [...current];
      [nextOrder[currentIndex], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[currentIndex]];
      return nextOrder;
    });
  };

  const desktopColumnById = new Map(desktopColumns.map((column) => [column.id, column]));
  const desktopGridTemplateColumns = getDesktopGridTemplateColumns(desktopColumnOrder);

  const renderDesktopColumn = (columnId: DesktopColumnId) => {
    if (columnId === "rail") {
      return (
        <div data-mobile-active={activeMobileColumn === "rail"} data-mobile-column="rail" key={columnId}>
          <RightRail onSelectGroup={selectGroupFromRail} onSelectMatch={selectMatchFromSchedule} />
        </div>
      );
    }

    if (columnId === "radar") {
      return (
        <div
          className="radar-detail-stack"
          data-mobile-active={activeMobileColumn === "radar"}
          data-mobile-column="radar"
          key={columnId}
        >
          <GroupRadar
            selectedGroupId={selectedGroupId}
            selectedMatch={selectedMatch}
            onSelectGroup={selectGroupFromRadar}
            onSelectMatch={setSelectedMatch}
            onOpenMatchRecord={openMatchRecord}
          />
        </div>
      );
    }

    if (columnId === "editor") {
      return (
        <div data-mobile-active={activeMobileColumn === "editor"} data-mobile-column="editor" key={columnId}>
          <EditorDesk />
        </div>
      );
    }

    return (
      <div data-mobile-active={activeMobileColumn === "news"} data-mobile-column="news" key={columnId}>
        <MessagePanel />
      </div>
    );
  };

  return (
    <div className="app-shell">
      <TopTickerPlaceholder
        isColumnSettingsOpen={isColumnSettingsOpen}
        onThemeChange={onThemeChange}
        onToggleColumnSettings={() => setIsColumnSettingsOpen((open) => !open)}
        theme={theme}
      />
      <MatchRecordDialog match={recordMatch} onClose={() => setRecordMatch(undefined)} />
      {isRecordCodeOpen ? (
        <MatchRecordCodeDialog
          onClose={() => {
            setIsRecordCodeOpen(false);
            setPendingRecordMatch(undefined);
          }}
          onSaved={() => {
            setIsRecordCodeOpen(false);
            setRecordMatch(pendingRecordMatch);
            setPendingRecordMatch(undefined);
          }}
        />
      ) : null}
      <div className="main-stage">
        {isColumnSettingsOpen && (
          <section className="desktop-column-layout-tools" aria-label="桌面栏目顺序设置">
            <div className="desktop-column-layout-panel">
              {desktopColumnOrder.map((columnId, index) => {
                const column = desktopColumnById.get(columnId);
                if (!column) return null;

                return (
                  <div className="desktop-column-layout-row" key={columnId}>
                    <span className="desktop-column-layout-slot">槽位 {index + 1}</span>
                    <strong>{column.label}</strong>
                    <div className="desktop-column-layout-actions">
                      <button
                        disabled={index === 0}
                        onClick={() => moveDesktopColumn(columnId, -1)}
                        type="button"
                      >
                        左移
                      </button>
                      <button
                        disabled={index === desktopColumnOrder.length - 1}
                        onClick={() => moveDesktopColumn(columnId, 1)}
                        type="button"
                      >
                        右移
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        <nav className="mobile-column-switcher" aria-label="移动端栏目切换">
          {mobileColumns.map((column) => (
            <button
              aria-pressed={activeMobileColumn === column.id}
              className={activeMobileColumn === column.id ? "active" : ""}
              key={column.id}
              onClick={() => setActiveMobileColumn(column.id)}
              type="button"
            >
              {column.label}
            </button>
          ))}
        </nav>
        <div className="columns" style={{ gridTemplateColumns: desktopGridTemplateColumns }}>
          {desktopColumnOrder.map(renderDesktopColumn)}
        </div>
      </div>
    </div>
  );
}
