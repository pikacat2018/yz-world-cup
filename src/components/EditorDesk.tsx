import { useEffect, useMemo, useState } from "react";

const placeholderPanels = [
  {
    label: "HOT TREND",
    title: "等待趋势采样",
    copy: "5分钟窗口 · Reddit / zhibo8",
    size: "large",
    states: ["sampling", "queue idle", "waiting next window", "trend queue active"],
  },
  {
    label: "FAN MOOD",
    title: "等待评论情绪",
    copy: "高频表达 / 球迷吐槽",
    size: "medium",
    states: ["312 replies indexed", "comment window active", "queue idle"],
  },
  {
    label: "POST IDEAS",
    title: "等待候选文案",
    copy: "短句 / 角度 / 微博素材",
    size: "small",
    states: ["waiting publishable angle", "draft queue idle", "angle scan pending"],
  },
];

export default function EditorDesk() {
  const [stateIndex, setStateIndex] = useState(0);
  const maxStateCount = useMemo(() => Math.max(...placeholderPanels.map((panel) => panel.states.length)), []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setStateIndex((current) => (current + 1) % maxStateCount);
    }, 9000);

    return () => window.clearInterval(intervalId);
  }, [maxStateCount]);

  return (
    <aside className="panel editor-desk" aria-label="Editor workspace placeholder">
      <div className="panel-title-row">
        <div>
          <h2>编辑工作台</h2>
          <span className="eyebrow">EDITOR DESK</span>
        </div>
        <span className="desk-state">queue idle</span>
      </div>
      <div className="editor-desk-scroll">
        {placeholderPanels.map((panel) => (
          <section className={`editor-placeholder-panel ${panel.size}`} key={panel.label}>
            <div className="editor-placeholder-head">
              <span>{panel.label}</span>
              <em>{panel.states[stateIndex % panel.states.length]}</em>
            </div>
            <strong>{panel.title}</strong>
            <p>{panel.copy}</p>
          </section>
        ))}
      </div>
    </aside>
  );
}
