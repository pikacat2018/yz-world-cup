import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { Match } from "../data/mockWorldCup";
import { getTeam } from "../data/mockWorldCup";
import {
  createMatchRecordSnapshot,
  deleteMatchRecord,
  readMatchRecord,
  type MatchWatchMethod,
  type MatchWatchStatus,
  upsertMatchRecord,
} from "../matches/matchRecordStore";
import { getBeijingDateTime } from "../utils/matchTime";
import TeamName from "./TeamName";

type MatchRecordDialogProps = {
  match?: Match;
  onClose: () => void;
};

const ratingOptions = [1, 2, 3, 4, 5];
const watchMethodOptions: Array<{ label: string; value: MatchWatchMethod }> = [
  { label: "直播", value: "live" },
  { label: "录播", value: "replay" },
  { label: "集锦", value: "highlights" },
];

const parseTags = (value: string) =>
  value
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);

export default function MatchRecordDialog({ match, onClose }: MatchRecordDialogProps) {
  const existingRecord = useMemo(() => (match ? readMatchRecord(match.id) : undefined), [match]);
  const [watchStatus, setWatchStatus] = useState<MatchWatchStatus>("want");
  const [watchMethod, setWatchMethod] = useState<MatchWatchMethod>("live");
  const [rating, setRating] = useState<number | undefined>();
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState("");
  const [watchedAt, setWatchedAt] = useState("");
  const [watchedPlace, setWatchedPlace] = useState("");

  useEffect(() => {
    if (!match) return;

    setWatchStatus(existingRecord?.watchStatus ?? "want");
    setWatchMethod(existingRecord?.watchMethod ?? "live");
    setRating(existingRecord?.rating);
    setComment(existingRecord?.comment ?? "");
    setTags(existingRecord?.tags.join("，") ?? "");
    setWatchedAt(existingRecord?.watchedAt ?? "");
    setWatchedPlace(existingRecord?.watchedPlace ?? "");
  }, [existingRecord, match]);

  if (!match) return null;

  const home = match.homeTeamId ? getTeam(match.homeTeamId) : undefined;
  const away = match.awayTeamId ? getTeam(match.awayTeamId) : undefined;
  const beijingTime = getBeijingDateTime(match);

  const saveRecord = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextRecord = createMatchRecordSnapshot(
      match,
      {
        watchStatus,
        watchMethod: watchStatus === "watched" ? watchMethod : undefined,
        rating: watchStatus === "watched" ? rating : undefined,
        comment: comment.trim() || undefined,
        tags: parseTags(tags),
        watchedAt: watchedAt || undefined,
        watchedPlace: watchedPlace.trim() || undefined,
        isMemorable: false,
      },
      existingRecord,
    );

    upsertMatchRecord(nextRecord);
    onClose();
  };

  const removeRecord = () => {
    deleteMatchRecord(match.id);
    onClose();
  };

  return (
    <div className="selected-export-backdrop match-record-backdrop" onClick={onClose}>
      <form
        aria-label="比赛记录"
        aria-modal="true"
        className="selected-export-modal match-record-modal"
        onClick={(event) => event.stopPropagation()}
        onSubmit={saveRecord}
        role="dialog"
      >
        <div className="selected-export-head">
          <div>
            <h3>单场记录</h3>
            <span>
              M{String(match.matchNo).padStart(2, "0")} · {match.stage} · {beijingTime.dateLabel} {beijingTime.time}
            </span>
          </div>
          <div className="selected-export-actions">
            <button aria-label="关闭" onClick={onClose} type="button">
              ×
            </button>
          </div>
        </div>

        <div className="match-record-matchline">
          <strong>
            <TeamName fallback={match.homeLabel} teamId={home?.id} />
          </strong>
          <span>{match.score ?? "vs"}</span>
          <strong>
            <TeamName fallback={match.awayLabel} teamId={away?.id} />
          </strong>
        </div>

        <div className="match-record-fields">
          <div className="match-record-status-tabs" aria-label="观看状态">
            <button aria-pressed={watchStatus === "want"} onClick={() => setWatchStatus("want")} type="button">
              想看
            </button>
            <button aria-pressed={watchStatus === "watched"} onClick={() => setWatchStatus("watched")} type="button">
              已看
            </button>
          </div>

          {watchStatus === "watched" ? (
            <div className="match-record-watch-method" aria-label="观看方式">
              {watchMethodOptions.map((option) => (
                <button
                  aria-pressed={watchMethod === option.value}
                  key={option.value}
                  onClick={() => setWatchMethod(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}

          <label>
            <span>评分</span>
            <div className="match-record-rating">
              {ratingOptions.map((value) => {
                const isActive = typeof rating === "number" && rating >= value;

                return (
                  <button
                    aria-label={`${value} 星`}
                    aria-pressed={isActive}
                    disabled={watchStatus !== "watched"}
                    key={value}
                    onClick={() => setRating(rating === value ? undefined : value)}
                    type="button"
                  >
                    ★
                  </button>
                );
              })}
            </div>
          </label>

          <label>
            <span>评论</span>
            <textarea
              maxLength={1000}
              onChange={(event) => setComment(event.target.value)}
              placeholder="记录这场比赛的看点、情绪或复盘线索"
              value={comment}
            />
          </label>

          <div className="match-record-field-grid">
            <label>
              <span>标签</span>
              <input onChange={(event) => setTags(event.target.value)} placeholder="揭幕战，补看" value={tags} />
            </label>
            <label>
              <span>观看日期</span>
              <input onChange={(event) => setWatchedAt(event.target.value)} type="date" value={watchedAt} />
            </label>
          </div>

          <label>
            <span>观看地点</span>
            <input onChange={(event) => setWatchedPlace(event.target.value)} placeholder="家里 / 酒吧 / 现场" value={watchedPlace} />
          </label>
        </div>

        <div className="follow-up-add-actions match-record-actions">
          {existingRecord ? (
            <button className="match-record-delete" onClick={removeRecord} type="button">
              删除
            </button>
          ) : null}
          <button onClick={onClose} type="button">
            取消
          </button>
          <button type="submit">保存</button>
        </div>
      </form>
    </div>
  );
}
