import type { Standing } from "../data/mockWorldCup";
import TeamName from "./TeamName";

type StandingsTableProps = {
  standings: Standing[];
  variant?: "default" | "compact";
};

const getRowToneClass = (index: number) => {
  if (index < 2) return "qualified";
  return "neutral";
};

export default function StandingsTable({ standings, variant = "default" }: StandingsTableProps) {
  const variantClassName = variant === "compact" ? " compact" : "";

  return (
    <div className={`table-shell${variantClassName}`}>
      <table className={`standings-table${variantClassName}`}>
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
              <tr className={`standing-status-${getRowToneClass(index)}`} key={standing.teamId}>
                <td>{index + 1}</td>
                <td className="team-cell">
                  <TeamName teamId={standing.teamId} />
                </td>
                <td className="numeric-cell">{standing.played}</td>
                <td className="numeric-cell">{standing.wins}</td>
                <td className="numeric-cell">{standing.draws}</td>
                <td className="numeric-cell">{standing.losses}</td>
                <td className="numeric-cell">{standing.goalsFor}</td>
                <td className="numeric-cell">{standing.goalsAgainst}</td>
                <td className="numeric-cell">{goalDifference > 0 ? `+${goalDifference}` : goalDifference}</td>
                <td className="points-cell">{standing.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
