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
  const [isAccessCodeVisible, setIsAccessCodeVisible] = useState(false);
  const [errorDetail, setErrorDetail] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "ready" | "error">("idle");

  useEffect(() => {
    if (!isSharedEditingEnabled() || !hasAccessCode) return undefined;

    const stopPolling = startSharedStatePolling((nextStatus) => {
      if (nextStatus === "ready") setStatus("ready");
      if (nextStatus === "error" || nextStatus === "locked") setStatus("error");
    });

    return stopPolling;
  }, [hasAccessCode]);

  if (!isSharedEditingEnabled()) return children;

  const submitAccessCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const code = accessCodeDraft.trim();
    if (!code) return;

    saveEditorAccessCode(code);
    setStatus("checking");
    setErrorDetail("");

    try {
      await hydrateSharedState();
      setHasAccessCode(true);
      setStatus("ready");
    } catch (error) {
      clearEditorAccessCode();
      setHasAccessCode(false);
      setStatus("error");
      setErrorDetail(
        error instanceof SharedStateError ? `${error.code} (${error.status})` : error instanceof Error ? error.message : "unknown_error",
      );
    }
  };

  if (hasAccessCode) return children;

  return (
    <main className="editor-access-page">
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
    </main>
  );
}
