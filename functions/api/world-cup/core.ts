const FIFA_API_BASE_URL = "https://api.fifa.com/api/v3";
const DEFAULT_COMPETITION_ID = "17";
const DEFAULT_SEASON_ID = "285023";
const DEFAULT_LANGUAGE = "en";
const MATCH_FETCH_COUNT = 500;

type EnvLike = Record<string, string | undefined>;

type FifaLocalizedText = {
  Description?: string;
  Locale?: string;
};

type FifaCalendarTeam = {
  Abbreviation?: string;
  IdCountry?: string;
  IdTeam?: string;
  ShortClubName?: string;
  TeamName?: FifaLocalizedText[];
};

type FifaCalendarMatch = {
  Away?: FifaCalendarTeam;
  AwayTeamPenaltyScore?: number | null;
  AwayTeamScore?: number | null;
  Date?: string;
  GroupName?: FifaLocalizedText[];
  Home?: FifaCalendarTeam;
  HomeTeamPenaltyScore?: number | null;
  HomeTeamScore?: number | null;
  IdGroup?: string;
  IdMatch?: string;
  IdStage?: string;
  MatchNumber?: number;
  MatchStatus?: number;
  PlaceHolderA?: string;
  PlaceHolderB?: string;
  StageName?: FifaLocalizedText[];
  Stadium?: {
    CityName?: FifaLocalizedText[];
    Name?: FifaLocalizedText[];
  };
};

type FifaCalendarMatchesResponse = {
  Results?: FifaCalendarMatch[];
};

type FifaStage = {
  IdStage?: string;
  Name?: FifaLocalizedText[];
  SequenceOrder?: number;
  Type?: number;
};

type FifaStagesResponse = {
  Results?: FifaStage[];
};

type FifaStandingRow = {
  Against?: number;
  Drawn?: number;
  For?: number;
  GoalsDiference?: number;
  Group?: FifaLocalizedText[];
  IdCountry?: string;
  IdGroup?: string;
  IdTeam?: string;
  Lost?: number;
  Played?: number;
  Points?: number;
  Position?: number;
  Team?: {
    Abbreviation?: string;
    Name?: FifaLocalizedText[];
  };
  Won?: number;
};

type FifaStandingsResponse = {
  Results?: FifaStandingRow[];
};

type FifaTimelineEvent = {
  AwayGoals?: number;
  EventDescription?: FifaLocalizedText[];
  HomeGoals?: number;
  IdTeam?: string;
  MatchMinute?: string;
  Type?: number;
  TypeLocalized?: FifaLocalizedText[];
};

type FifaTimelineResponse = {
  Event?: FifaTimelineEvent[];
};

type MatchGoal = {
  minute: string;
  ownGoal?: boolean;
  player: string;
  side: "away" | "home";
};

type MatchRedCard = {
  minute: string;
  player: string;
  side: "away" | "home";
};

type PenaltyShootout = {
  awayScore: number;
  homeScore: number;
  rounds: [];
};

type MatchPayload = {
  awayLabel?: string;
  awayTeamId?: string;
  date: string;
  goals?: MatchGoal[];
  groupId: string;
  homeLabel?: string;
  homeTeamId?: string;
  id: string;
  matchNo: number;
  note: string;
  penaltyShootout?: PenaltyShootout;
  redCards?: MatchRedCard[];
  score?: string;
  stage: string;
  status: "finished" | "live" | "scheduled";
  utcDate?: string;
  venue: string;
};

type StandingPayload = {
  draws: number;
  goalsAgainst: number;
  goalsFor: number;
  losses: number;
  played: number;
  points: number;
  status: "eliminated" | "fighting" | "pending" | "possible" | "qualified";
  teamId: string;
  wins: number;
};

type GroupPayload = {
  id: string;
  keyAlert: string;
  leaderTeamId: string;
  matches: MatchPayload[];
  name: string;
  qualificationOutlook: string;
  standings: StandingPayload[];
  summary: string;
};

export type WorldCupApiPayload = {
  competitionId: string;
  eventEnhancement: {
    provider: "fifa";
    status: "ready";
  };
  fetchedAt: string;
  groups: GroupPayload[];
  matches: MatchPayload[];
  seasonId: string;
  source: "fifa-official";
};

