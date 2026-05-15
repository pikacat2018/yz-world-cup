import { useMemo, useState } from "react";
import { allMatches, getTeam } from "../data/mockWorldCup";
import { getBeijingDateTime } from "../utils/matchTime";
import TeamName from "./TeamName";

const splitScore = (score?: string) => {
  if (!score) return undefined;

  const [homeScore, awayScore] = score.split("-");
  if (!homeScore || !awayScore) return undefined;

  return { homeScore, awayScore };
};

export default function SchedulePanel() {
  const matchDates = useMemo(
    () => Array.from(new Set(allMatches.map((match) => getBeijingDateTime(match).date))),
    [],
  );
  const [selectedDate, setSelectedDate] = useState(matchDates[0] ?? "");
  const dailyMatches = allMatches.filter((match) => getBeijingDateTime(match).date === selectedDate);
  const activeDateIndex = matchDates.indexOf(selectedDate);

  const openFullSchedule = () => {
    window.open("/schedule", "_blank", "noopener,noreferrer");
  };

  return (
    <section className="panel schedule-panel" aria-label="Match queue">
      <div className="panel-title-row">
        <div>
          <h2>对阵赛程</h2>
          <span className="eyebrow">MATCH QUEUE</span>
          <span className="schedule-count-badge">{dailyMatches.length} matches</span>
        </div>
        <div className="schedule-title-tools">
          <div className="date-switcher" aria-label="按日期查看赛程">
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
          <button className="overview-button schedule-all-button" aria-label="全部赛程" onClick={openFullSchedule} title="全部赛程" type="button">
            ALL
          </button>
        </div>
      </div>
      <div className="schedule-list">
        {dailyMatches.map((match) => {
          const home = match.homeTeamId ? getTeam(match.homeTeamId) : undefined;
          const away = match.awayTeamId ? getTeam(match.awayTeamId) : undefined;
          const beijingTime = getBeijingDateTime(match);
          const score = splitScore(match.score);

          return (
            <article className={`schedule-row schedule-${match.status}`} key={match.id}>
              <div className="schedule-id-block">
                <span className="match-no">M{String(match.matchNo).padStart(2, "0")}</span>
                <span>{match.groupId} 组</span>
              </div>
              <div className="schedule-time-block" aria-label="北京时间">
                <span>{beijingTime.dateLabel}</span>
                <strong>{beijingTime.time}</strong>
              </div>
              <div className="schedule-team-stack">
                <div className="schedule-team-line">
                  <span>
                    <TeamName fallback={match.homeLabel} teamId={home?.id} />
                  </span>
                  {score && <strong className="schedule-score">{score.homeScore}</strong>}
                </div>
                <div className="schedule-team-line">
                  <span>
                    <TeamName fallback={match.awayLabel} teamId={away?.id} />
                  </span>
                  {score && <strong className="schedule-score">{score.awayScore}</strong>}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
