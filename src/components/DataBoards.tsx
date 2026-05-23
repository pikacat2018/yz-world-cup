import { useMemo, useState } from "react";
import { allMatches, getTeam, playerStats, storyEvents } from "../data/mockWorldCup";
import type { Match } from "../data/mockWorldCup";

type BoardTab = "overview" | "scorers" | "assists" | "cards" | "events";

type BoardRow = {
  actionGroupId?: string;
  key: string;
  label?: string;
  name: string;
  meta: string;
  value: string;
};

type DataBoardsProps = {
  onSelectGroup: (groupId: string) => void;
};

type ScoredMatch = {
  match: Match;
  homeGoals: number;
  awayGoals: number;
};

const parseScoredMatch = (match: Match): ScoredMatch | undefined => {
  if (match.status !== "finished" || !match.score) return undefined;

  const [home, away] = match.score.split("-").map(Number);
  if (!Number.isFinite(home) || !Number.isFinite(away)) return undefined;

  return { match, homeGoals: home, awayGoals: away };
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

const formatTieSuffix = (tieCount: number) => (tieCount > 1 ? ` · 另 ${tieCount - 1} 项并列` : "");

const tabs: { id: BoardTab; label: string }[] = [
  { id: "overview", label: "概览" },
  { id: "scorers", label: "进球" },
  { id: "assists", label: "助攻" },
  { id: "cards", label: "红黄牌" },
  { id: "events", label: "事件" },
];

export default function DataBoards({ onSelectGroup }: DataBoardsProps) {
  const [activeTab, setActiveTab] = useState<BoardTab>("overview");

  const rows = useMemo<Record<BoardTab, BoardRow[]>>(() => {
    const topScorer = playerStats.scorers[0];
    const topAssist = playerStats.assists[0];
    const cardWatch = playerStats.cards[0];
    const topSingleMatchScorer = playerStats.singleMatchGoals[0];
    const topSingleMatch = allMatches.find((match) => match.matchNo === topSingleMatchScorer?.matchNo);
    const topSingleScoredMatch = topSingleMatch ? parseScoredMatch(topSingleMatch) : undefined;
    const fallbackSingleMatchLabel =
      topSingleMatchScorer && "match" in topSingleMatchScorer ? topSingleMatchScorer.match : undefined;
    const singleMatchTieCount = topSingleMatchScorer?.goals
      ? playerStats.singleMatchGoals.filter((item) => item.goals === topSingleMatchScorer.goals).length
      : 0;
    const scoredMatches = allMatches.flatMap((match) => {
      const scoredMatch = parseScoredMatch(match);
      return scoredMatch ? [scoredMatch] : [];
    });
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

    return {
      overview: [
        {
          key: "overview-scorer",
          label: "进球最多",
          name: topScorer?.player ?? "--",
          meta: topScorer?.team ?? "--",
          value: topScorer?.goals ? `${topScorer.goals} 球` : "--",
        },
        {
          key: "overview-assist",
          label: "助攻最多",
          name: topAssist?.player ?? "--",
          meta: topAssist?.team ?? "--",
          value: topAssist?.assists ? `${topAssist.assists} 助` : "--",
        },
        {
          key: "overview-card",
          label: "红黄牌",
          name: cardWatch?.player ?? "--",
          meta: cardWatch?.team ?? "--",
          value: cardWatch ? `${cardWatch.yellowCards ?? 0}黄/${cardWatch.redCards ?? 0}红` : "--",
        },
        {
          actionGroupId: topSingleMatch?.groupId !== "KO" ? topSingleMatch?.groupId : undefined,
          key: "overview-single-match-goal",
          label: "单场进球",
          name: topSingleMatchScorer?.player ?? "--",
          meta: topSingleMatchScorer
            ? `${topSingleScoredMatch ? formatMatchLabel(topSingleScoredMatch) : fallbackSingleMatchLabel ?? "--"}${formatTieSuffix(singleMatchTieCount)}`
            : "--",
          value: topSingleMatchScorer?.goals ? `${topSingleMatchScorer.goals} 球` : "--",
        },
        {
          key: "overview-margin",
          label: "最大分差",
          name: highestMarginMatch ? formatMatchLabel(highestMarginMatch) : "--",
          meta: highestMarginMatch
            ? `M${String(highestMarginMatch.match.matchNo).padStart(2, "0")}${formatTieSuffix(highestMarginTieCount)}`
            : "--",
          value: highestMargin === undefined ? "--" : `${highestMargin} 球`,
        },
        {
          key: "overview-total-goals",
          label: "最大比分",
          name: highestScoringMatch ? formatMatchLabel(highestScoringMatch) : "--",
          meta: highestScoringMatch
            ? `M${String(highestScoringMatch.match.matchNo).padStart(2, "0")}${formatTieSuffix(highestGoalTotalTieCount)}`
            : "--",
          value: highestGoalTotal === undefined ? "--" : `${highestGoalTotal} 球`,
        },
      ],
      scorers: playerStats.scorers.map((item) => ({
        key: `scorer-${item.rank}`,
        label: String(item.rank),
        name: item.player,
        meta: item.team,
        value: `${item.goals ?? 0}`,
      })),
      assists: playerStats.assists.map((item) => ({
        key: `assist-${item.rank}`,
        label: String(item.rank),
        name: item.player,
        meta: item.team,
        value: `${item.assists ?? 0}`,
      })),
      cards: playerStats.cards.map((item) => ({
        key: `card-${item.rank}`,
        label: String(item.rank),
        name: item.player,
        meta: item.team,
        value: `${item.yellowCards ?? 0}黄/${item.redCards ?? 0}红`,
      })),
      events: storyEvents.map((event, index) => ({
        actionGroupId: event.groupId,
        key: `event-${event.label}-${index}`,
        name: event.label,
        meta: "",
        value: event.value,
      })),
    };
  }, []);

  return (
    <aside className="panel data-boards">
      <div className="panel-title-row compact-title-row">
        <div>
          <h2>数据板</h2>
        </div>
      </div>

      <div className="data-board-tabs" role="tablist" aria-label="数据板切换">
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
              {activeTab !== "events" && <span>{row.label}</span>}
              <strong>{row.name}</strong>
              {activeTab !== "events" && <em>{row.meta}</em>}
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
