import { useEffect, useMemo, useState } from "react";
import type { Match } from "../data/mockWorldCup";
import { getMatchRecordBadge, hydrateMatchRecords, MATCH_RECORD_UPDATED_EVENT, readMatchRecords } from "../matches/matchRecordStore";
import { getBeijingDateTime } from "../utils/matchTime";
import TeamName from "./TeamName";

type MatchImpactProps = {
  matches: Match[];
  onOpenMatchRecord?: (match: Match) => void;
};

type TimelineEvent =
  | ({
      kind: "goal";
      count: number;
      isLastForScorer: boolean;
    } & NonNullable<Match["goals"]>[number])
  | ({
      kind: "red-card";
    } & NonNullable<Match["redCards"]>[number]);

function parseMinuteSortValue(minute: string) {
  const match = minute.match(/^(\d+)(?:'\+(\d+))?'/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const base = Number(match[1] ?? 0);
  const extra = Number(match[2] ?? 0);
  return base * 100 + extra;
}

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
        const totalGoalsByScorer = new Map<string, number>();

        for (const goal of match.goals ?? []) {
          const scorerKey = `${goal.side}:${goal.player}`;
          totalGoalsByScorer.set(scorerKey, (totalGoalsByScorer.get(scorerKey) ?? 0) + 1);
        }

        const goals = (match.goals ?? []).map((goal) => {
          const scorerKey = `${goal.side}:${goal.player}`;
          const count = (scorerCounts.get(scorerKey) ?? 0) + 1;
          scorerCounts.set(scorerKey, count);

          return {
            ...goal,
            count,
            isLastForScorer: count === (totalGoalsByScorer.get(scorerKey) ?? 0),
          };
        });
        const events: TimelineEvent[] = [
          ...goals.map((goal) => ({ ...goal, kind: "goal" as const })),
          ...(match.redCards ?? []).map((card) => ({ ...card, kind: "red-card" as const })),
        ].sort((left, right) => {
          const minuteDiff = parseMinuteSortValue(left.minute) - parseMinuteSortValue(right.minute);
          if (minuteDiff !== 0) return minuteDiff;
          if (left.kind !== right.kind) return left.kind === "goal" ? -1 : 1;
          return left.player.localeCompare(right.player, "en");
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
            {events.length > 0 ? (
              <div className="impact-goal-events impact-card-events" aria-label="比赛事件">
                {events.map((event, index) => (
                  <div className={`impact-goal-event ${event.side}`} key={`${event.kind}-${event.minute}-${event.player}-${index}`}>
                    <span className="impact-goal-player">
                      {event.kind === "red-card" && event.side === "away" ? <em className="impact-card-marker" aria-hidden="true">■</em> : null}
                      {event.kind === "goal" && event.side === "home" && event.ownGoal ? <em>OG</em> : null}
                      {event.kind === "goal" && event.side === "home" && !event.ownGoal && event.count > 1 && event.isLastForScorer ? <em>x{event.count}</em> : null}
                      {event.kind === "goal" && event.side === "away" ? <em className="impact-goal-marker" aria-hidden="true">⚽</em> : null}
                      <span>{event.player}</span>
                      {event.kind === "goal" && event.side === "home" ? <em className="impact-goal-marker" aria-hidden="true">⚽</em> : null}
                      {event.kind === "goal" && event.side === "away" && !event.ownGoal && event.count > 1 && event.isLastForScorer ? <em>x{event.count}</em> : null}
                      {event.kind === "goal" && event.side === "away" && event.ownGoal ? <em>OG</em> : null}
                      {event.kind === "red-card" && event.side === "home" ? <em className="impact-card-marker" aria-hidden="true">■</em> : null}
                    </span>
                    <span className="impact-goal-minute">{event.minute}</span>
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
