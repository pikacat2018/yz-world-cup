import { useEffect, useMemo, useState } from "react";
import type { Match } from "../data/mockWorldCup";
import { getMatchRecordBadge, hydrateMatchRecords, MATCH_RECORD_UPDATED_EVENT, readMatchRecords } from "../matches/matchRecordStore";
import { getBeijingDateTime } from "../utils/matchTime";
import TeamName from "./TeamName";

type MatchImpactProps = {
  matches: Match[];
  onOpenMatchRecord?: (match: Match) => void;
};

export default function MatchImpact({ matches, onOpenMatchRecord }: MatchImpactProps) {
  const [recordVersion, setRecordVersion] = useState(0);
  const recordByMatchId = useMemo(
    () => new Map(readMatchRecords().map((record) => [record.matchId, record])),
    [recordVersion],
  );

  useEffect(() => {
    if (!onOpenMatchRecord) return undefined;

    const updateRecords = () => setRecordVersion((version) => version + 1);
    window.addEventListener(MATCH_RECORD_UPDATED_EVENT, updateRecords);
    void hydrateMatchRecords().catch((error) => {
      console.warn("[match-records] hydrate failed", error);
    });

    return () => window.removeEventListener(MATCH_RECORD_UPDATED_EVENT, updateRecords);
  }, [onOpenMatchRecord]);

  return (
    <div className="match-impact-stream">
      {matches.map((match) => {
        const beijingTime = getBeijingDateTime(match);
        const hasRecord = Boolean(getMatchRecordBadge(recordByMatchId.get(match.id)));
        const scorerCounts = new Map<string, number>();
        const goals = (match.goals ?? []).map((goal) => {
          const scorerKey = `${goal.side}:${goal.player}`;
          const count = (scorerCounts.get(scorerKey) ?? 0) + 1;
          scorerCounts.set(scorerKey, count);

          return { ...goal, count };
        });

        return (
          <article
            className={`impact-row impact-${match.status} ${onOpenMatchRecord ? "has-record-action" : ""}`}
            key={match.id}
          >
            <span className="impact-stage">{match.stage}</span>
            <span className="impact-match-no">M{String(match.matchNo).padStart(2, "0")}</span>
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
            {match.penaltyShootout ? (
              <div className="impact-penalty-score">
                {match.penaltyShootout.homeScore}-{match.penaltyShootout.awayScore}
              </div>
            ) : null}
            {goals.length > 0 ? (
              <div className="impact-goal-events" aria-label="进球事件">
                {goals.map((goal, index) => (
                  <div className={`impact-goal-event ${goal.side}`} key={`${goal.minute}-${goal.player}-${index}`}>
                    <span className="impact-goal-player">
                      {goal.side === "home" && goal.ownGoal ? <em>OG</em> : null}
                      {goal.side === "home" && !goal.ownGoal && goal.count > 1 ? <em>{goal.count}x</em> : null}
                      <span>{goal.player}</span>
                      {goal.side === "away" && !goal.ownGoal && goal.count > 1 ? <em>x{goal.count}</em> : null}
                      {goal.side === "away" && goal.ownGoal ? <em>OG</em> : null}
                    </span>
                    <span className="impact-goal-minute">{goal.minute}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {match.penaltyShootout ? (
              <div className="impact-penalty-events" aria-label="点球大战">
                {match.penaltyShootout.rounds.map((round) => (
                  <div className="impact-penalty-round" key={round.round}>
                    <span className="impact-penalty-player home">{round.home?.player ?? ""}</span>
                    <span className="impact-penalty-result home">
                      {round.home ? (round.home.scored ? "✓" : "×") : ""}
                    </span>
                    <span className="impact-penalty-no">{round.round}</span>
                    <span className="impact-penalty-result away">
                      {round.away ? (round.away.scored ? "✓" : "×") : ""}
                    </span>
                    <span className="impact-penalty-player away">{round.away?.player ?? ""}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="impact-venue" title={match.venue}>
              {match.venue}
            </div>
            {onOpenMatchRecord ? (
              <button
                aria-label={`记录 M${String(match.matchNo).padStart(2, "0")} 比赛`}
                className={`match-record-chip impact-record-chip ${hasRecord ? "active" : ""}`}
                onClick={() => onOpenMatchRecord(match)}
                type="button"
              >
                {hasRecord ? "★" : "☆"}
              </button>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
