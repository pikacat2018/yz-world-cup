import { useMemo, useState } from "react";
import { getTeam, type Match } from "../data/mockWorldCup";
import { useWorldCupData } from "../matches/worldCupDataStore";
import { getBeijingDateTime } from "../utils/matchTime";
import TeamName from "./TeamName";

const DEFAULT_QUEUE_SIZE = 6;

const splitScore = (score?: string) => {
  if (!score) return undefined;

  const [homeScore, awayScore] = score.split("-");
  if (!homeScore || !awayScore) return undefined;

  return { homeScore, awayScore };
};

const getStageLabel = (match: Match) => {
  if (match.groupId !== "KO") return `${match.groupId} 组`;
  if (match.stage === "32 强") return "1/16 决赛";
  if (match.stage === "16 强") return "1/8 决赛";
  return match.stage;
};

type SchedulePanelProps = {
  onSelectMatch: (match: Match) => void;
};

export default function SchedulePanel({ onSelectMatch }: SchedulePanelProps) {
  const { allMatches } = useWorldCupData();
  const matchDates = useMemo(
    () => Array.from(new Set(allMatches.map((match) => getBeijingDateTime(match).date))),
    [allMatches],
  );
  const [selectedDate, setSelectedDate] = useState(matchDates[0] ?? "");
  const activeDateIndex = matchDates.indexOf(selectedDate);
  const queuedMatches = allMatches
    .filter((match) => getBeijingDateTime(match).date >= selectedDate)
    .slice(0, DEFAULT_QUEUE_SIZE);

  const openFullSchedule = () => {
    window.open("/schedule", "_blank", "noopener,noreferrer");
  };

  return (
    <section className="panel schedule-panel" aria-label="赛程">
      <div className="panel-title-row schedule-head-row">
        <div>
          <h2>赛程</h2>
        </div>
        <div className="schedule-title-tools">
          <div className="date-switcher" aria-label="选择比赛日期">
            <button
              aria-label="前一天"
              disabled={activeDateIndex <= 0}
              onClick={() => setSelectedDate(matchDates[Math.max(0, activeDateIndex - 1)])}
              type="button"
            >
              -
            </button>
            <select onChange={(event) => setSelectedDate(event.target.value)} value={selectedDate}>
              {matchDates.map((date) => (
                <option key={date} value={date}>
                  {date.slice(5)}
                </option>
              ))}
            </select>
            <button
              aria-label="后一天"
              disabled={activeDateIndex === -1 || activeDateIndex >= matchDates.length - 1}
              onClick={() => setSelectedDate(matchDates[Math.min(matchDates.length - 1, activeDateIndex + 1)])}
              type="button"
            >
              +
            </button>
          </div>
          <button
            aria-label="打开全部比赛"
            className="overview-button schedule-all-button"
            onClick={openFullSchedule}
            title="全部比赛"
            type="button"
          >
            全部比赛
          </button>
        </div>
      </div>
      <div className="schedule-list">
        {queuedMatches.map((match) => {
          const home = match.homeTeamId ? getTeam(match.homeTeamId) : undefined;
          const away = match.awayTeamId ? getTeam(match.awayTeamId) : undefined;
          const beijingTime = getBeijingDateTime(match);
          const score = splitScore(match.score);
          const stageLabel = getStageLabel(match);

          return (
            <article
              aria-label={`查看 M${String(match.matchNo).padStart(2, "0")} 所在比赛列表`}
              className={`schedule-row schedule-${match.status}`}
              key={match.id}
              onClick={() => onSelectMatch(match)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectMatch(match);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <span className="match-no schedule-match-no">M{String(match.matchNo).padStart(2, "0")}</span>
              <span className="schedule-group-name" title={stageLabel}>
                {stageLabel}
              </span>
              <div className="schedule-date-time" aria-label="北京时间">
                <time>{beijingTime.dateLabel}</time>
                <strong>{beijingTime.time}</strong>
              </div>
              <div className="schedule-scoreline">
                <div className="schedule-team-row">
                  <strong className="schedule-team">
                    <TeamName fallback={match.homeLabel} teamId={home?.id} />
                  </strong>
                  <span className="schedule-score-box">{score?.homeScore ?? "-"}</span>
                </div>
                <div className="schedule-team-row">
                  <strong className="schedule-team">
                    <TeamName fallback={match.awayLabel} teamId={away?.id} />
                  </strong>
                  <span className="schedule-score-box">{score?.awayScore ?? "-"}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
