import { groups, getTeam } from "../data/mockWorldCup";
import StatusBadge from "./StatusBadge";
import TeamFlag from "./TeamFlag";
import TeamName from "./TeamName";

export default function AllGroupsOverview() {
  const selectGroupAndClose = (groupId: string) => {
    window.opener?.postMessage({ type: "select-group", groupId }, window.location.origin);
    window.close();
  };

  return (
    <main className="all-groups-page">
      <header className="all-groups-header">
        <div>
          <span className="eyebrow">ALL GROUPS OVERVIEW</span>
          <h1>2026 世界杯全部小组信息</h1>
          <p>12 个小组 A-L，每组 4 队；小组前二与 8 个最佳第三进入 32 强。</p>
        </div>
        <button className="overview-button large" onClick={() => window.close()} type="button">
          关闭总览
        </button>
      </header>

      <section className="all-groups-grid">
        {groups.map((group) => {
          const leader = getTeam(group.leaderTeamId);

          return (
            <button
              className="all-group-card clickable"
              key={group.id}
              onClick={() => selectGroupAndClose(group.id)}
              type="button"
            >
              <div className="group-card-head">
                <div>
                  <h2>{group.name}</h2>
                </div>
                <span className="leader">
                  头名 <TeamFlag teamId={group.leaderTeamId} />
                  {leader.name}
                </span>
              </div>
              <div className="all-group-standings">
                {group.standings.map((standing, index) => {
                  const goalDifference = standing.goalsFor - standing.goalsAgainst;

                  return (
                    <div className="all-group-row" key={standing.teamId}>
                      <span className="rank">{index + 1}</span>
                      <strong>
                        <TeamName teamId={standing.teamId} />
                      </strong>
                      <span>{standing.points} 分</span>
                      <span>{goalDifference > 0 ? `+${goalDifference}` : goalDifference}</span>
                      <StatusBadge status={standing.status} />
                    </div>
                  );
                })}
              </div>
              <div className="all-group-outlook">
                <span>{group.summary}</span>
                <span>{group.keyAlert}</span>
              </div>
            </button>
          );
        })}
      </section>
    </main>
  );
}