const TEAM_CODE_TO_INTERNAL_ID: Record<string, string> = {
  ALG: "alg",
  ARG: "arg",
  AUS: "aus",
  AUT: "aut",
  BEL: "bel",
  BIH: "bih",
  BRA: "bra",
  CAN: "can",
  CIV: "civ",
  COD: "cod",
  COL: "col",
  CPV: "cpv",
  CRO: "cro",
  CUV: "cuw",
  CUW: "cuw",
  CZE: "cze",
  ECU: "ecu",
  EGY: "egy",
  ENG: "eng",
  ESP: "esp",
  FRA: "fra",
  GER: "ger",
  GHA: "gha",
  HAI: "hai",
  IRN: "irn",
  IRQ: "irq",
  JOR: "jor",
  JPN: "jpn",
  KOR: "kor",
  KSA: "ksa",
  MAR: "mar",
  MEX: "mex",
  NED: "ned",
  NOR: "nor",
  NZL: "nzl",
  PAN: "pan",
  PAR: "par",
  POR: "por",
  QAT: "qat",
  RSA: "rsa",
  SCO: "sco",
  SEN: "sen",
  SUI: "sui",
  SWE: "swe",
  TUN: "tun",
  TUR: "tur",
  URU: "uru",
  USA: "usa",
  UZB: "uzb",
};

const GROUP_IDS = "ABCDEFGHIJKL".split("");
const PLAYER_SHORT_NAME_ALIASES: Record<string, Record<string, string>> = {
  mex: {
    RAUL: "JIMENEZ",
  },
};

const readEnvValue = (env: EnvLike, key: string) => {
  const value = env[key];
  return typeof value === "string" ? value.trim() : "";
};

const getCompetitionId = (env: EnvLike) =>
  readEnvValue(env, "FIFA_COMPETITION_ID") || DEFAULT_COMPETITION_ID;

const getSeasonId = (env: EnvLike) => readEnvValue(env, "FIFA_SEASON_ID") || DEFAULT_SEASON_ID;

