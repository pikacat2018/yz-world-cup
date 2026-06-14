import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { NEWS_ITEMS_UPDATED_EVENT, readPinnedNewsIds, readStoredNewsItems } from "../news/newsStore";
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
    <div className="bottom-ticker-content" aria-hidden={isDuplicate || undefined}>
      {items.map((item) => {
        const label = tickerSourceLabels[item.source];
        const copy = (
          <>
            <span className="bottom-ticker-source">{label}</span>
            <span className="bottom-ticker-divider">｜</span>
            <span className="bottom-ticker-text">{item.text}</span>
          </>
        );

        return item.url ? (
          <a
            className="bottom-ticker-item"
            href={item.url}
            key={item.id}
            rel="noopener noreferrer"
            tabIndex={isDuplicate ? -1 : undefined}
            target="_blank"
          >
            {copy}
          </a>
        ) : (
          <span className="bottom-ticker-item" key={item.id}>
            {copy}
          </span>
        );
      })}
    </div>
  );
}

export default function BottomTicker() {
  const [items, setItems] = useState<TickerItem[]>(loadTickerItems);
  const animationDuration = useMemo(() => `${Math.max(28, items.length * 5)}s`, [items.length]);

  useEffect(() => {
    const refreshTicker = () => setItems(loadTickerItems());

    window.addEventListener(BOTTOM_TICKER_UPDATED_EVENT, refreshTicker);
    window.addEventListener(NEWS_ITEMS_UPDATED_EVENT, refreshTicker);
    window.addEventListener("storage", refreshTicker);

    return () => {
      window.removeEventListener(BOTTOM_TICKER_UPDATED_EVENT, refreshTicker);
      window.removeEventListener(NEWS_ITEMS_UPDATED_EVENT, refreshTicker);
      window.removeEventListener("storage", refreshTicker);
    };
  }, []);

  return (
    <footer className="bottom-ticker" aria-label="底部动态快讯滚动条">
      <div className="ticker-label alert">FLASH</div>
      <div className="bottom-ticker-viewport" style={{ "--ticker-duration": animationDuration } as CSSProperties}>
        <div className="bottom-ticker-track">
          <TickerContent items={items} />
          <TickerContent isDuplicate items={items} />
        </div>
      </div>
    </footer>
  );
}
