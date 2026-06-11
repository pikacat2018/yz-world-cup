import { useEffect, useMemo, useState } from "react";
import { getTeam, teams, type Match } from "../data/mockWorldCup";
import { hydrateWorldCupSnapshot, useWorldCupData } from "../matches/worldCupDataStore";
import { getBeijingDateTime } from "../utils/matchTime";
import TeamName from "./TeamName";

const getSide = (match: Match, side: "home" | "away") => {
  const teamId = side === "home" ? match.homeTeamId : match.awayTeamId;
  const fallback = side === "home" ? match.homeLabel : match.awayLabel;

  if (!teamId) return { label: fallback ?? "待定", teamId: undefined };
  return { label: getTeam(teamId).name, teamId };
};

const splitScore = (score?: string) => {
  if (!score) return undefined;

  const [home, away] = score.split("-").map((value) => Number(value));
  if (Number.isNaN(home) || Number.isNaN(away)) return undefined;

  return { home, away };
};

const getStageFilter = (match: Match) => {
  if (match.groupId !== "KO") return "group";
  if (match.stage === "32 强") return "r32";
  if (match.stage === "16 强") return "r16";
  if (match.stage === "1/4 决赛") return "quarter";
  if (match.stage === "半决赛") return "semi";
  if (match.stage === "三四名决赛") return "third";
  if (match.stage === "决赛") return "final";
  return "group";
};

const progressOptions = [
  { value: "all", label: "全部阶段" },
  { value: "group", label: "小组赛" },
  { value: "r32", label: "32强" },
  { value: "r16", label: "16强" },
  { value: "quarter", label: "1/4决赛" },
  { value: "semi", label: "半决赛" },
  { value: "third", label: "三四名决赛" },
  { value: "final", label: "决赛" },
];

const getVenueCountry = (venue: string) => {
  if (/Toronto|Vancouver|BC Place/.test(venue)) return "canada";
  if (/Mexico|Guadalajara|Monterrey/.test(venue)) return "mexico";
  return "usa";
};

const countryVenueOptions = [
  { value: "country:usa", label: "美国全部球场" },
  { value: "country:canada", label: "加拿大全部球场" },
  { value: "country:mexico", label: "墨西哥全部球场" },
];

const countryLabel = {
  canada: "加拿大",
  mexico: "墨西哥",
  usa: "美国",
} as const;