async function fetchFifaJson<T>(path: string) {
  const response = await fetch(`${FIFA_API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`fifa_request_failed:${response.status}:${path}`);
  }

  return (await response.json()) as T;
}

const getDescription = (values?: FifaLocalizedText[]) => values?.[0]?.Description ?? "";

const normalizeTeamId = (team?: FifaCalendarTeam) => {
  const code = (team?.Abbreviation ?? team?.IdCountry ?? "").toUpperCase();
  return code ? TEAM_CODE_TO_INTERNAL_ID[code] : undefined;
};

const normalizeStatus = (matchStatus?: number): MatchPayload["status"] => {
  if (matchStatus === 0) return "finished";
  if ([3, 4, 5, 6, 7, 8, 9].includes(matchStatus ?? -1)) return "live";
  return "scheduled";
};

const normalizeStage = (stageName: string) => {
  switch (stageName.toLowerCase()) {
    case "first stage":
      return "小组赛";
    case "round of 32":
      return "32 强";
    case "round of 16":
      return "16 强";
    case "quarter-final":
      return "1/4 决赛";
    case "semi-final":
      return "半决赛";
    case "play-off for third place":
      return "三四名决赛";
    case "final":
      return "决赛";
    default:
      return stageName || "待定阶段";
  }
};

const formatUtcDate = (utcDate?: string) => {
  if (!utcDate) return "2026-06-11 00:00";
  const date = new Date(utcDate);
  if (Number.isNaN(date.getTime())) return "2026-06-11 00:00";
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}`;
};

const extractGoalPlayerName = (description: string) => {
  const beforeBracket = description.split("(")[0]?.trim();
  if (beforeBracket) return beforeBracket.replace(/\s+scores!?\.?$/i, "").trim();
  const beforeScores = description.split(" scores")[0]?.trim();
  return beforeScores || "Unknown";
};

const normalizePlayerToken = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

const resolveDisplayPlayerName = (teamId: string | undefined, rawName: string) => {
  const trimmed = rawName.trim();
  if (!trimmed) return rawName;
  if (!teamId) return trimmed;

  const normalizedToken = normalizePlayerToken(trimmed);
  if (normalizedToken.includes(" ")) return trimmed;

  return PLAYER_SHORT_NAME_ALIASES[teamId]?.[normalizedToken] ?? trimmed;
};

const extractCardPlayerName = (description: string) => {
  const beforeBracket = description.split("(")[0]?.trim();
  if (beforeBracket) {
    const cleaned = beforeBracket
      .replace(/\s+is shown a red card\.?$/i, "")
      .replace(/\s+receives a red card\.?$/i, "")
      .replace(/\s+sent off\.?$/i, "")
      .trim();
    if (!cleaned) return undefined;
    const generic = cleaned.toLowerCase();
    if (generic === "red card given" || generic === "red card" || generic === "sent off") return undefined;
    return cleaned;
  }
  const fallback = description.trim();
  if (!fallback) return undefined;
  const generic = fallback.toLowerCase();
  if (generic === "red card given" || generic === "red card" || generic === "sent off") return undefined;
  return fallback;
};

function normalizeGoalEvents(match: FifaCalendarMatch, timeline?: FifaTimelineResponse) {
  const events = Array.isArray(timeline?.Event) ? timeline.Event : [];
  const homeFifaTeamId = match.Home?.IdTeam;
  const awayFifaTeamId = match.Away?.IdTeam;
  const homeTeamId = normalizeTeamId(match.Home);
  const awayTeamId = normalizeTeamId(match.Away);
  let lastHomeGoals = 0;
  let lastAwayGoals = 0;

  return events
    .filter((event) => {
      const label = getDescription(event.TypeLocalized).toLowerCase();
      const description = getDescription(event.EventDescription).toLowerCase();
      const homeGoals = typeof event.HomeGoals === "number" ? event.HomeGoals : lastHomeGoals;
      const awayGoals = typeof event.AwayGoals === "number" ? event.AwayGoals : lastAwayGoals;
      const scoreChanged = homeGoals !== lastHomeGoals || awayGoals !== lastAwayGoals;

      lastHomeGoals = homeGoals;
      lastAwayGoals = awayGoals;

      if (description.includes("disallowed")) return false;
      if (!scoreChanged) return false;
      return label.includes("goal");
    })
    .map((event) => {
      const description = getDescription(event.EventDescription);
      const label = getDescription(event.TypeLocalized).toLowerCase();
      const ownGoal = label.includes("own goal") || description.toLowerCase().includes("own goal");
      const side =
        event.IdTeam && event.IdTeam === awayFifaTeamId
          ? "away"
          : event.IdTeam && event.IdTeam === homeFifaTeamId
            ? "home"
            : (event.AwayGoals ?? 0) > (event.HomeGoals ?? 0)
              ? "away"
              : "home";

      return {
        minute: event.MatchMinute ?? "",
        ownGoal: ownGoal || undefined,
        player: resolveDisplayPlayerName(side === "home" ? homeTeamId : awayTeamId, extractGoalPlayerName(description)),
        side,
      } satisfies MatchGoal;
    });
}

function normalizeRedCardEvents(match: FifaCalendarMatch, timeline?: FifaTimelineResponse) {
  const events = Array.isArray(timeline?.Event) ? timeline.Event : [];
  const homeTeamId = match.Home?.IdTeam;
  const awayTeamId = match.Away?.IdTeam;

  const deduped = new Map<string, MatchRedCard>();

  for (const event of events) {
    const label = getDescription(event.TypeLocalized).toLowerCase();
    const description = getDescription(event.EventDescription).toLowerCase();
    if (!label.includes("red card") && !description.includes("red card") && !description.includes("sent off")) continue;

    const player = extractCardPlayerName(getDescription(event.EventDescription));
    if (!player) continue;

    const side =
      event.IdTeam && event.IdTeam === awayTeamId
        ? "away"
        : event.IdTeam && event.IdTeam === homeTeamId
          ? "home"
          : "home";

    const card = {
      minute: event.MatchMinute ?? "",
      player,
      side,
    } satisfies MatchRedCard;

    deduped.set(`${card.minute}|${card.side}|${card.player}`, card);
  }

  return [...deduped.values()]
    .sort((a, b) => a.minute.localeCompare(b.minute, undefined, { numeric: true }))
    ;
}

function normalizePenaltyShootout(match: FifaCalendarMatch) {
  if (
    typeof match.HomeTeamPenaltyScore !== "number" ||
    typeof match.AwayTeamPenaltyScore !== "number" ||
    (match.HomeTeamPenaltyScore === 0 && match.AwayTeamPenaltyScore === 0)
  ) {
    return undefined;
  }

  return {
    awayScore: match.AwayTeamPenaltyScore,
    homeScore: match.HomeTeamPenaltyScore,
    rounds: [],
  } satisfies PenaltyShootout;
}

function buildMatchPayload(match: FifaCalendarMatch, timeline?: FifaTimelineResponse): MatchPayload {
  const stageName = getDescription(match.StageName);
  const stage = normalizeStage(stageName);
  const homeTeamId = normalizeTeamId(match.Home);
  const awayTeamId = normalizeTeamId(match.Away);
  const status = normalizeStatus(match.MatchStatus);
  const score =
    typeof match.HomeTeamScore === "number" && typeof match.AwayTeamScore === "number"
      ? `${match.HomeTeamScore}-${match.AwayTeamScore}`
      : undefined;
  const groupName = getDescription(match.GroupName);
  const groupId = stage === "小组赛" ? groupName.replace(/^Group\s+/i, "").trim().toUpperCase() || "A" : "KO";
  const venue = getDescription(match.Stadium?.Name) || getDescription(match.Stadium?.CityName) || "待定球场";
  const goals = normalizeGoalEvents(match, timeline);
  const redCards = normalizeRedCardEvents(match, timeline);

  return {
    awayLabel: awayTeamId ? undefined : match.Away?.ShortClubName || getDescription(match.Away?.TeamName) || match.PlaceHolderB,
    awayTeamId,
    date: formatUtcDate(match.Date),
    goals,
    groupId,
    homeLabel: homeTeamId ? undefined : match.Home?.ShortClubName || getDescription(match.Home?.TeamName) || match.PlaceHolderA,
    homeTeamId,
    id: `fifa-${match.IdMatch ?? match.MatchNumber ?? Math.random()}`,
    matchNo: match.MatchNumber ?? 0,
    note:
      goals.length > 0
        ? "进球事件来自 FIFA 官方 timelines。"
        : "基础赛程、赛果、排名来自 FIFA 官方 API。",
    penaltyShootout: normalizePenaltyShootout(match),
    redCards,
    score,
    stage,
    status,
    utcDate: match.Date,
    venue,
  };
}

const getStandingStatus = (position: number, points: number): StandingPayload["status"] => {
  if (points === 0) return "pending";
  if (position <= 2) return "qualified";
  if (position === 3 && points >= 4) return "fighting";
  if (position === 3) return "possible";
  if (points <= 1) return "eliminated";
  return "pending";
};

function buildStandingsByGroup(rows: FifaStandingRow[]) {
  const byGroup = new Map<string, StandingPayload[]>();

  for (const row of rows) {
    const groupId = getDescription(row.Group).replace(/^Group\s+/i, "").trim().toUpperCase();
    if (!groupId || !GROUP_IDS.includes(groupId)) continue;

    const teamCode = (row.Team?.Abbreviation ?? row.IdCountry ?? "").toUpperCase();
    const teamId = TEAM_CODE_TO_INTERNAL_ID[teamCode];
    if (!teamId) continue;

    const normalizedRow = {
      draws: row.Drawn ?? 0,
      goalsAgainst: row.Against ?? 0,
      goalsFor: row.For ?? 0,
      losses: row.Lost ?? 0,
      played: row.Played ?? 0,
      points: row.Points ?? 0,
      status: getStandingStatus(row.Position ?? 99, row.Points ?? 0),
      teamId,
      wins: row.Won ?? 0,
    } satisfies StandingPayload;

    const groupRows = byGroup.get(groupId) ?? [];
    groupRows.push(normalizedRow);
    byGroup.set(groupId, groupRows);
  }

  for (const [groupId, groupRows] of byGroup) {
    byGroup.set(
      groupId,
      groupRows.sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)),
    );
  }

  return byGroup;
}

