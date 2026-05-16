import type { Group } from "../data/mockWorldCup";
import { getTeam } from "../data/mockWorldCup";
import MatchImpact from "./MatchImpact";

type GroupDetailProps = {
  group: Group;
};

const getScoreSpread = (score?: string) => {
  if (!score) return 0;

  const [homeValue, awayValue] = score.split("-").map(Number);
  if (Number.isNaN(homeValue) || Number.isNaN(awayValue)) return 0;

  return Math.abs(homeValue - awayValue);
};

const getTotalGoals = (score?: string) => {
  if (!score) return 0;

  const [homeValue, awayValue] = score.split("-").map(Number);
  if (Number.isNaN(homeValue) || Number.isNaN(awayValue)) return 0;

  return homeValue + awayValue;
};

const getMatchLabel = (group: Group, matchId?: string) => {
  const match = group.matches.find((item) => item.id === matchId);
  if (!match) return "待定";

  const home = match.homeTeamId ? getTeam(match.homeTeamId).name : match.homeLabel;
  const away = match.awayTeamId ? getTeam(match.awayTeamId).name : match.awayLabel;

  return `${home} ${match.score ?? "vs"} ${away}`;
};

const buildFixedFacts = (group: Group) => {
  const leader = getTeam(group.leaderTeamId);
  const qualified = group.standings
    .filter((standing) => standing.status === "qualified")
    .map((standing) => getTeam(standing.teamId).name);
  const eliminated = group.standings
    .filter((standing) => standing.status === "eliminated")
    .map((standing) => getTeam(standing.teamId).name);
  const third = group.standings[2];
  const lowestAgainst = [...group.standings].sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0];
  const topAttack = [...group.standings].sort((a, b) => b.goalsFor - a.goalsFor)[0];
  const widestMatch = [...group.matches].sort((a, b) => getScoreSpread(b.score) - getScoreSpread(a.score))[0];
  const highestGoalMatch = [...group.matches].sort((a, b) => getTotalGoals(b.score) - getTotalGoals(a.score))[0];
  const pointSpread = group.standings[0].points - group.standings[group.standings.length - 1].points;
  const deathGroupLevel = pointSpread <= 3 ? "高" : pointSpread <= 5 ? "中" : "低";

  return [
    `头名：${leader.name}`,
    "小组前二直接晋级 32 强",
    third ? `第三名：${getTeam(third.teamId).name} ${third.points} 分` : "第三名：待定",
    `最大比分：${getMatchLabel(group, widestMatch?.id)}`,
    topAttack ? `最多进球：${getTeam(topAttack.teamId).name} ${topAttack.goalsFor}` : "最多进球：待定",
    lowestAgainst ? `最少失球：${getTeam(lowestAgainst.teamId).name} ${lowestAgainst.goalsAgainst}` : "最少失球：待定",
    `最大冷门：${getMatchLabel(group, highestGoalMatch?.id)}`,
    `死亡小组程度：${deathGroupLevel}`,
    `已确定出线：${qualified.length > 0 ? qualified.join(" / ") : "暂无"}`,
    `已确定出局：${eliminated.length > 0 ? eliminated.join(" / ") : "暂无"}`,
  ];
};

const buildLiveStatus = (group: Group) => {
  const leader = getTeam(group.leaderTeamId);
  const second = group.standings[1];
  const third = group.standings[2];
  const nextMatch = group.matches.find((match) => match.status !== "finished");
  const pressureTeam = third ?? group.standings[group.standings.length - 1];

  return [
    `${leader.name}暂居头名线`,
    second ? `${getTeam(second.teamId).name}守住直接出线区` : "第二名仍未稳定",
    third ? `${getTeam(third.teamId).name}需要横向比较` : "第三名窗口待观察",
    pressureTeam ? `${getTeam(pressureTeam.teamId).name}末轮压力最大` : group.keyAlert,
    nextMatch ? `下一场关键战：${getMatchLabel(group, nextMatch.id)}` : group.keyAlert,
  ];
};

export default function GroupDetail({ group }: GroupDetailProps) {
  const fixedFacts = buildFixedFacts(group);
  const liveStatus = buildLiveStatus(group);

  return (
    <main className="panel group-detail">
      <section className="group-facts">
        <div className="group-facts-head">
          <div>
            <h1>小组信息</h1>
          </div>
          <p>{group.name}</p>
        </div>
        <div className="group-facts-grid">
          <section className="fact-layer fixed-layer" aria-label="固定事实">
            <div className="fact-layer-head">
              <span>固定事实</span>
            </div>
            <ul>
              {fixedFacts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </section>
          <section className="fact-layer live-layer" aria-label="实时状态">
            <div className="fact-layer-head">
              <span>实时状态</span>
            </div>
            <ul>
              {liveStatus.map((status) => (
                <li key={status}>{status}</li>
              ))}
            </ul>
          </section>
        </div>
      </section>

      <section className="detail-section schedule-detail-section">
        <MatchImpact group={group} />
      </section>
    </main>
  );
}
