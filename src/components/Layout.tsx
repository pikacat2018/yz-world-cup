import { useState } from "react";
import EditorDesk from "./EditorDesk";
import GroupRadar from "./GroupRadar";
import MessagePanel from "./MessagePanel";
import RightRail from "./RightRail";
import type { AppTheme } from "./ThemeToggle";
import TopTickerPlaceholder from "./TopTickerPlaceholder";

type LayoutProps = {
  onThemeChange: (theme: AppTheme) => void;
  selectedGroupId: string;
  theme: AppTheme;
  onSelectGroup: (groupId: string) => void;
};

type MobileColumn = "rail" | "radar" | "editor" | "news";

const mobileColumns: Array<{ id: MobileColumn; label: string }> = [
  { id: "news", label: "新闻" },
  { id: "editor", label: "今日跟进" },
  { id: "rail", label: "赛程数据" },
  { id: "radar", label: "小组" },
];

export default function Layout({ onThemeChange, selectedGroupId, theme, onSelectGroup }: LayoutProps) {
  const [activeMobileColumn, setActiveMobileColumn] = useState<MobileColumn>("news");

  return (
    <div className="app-shell">
      <TopTickerPlaceholder onThemeChange={onThemeChange} theme={theme} />
      <div className="main-stage">
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
        <div className="columns">
          <div data-mobile-active={activeMobileColumn === "rail"} data-mobile-column="rail">
            <RightRail />
          </div>
          <div
            className="radar-detail-stack"
            data-mobile-active={activeMobileColumn === "radar"}
            data-mobile-column="radar"
          >
            <GroupRadar selectedGroupId={selectedGroupId} onSelectGroup={onSelectGroup} />
          </div>
          <div data-mobile-active={activeMobileColumn === "editor"} data-mobile-column="editor">
            <EditorDesk />
          </div>
          <div data-mobile-active={activeMobileColumn === "news"} data-mobile-column="news">
            <MessagePanel />
          </div>
        </div>
      </div>
    </div>
  );
}