function buildGroups(matches: MatchPayload[], standingsByGroup: Map<string, StandingPayload[]>) {
  const matchesByGroup = new Map<string, MatchPayload[]>();
  for (const match of matches) {
    if (match.groupId === "KO") continue;
    const groupMatches = matchesByGroup.get(match.groupId) ?? [];
    groupMatches.push(match);
    matchesByGroup.set(match.groupId, groupMatches);
  }

  return GROUP_IDS.map((groupId) => {
    const standings = standingsByGroup.get(groupId) ?? [];
    const leaderTeamId = standings[0]?.teamId ?? "";
    return {
      id: groupId,
      keyAlert: "积分榜与赛果来自 FIFA 官方数据。",
      leaderTeamId,
      matches: matchesByGroup.get(groupId) ?? [],
      name: `${groupId} 组`,
      qualificationOutlook: "小组积分榜与后续晋级关系来自 FIFA 官方接口。",
      standings,
      summary: "当前小组信息已切到 FIFA 官方主源。",
    } satisfies GroupPayload;
  });
}

async function fetchMatchTimelines(matches: FifaCalendarMatch[]) {
  const matchesNeedingTimeline = matches.filter((match) => normalizeStatus(match.MatchStatus) !== "scheduled");
  const timelineEntries = await Promise.all(
    matchesNeedingTimeline.map(async (match) => {
      const matchId = match.IdMatch;
      if (!matchId) return null;
      const timeline = await fetchFifaJson<FifaTimelineResponse>(`/timelines/${matchId}?language=${DEFAULT_LANGUAGE}`);
      return [matchId, timeline] as const;
    }),
  );

  return new Map(timelineEntries.filter((entry): entry is readonly [string, FifaTimelineResponse] => Boolean(entry)));
}

