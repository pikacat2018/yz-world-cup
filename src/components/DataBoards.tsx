import { useMemo, useState } from "react";
import { getTeam, type Match, type MatchGoal } from "../data/mockWorldCup";
import { useWorldCupData } from "../matches/worldCupDataStore";

type BoardTab = "overview" | "scorers" | "assists" | "cards" | "events";

type BoardRow = {
  actionGroupId?: string;
  key: string;
  label?: string;
  meta: string;
  name: string;
  value: string;
};

type DataBoardsProps = {
  onSelectGroup: (groupId: string) => void;
};

type ScoredMatch = {
  awayGoals: number;
  homeGoals: number;
  match: Match;
};

type AggregatedScorer = {
  goals: number;
  groupId?: string;
  matches: number[];
  name: string;
  ownGoals: number;
  teamId?: string;
};

const tabs: { id: BoardTab; label: string }[] = [
  { id: "overview", label: "概览" },
  { id: "scorers", label: "进球" },
  { id: "assists", label: "助攻" },
  { id: "cards", label: "红黄牌" },
  { id: "events", label: "事件" },
];

const parseScoredMatch = (match: Match): ScoredMatch | undefined => {
  if (match.status !== "finished" || !match.score) return undefined;

  const [home, away] = match.score.split("-").map(Number);
  if (!Number.isFinite(home) || !Number.isFinite(away)) return undefined;

  return { awayGoals: away, homeGoals: home, match };
};

const getTeamLabel = (teamId?: string, fallback?: string) => (teamId ? getTeam(teamId).name : fallback ?? "--");

const formatMatchLabel = ({ match, homeGoals, awayGoals }: ScoredMatch) => {
  const home = getTeamLabel(match.homeTeamId, match.homeLabel);
  const away = getTeamLabel(match.awayTeamId, match.awayLabel);
  return `${home} ${homeGoals}-${awayGoals} ${away}`;
};

const pickMaxBy = (matches: ScoredMatch[], getValue: (match: ScoredMatch) => number) =>
  matches.reduce<ScoredMatch | undefined>((best, current) => {
    if (!best) return current;

    const currentValue = getValue(current);
    const bestValue = getValue(best);
    if (currentValue > bestValue) return current;
    if (currentValue === bestValue && current.match.matchNo < best.match.matchNo) return current;

    return best;
  }, undefined);

const countMatchesByValue = (
  matches: ScoredMatch[],
  getValue: (match: ScoredMatch) => number,
  value?: number,
) => (value === undefined ? 0 : matches.filter((match) => getValue(match) === value).length);

const formatTieSuffix = (tieCount: number) => (tieCount > 1 ? `，另有 ${tieCount - 1} 场并列` : "");

const createUnavailableRows = (message: string): BoardRow[] => [
  {
    key: message,
    label: "",
    meta: "",
    name: message,
    value: "--",
  },
];

function aggregateScorers(matches: Match[]) {
  const scorerMap = new Map<string, AggregatedScorer>();
  const singleMatchGoalRows: Array<{ goals: number; match: Match; player: string; teamLabel: string }> = [];

  for (const match of matches) {
    const goals = Array.isArray(match.goals) ? match.goals : [];
    const goalsByPlayer = new Map<string, { count: number; ownGoals: number; side: MatchGoal["side"] }>();

    for (const goal of goals) {
      const key = `${goal.side}:${goal.player}`;
      const current = goalsByPlayer.get(key) ?? { count: 0, ownGoals: 0, side: goal.side };
      current.count += 1;
      if (goal.ownGoal) current.ownGoals += 1;
      goalsByPlayer.set(key, current);

      const teamId = goal.side === "home" ? match.homeTeamId : match.awayTeamId;
      const scorerKey = `${teamId ?? goal.side}:${goal.player}`;
      const existing = scorerMap.get(scorerKey) ?? {
        goals: 0,
        groupId: match.groupId !== "KO" ? match.groupId : undefined,
        matches: [],
        name: goal.player,
        ownGoals: 0,
        teamId,
      };
      existing.goals += 1;
      if (goal.ownGoal) existing.ownGoals += 1;
      if (!existing.matches.includes(match.matchNo)) existing.matches.push(match.matchNo);
      scorerMap.set(scorerKey, existing);
    }

    for (const [key, details] of goalsByPlayer) {
      const [side, player] = key.split(":");
      const teamId = side === "home" ? match.homeTeamId : match.awayTeamId;
      singleMatchGoalRows.push({
        goals: details.count,
        match,
        player,
        teamLabel: getTeamLabel(teamId, side === "home" ? match.homeLabel : match.awayLabel),
      });
    }
  }

  const scorers = [...scorerMap.values()].sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name, "zh-CN"));
  const topSingleMatch = [...singleMatchGoalRows].sort((a, b) => b.goals - a.goals || a.match.matchNo - b.match.matchNo)[0];
  const topSingleMatchTieCount = topSingleMatch
    ? singleMatchGoalRows.filter((row) => row.goals === topSingleMatch.goals).length
    : 0;

  return { scorers, topSingleMatch, topSingleMatchTieCount };
}

