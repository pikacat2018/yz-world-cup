import type { KeyboardEvent } from "react";
import { useWorldCupData } from "../matches/worldCupDataStore";
import StandingsTable from "./StandingsTable";

export default function AllGroupsOverview() {
  const { groups } = useWorldCupData();
  const isValidGroupId = (groupId: string) => groups.some((group) => group.id === groupId);

  const closeOrReturnHome = () => {
    try {
      if (window.opener && !window.opener.closed) {
        window.close();
        return;
      }
    } catch {
      // Fall through to same-tab navigation when opener access is unavailable.
    }

    window.location.assign("/");
  };

  const selectGroupAndClose = (groupId: string) => {
    if (!isValidGroupId(groupId)) return;

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: "select-group", groupId }, window.location.origin);
        window.close();
        return;
      }
    } catch {
      // Fall through to same-tab navigation when opener access is unavailable.
    }

    window.location.assign(`/?group=${encodeURIComponent(groupId)}`);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>, groupId: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    selectGroupAndClose(groupId);
  };

  return (
    <main className="all-groups-page">
      <header className="all-groups-header">
        <div>
          <span className="eyebrow">ALL GROUPS OVERVIEW</span>
          <h1>2026 世界杯全部小组信息</h1>
          <p>12 个小组 A-L，每组 4 队；小组前二与 8 个最佳第三进入 32 强。</p>
        </div>
        <button className="overview-button large" onClick={closeOrReturnHome} type="button">
          关闭总览
        </button>
      </header>

      <section className="all-groups-grid">
        {groups.map((group) => {
          return (
            <article
              className="all-group-card clickable"
              key={group.id}
              onClick={() => selectGroupAndClose(group.id)}
              onKeyDown={(event) => handleCardKeyDown(event, group.id)}
              role="button"
              tabIndex={0}
            >
              <div className="group-card-head">
                <h2>{group.name}</h2>
              </div>
              <StandingsTable standings={group.standings} variant="compact" />
            </article>
          );
        })}
      </section>
    </main>
  );
}