export default function AllSchedulePage() {
  const { allMatches, fetchedAt, isFallback, source } = useWorldCupData();
  const [isSyncing, setIsSyncing] = useState(false);
  const [progressFilter, setProgressFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [venueFilter, setVenueFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [draftSelectedIds, setDraftSelectedIds] = useState<string[]>([]);
  const [confirmedSelectedIds, setConfirmedSelectedIds] = useState<string[]>([]);

  const venues = useMemo(() => Array.from(new Set(allMatches.map((match) => match.venue))).sort(), [allMatches]);
  const matchTimes = useMemo(
    () => Array.from(new Set(allMatches.map((match) => getBeijingDateTime(match).time))).sort(),
    [allMatches],
  );

  const displayedMatches = useMemo(() => {
    const filtered =
      confirmedSelectedIds.length > 0
        ? allMatches.filter((match) => confirmedSelectedIds.includes(match.id))
        : allMatches.filter((match) => {
            const progressMatches = progressFilter === "all" || getStageFilter(match) === progressFilter;
            const teamMatches =
              teamFilter === "all" || match.homeTeamId === teamFilter || match.awayTeamId === teamFilter;
            const venueMatches =
              venueFilter === "all" ||
              (venueFilter.startsWith("country:")
                ? getVenueCountry(match.venue) === venueFilter.replace("country:", "")
                : match.venue === venueFilter);
            const timeMatches = timeFilter === "all" || getBeijingDateTime(match).time === timeFilter;

            return progressMatches && teamMatches && venueMatches && timeMatches;
          });

    return [...filtered].sort((a, b) => getBeijingDateTime(a).timestamp - getBeijingDateTime(b).timestamp);
  }, [allMatches, confirmedSelectedIds, progressFilter, teamFilter, timeFilter, venueFilter]);

  const resultDensity =
    confirmedSelectedIds.length > 0 || teamFilter !== "all"
      ? "selected-list"
      : displayedMatches.length <= 1
        ? "one"
        : displayedMatches.length <= 3
          ? "few"
          : "many";

  const useBracketView =
    confirmedSelectedIds.length === 0 &&
    teamFilter === "all" &&
    progressFilter !== "all" &&
    progressFilter !== "group" &&
    displayedMatches.length > 0 &&
    displayedMatches.every((match) => match.groupId === "KO");

  const bracketMatches = [...displayedMatches].sort((a, b) => a.matchNo - b.matchNo);
  const bracketSplit = Math.ceil(bracketMatches.length / 2);
  const firstHalfMatches = bracketMatches.slice(0, bracketSplit);
  const secondHalfMatches = bracketMatches.slice(bracketSplit);
  const bracketClassName =
    `${progressFilter === "semi" ? "vertical" : displayedMatches.length <= 1 ? "single" : "halves"} stage-${progressFilter}`;

  const syncStatusText = isFallback
    ? "当前显示本地 fallback 数据，请检查 FIFA 官方接口可用性后刷新。"
    : fetchedAt
      ? `主源 ${source} 最近刷新：${new Date(fetchedAt).toLocaleString("zh-CN")}`
      : `主源 ${source} 已连接`;

  const runSync = async () => {
    setIsSyncing(true);
    try {
      await hydrateWorldCupSnapshot(true);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    void runSync();
  }, []);

  const toggleDraftSelection = (matchId: string) => {
    setDraftSelectedIds((current) =>
      current.includes(matchId) ? current.filter((id) => id !== matchId) : [...current, matchId],
    );
  };

  const clearConfirmedSelection = () => {
    setConfirmedSelectedIds([]);
    setDraftSelectedIds([]);
  };

  const renderMatchCard = (match: Match) => {
    const home = getSide(match, "home");
    const away = getSide(match, "away");
    const isSelected = draftSelectedIds.includes(match.id);
    const score = splitScore(match.score);
    const beijingTime = getBeijingDateTime(match);
    const homeResult = score ? (score.home > score.away ? "winner" : score.home < score.away ? "loser" : "draw") : "";
    const awayResult = score ? (score.away > score.home ? "winner" : score.away < score.home ? "loser" : "draw") : "";
    const stageMeta = match.groupId === "KO" ? `淘汰赛 | ${match.stage}` : `${match.groupId} 组 | ${match.stage}`;

    return (
      <article
        aria-pressed={isSelected}
        className={`schedule-page-card ${isSelected ? "selected" : ""}`}
        key={match.id}
        onClick={() => toggleDraftSelection(match.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleDraftSelection(match.id);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="schedule-card-topline">
          <span className="match-no">M{String(match.matchNo).padStart(2, "0")}</span>
          <span className="schedule-meta">{stageMeta}</span>
        </div>
        <div className={`schedule-page-teams ${score ? "has-score" : ""}`}>
          <strong className={homeResult}>
            <TeamName fallback={home.label} teamId={home.teamId} />
          </strong>
          <b>{score ? `${score.home}:${score.away}` : "vs"}</b>
          <strong className={awayResult}>
            <TeamName fallback={away.label} teamId={away.teamId} />
          </strong>
        </div>
        <div className="schedule-card-bottomline">
          <time className="schedule-card-time" dateTime={beijingTime.dateTime}>
            {beijingTime.dateLabel} {beijingTime.time}
          </time>
          <span className="schedule-card-venue" title={match.venue}>
            {match.venue}
          </span>
        </div>
      </article>
    );
  };

  return (
    <main className="all-schedule-page">
      <header className="all-groups-header">
        <div>
          <span className="eyebrow">FULL MATCH SCHEDULE</span>
          <h1>2026 世界杯全部赛程</h1>
          <p>基础赛程、赛果、排名与进球时间线均来自 FIFA 官方公开接口。</p>
        </div>
        <div className="schedule-header-actions">
          <button className="overview-button large" disabled={isSyncing} onClick={runSync} type="button">
            {isSyncing ? "刷新中" : "刷新数据"}
          </button>
          <span className={`sync-inline-status ${isFallback ? "failed" : "ok"}`} title={syncStatusText}>
            {syncStatusText}
          </span>
          <a
            className="sync-inline-link"
            href="https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures"
            rel="noreferrer"
            target="_blank"
          >
            FIFA 官方赛程
          </a>
          <button className="overview-button large" onClick={() => window.close()} type="button">
            关闭赛程
          </button>
        </div>
      </header>
      <section className="schedule-filter-bar" aria-label="赛程筛选">
        <label>
          <span>赛程进度</span>
          <select onChange={(event) => setProgressFilter(event.target.value)} value={progressFilter}>
            {progressOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>球队</span>
          <select onChange={(event) => setTeamFilter(event.target.value)} value={teamFilter}>
            <option value="all">全部球队</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>球场</span>
          <select onChange={(event) => setVenueFilter(event.target.value)} value={venueFilter}>
            <option value="all">全部球场</option>
            {countryVenueOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            {venues.map((venue) => (
              <option key={venue} value={venue}>
                {countryLabel[getVenueCountry(venue)]} {venue}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>开赛时间</span>
          <select onChange={(event) => setTimeFilter(event.target.value)} value={timeFilter}>
            <option value="all">全部时间</option>
            {matchTimes.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </label>
        <div className="selection-actions">
          <button
            className="overview-button"
            disabled={draftSelectedIds.length === 0}
            onClick={() => setConfirmedSelectedIds(draftSelectedIds)}
            type="button"
          >
            确定选中 {draftSelectedIds.length}
          </button>
          <button
            className="overview-button"
            disabled={confirmedSelectedIds.length === 0}
            onClick={clearConfirmedSelection}
            type="button"
          >
            显示全部
          </button>
          <span>{displayedMatches.length} 场</span>
        </div>
      </section>
      <section className={useBracketView ? `schedule-bracket-view ${bracketClassName}` : `schedule-page-grid ${resultDensity}`}>
        {useBracketView ? (
          <>
            <div className="bracket-half">
              <div className="bracket-half-title">上半区</div>
              <div className="bracket-match-stack">{firstHalfMatches.map(renderMatchCard)}</div>
            </div>
            {secondHalfMatches.length > 0 && (
              <div className="bracket-half">
                <div className="bracket-half-title">下半区</div>
                <div className="bracket-match-stack">{secondHalfMatches.map(renderMatchCard)}</div>
              </div>
            )}
          </>
        ) : (
          displayedMatches.map(renderMatchCard)
        )}
      </section>
    </main>
  );
}
