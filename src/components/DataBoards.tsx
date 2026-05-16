import { useMemo, useState } from "react";
import { playerStats, storyEvents } from "../data/mockWorldCup";

type BoardTab = "overview" | "scorers" | "assists" | "cards" | "events";

type BoardRow = {
  key: string;
  label?: string;
  name: string;
  meta: string;
  value: string;
};

const tabs: { id: BoardTab; label: string }[] = [
  { id: "overview", label: "概览" },
  { id: "scorers", label: "射手榜" },
  { id: "assists", label: "助攻榜" },
  { id: "cards", label: "红黄牌" },
  { id: "events", label: "事件榜" },
];

export default function DataBoards() {
  const [activeTab, setActiveTab] = useState<BoardTab>("overview");

  const rows = useMemo<Record<BoardTab, BoardRow[]>>(() => {
    const topScorer = playerStats.scorers[0];
    const topAssist = playerStats.assists[0];
    const cardWatch = playerStats.cards[0];
    const biggestUpset = storyEvents[8];
    const biggestWin = storyEvents[9];

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
          key: "overview-upset",
          label: "最大冷门",
          name: biggestUpset?.value ?? "--",
          meta: biggestUpset?.detail ?? "--",
          value: "事实",
        },
        {
          key: "overview-score",
          label: "最大比分",
          name: biggestWin?.value ?? "--",
          meta: biggestWin?.detail ?? "--",
          value: "事实",
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
        key: `event-${event.label}-${index}`,
        label: String(index + 1),
        name: event.value,
        meta: event.detail,
        value: event.label,
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
        {rows[activeTab].map((row) => (
          <div className={`data-board-row ${activeTab === "overview" ? "overview-row" : ""}`} key={row.key}>
            <span>{row.label}</span>
            <strong>{row.name}</strong>
            <em>{row.meta}</em>
            <b>{row.value}</b>
          </div>
        ))}
      </div>
    </aside>
  );
}