export async function fetchWorldCupPayload(env: EnvLike): Promise<WorldCupApiPayload> {
  const competitionId = getCompetitionId(env);
  const seasonId = getSeasonId(env);

  const [matchesResponse, stagesResponse] = await Promise.all([
    fetchFifaJson<FifaCalendarMatchesResponse>(
      `/calendar/matches?language=${DEFAULT_LANGUAGE}&count=${MATCH_FETCH_COUNT}&idSeason=${seasonId}`,
    ),
    fetchFifaJson<FifaStagesResponse>(`/stages?idSeason=${seasonId}&language=${DEFAULT_LANGUAGE}`),
  ]);

  const rawMatches = Array.isArray(matchesResponse.Results) ? matchesResponse.Results : [];
  const stages = Array.isArray(stagesResponse.Results) ? stagesResponse.Results : [];
  const firstStage =
    stages.find((stage) => stage.Type === 1) ?? stages.find((stage) => /first stage/i.test(getDescription(stage.Name)));
  if (!firstStage?.IdStage) {
    throw new Error("fifa_group_stage_missing");
  }

  const [standingsResponse, timelinesByMatchId] = await Promise.all([
    fetchFifaJson<FifaStandingsResponse>(
      `/calendar/${competitionId}/${seasonId}/${firstStage.IdStage}/standing?language=${DEFAULT_LANGUAGE}&count=200`,
    ),
    fetchMatchTimelines(rawMatches),
  ]);

  const matches = rawMatches
    .map((match) => buildMatchPayload(match, match.IdMatch ? timelinesByMatchId.get(match.IdMatch) : undefined))
    .sort((a, b) => a.matchNo - b.matchNo);
  const standingsByGroup = buildStandingsByGroup(Array.isArray(standingsResponse.Results) ? standingsResponse.Results : []);
  const groups = buildGroups(matches, standingsByGroup);

  return {
    competitionId,
    eventEnhancement: {
      provider: "fifa",
      status: "ready",
    },
    fetchedAt: new Date().toISOString(),
    groups,
    matches,
    seasonId,
    source: "fifa-official",
  };
}
