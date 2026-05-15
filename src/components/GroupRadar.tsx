import { groups } from "../data/mockWorldCup";
import StandingsTable from "./StandingsTable";

type GroupRadarProps = {
  selectedGroupId: string;
  onSelectGroup: (groupId: string) => void;
};

export default function GroupRadar({ selectedGroupId, onSelectGroup }: GroupRadarProps) {
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? groups[0];

  const openAllGroups = () => {
    window.open("/all-groups", "_blank", "noopener,noreferrer");
  };

  return (
    <aside className="panel group-radar">
      <div className="panel-title-row">
        <div>
          <span className="eyebrow">GROUP RADAR</span>
          <h2>小组雷达</h2>
        </div>
        <div className="radar-actions">
          <div className="group-letter-grid compact" aria-label="小组字母导航">
            {groups.map((group) => (
              <button
                aria-pressed={selectedGroupId === group.id}
                className={`group-letter-button ${selectedGroupId === group.id ? "selected" : ""}`}
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                type="button"
              >
                {group.id}
              </button>
            ))}
          </div>
          <button className="overview-button" onClick={openAllGroups} type="button">
            全部小组
          </button>
        </div>
      </div>
      <div className="radar-summary-card">
        <StandingsTable standings={selectedGroup.standings} />
      </div>
    </aside>
  );
}
