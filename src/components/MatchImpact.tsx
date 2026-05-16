import type { Group } from "../data/mockWorldCup";
import { getBeijingDateTime } from "../utils/matchTime";
import TeamName from "./TeamName";

type MatchImpactProps = {
  group: Group;
};

export default function MatchImpact({ group }: MatchImpactProps) {
  return (
    <div className="match-impact-stream">
      {group.matches.map((match) => {
        const beijingTime = getBeijingDateTime(match);

        return (
          <article className={`impact-row impact-${match.status}`} key={match.id}>
            <span className="impact-stage">{match.stage}</span>
            <time className="impact-time">
              {beijingTime.dateLabel} {beijingTime.time}
            </time>
            <div className="impact-scoreline">
              <strong className="impact-team home">
                <TeamName fallback={match.homeLabel} teamId={match.homeTeamId} />
              </strong>
              <span className="impact-score">{match.score ?? "vs"}</span>
              <strong className="impact-team away">
                <TeamName fallback={match.awayLabel} teamId={match.awayTeamId} />
              </strong>
            </div>
            <div className="impact-venue" title={match.venue}>
              {match.venue}
            </div>
          </article>
        );
      })}
    </div>
  );
}