export default function DataBoards({ onSelectGroup }: DataBoardsProps) {
  const { allMatches, eventEnhancementStatus, isFallback } = useWorldCupData();
  const [activeTab, setActiveTab] = useState<BoardTab>("overview");

  const rows = useMemo<Record<BoardTab, BoardRow[]>>(() => {
    const scoredMatches = allMatches.flatMap((match) => {
      const scoredMatch = parseScoredMatch(match);
      return scoredMatch ? [scoredMatch] : [];
    });
    const { scorers, topSingleMatch, topSingleMatchTieCount } = aggregateScorers(allMatches);
    const topSingleMatchScore = topSingleMatch ? parseScoredMatch(topSingleMatch.match) : undefined;
    const topScorer = scorers[0];
    const highestMarginMatch = pickMaxBy(scoredMatches, ({ homeGoals, awayGoals }) => Math.abs(homeGoals - awayGoals));
    const highestScoringMatch = pickMaxBy(scoredMatches, ({ homeGoals, awayGoals }) => homeGoals + awayGoals);
    const highestMargin = highestMarginMatch
      ? Math.abs(highestMarginMatch.homeGoals - highestMarginMatch.awayGoals)
      : undefined;
    const highestGoalTotal = highestScoringMatch
      ? highestScoringMatch.homeGoals + highestScoringMatch.awayGoals
      : undefined;
    const highestMarginTieCount = countMatchesByValue(
      scoredMatches,
      ({ homeGoals, awayGoals }) => Math.abs(homeGoals - awayGoals),
      highestMargin,
    );
    const highestGoalTotalTieCount = countMatchesByValue(
      scoredMatches,
      ({ homeGoals, awayGoals }) => homeGoals + awayGoals,
      highestGoalTotal,
    );

    const overviewRows: BoardRow[] = [
      {
        actionGroupId: topScorer?.groupId,
        key: "overview-scorer",
        label: "头号射手",
        meta: topScorer ? getTeamLabel(topScorer.teamId) : "--",
        name: topScorer?.name ?? "暂无真实进球事件",
        value: topScorer ? `${topScorer.goals} 球` : "--",
      },
      {
        actionGroupId: topSingleMatch?.match.groupId !== "KO" ? topSingleMatch?.match.groupId : undefined,
        key: "overview-single-match-goal",
        label: "单场进球",
        meta: topSingleMatch
          ? topSingleMatchScore
            ? `${formatMatchLabel(topSingleMatchScore)}${formatTieSuffix(topSingleMatchTieCount)}`
            : "比分待补全"
          : "--",
        name: topSingleMatch ? `${topSingleMatch.player} | ${topSingleMatch.teamLabel}` : "等待 FIFA 事件增强",
        value: topSingleMatch ? `${topSingleMatch.goals} 球` : "--",
      },
      {
        key: "overview-margin",
        label: "最大分差",
        meta: highestMarginMatch
          ? `M${String(highestMarginMatch.match.matchNo).padStart(2, "0")}${formatTieSuffix(highestMarginTieCount)}`
          : "--",
        name: highestMarginMatch ? formatMatchLabel(highestMarginMatch) : "暂无完赛结果",
        value: highestMargin === undefined ? "--" : `${highestMargin} 球`,
      },
      {
        key: "overview-total-goals",
        label: "总进球最多",
        meta: highestScoringMatch
          ? `M${String(highestScoringMatch.match.matchNo).padStart(2, "0")}${formatTieSuffix(highestGoalTotalTieCount)}`
          : "--",
        name: highestScoringMatch ? formatMatchLabel(highestScoringMatch) : "暂无完赛结果",
        value: highestGoalTotal === undefined ? "--" : `${highestGoalTotal} 球`,
      },
      {
        key: "overview-source",
        label: "数据状态",
        meta: isFallback ? "fallback" : "fifa-official",
        name: isFallback ? "当前仍在显示 fallback 比赛数据" : "基础赛程和积分榜已切到真实主源",
        value: eventEnhancementStatus === "ready" ? "事件层已接通" : "事件层待补全",
      },
    ];

    const scorerRows =
      scorers.length > 0
        ? scorers.slice(0, 12).map((item, index) => ({
            actionGroupId: item.groupId,
            key: `scorer-${item.name}-${index}`,
            label: String(index + 1),
            meta: `${getTeamLabel(item.teamId)} | M${item.matches.map((matchNo) => String(matchNo).padStart(2, "0")).join(", M")}`,
            name: item.name,
            value: item.ownGoals > 0 ? `${item.goals} 球 / 乌龙 ${item.ownGoals}` : `${item.goals}`,
          }))
        : createUnavailableRows("暂无真实进球事件");

    return {
      assists: createUnavailableRows("当前页面暂未展示助攻明细"),
      cards: createUnavailableRows("当前主源不含稳定红黄牌明细"),
      events: createUnavailableRows("当前页面暂未展示更多事件流"),
      overview: overviewRows,
      scorers: scorerRows,
    };
  }, [allMatches, eventEnhancementStatus, isFallback]);

  return (
    <aside className="panel data-boards">
      <div className="panel-title-row compact-title-row">
        <div>
          <h2>数据板</h2>
        </div>
      </div>

      <div className="data-board-tabs" aria-label="数据板切换" role="tablist">
        {tabs.map((tab) => (
          <button
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? "active" : ""}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="data-board-list" role="tabpanel">
        {rows[activeTab].map((row) => {
          const rowClassName = `data-board-row ${activeTab === "overview" ? "overview-row" : ""} ${
            activeTab === "events" ? "event-row" : ""
          }`;
          const rowContents = (
            <>
              {activeTab !== "events" && row.label ? <span>{row.label}</span> : null}
              <strong>{row.name}</strong>
              {row.meta ? <em>{row.meta}</em> : null}
              <b>{row.value}</b>
            </>
          );

          if (row.actionGroupId) {
            return (
              <button
                className={`${rowClassName} clickable-row`}
                key={row.key}
                onClick={() => onSelectGroup(row.actionGroupId!)}
                type="button"
              >
                {rowContents}
              </button>
            );
          }

          return (
            <div className={rowClassName} key={row.key}>
              {rowContents}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
