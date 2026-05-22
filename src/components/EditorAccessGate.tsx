import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import {
  clearEditorAccessCode,
  getEditorAccessCode,
  hydrateSharedState,
  isSharedEditingEnabled,
  saveEditorAccessCode,
  SharedStateError,
  startSharedStatePolling,
} from "../shared/onlineState";

type EditorAccessGateProps = {
  children: ReactNode;
};

export default function EditorAccessGate({ children }: EditorAccessGateProps) {
  const [accessCodeDraft, setAccessCodeDraft] = useState("");
  const [hasAccessCode, setHasAccessCode] = useState(() => !isSharedEditingEnabled() || Boolean(getEditorAccessCode()));
  const [hasHydrated, setHasHydrated] = useState(() => !isSharedEditingEnabled() || !getEditorAccessCode());
  const [isAccessCodeVisible, setIsAccessCodeVisible] = useState(false);
  const [errorDetail, setErrorDetail] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "ready" | "error">("idle");
  const [syncAttempt, setSyncAttempt] = useState(0);

  useEffect(() => {
    if (!isSharedEditingEnabled() || !hasAccessCode) return undefined;

    let isCancelled = false;
    let stopPolling: () => void = () => undefined;

    setStatus("checking");
    setHasHydrated(false);

    void hydrateSharedState()
      .then(() => {
        if (isCancelled) return;

        setHasHydrated(true);
        setStatus("ready");
        stopPolling = startSharedStatePolling((nextStatus) => {
          if (nextStatus === "ready") setStatus("ready");
          if (nextStatus === "error" || nextStatus === "locked") setStatus("error");
        });
      })
      .catch((error) => {
        if (isCancelled) return;

        if (error instanceof SharedStateError && (error.status === 401 || error.status === 403)) {
          clearEditorAccessCode();
          setHasAccessCode(false);
        }
        setHasHydrated(false);
        setStatus("error");
        setErrorDetail(
          error instanceof SharedStateError ? `${error.code} (${error.status})` : error instanceof Error ? error.message : "unknown_error",
        );
      });

    return () => {
      isCancelled = true;
      stopPolling();
    };
  }, [hasAccessCode, syncAttempt]);

  if (!isSharedEditingEnabled()) return children;

  const submitAccessCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const code = accessCodeDraft.trim();
    if (!code) return;

    saveEditorAccessCode(code);
    setStatus("checking");
    setErrorDetail("");

    setHasAccessCode(true);
    setHasHydrated(false);
    setSyncAttempt((attempt) => attempt + 1);
  };

  if (hasAccessCode && hasHydrated) return children;

  return (
    <main className="editor-access-page">
      {hasAccessCode ? (
        <section className="editor-access-panel" aria-live="polite">
          <span className="eyebrow">SYNC FIRST</span>
          <h1>同步云端数据</h1>
          <p>
            {status === "error"
              ? "云端同步失败，已暂停进入编辑界面，避免本地旧数据覆盖云端。"
              : "正在先拉取云端版本，完成后再进入编辑界面。"}
            {errorDetail && <span className="editor-access-error-detail">Debug: {errorDetail}</span>}
          </p>
          {status === "error" && (
            <div className="editor-access-input-row">
              <button
                onClick={() => {
                  setErrorDetail("");
                  setStatus("checking");
                  setSyncAttempt((attempt) => attempt + 1);
                }}
                type="button"
              >
                重试同步
              </button>
              <button
                onClick={() => {
                  clearEditorAccessCode();
                  setHasAccessCode(false);
                  setHasHydrated(false);
                }}
                type="button"
              >
                重新输入访问码
              </button>
            </div>
          )}
        </section>
      ) : (
        <form className="editor-access-panel" onSubmit={submitAccessCode}>
          <span className="eyebrow">EDITOR ACCESS</span>
          <h1>编辑工作台</h1>
          <div className="editor-access-input-row">
            <input
              autoFocus
              aria-label="编辑访问码"
              onChange={(event) => setAccessCodeDraft(event.target.value)}
              placeholder="输入编辑访问码"
              type={isAccessCodeVisible ? "text" : "password"}
              value={accessCodeDraft}
            />
            <button
              aria-label={isAccessCodeVisible ? "隐藏访问码" : "显示访问码"}
              className="editor-access-visibility-button"
              onClick={() => setIsAccessCodeVisible((isVisible) => !isVisible)}
              type="button"
            >
              {isAccessCodeVisible ? "隐藏" : "显示"}
            </button>
          </div>
          <button disabled={status === "checking"} type="submit">
            {status === "checking" ? "验证中..." : "进入"}
          </button>
          {status === "error" && (
            <p>
              访问码不正确，或线上同步服务暂时不可用。
              {errorDetail && <span className="editor-access-error-detail">Debug: {errorDetail}</span>}
            </p>
          )}
        </form>
      )}
    </main>
  );
}
