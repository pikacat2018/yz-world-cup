import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { readPinnedNewsIds, readStoredNewsItems } from "../news/newsStore";
import { BOTTOM_TICKER_UPDATED_EVENT, composeBottomTickerItems, tickerSourceLabels } from "../news/ticker";
import type { TickerItem } from "../news/types";

const loadTickerItems = () => {
  const pinnedIds = new Set(readPinnedNewsIds());
  const storedItems = readStoredNewsItems().map((item) => ({
    ...item,
    pinned: pinnedIds.has(item.id),
  }));

  return composeBottomTickerItems(storedItems);
};

type TickerContentProps = {
  isDuplicate?: boolean;
  items: TickerItem[];
};

function TickerContent({ isDuplicate = false, items }: TickerContentProps) {
  return (
    <div className="bottom-ticker-content top-live-ticker-content" aria-hidden={isDuplicate || undefined}>
      {items.map((item) => {
        const label = tickerSourceLabels[item.source];
        const copy = (
          <>
            <span className="bottom-ticker-source">{label}</span>
            <span className="bottom-ticker-divider">/</span>
            <span className="bottom-ticker-text">{item.text}</span>
          </>
        );

        return item.url ? (
          <a
            className="bottom-ticker-item top-live-ticker-item"
            href={item.url}
            key={item.id}
            rel="noopener noreferrer"
            tabIndex={isDuplicate ? -1 : undefined}
            target="_blank"
          >
            {copy}
          </a>
        ) : (
          <span className="bottom-ticker-item top-live-ticker-item" key={item.id}>
            {copy}
          </span>
        );
      })}
    </div>
  );
}

export default function TopTickerPlaceholder() {
  const [items, setItems] = useState<TickerItem[]>(loadTickerItems);
  const animationDuration = useMemo(() => `${Math.max(30, items.length * 5)}s`, [items.length]);

  useEffect(() => {
    const refreshTicker = () => setItems(loadTickerItems());

    window.addEventListener(BOTTOM_TICKER_UPDATED_EVENT, refreshTicker);
    window.addEventListener("storage", refreshTicker);

    return () => {
      window.removeEventListener(BOTTOM_TICKER_UPDATED_EVENT, refreshTicker);
      window.removeEventListener("storage", refreshTicker);
    };
  }, []);

  return (
    <header className="top-ticker top-live-bar" aria-label="Top quick ticker">
      <div className="top-flash-row">
        <div className="ticker-label top-flash-label">QUICK</div>
        <div className="bottom-ticker-viewport top-live-ticker-viewport" style={{ "--ticker-duration": animationDuration } as CSSProperties}>
          <div className="bottom-ticker-track">
            <TickerContent items={items} />
            <TickerContent isDuplicate items={items} />
          </div>
        </div>
      </div>
    </header>
  );
}
