import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import {
  clearEditorAccessCode,
  getEditorAccessCode,
  hydrateSharedState,
  isSharedEditingEnabled,
  saveEditorAccessCode,
  startSharedStatePolling,
} from "../shared/onlineState";

type EditorAccessGateProps = {
  children: ReactNode;
};

export default function EditorAccessGate({ children }: EditorAccessGateProps) {
  const [accessCodeDraft, setAccessCodeDraft] = useState("");
  const [hasAccessCode, setHasAccessCode] = useState(() => !isSharedEditingEnabled() || Boolean(getEditorAccessCode()));
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

    try {
      await hydrateSharedState();
      setHasAccessCode(true);
      setStatus("ready");
    } catch {
      clearEditorAccessCode();
      setHasAccessCode(false);
      setStatus("error");
    }
  };

  if (hasAccessCode) return children;

  return (
    <main className="editor-access-page">
      <form className="editor-access-panel" onSubmit={submitAccessCode}>
        <span className="eyebrow">EDITOR ACCESS</span>
        <h1>编辑工作台</h1>
        <input
          autoFocus
          aria-label="编辑访问码"
          onChange={(event) => setAccessCodeDraft(event.target.value)}
          placeholder="输入编辑访问码"
          type="password"
          value={accessCodeDraft}
        />
        <button disabled={status === "checking"} type="submit">
          {status === "checking" ? "验证中..." : "进入"}
        </button>
        {status === "error" && <p>访问码不正确，或线上同步服务暂时不可用。</p>}
      </form>
    </main>
  );
}
