import { useState } from "react";
import { playerStats, storyEvents } from "../data/mockWorldCup";

type BoardTab = "scorers" | "assists" | "cards" | "events";

const tabs: { id: BoardTab; label: string }[] = [
  { id: "scorers", label: "射手榜" },
  { id: "assists", label: "助攻榜" },
  { id: "cards", label: "红黄牌" },
  { id: "events", label: "事件榜" },
];

export default function DataBoards() {
  const [activeTab, setActiveTab] = useState<BoardTab>("scorers");

  return (
    <aside className="panel data-boards">
      <div className="panel-title-row">
        <div>
          <span className="eyebrow">DATA BOARDS</span>
          <h2>数据榜</h2>
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label="数据榜切换">
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
      <div className="board-content">
        {activeTab === "scorers" && (
          <div className="rank-list">
            {playerStats.scorers.map((item) => (
              <div className="rank-row" key={item.rank}>
                <span className="rank">{item.rank}</span>
                <strong>{item.player}</strong>
                <span>{item.team}</span>
                <b>{item.goals} 球</b>
              </div>
            ))}
          </div>
        )}

        {activeTab === "assists" && (
          <div className="rank-list">
            {playerStats.assists.map((item) => (
              <div className="rank-row" key={item.rank}>
                <span className="rank">{item.rank}</span>
                <strong>{item.player}</strong>
                <span>{item.team}</span>
                <b>{item.assists} 助</b>
              </div>
            ))}
          </div>
        )}

        {activeTab === "cards" && (
          <div className="rank-list">
            {playerStats.cards.map((item) => (
              <div className="rank-row cards" key={item.rank}>
                <span className="rank">{item.rank}</span>
                <strong>{item.player}</strong>
                <span>{item.team}</span>
                <b>黄 {item.yellowCards} / 红 {item.redCards}</b>
              </div>
            ))}
          </div>
        )}

        {activeTab === "events" && (
          <div className="event-list">
            {storyEvents.map((event) => (
              <article className="event-card" key={event.label}>
                <span>{event.label}</span>
                <strong>{event.value}</strong>
                <p>{event.detail}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
