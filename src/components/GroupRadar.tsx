import { groups } from "../data/mockWorldCup";
import MatchImpact from "./MatchImpact";
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
          <h2>小组雷达</h2>
        </div>
        <div className="radar-actions">
          <div className="group-letter-grid compact" aria-label="小组导航">
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
            全
          </button>
        </div>
      </div>
      <div className="radar-summary-card">
        <StandingsTable standings={selectedGroup.standings} />
        <div className="radar-match-list" aria-label={`${selectedGroup.id}组比赛`}>
          <MatchImpact group={selectedGroup} />
        </div>
      </div>
    </aside>
  );
}
