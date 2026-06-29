import type { Match } from "../data/mockWorldCup";
import { useWorldCupData } from "../matches/worldCupDataStore";
import MatchImpact from "./MatchImpact";
import StandingsTable from "./StandingsTable";

type GroupRadarProps = {
  selectedGroupId: string;
  selectedMatch?: Match;
  onOpenMatchRecord: (match: Match) => void;
  onSelectGroup: (groupId: string) => void;
  onSelectMatch: (match: Match) => void;
};

const knockoutStages = ["32 强", "16 强", "1/4 决赛", "半决赛", "三四名决赛", "决赛"];

const getStageOptionLabel = (stage: string) => {
  if (stage === "32 强") return "1/16决赛";
  if (stage === "16 强") return "1/8决赛";
  if (stage === "1/4 决赛") return "1/4决赛";
  return stage;
};

export default function GroupRadar({
  selectedGroupId,
  selectedMatch,
  onOpenMatchRecord,
  onSelectGroup,
  onSelectMatch,
}: GroupRadarProps) {
  const { allMatches, groups } = useWorldCupData();
  const findFirstStageMatch = (stage: string) =>
    allMatches.find((match) => match.groupId === "KO" && match.stage === stage);
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? groups[0];
  const selectedStage =
    selectedMatch?.groupId === "KO" && knockoutStages.includes(selectedMatch.stage) ? selectedMatch.stage : undefined;
  const stageMatches = selectedStage
    ? allMatches.filter((match) => match.groupId === "KO" && match.stage === selectedStage)
    : [];

  const openAllGroups = () => {
    window.open("/all-groups", "_blank");
  };

  if (!selectedGroup && !selectedStage) {
    return (
      <aside className="panel group-radar">
        <div className="panel-title-row">
          <div className="radar-title-tools">
            <h2>比赛</h2>
            <select className="knockout-stage-select" disabled value="">
              <option value="">等待抓取数据</option>
            </select>
          </div>
        </div>
        <div className="radar-summary-card">
          <div className="radar-match-list" aria-label="暂无比赛数据">
            暂无抓取到的比赛数据
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="panel group-radar">
      <div className="panel-title-row">
        <div className="radar-title-tools">
          <h2>比赛</h2>
          <select
            className="knockout-stage-select"
            onChange={(event) => {
              const nextMatch = findFirstStageMatch(event.target.value);
              if (nextMatch) onSelectMatch(nextMatch);
            }}
            value={selectedStage ?? ""}
          >
            <option value="">淘汰赛</option>
            {knockoutStages.map((stage) => (
              <option key={stage} value={stage}>
                {getStageOptionLabel(stage)}
              </option>
            ))}
          </select>
        </div>
        <div className="radar-actions">
          <div className="group-letter-grid compact" aria-label="小组导航">
            {groups.map((group) => (
              <button
                aria-pressed={!selectedStage && selectedGroupId === group.id}
                className={`group-letter-button ${!selectedStage && selectedGroupId === group.id ? "selected" : ""}`}
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                type="button"
              >
                {group.id}
              </button>
            ))}
          </div>
          <button className="overview-button" onClick={openAllGroups} type="button">
            全
          </button>
        </div>
      </div>
      {selectedStage ? (
        <div className="radar-summary-card knockout-summary-card">
          <div className="knockout-stage-head">
            <span>{getStageOptionLabel(selectedStage)}</span>
            <strong>{stageMatches.length} 场</strong>
          </div>
          <div className="radar-match-list" aria-label={`${getStageOptionLabel(selectedStage)}比赛`}>
            <MatchImpact matches={stageMatches} onOpenMatchRecord={onOpenMatchRecord} />
          </div>
        </div>
      ) : (
        <div className="radar-summary-card">
          <StandingsTable standings={selectedGroup.standings} />
          <div className="radar-match-list" aria-label={`${selectedGroup.id}组比赛`}>
            <MatchImpact matches={selectedGroup.matches} onOpenMatchRecord={onOpenMatchRecord} />
          </div>
        </div>
      )}
    </aside>
  );
}
