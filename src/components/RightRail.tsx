import DataBoards from "./DataBoards";
import SchedulePanel from "./SchedulePanel";

export default function RightRail() {
  return (
    <aside className="right-rail">
      <SchedulePanel />
      <DataBoards />
    </aside>
  );
}
