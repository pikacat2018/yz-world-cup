import type { Group } from "../data/mockWorldCup";
import EditorDesk from "./EditorDesk";
import GroupDetail from "./GroupDetail";
import GroupRadar from "./GroupRadar";
import MessagePanel from "./MessagePanel";
import RightRail from "./RightRail";
import type { AppTheme } from "./ThemeToggle";
import TopTickerPlaceholder from "./TopTickerPlaceholder";

type LayoutProps = {
  onThemeChange: (theme: AppTheme) => void;
  selectedGroup: Group;
  selectedGroupId: string;
  theme: AppTheme;
  onSelectGroup: (groupId: string) => void;
};

export default function Layout({ onThemeChange, selectedGroup, selectedGroupId, theme, onSelectGroup }: LayoutProps) {
  return (
    <div className="app-shell">
      <TopTickerPlaceholder onThemeChange={onThemeChange} theme={theme} />
      <div className="main-stage">
        <div className="columns">
          <RightRail />
          <div className="radar-detail-stack">
            <GroupRadar selectedGroupId={selectedGroupId} onSelectGroup={onSelectGroup} />
            <div className="center-stack">
              <GroupDetail group={selectedGroup} />
            </div>
          </div>
          <EditorDesk />
          <MessagePanel />
        </div>
      </div>
    </div>
  );
}
