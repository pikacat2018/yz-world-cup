import DataBoards from "./DataBoards";
import SchedulePanel from "./SchedulePanel";
import type { Match } from "../data/mockWorldCup";

type RightRailProps = {
  onSelectGroup: (groupId: string) => void;
  onSelectMatch: (match: Match) => void;
};

export default function RightRail({ onSelectGroup, onSelectMatch }: RightRailProps) {
  return (
    <aside className="right-rail">
      <SchedulePanel onSelectMatch={onSelectMatch} />
      <DataBoards onSelectGroup={onSelectGroup} />
    </aside>
  );
}
