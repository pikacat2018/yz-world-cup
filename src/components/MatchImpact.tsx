import type { Group, Match, Standing } from "../data/mockWorldCup";
import { getTeam } from "../data/mockWorldCup";
import { getBeijingDateTime } from "../utils/matchTime";
import TeamName from "./TeamName";

type MatchImpactProps = {
  group: Group;
};

type Score = {
  away: number;
  home: number;
};

const splitScore = (score?: string): Score | undefined => {
  if (!score) return undefined;

  const [homeValue, awayValue] = score.split("-").map(Number);
  if (Number.isNaN(homeValue) || Number.isNaN(awayValue)) return undefined;

  return { away: awayValue, home: homeValue };
};

const getStanding = (standings: Standing[], teamId?: string) =>
  teamId ? standings.find((standing) => standing.teamId === teamId) : undefined;

const getTeamLabel = (teamId?: string, fallback = "待定") => (teamId ? getTeam(teamId).name : fallback);

const getImpact = (match: Match, group: Group) => {
  const score = splitScore(match.score);
  const homeStanding = getStanding(group.standings, match.homeTeamId);
  const awayStanding = getStanding(group.standings, match.awayTeamId);
  const homeName = getTeamLabel(match.homeTeamId, match.homeLabel);
  const awayName = getTeamLabel(match.awayTeamId, match.awayLabel);

  if (!score || match.status !== "finished") {
    return {
      tag: match.status === "live" ? "live watch" : "next window",
      text: "下一轮出线形势更复杂",
    };
  }

  if (score.home === score.away) {
    return { tag: "shape shift", text: "横向比较压力增大" };
  }

  const homeWon = score.home > score.away;
  const winnerId = homeWon ? match.homeTeamId : match.awayTeamId;
  const loserId = homeWon ? match.awayTeamId : match.homeTeamId;
  const winnerName = homeWon ? homeName : awayName;
  const loserName = homeWon ? awayName : homeName;
  const winnerStanding = homeWon ? homeStanding : awayStanding;
  const loserStanding = homeWon ? awayStanding : homeStanding;
  const winnerRank = group.standings.findIndex((standing) => standing.teamId === winnerId);
  const loserRank = group.standings.findIndex((standing) => standing.teamId === loserId);

  if (winnerStanding?.status === "qualified" && winnerRank === 0) {
    return { tag: "locked", text: `${winnerName} 锁定头名` };
  }

  if (winnerStanding?.status === "qualified") {
    return { tag: "qualified", text: `${winnerName} 提前出线` };
  }

  if (loserStanding?.status === "eliminated") {
    return { tag: "risk", text: `${loserName} 出局风险升高` };
  }

  if (winnerRank > loserRank && loserRank >= 0) {
    return { tag: "spread", text: "冷门结果，具备传播价值" };
  }

  if (winnerStanding?.status === "fighting" || winnerStanding?.status === "possible") {
    return { tag: "control", text: `${winnerName} 保留出线主动权` };
  }

  return { tag: "impact", text: "小组排名发生变化" };
};

export default function MatchImpact({ group }: MatchImpactProps) {
  return (
    <div className="match-impact-stream">
      {group.matches.map((match) => {
        const beijingTime = getBeijingDateTime(match);
        const impact = getImpact(match, group);

        return (
          <article className={`impact-row impact-${match.status}`} key={match.id}>
            <div className="impact-result">
              <strong>
                <TeamName fallback={match.homeLabel} teamId={match.homeTeamId} />
              </strong>
              <span>{match.score ?? "vs"}</span>
              <strong>
                <TeamName fallback={match.awayLabel} teamId={match.awayTeamId} />
              </strong>
            </div>
            <div className="impact-summary">
              <span aria-hidden="true">→</span>
              <strong>{impact.text}</strong>
              <em>{impact.tag}</em>
            </div>
            <div className="impact-meta">
              <span>
                {match.stage} · {beijingTime.dateLabel}
              </span>
              <span title={match.venue}>{match.venue}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
