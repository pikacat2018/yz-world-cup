import { useCallback, useEffect, useState } from "react";
import { MAX_PINNED_NEWS, readStoredNewsItems, saveNewsItems, savePinnedNewsIds } from "../news/newsStore";
import { BOTTOM_TICKER_UPDATED_EVENT, notifyBottomTickerUpdated } from "../news/ticker";
import type { NewsItem } from "../news/types";

const getDisplayTitle = (item: NewsItem) => item.translatedTitle || item.title;
const getOriginalLink = (item: NewsItem) => item.url || item.externalUrl || "";
const buildExportText = (items: NewsItem[]) =>
  items
    .map((item, index) => {
      const link = getOriginalLink(item);
      return [`${index + 1}. ${getDisplayTitle(item)}`, link ? `链接：${link}` : "链接：暂无"].join("\n");
    })
    .join("\n\n");

export default function EditorDesk() {
  const [items, setItems] = useState<NewsItem[]>(() => readStoredNewsItems());
  const [isExportOpen, setIsExportOpen] = useState(false);

  const refreshSelection = useCallback(() => {
    setItems(readStoredNewsItems());
  }, []);

  useEffect(() => {
    refreshSelection();

    window.addEventListener(BOTTOM_TICKER_UPDATED_EVENT, refreshSelection);
    window.addEventListener("storage", refreshSelection);

    return () => {
      window.removeEventListener(BOTTOM_TICKER_UPDATED_EVENT, refreshSelection);
      window.removeEventListener("storage", refreshSelection);
    };
  }, [refreshSelection]);

  const selectedItems = items.filter((item) => item.pinned).slice(0, MAX_PINNED_NEWS);
  const exportText = buildExportText(selectedItems);

  const removeSelectedItem = (target: NewsItem) => {
    const nextItems = items.map((item) => (item.id === target.id ? { ...item, pinned: false } : item));
    const nextPinnedIds = nextItems.filter((item) => item.pinned).map((item) => item.id);

    savePinnedNewsIds(nextPinnedIds);
    saveNewsItems(nextItems);
    notifyBottomTickerUpdated();
    setItems(nextItems);
  };

  return (
    <aside className="panel editor-desk selected-desk" aria-label="精选内容">
      <div className="panel-title-row selected-title-row">
        <div>
          <h2>精选内容</h2>
          <span className="eyebrow">SELECTED</span>
        </div>
        <div className="selected-title-actions">
          <button disabled={selectedItems.length === 0} onClick={() => setIsExportOpen(true)} type="button">
            导出
          </button>
          <span className="desk-state">{selectedItems.length}/{MAX_PINNED_NEWS}</span>
        </div>
      </div>

      <div className="editor-desk-scroll selected-scroll">
        {selectedItems.length > 0 ? (
          <ol className="selected-list">
            {selectedItems.map((item, index) => (
              <li className="selected-item" key={item.id}>
                <span className="selected-index">{String(index + 1).padStart(2, "0")}</span>
                {item.url ? (
                  <a className="selected-title" href={item.url} rel="noopener noreferrer" target="_blank">
                    {getDisplayTitle(item)}
                  </a>
                ) : (
                  <span className="selected-title">{getDisplayTitle(item)}</span>
                )}
                <button
                  aria-label="取消精选"
                  className="selected-star-button active"
                  onClick={() => removeSelectedItem(item)}
                  title="取消精选"
                  type="button"
                >
                  ★
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <div className="selected-empty">
            <strong>等待精选</strong>
            <span>点击第四栏消息星星后，标题会同步到这里。</span>
          </div>
        )}
      </div>
      {isExportOpen && (
        <div className="selected-export-backdrop" role="presentation" onClick={() => setIsExportOpen(false)}>
          <section
            aria-label="导出精选内容"
            aria-modal="true"
            className="selected-export-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="selected-export-head">
              <div>
                <h3>导出精选内容</h3>
                <span>{selectedItems.length} 条 · 纯文本</span>
              </div>
              <button aria-label="关闭导出窗口" onClick={() => setIsExportOpen(false)} type="button">
                ×
              </button>
            </div>
            <textarea readOnly value={exportText} />
          </section>
        </div>
      )}
    </aside>
  );
}
