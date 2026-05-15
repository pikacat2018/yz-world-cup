import type { Group } from "../data/mockWorldCup";
import { getTeam } from "../data/mockWorldCup";
import StatusBadge from "./StatusBadge";
import TeamName from "./TeamName";

type GroupCardProps = {
  group: Group;
  isSelected: boolean;
  onSelect: (groupId: string) => void;
};

export default function GroupCard({ group, isSelected, onSelect }: GroupCardProps) {
  const leader = getTeam(group.leaderTeamId);

  return (
    <button
      className={`group-card ${isSelected ? "selected" : ""}`}
      onClick={() => onSelect(group.id)}
      type="button"
    >
      <div className="group-card-head">
        <span className="group-id">{group.name}</span>
        <span className="leader">头名 {leader.name}</span>
      </div>
      <p>{group.summary}</p>
      <div className="mini-standings">
        {group.standings.map((standing) => {
          return (
            <div className="mini-standing-row" key={standing.teamId}>
              <span>
                <TeamName teamId={standing.teamId} />
              </span>
              <strong>{standing.points}</strong>
              <StatusBadge status={standing.status} />
            </div>
          );
        })}
      </div>
    </button>
  );
}
