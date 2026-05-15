import type { Group } from "../data/mockWorldCup";
import EditorDesk from "./EditorDesk";
import GroupDetail from "./GroupDetail";
import GroupRadar from "./GroupRadar";
import MessagePanel from "./MessagePanel";
import RightRail from "./RightRail";
import TopTickerPlaceholder from "./TopTickerPlaceholder";

type LayoutProps = {
  selectedGroup: Group;
  selectedGroupId: string;
  onSelectGroup: (groupId: string) => void;
};

export default function Layout({ selectedGroup, selectedGroupId, onSelectGroup }: LayoutProps) {
  return (
    <div className="app-shell">
      <TopTickerPlaceholder />
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
