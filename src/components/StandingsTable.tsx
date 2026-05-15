import type { Standing } from "../data/mockWorldCup";
import TeamName from "./TeamName";

type StandingsTableProps = {
  standings: Standing[];
};

const getStatusClass = (status: Standing["status"]) => {
  if (status === "qualified") return "qualified";
  if (status === "eliminated") return "eliminated";
  if (status === "fighting" || status === "possible") return "contending";
  return "pending";
};

export default function StandingsTable({ standings }: StandingsTableProps) {
  return (
    <div className="table-shell">
      <table className="standings-table">
        <thead>
          <tr>
            <th>排名</th>
            <th>球队</th>
            <th>赛</th>
            <th>胜</th>
            <th>平</th>
            <th>负</th>
            <th>进</th>
            <th>失</th>
            <th>净</th>
            <th>分</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((standing, index) => {
            const goalDifference = standing.goalsFor - standing.goalsAgainst;

            return (
              <tr className={`standing-status-${getStatusClass(standing.status)}`} key={standing.teamId}>
                <td>{index + 1}</td>
                <td className="team-cell">
                  <TeamName teamId={standing.teamId} />
                </td>
                <td>{standing.played}</td>
                <td>{standing.wins}</td>
                <td>{standing.draws}</td>
                <td>{standing.losses}</td>
                <td>{standing.goalsFor}</td>
                <td>{standing.goalsAgainst}</td>
                <td>{goalDifference > 0 ? `+${goalDifference}` : goalDifference}</td>
                <td className="points-cell">{standing.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
