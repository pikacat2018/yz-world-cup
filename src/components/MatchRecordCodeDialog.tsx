import { type FormEvent, useState } from "react";
import { saveMatchRecordCode } from "../matches/matchRecordStore";

type MatchRecordCodeDialogProps = {
  onClose: () => void;
  onSaved: () => void;
};

export default function MatchRecordCodeDialog({ onClose, onSaved }: MatchRecordCodeDialogProps) {
  const [code, setCode] = useState("");
  const [isCodeVisible, setIsCodeVisible] = useState(false);

  const submitCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextCode = code.trim();
    if (!nextCode) return;

    saveMatchRecordCode(nextCode);
    onSaved();
  };

  return (
    <div className="selected-export-backdrop match-record-backdrop" onClick={onClose}>
      <form
        aria-label="设置个人记录码"
        aria-modal="true"
        className="selected-export-modal match-record-code-modal"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submitCode}
        role="dialog"
      >
        <div className="selected-export-head">
          <div>
            <h3>设置个人记录码</h3>
            <span>用于同步你的比赛记录，其他编辑不会看到这个码。</span>
          </div>
          <div className="selected-export-actions">
            <button aria-label="关闭" onClick={onClose} type="button">
              ×
            </button>
          </div>
        </div>

        <div className="match-record-code-field">
          <input
            autoFocus
            aria-label="个人记录码"
            onChange={(event) => setCode(event.target.value)}
            placeholder="请输入并记住这个码"
            type={isCodeVisible ? "text" : "password"}
            value={code}
          />
          <button
            aria-label={isCodeVisible ? "隐藏个人记录码" : "显示个人记录码"}
            onClick={() => setIsCodeVisible((visible) => !visible)}
            type="button"
          >
            {isCodeVisible ? "隐藏" : "显示"}
          </button>
        </div>

        <p className="match-record-code-note">请务必记住：换设备需要输入同一个个人记录码，忘记后无法找回。</p>

        <div className="follow-up-add-actions match-record-actions">
          <button onClick={onClose} type="button">
            取消
          </button>
          <button disabled={!code.trim()} type="submit">
            保存并继续
          </button>
        </div>
      </form>
    </div>
  );
}
