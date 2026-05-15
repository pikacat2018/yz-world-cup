import type { Group } from "../data/mockWorldCup";
import { getTeam } from "../data/mockWorldCup";
import MatchImpact from "./MatchImpact";

type GroupDetailProps = {
  group: Group;
};

export default function GroupDetail({ group }: GroupDetailProps) {
  const leader = getTeam(group.leaderTeamId);
  const keyPoints = [
    `头名：${leader.name}`,
    "前二直通 32 强",
    "最佳第三保留窗口",
    "第三名需看横向比较",
    group.keyAlert,
  ];

  return (
    <main className="panel group-detail">
      <section className="hero-strip outlook-summary-strip">
        <div className="hero-copy">
          <h1>出线形势</h1>
          <span className="eyebrow">GROUP OUTLOOK</span>
        </div>
        <div className="signal-card">
          <ul>
            {keyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
        <div className="outlook-summary-note">
          <p>{group.qualificationOutlook}</p>
          <div className="outlook-rule-grid">
            <div className="rule-row">
              <span>小组前二</span>
              <strong>24 队</strong>
            </div>
            <div className="rule-row">
              <span>最佳第三</span>
              <strong>8 / 12 队</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="detail-section schedule-detail-section">
        <div className="section-title-row">
          <h2>结果影响</h2>
          <span>MATCH IMPACT</span>
        </div>
        <MatchImpact group={group} />
      </section>
    </main>
  );
}
