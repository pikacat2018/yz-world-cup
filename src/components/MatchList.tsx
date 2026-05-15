import type { Match } from "../data/mockWorldCup";
import { getTeam } from "../data/mockWorldCup";
import { getBeijingDateTime } from "../utils/matchTime";
import TeamName from "./TeamName";

type MatchListProps = {
  matches: Match[];
};

export default function MatchList({ matches }: MatchListProps) {
  return (
    <div className="match-grid fixture-list">
      {matches.map((match) => {
        const home = match.homeTeamId ? getTeam(match.homeTeamId) : undefined;
        const away = match.awayTeamId ? getTeam(match.awayTeamId) : undefined;
        const beijingTime = getBeijingDateTime(match);

        return (
          <article className={`match-card fixture-row match-${match.status}`} key={match.id}>
            <div className="fixture-time">
              <span>{match.stage}</span>
              <strong>{beijingTime.dateTime}</strong>
            </div>
            <div className="fixture-teams">
              <strong>
                <TeamName fallback={match.homeLabel} teamId={home?.id} />
              </strong>
              <span>{match.score ?? "vs"}</span>
              <strong>
                <TeamName fallback={match.awayLabel} teamId={away?.id} />
              </strong>
            </div>
            <div className="fixture-context">
              <span title={match.venue}>{match.venue}</span>
              <em>{match.note}</em>
            </div>
          </article>
        );
      })}
    </div>
  );
}
