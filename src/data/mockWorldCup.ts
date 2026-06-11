export type Status = "qualified" | "fighting" | "possible" | "eliminated" | "pending";

export type Team = {
  id: string;
  name: string;
  code: string;
  confederation: string;
};

export type Standing = {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  status: Status;
};

export type Match = {
  id: string;
  matchNo: number;
  groupId: string;
  date: string;
  utcDate?: string;
  stage: string;
  homeTeamId?: string;
  awayTeamId?: string;
  homeLabel?: string;
  awayLabel?: string;
  venue: string;
  status: "scheduled" | "live" | "finished";
  score?: string;
  goals?: MatchGoal[];
  redCards?: MatchRedCard[];
  penaltyShootout?: PenaltyShootout;
  note: string;
};

export type MatchGoal = {
  side: "home" | "away";
  minute: string;
  ownGoal?: boolean;
  player: string;
};

export type MatchRedCard = {
  side: "home" | "away";
  minute: string;
  player: string;
};

export type PenaltyShootout = {
  homeScore: number;
  awayScore: number;
  rounds: PenaltyRound[];
};

export type PenaltyRound = {
  home?: PenaltyKick;
  round: number;
  away?: PenaltyKick;
};

export type PenaltyKick = {
  player: string;
  scored: boolean;
};

export type Group = {
  id: string;
  name: string;
  leaderTeamId: string;
  summary: string;
  keyAlert: string;
  qualificationOutlook: string;
  standings: Standing[];
  matches: Match[];
};

export type PlayerStat = {
  rank: number;
  player: string;
  team: string;
  match?: string;
  matchNo?: number;
  goals?: number;
  assists?: number;
  yellowCards?: number;
  redCards?: number;
};

export type StoryEvent = {
  label: string;
  value: string;
  detail: string;
  groupId?: string;
};

const flagByCode: Record<string, string> = {
  CAN: "🇨🇦",
  JPN: "🇯🇵",
  MAR: "🇲🇦",
  SUI: "🇨🇭",
  MEX: "🇲🇽",
  RSA: "🇿🇦",
  CZE: "🇨🇿",
  BIH: "🇧🇦",
  CRO: "🇭🇷",
  KOR: "🇰🇷",
  GHA: "🇬🇭",
  HAI: "🇭🇹",
  USA: "🇺🇸",
  NED: "🇳🇱",
  EGY: "🇪🇬",
  AUS: "🇦🇺",
  BRA: "🇧🇷",
  DEN: "🇩🇰",
  NGA: "🇳🇬",
  QAT: "🇶🇦",
  TUR: "🇹🇷",
  ARG: "🇦🇷",
  SEN: "🇸🇳",
  SCO: "🏴",
  KSA: "🇸🇦",
  FRA: "🇫🇷",
  COL: "🇨🇴",
  TUN: "🇹🇳",
  SWE: "🇸🇪",
  NZL: "🇳🇿",
  CUW: "🇨🇼",
  ESP: "🇪🇸",
  URU: "🇺🇾",
  IRN: "🇮🇷",
  CPV: "🇨🇻",
  CIV: "🇨🇮",
  UAE: "🇦🇪",
  ENG: "🏴",
  ECU: "🇪🇨",
  IRL: "🇮🇪",
  HON: "🇭🇳",
  GER: "🇩🇪",
  NOR: "🇳🇴",
  JAM: "🇯🇲",
  CHI: "🇨🇱",
  IRQ: "🇮🇶",
  AUT: "🇦🇹",
  JOR: "🇯🇴",
  POR: "🇵🇹",
  PAR: "🇵🇾",
  ALG: "🇩🇿",
  CHN: "🇨🇳",
  COD: "🇨🇩",
  BEL: "🇧🇪",
  PER: "🇵🇪",
  CMR: "🇨🇲",
  PAN: "🇵🇦",
  ITA: "🇮🇹",
  SRB: "🇷🇸",
  CRC: "🇨🇷",
  UZB: "🇺🇿",
};

const flagImageCodeByCode: Record<string, string> = {
  CAN: "ca",
  JPN: "jp",
  MAR: "ma",
  SUI: "ch",
  MEX: "mx",
  RSA: "za",
  CZE: "cz",
  BIH: "ba",
  CRO: "hr",
  KOR: "kr",
  GHA: "gh",
  HAI: "ht",
  USA: "us",
  NED: "nl",
  EGY: "eg",
  AUS: "au",
  BRA: "br",
  DEN: "dk",
  NGA: "ng",
  QAT: "qa",
  TUR: "tr",
  ARG: "ar",
  SEN: "sn",
  SCO: "gb-sct",
  KSA: "sa",
  FRA: "fr",
  COL: "co",
  TUN: "tn",
  SWE: "se",
  NZL: "nz",
  CUW: "cw",
  ESP: "es",
  URU: "uy",
  IRN: "ir",
  CPV: "cv",
  CIV: "ci",
  UAE: "ae",
  ENG: "gb-eng",
  ECU: "ec",
  IRL: "ie",
  HON: "hn",
  GER: "de",
  NOR: "no",
  JAM: "jm",
  CHI: "cl",
  IRQ: "iq",
  AUT: "at",
  JOR: "jo",
  POR: "pt",
  PAR: "py",
  ALG: "dz",
  CHN: "cn",
  COD: "cd",
  BEL: "be",
  PER: "pe",
  CMR: "cm",
  PAN: "pa",
  ITA: "it",
  SRB: "rs",
  CRC: "cr",
  UZB: "uz",
};

export const teams: Team[] = [
  { id: "mex", name: "墨西哥", code: "MEX", confederation: "CONCACAF" },
  { id: "rsa", name: "南非", code: "RSA", confederation: "CAF" },
  { id: "kor", name: "韩国", code: "KOR", confederation: "AFC" },
  { id: "cze", name: "捷克", code: "CZE", confederation: "UEFA" },
  { id: "can", name: "加拿大", code: "CAN", confederation: "CONCACAF" },
  { id: "sui", name: "瑞士", code: "SUI", confederation: "UEFA" },
  { id: "qat", name: "卡塔尔", code: "QAT", confederation: "AFC" },
  { id: "bih", name: "波黑", code: "BIH", confederation: "UEFA" },
  { id: "bra", name: "巴西", code: "BRA", confederation: "CONMEBOL" },
  { id: "mar", name: "摩洛哥", code: "MAR", confederation: "CAF" },
  { id: "hai", name: "海地", code: "HAI", confederation: "CONCACAF" },
  { id: "sco", name: "苏格兰", code: "SCO", confederation: "UEFA" },
  { id: "usa", name: "美国", code: "USA", confederation: "CONCACAF" },
  { id: "par", name: "巴拉圭", code: "PAR", confederation: "CONMEBOL" },
  { id: "aus", name: "澳大利亚", code: "AUS", confederation: "AFC" },
  { id: "tur", name: "土耳其", code: "TUR", confederation: "UEFA" },
  { id: "ger", name: "德国", code: "GER", confederation: "UEFA" },
  { id: "cuw", name: "库拉索", code: "CUW", confederation: "CONCACAF" },
  { id: "civ", name: "科特迪瓦", code: "CIV", confederation: "CAF" },
  { id: "ecu", name: "厄瓜多尔", code: "ECU", confederation: "CONMEBOL" },
  { id: "ned", name: "荷兰", code: "NED", confederation: "UEFA" },
  { id: "jpn", name: "日本", code: "JPN", confederation: "AFC" },
  { id: "tun", name: "突尼斯", code: "TUN", confederation: "CAF" },
  { id: "swe", name: "瑞典", code: "SWE", confederation: "UEFA" },
  { id: "bel", name: "比利时", code: "BEL", confederation: "UEFA" },
  { id: "egy", name: "埃及", code: "EGY", confederation: "CAF" },
  { id: "irn", name: "伊朗", code: "IRN", confederation: "AFC" },
  { id: "nzl", name: "新西兰", code: "NZL", confederation: "OFC" },
  { id: "esp", name: "西班牙", code: "ESP", confederation: "UEFA" },
  { id: "cpv", name: "佛得角", code: "CPV", confederation: "CAF" },
  { id: "ksa", name: "沙特", code: "KSA", confederation: "AFC" },
  { id: "uru", name: "乌拉圭", code: "URU", confederation: "CONMEBOL" },
  { id: "fra", name: "法国", code: "FRA", confederation: "UEFA" },
  { id: "sen", name: "塞内加尔", code: "SEN", confederation: "CAF" },
  { id: "nor", name: "挪威", code: "NOR", confederation: "UEFA" },
  { id: "irq", name: "伊拉克", code: "IRQ", confederation: "AFC" },
  { id: "arg", name: "阿根廷", code: "ARG", confederation: "CONMEBOL" },
  { id: "alg", name: "阿尔及利亚", code: "ALG", confederation: "CAF" },
  { id: "aut", name: "奥地利", code: "AUT", confederation: "UEFA" },
  { id: "jor", name: "约旦", code: "JOR", confederation: "AFC" },
  { id: "por", name: "葡萄牙", code: "POR", confederation: "UEFA" },
  { id: "uzb", name: "乌兹别克斯坦", code: "UZB", confederation: "AFC" },
  { id: "col", name: "哥伦比亚", code: "COL", confederation: "CONMEBOL" },
  { id: "cod", name: "民主刚果", code: "COD", confederation: "CAF" },
  { id: "eng", name: "英格兰", code: "ENG", confederation: "UEFA" },
  { id: "cro", name: "克罗地亚", code: "CRO", confederation: "UEFA" },
  { id: "gha", name: "加纳", code: "GHA", confederation: "CAF" },
  { id: "pan", name: "巴拿马", code: "PAN", confederation: "CONCACAF" },
];

const groupTeamIds = [
  ["mex", "rsa", "kor", "cze"],
  ["can", "sui", "qat", "bih"],
  ["bra", "mar", "hai", "sco"],
  ["usa", "par", "aus", "tur"],
  ["ger", "cuw", "civ", "ecu"],
  ["ned", "jpn", "tun", "swe"],
  ["bel", "egy", "irn", "nzl"],
  ["esp", "cpv", "ksa", "uru"],
  ["fra", "sen", "nor", "irq"],
  ["arg", "alg", "aut", "jor"],
  ["por", "uzb", "col", "cod"],
  ["eng", "cro", "gha", "pan"],
];

const pointsMatrix = [
  [7, 4, 3, 1],
  [6, 4, 4, 0],
  [9, 4, 2, 1],
  [7, 5, 3, 0],
  [6, 6, 3, 1],
  [7, 4, 4, 0],
  [6, 5, 2, 2],
  [7, 4, 3, 1],
  [5, 5, 4, 1],
  [9, 3, 3, 0],
  [6, 4, 4, 2],
  [7, 5, 3, 1],
];

const statusFor = (rank: number, points: number): Status => {
  if (points >= 7) return "qualified";
  if (rank <= 2) return "fighting";
  if (rank === 3) return "possible";
  if (points === 0) return "eliminated";
  return "pending";
};

const buildStanding = (teamId: string, index: number, points: number): Standing => ({
  teamId,
  played: index === 3 && points <= 1 ? 2 : 3,
  wins: Math.floor(points / 3),
  draws: points % 3,
  losses: Math.max(0, 3 - Math.floor(points / 3) - (points % 3)),
  goalsFor: 6 - index + (points >= 7 ? 2 : 0),
  goalsAgainst: 2 + index,
  points,
  status: statusFor(index + 1, points),
});

type OfficialFixture = Omit<Match, "id" | "status" | "score" | "note">;

const officialFixtures: OfficialFixture[] = [
  { matchNo: 1, groupId: "A", date: "2026-06-11 20:00", stage: "第 1 轮", homeTeamId: "mex", awayTeamId: "rsa", venue: "Mexico City Stadium" },
  { matchNo: 2, groupId: "A", date: "2026-06-11 21:00", stage: "第 1 轮", homeTeamId: "kor", awayTeamId: "cze", venue: "Estadio Guadalajara" },
  { matchNo: 3, groupId: "B", date: "2026-06-12 15:00", stage: "第 1 轮", homeTeamId: "can", awayTeamId: "bih", venue: "Toronto Stadium" },
  { matchNo: 4, groupId: "D", date: "2026-06-12 18:00", stage: "第 1 轮", homeTeamId: "usa", awayTeamId: "par", venue: "Los Angeles Stadium" },
  { matchNo: 5, groupId: "C", date: "2026-06-13 21:00", stage: "第 1 轮", homeTeamId: "hai", awayTeamId: "sco", venue: "Boston Stadium" },
  { matchNo: 6, groupId: "D", date: "2026-06-13 21:00", stage: "第 1 轮", homeTeamId: "aus", awayTeamId: "tur", venue: "BC Place Vancouver" },
  { matchNo: 7, groupId: "C", date: "2026-06-13 18:00", stage: "第 1 轮", homeTeamId: "bra", awayTeamId: "mar", venue: "New York New Jersey Stadium" },
  { matchNo: 8, groupId: "B", date: "2026-06-13 12:00", stage: "第 1 轮", homeTeamId: "qat", awayTeamId: "sui", venue: "San Francisco Bay Area Stadium" },
  { matchNo: 9, groupId: "E", date: "2026-06-14 19:00", stage: "第 1 轮", homeTeamId: "civ", awayTeamId: "ecu", venue: "Philadelphia Stadium" },
  { matchNo: 10, groupId: "E", date: "2026-06-14 12:00", stage: "第 1 轮", homeTeamId: "ger", awayTeamId: "cuw", venue: "Houston Stadium" },
  { matchNo: 11, groupId: "F", date: "2026-06-14 15:00", stage: "第 1 轮", homeTeamId: "ned", awayTeamId: "jpn", venue: "Dallas Stadium" },
  { matchNo: 12, groupId: "F", date: "2026-06-14 21:00", stage: "第 1 轮", homeTeamId: "swe", awayTeamId: "tun", venue: "Estadio Monterrey" },
  { matchNo: 13, groupId: "H", date: "2026-06-15 18:00", stage: "第 1 轮", homeTeamId: "ksa", awayTeamId: "uru", venue: "Miami Stadium" },
  { matchNo: 14, groupId: "H", date: "2026-06-15 12:00", stage: "第 1 轮", homeTeamId: "esp", awayTeamId: "cpv", venue: "Atlanta Stadium" },
  { matchNo: 15, groupId: "G", date: "2026-06-15 18:00", stage: "第 1 轮", homeTeamId: "irn", awayTeamId: "nzl", venue: "Los Angeles Stadium" },
  { matchNo: 16, groupId: "G", date: "2026-06-15 12:00", stage: "第 1 轮", homeTeamId: "bel", awayTeamId: "egy", venue: "Seattle Stadium" },
  { matchNo: 17, groupId: "I", date: "2026-06-16 15:00", stage: "第 1 轮", homeTeamId: "fra", awayTeamId: "sen", venue: "New York New Jersey Stadium" },
  { matchNo: 18, groupId: "I", date: "2026-06-16 18:00", stage: "第 1 轮", homeTeamId: "irq", awayTeamId: "nor", venue: "Boston Stadium" },
  { matchNo: 19, groupId: "J", date: "2026-06-16 20:00", stage: "第 1 轮", homeTeamId: "arg", awayTeamId: "alg", venue: "Kansas City Stadium" },
  { matchNo: 20, groupId: "J", date: "2026-06-16 21:00", stage: "第 1 轮", homeTeamId: "aut", awayTeamId: "jor", venue: "San Francisco Bay Area Stadium" },
  { matchNo: 21, groupId: "L", date: "2026-06-17 19:00", stage: "第 1 轮", homeTeamId: "gha", awayTeamId: "pan", venue: "Toronto Stadium" },
  { matchNo: 22, groupId: "L", date: "2026-06-17 15:00", stage: "第 1 轮", homeTeamId: "eng", awayTeamId: "cro", venue: "Dallas Stadium" },
  { matchNo: 23, groupId: "K", date: "2026-06-17 12:00", stage: "第 1 轮", homeTeamId: "por", awayTeamId: "cod", venue: "Houston Stadium" },
  { matchNo: 24, groupId: "K", date: "2026-06-17 21:00", stage: "第 1 轮", homeTeamId: "uzb", awayTeamId: "col", venue: "Mexico City Stadium" },
  { matchNo: 25, groupId: "A", date: "2026-06-18 12:00", stage: "第 2 轮", homeTeamId: "cze", awayTeamId: "rsa", venue: "Atlanta Stadium" },
  { matchNo: 26, groupId: "B", date: "2026-06-18 12:00", stage: "第 2 轮", homeTeamId: "sui", awayTeamId: "bih", venue: "Los Angeles Stadium" },
  { matchNo: 27, groupId: "B", date: "2026-06-18 15:00", stage: "第 2 轮", homeTeamId: "can", awayTeamId: "qat", venue: "BC Place Vancouver" },
  { matchNo: 28, groupId: "A", date: "2026-06-18 20:00", stage: "第 2 轮", homeTeamId: "mex", awayTeamId: "kor", venue: "Estadio Guadalajara" },
  { matchNo: 29, groupId: "C", date: "2026-06-19 21:00", stage: "第 2 轮", homeTeamId: "bra", awayTeamId: "hai", venue: "Philadelphia Stadium" },
  { matchNo: 30, groupId: "C", date: "2026-06-19 18:00", stage: "第 2 轮", homeTeamId: "sco", awayTeamId: "mar", venue: "Boston Stadium" },
  { matchNo: 31, groupId: "D", date: "2026-06-19 21:00", stage: "第 2 轮", homeTeamId: "tur", awayTeamId: "par", venue: "San Francisco Bay Area Stadium" },
  { matchNo: 32, groupId: "D", date: "2026-06-19 12:00", stage: "第 2 轮", homeTeamId: "usa", awayTeamId: "aus", venue: "Seattle Stadium" },
  { matchNo: 33, groupId: "F", date: "2026-06-20 12:00", stage: "第 2 轮", homeTeamId: "ned", awayTeamId: "swe", venue: "Houston Stadium" },
  { matchNo: 34, groupId: "E", date: "2026-06-20 16:00", stage: "第 2 轮", homeTeamId: "ger", awayTeamId: "civ", venue: "Toronto Stadium" },
  { matchNo: 35, groupId: "E", date: "2026-06-20 19:00", stage: "第 2 轮", homeTeamId: "ecu", awayTeamId: "cuw", venue: "Kansas City Stadium" },
  { matchNo: 36, groupId: "F", date: "2026-06-20 23:00", stage: "第 2 轮", homeTeamId: "tun", awayTeamId: "jpn", venue: "Estadio Monterrey" },
  { matchNo: 37, groupId: "H", date: "2026-06-21 18:00", stage: "第 2 轮", homeTeamId: "uru", awayTeamId: "cpv", venue: "Miami Stadium" },
  { matchNo: 38, groupId: "H", date: "2026-06-21 12:00", stage: "第 2 轮", homeTeamId: "esp", awayTeamId: "ksa", venue: "Atlanta Stadium" },
  { matchNo: 39, groupId: "G", date: "2026-06-21 12:00", stage: "第 2 轮", homeTeamId: "bel", awayTeamId: "irn", venue: "Los Angeles Stadium" },
  { matchNo: 40, groupId: "G", date: "2026-06-21 18:00", stage: "第 2 轮", homeTeamId: "nzl", awayTeamId: "egy", venue: "BC Place Vancouver" },
  { matchNo: 41, groupId: "I", date: "2026-06-22 20:00", stage: "第 2 轮", homeTeamId: "nor", awayTeamId: "sen", venue: "New York New Jersey Stadium" },
  { matchNo: 42, groupId: "I", date: "2026-06-22 17:00", stage: "第 2 轮", homeTeamId: "fra", awayTeamId: "irq", venue: "Philadelphia Stadium" },
  { matchNo: 43, groupId: "J", date: "2026-06-22 12:00", stage: "第 2 轮", homeTeamId: "arg", awayTeamId: "aut", venue: "Dallas Stadium" },
  { matchNo: 44, groupId: "J", date: "2026-06-22 20:00", stage: "第 2 轮", homeTeamId: "jor", awayTeamId: "alg", venue: "San Francisco Bay Area Stadium" },
  { matchNo: 45, groupId: "L", date: "2026-06-23 16:00", stage: "第 2 轮", homeTeamId: "eng", awayTeamId: "gha", venue: "Boston Stadium" },
  { matchNo: 46, groupId: "L", date: "2026-06-23 19:00", stage: "第 2 轮", homeTeamId: "pan", awayTeamId: "cro", venue: "Toronto Stadium" },
  { matchNo: 47, groupId: "K", date: "2026-06-23 12:00", stage: "第 2 轮", homeTeamId: "por", awayTeamId: "uzb", venue: "Houston Stadium" },
  { matchNo: 48, groupId: "K", date: "2026-06-23 21:00", stage: "第 2 轮", homeTeamId: "col", awayTeamId: "cod", venue: "Estadio Guadalajara" },
  { matchNo: 49, groupId: "C", date: "2026-06-24 18:00", stage: "第 3 轮", homeTeamId: "sco", awayTeamId: "bra", venue: "Miami Stadium" },
  { matchNo: 50, groupId: "C", date: "2026-06-24 18:00", stage: "第 3 轮", homeTeamId: "mar", awayTeamId: "hai", venue: "Atlanta Stadium" },
  { matchNo: 51, groupId: "B", date: "2026-06-24 12:00", stage: "第 3 轮", homeTeamId: "sui", awayTeamId: "can", venue: "BC Place Vancouver" },
  { matchNo: 52, groupId: "B", date: "2026-06-24 12:00", stage: "第 3 轮", homeTeamId: "bih", awayTeamId: "qat", venue: "Seattle Stadium" },
  { matchNo: 53, groupId: "A", date: "2026-06-24 20:00", stage: "第 3 轮", homeTeamId: "cze", awayTeamId: "mex", venue: "Mexico City Stadium" },
  { matchNo: 54, groupId: "A", date: "2026-06-24 20:00", stage: "第 3 轮", homeTeamId: "rsa", awayTeamId: "kor", venue: "Estadio Monterrey" },
  { matchNo: 55, groupId: "E", date: "2026-06-25 16:00", stage: "第 3 轮", homeTeamId: "cuw", awayTeamId: "civ", venue: "Philadelphia Stadium" },
  { matchNo: 56, groupId: "E", date: "2026-06-25 16:00", stage: "第 3 轮", homeTeamId: "ecu", awayTeamId: "ger", venue: "New York New Jersey Stadium" },
  { matchNo: 57, groupId: "F", date: "2026-06-25 18:00", stage: "第 3 轮", homeTeamId: "jpn", awayTeamId: "swe", venue: "Dallas Stadium" },
  { matchNo: 58, groupId: "F", date: "2026-06-25 18:00", stage: "第 3 轮", homeTeamId: "tun", awayTeamId: "ned", venue: "Kansas City Stadium" },
  { matchNo: 59, groupId: "D", date: "2026-06-25 19:00", stage: "第 3 轮", homeTeamId: "tur", awayTeamId: "usa", venue: "Los Angeles Stadium" },
  { matchNo: 60, groupId: "D", date: "2026-06-25 19:00", stage: "第 3 轮", homeTeamId: "par", awayTeamId: "aus", venue: "San Francisco Bay Area Stadium" },
  { matchNo: 61, groupId: "I", date: "2026-06-26 15:00", stage: "第 3 轮", homeTeamId: "nor", awayTeamId: "fra", venue: "Boston Stadium" },
  { matchNo: 62, groupId: "I", date: "2026-06-26 15:00", stage: "第 3 轮", homeTeamId: "sen", awayTeamId: "irq", venue: "Toronto Stadium" },
  { matchNo: 63, groupId: "G", date: "2026-06-26 20:00", stage: "第 3 轮", homeTeamId: "egy", awayTeamId: "irn", venue: "Seattle Stadium" },
  { matchNo: 64, groupId: "G", date: "2026-06-26 20:00", stage: "第 3 轮", homeTeamId: "nzl", awayTeamId: "bel", venue: "BC Place Vancouver" },
  { matchNo: 65, groupId: "H", date: "2026-06-26 19:00", stage: "第 3 轮", homeTeamId: "cpv", awayTeamId: "ksa", venue: "Houston Stadium" },
  { matchNo: 66, groupId: "H", date: "2026-06-26 19:00", stage: "第 3 轮", homeTeamId: "uru", awayTeamId: "esp", venue: "Estadio Guadalajara" },
  { matchNo: 67, groupId: "L", date: "2026-06-27 17:00", stage: "第 3 轮", homeTeamId: "pan", awayTeamId: "eng", venue: "New York New Jersey Stadium" },
  { matchNo: 68, groupId: "L", date: "2026-06-27 17:00", stage: "第 3 轮", homeTeamId: "cro", awayTeamId: "gha", venue: "Philadelphia Stadium" },
  { matchNo: 69, groupId: "J", date: "2026-06-27 21:00", stage: "第 3 轮", homeTeamId: "alg", awayTeamId: "aut", venue: "Kansas City Stadium" },
  { matchNo: 70, groupId: "J", date: "2026-06-27 21:00", stage: "第 3 轮", homeTeamId: "jor", awayTeamId: "arg", venue: "Dallas Stadium" },
  { matchNo: 71, groupId: "K", date: "2026-06-27 19:30", stage: "第 3 轮", homeTeamId: "col", awayTeamId: "por", venue: "Miami Stadium" },
  { matchNo: 72, groupId: "K", date: "2026-06-27 18:30", stage: "第 3 轮", homeTeamId: "cod", awayTeamId: "uzb", venue: "Atlanta Stadium" },
];

const knockoutFixtures: Match[] = [
  { id: "ko-73", matchNo: 73, groupId: "KO", date: "2026-06-28 12:00", stage: "32 强", homeLabel: "A 组第二", awayLabel: "B 组第二", venue: "Los Angeles Stadium", status: "scheduled", note: "32 强淘汰赛，官方编号 M73。" },
  { id: "ko-74", matchNo: 74, groupId: "KO", date: "2026-06-29 16:30", stage: "32 强", homeLabel: "E 组第一", awayLabel: "最佳第三 A/B/C/D/F", venue: "Boston Stadium", status: "scheduled", note: "32 强淘汰赛，官方编号 M74。" },
  { id: "ko-75", matchNo: 75, groupId: "KO", date: "2026-06-29 19:00", stage: "32 强", homeLabel: "F 组第一", awayLabel: "C 组第二", venue: "Monterrey Stadium", status: "scheduled", note: "32 强淘汰赛，官方编号 M75。" },
  { id: "ko-76", matchNo: 76, groupId: "KO", date: "2026-06-29 12:00", stage: "32 强", homeLabel: "C 组第一", awayLabel: "F 组第二", venue: "Houston Stadium", status: "scheduled", note: "32 强淘汰赛，官方编号 M76。" },
  { id: "ko-77", matchNo: 77, groupId: "KO", date: "2026-06-30 17:00", stage: "32 强", homeLabel: "I 组第一", awayLabel: "最佳第三 C/D/F/G/H", venue: "New York New Jersey Stadium", status: "scheduled", note: "32 强淘汰赛，官方编号 M77。" },
  { id: "ko-78", matchNo: 78, groupId: "KO", date: "2026-06-30 12:00", stage: "32 强", homeLabel: "E 组第二", awayLabel: "I 组第二", venue: "Dallas Stadium", status: "scheduled", note: "32 强淘汰赛，官方编号 M78。" },
  { id: "ko-79", matchNo: 79, groupId: "KO", date: "2026-06-30 19:00", stage: "32 强", homeLabel: "A 组第一", awayLabel: "最佳第三 C/E/F/H/I", venue: "Mexico City Stadium", status: "scheduled", note: "32 强淘汰赛，官方编号 M79。" },
  { id: "ko-80", matchNo: 80, groupId: "KO", date: "2026-07-01 12:00", stage: "32 强", homeLabel: "L 组第一", awayLabel: "最佳第三 E/H/I/J/K", venue: "Atlanta Stadium", status: "scheduled", note: "32 强淘汰赛，官方编号 M80。" },
  { id: "ko-81", matchNo: 81, groupId: "KO", date: "2026-07-01 17:00", stage: "32 强", homeLabel: "D 组第一", awayLabel: "最佳第三 B/E/F/I/J", venue: "San Francisco Bay Area Stadium", status: "scheduled", note: "32 强淘汰赛，官方编号 M81。" },
  { id: "ko-82", matchNo: 82, groupId: "KO", date: "2026-07-01 13:00", stage: "32 强", homeLabel: "G 组第一", awayLabel: "最佳第三 A/E/H/I/J", venue: "Seattle Stadium", status: "scheduled", note: "32 强淘汰赛，官方编号 M82。" },
  { id: "ko-83", matchNo: 83, groupId: "KO", date: "2026-07-02 19:00", stage: "32 强", homeLabel: "K 组第二", awayLabel: "L 组第二", venue: "Toronto Stadium", status: "scheduled", note: "32 强淘汰赛，官方编号 M83。" },
  { id: "ko-84", matchNo: 84, groupId: "KO", date: "2026-07-02 12:00", stage: "32 强", homeLabel: "H 组第一", awayLabel: "J 组第二", venue: "Los Angeles Stadium", status: "scheduled", note: "32 强淘汰赛，官方编号 M84。" },
  { id: "ko-85", matchNo: 85, groupId: "KO", date: "2026-07-02 20:00", stage: "32 强", homeLabel: "B 组第一", awayLabel: "最佳第三 E/F/G/I/J", venue: "Vancouver Stadium", status: "scheduled", note: "32 强淘汰赛，官方编号 M85。" },
  { id: "ko-86", matchNo: 86, groupId: "KO", date: "2026-07-03 18:00", stage: "32 强", homeLabel: "J 组第一", awayLabel: "H 组第二", venue: "Miami Stadium", status: "scheduled", note: "32 强淘汰赛，官方编号 M86。" },
  { id: "ko-87", matchNo: 87, groupId: "KO", date: "2026-07-03 20:30", stage: "32 强", homeLabel: "K 组第一", awayLabel: "最佳第三 D/E/I/J/L", venue: "Kansas City Stadium", status: "scheduled", note: "32 强淘汰赛，官方编号 M87。" },
  { id: "ko-88", matchNo: 88, groupId: "KO", date: "2026-07-03 13:00", stage: "32 强", homeLabel: "D 组第二", awayLabel: "G 组第二", venue: "Dallas Stadium", status: "scheduled", note: "32 强淘汰赛，官方编号 M88。" },
  { id: "ko-89", matchNo: 89, groupId: "KO", date: "2026-07-04 17:00", stage: "16 强", homeLabel: "M74 胜者", awayLabel: "M77 胜者", venue: "Philadelphia Stadium", status: "scheduled", note: "16 强淘汰赛，官方编号 M89。" },
  { id: "ko-90", matchNo: 90, groupId: "KO", date: "2026-07-04 12:00", stage: "16 强", homeLabel: "M73 胜者", awayLabel: "M75 胜者", venue: "Houston Stadium", status: "scheduled", note: "16 强淘汰赛，官方编号 M90。" },
  { id: "ko-91", matchNo: 91, groupId: "KO", date: "2026-07-05 16:00", stage: "16 强", homeLabel: "M76 胜者", awayLabel: "M78 胜者", venue: "New York New Jersey Stadium", status: "scheduled", note: "16 强淘汰赛，官方编号 M91。" },
  { id: "ko-92", matchNo: 92, groupId: "KO", date: "2026-07-05 18:00", stage: "16 强", homeLabel: "M79 胜者", awayLabel: "M80 胜者", venue: "Mexico City Stadium", status: "scheduled", note: "16 强淘汰赛，官方编号 M92。" },
  { id: "ko-93", matchNo: 93, groupId: "KO", date: "2026-07-06 14:00", stage: "16 强", homeLabel: "M83 胜者", awayLabel: "M84 胜者", venue: "Dallas Stadium", status: "scheduled", note: "16 强淘汰赛，官方编号 M93。" },
  { id: "ko-94", matchNo: 94, groupId: "KO", date: "2026-07-06 17:00", stage: "16 强", homeLabel: "M81 胜者", awayLabel: "M82 胜者", venue: "Seattle Stadium", status: "scheduled", note: "16 强淘汰赛，官方编号 M94。" },
  { id: "ko-95", matchNo: 95, groupId: "KO", date: "2026-07-07 12:00", stage: "16 强", homeLabel: "M86 胜者", awayLabel: "M88 胜者", venue: "Atlanta Stadium", status: "scheduled", note: "16 强淘汰赛，官方编号 M95。" },
  { id: "ko-96", matchNo: 96, groupId: "KO", date: "2026-07-07 13:00", stage: "16 强", homeLabel: "M85 胜者", awayLabel: "M87 胜者", venue: "Vancouver Stadium", status: "scheduled", note: "16 强淘汰赛，官方编号 M96。" },
  { id: "ko-97", matchNo: 97, groupId: "KO", date: "2026-07-09 16:00", stage: "1/4 决赛", homeLabel: "M89 胜者", awayLabel: "M90 胜者", venue: "Boston Stadium", status: "scheduled", note: "1/4 决赛，官方编号 M97。" },
  { id: "ko-98", matchNo: 98, groupId: "KO", date: "2026-07-10 12:00", stage: "1/4 决赛", homeLabel: "M93 胜者", awayLabel: "M94 胜者", venue: "Los Angeles Stadium", status: "scheduled", note: "1/4 决赛，官方编号 M98。" },
  { id: "ko-99", matchNo: 99, groupId: "KO", date: "2026-07-11 17:00", stage: "1/4 决赛", homeLabel: "M91 胜者", awayLabel: "M92 胜者", venue: "Miami Stadium", status: "scheduled", note: "1/4 决赛，官方编号 M99。" },
  { id: "ko-100", matchNo: 100, groupId: "KO", date: "2026-07-11 20:00", stage: "1/4 决赛", homeLabel: "M95 胜者", awayLabel: "M96 胜者", venue: "Kansas City Stadium", status: "scheduled", note: "1/4 决赛，官方编号 M100。" },
  { id: "ko-101", matchNo: 101, groupId: "KO", date: "2026-07-14 14:00", stage: "半决赛", homeLabel: "M97 胜者", awayLabel: "M98 胜者", venue: "Dallas Stadium", status: "scheduled", note: "半决赛，官方编号 M101。" },
  { id: "ko-102", matchNo: 102, groupId: "KO", date: "2026-07-15 15:00", stage: "半决赛", homeLabel: "M99 胜者", awayLabel: "M100 胜者", venue: "Atlanta Stadium", status: "scheduled", note: "半决赛，官方编号 M102。" },
  { id: "ko-103", matchNo: 103, groupId: "KO", date: "2026-07-18 17:00", stage: "三四名决赛", homeLabel: "M101 负者", awayLabel: "M102 负者", venue: "Miami Stadium", status: "scheduled", note: "三四名决赛，官方编号 M103。" },
  { id: "ko-104", matchNo: 104, groupId: "KO", date: "2026-07-19 15:00", stage: "决赛", homeLabel: "M101 胜者", awayLabel: "M102 胜者", venue: "New York New Jersey Stadium", status: "scheduled", note: "决赛，官方编号 M104。" },
];

const simulatedGoals = (matchNo: number): MatchGoal[] | undefined => {
  const goalsByMatchNo: Record<number, MatchGoal[]> = {
    1: [
      { side: "home", minute: "24'", player: "Jimenez" },
      { side: "away", minute: "35'", player: "Tau" },
      { side: "home", minute: "67'", player: "Jimenez" },
      { side: "away", minute: "76'", player: "Tau" },
      { side: "home", minute: "81'", player: "Lozano" },
      { side: "away", minute: "81'", player: "Mokoena" },
    ],
    2: [
      { side: "away", minute: "18'", player: "Schick" },
      { side: "home", minute: "44'", player: "Son" },
      { side: "away", minute: "58'", player: "Hlozek" },
    ],
    25: [
      { side: "home", minute: "12'", player: "Soucek" },
      { side: "home", minute: "29'", player: "Schick" },
      { side: "away", minute: "72'", player: "Mokoena" },
    ],
    28: [
      { side: "away", minute: "21'", player: "Lee" },
      { side: "home", minute: "39'", player: "Lozano" },
      { side: "home", minute: "64'", player: "Kim", ownGoal: true },
      { side: "away", minute: "88'", player: "Son" },
    ],
    53: [
      { side: "away", minute: "16'", player: "Jimenez" },
      { side: "home", minute: "52'", player: "Schick" },
      { side: "away", minute: "77'", player: "Lozano" },
    ],
    54: [
      { side: "away", minute: "9'", player: "Son" },
      { side: "home", minute: "33'", player: "Foster" },
      { side: "away", minute: "61'", player: "Hwang" },
      { side: "home", minute: "90+1'", player: "Tau" },
    ],
  };

  return goalsByMatchNo[matchNo];
};

const scoreFromGoals = (goals: MatchGoal[]) => {
  const home = goals.filter((goal) => goal.side === "home").length;
  const away = goals.filter((goal) => goal.side === "away").length;
  return `${home}-${away}`;
};

const simulatedPenaltyShootout = (matchNo: number): PenaltyShootout | undefined => {
  if (matchNo !== 104) return undefined;

  return {
    homeScore: 4,
    awayScore: 3,
    rounds: [
      { round: 1, home: { player: "Mbappe", scored: true }, away: { player: "Messi", scored: true } },
      { round: 2, home: { player: "Griezmann", scored: true }, away: { player: "Alvarez", scored: false } },
      { round: 3, home: { player: "Camavinga", scored: false }, away: { player: "Mac Allister", scored: true } },
      { round: 4, home: { player: "Tchouameni", scored: true }, away: { player: "Dybala", scored: true } },
      { round: 5, home: { player: "Kolo Muani", scored: true }, away: { player: "Lautaro", scored: false } },
    ],
  };
};

const buildMatches = (groupId: string): Match[] =>
  officialFixtures
    .filter((fixture) => fixture.groupId === groupId)
    .map((fixture, index) => {
      const goals = simulatedGoals(fixture.matchNo);

      return {
        ...fixture,
        id: `${groupId}-m${index + 1}`,
        score: goals ? scoreFromGoals(goals) : simulatedScore(fixture.matchNo),
        goals,
        status: "finished",
        note:
          fixture.stage === "第 3 轮"
            ? "同组末轮同步窗口，重点观察净胜球与最佳第三排序。"
            : "官方赛程编号已确认，时间后续可接入实时源校准。",
      };
    });

const simulatedScore = (matchNo: number) => {
  const home = (matchNo * 7 + 1) % 4;
  const away = (matchNo * 5 + 2) % 4;
  return `${home}-${away}`;
};

const simulatedKnockoutResults: Record<
  number,
  Partial<
    Pick<
      Match,
      | "goals"
      | "homeTeamId"
      | "awayTeamId"
      | "homeLabel"
      | "awayLabel"
      | "penaltyShootout"
      | "score"
      | "status"
      | "note"
    >
  >
> = {
  73: { homeTeamId: "mex", awayTeamId: "can" },
  74: { homeTeamId: "ger", awayTeamId: "jpn" },
  75: { homeTeamId: "ned", awayTeamId: "mar" },
  76: { homeTeamId: "bra", awayTeamId: "swe" },
  77: { homeTeamId: "fra", awayTeamId: "kor" },
  78: { homeTeamId: "ecu", awayTeamId: "sen" },
  79: { homeTeamId: "cze", awayTeamId: "aus" },
  80: { homeTeamId: "eng", awayTeamId: "gha" },
  81: { homeTeamId: "usa", awayTeamId: "tur" },
  82: { homeTeamId: "bel", awayTeamId: "egy" },
  83: { homeTeamId: "col", awayTeamId: "cro" },
  84: { homeTeamId: "esp", awayTeamId: "arg" },
  85: { homeTeamId: "sui", awayTeamId: "uru" },
  86: { homeTeamId: "alg", awayTeamId: "por" },
  87: { homeTeamId: "uzb", awayTeamId: "nor" },
  88: { homeTeamId: "par", awayTeamId: "civ" },
  89: { homeTeamId: "ger", awayTeamId: "fra" },
  90: { homeTeamId: "mex", awayTeamId: "por" },
  91: { homeTeamId: "bra", awayTeamId: "usa" },
  92: { homeTeamId: "eng", awayTeamId: "arg" },
  93: { homeTeamId: "esp", awayTeamId: "uru" },
  94: { homeTeamId: "bel", awayTeamId: "ned" },
  95: { homeTeamId: "jpn", awayTeamId: "mar" },
  96: { homeTeamId: "cro", awayTeamId: "col" },
  97: { homeTeamId: "fra", awayTeamId: "mex" },
  98: { homeTeamId: "esp", awayTeamId: "bel" },
  99: { homeTeamId: "bra", awayTeamId: "arg" },
  100: { homeTeamId: "mar", awayTeamId: "cro" },
  101: { homeTeamId: "fra", awayTeamId: "esp" },
  102: { homeTeamId: "arg", awayTeamId: "mar" },
  103: { homeTeamId: "esp", awayTeamId: "mar" },
  104: {
    homeTeamId: "fra",
    awayTeamId: "arg",
    score: "1-1",
    goals: [
      { side: "home", minute: "18'", player: "Mbappe" },
      { side: "away", minute: "72'", player: "Messi" },
    ],
    penaltyShootout: simulatedPenaltyShootout(104),
  },
};

const knockoutMatches = knockoutFixtures.map((match) => ({
  ...match,
  score: simulatedScore(match.matchNo),
  status: "finished" as const,
  note: "模拟比分，用于校验全赛程赛果展示。",
  ...simulatedKnockoutResults[match.matchNo],
}));

export const getTeam = (teamId: string) => teams.find((team) => team.id === teamId)!;

export const getTeamFlag = (teamId: string) => flagByCode[getTeam(teamId).code] ?? "🏳️";

export const getTeamFlagImageUrl = (teamId: string) => {
  const flagCode = flagImageCodeByCode[getTeam(teamId).code];
  return flagCode ? `https://flagcdn.com/${flagCode}.svg` : "";
};

export const groups: Group[] = groupTeamIds.map((teamIds, index) => {
  const id = String.fromCharCode(65 + index);
  const standings = pointsMatrix[index].map((points, standingIndex) =>
    buildStanding(teamIds[standingIndex], standingIndex, points),
  );

  return {
    id,
    name: `${id} 组`,
    leaderTeamId: teamIds[0],
    summary:
      standings[2].points >= 4
        ? "前三分差极小，最佳第三席位将被净胜球左右。"
        : "头名优势清晰，第二名争夺进入最后窗口。",
    keyAlert:
      standings[2].points >= 4
        ? "第三名当前分数具备晋级 32 强竞争力。"
        : "第四名需要连胜并等待其他小组结果。",
    qualificationOutlook:
      "2026 赛制下每组前二直接晋级，12 个小组第三中成绩最好的 8 队进入 32 强。本组重点看第二名积分与第三名净胜球。",
    standings,
    matches: buildMatches(id),
  };
});

export const allMatches = [...groups.flatMap((group) => group.matches), ...knockoutMatches].sort(
  (a, b) => a.matchNo - b.matchNo,
);

export const playerStats = {
  scorers: [
    { rank: 1, player: "基利安·姆巴佩", team: "法国", goals: 5 },
    { rank: 2, player: "维尼修斯", team: "巴西", goals: 4 },
    { rank: 3, player: "哈里·凯恩", team: "英格兰", goals: 4 },
    { rank: 4, player: "劳塔罗·马丁内斯", team: "阿根廷", goals: 3 },
    { rank: 5, player: "堂安律", team: "日本", goals: 3 },
  ] satisfies PlayerStat[],
  assists: [
    { rank: 1, player: "布鲁诺·费尔南德斯", team: "葡萄牙", assists: 4 },
    { rank: 2, player: "德布劳内", team: "比利时", assists: 3 },
    { rank: 3, player: "佩德里", team: "西班牙", assists: 3 },
    { rank: 4, player: "梅西", team: "阿根廷", assists: 2 },
    { rank: 5, player: "孙兴慜", team: "韩国", assists: 2 },
  ] satisfies PlayerStat[],
  cards: [
    { rank: 1, player: "奥塔门迪", team: "阿根廷", yellowCards: 2, redCards: 1 },
    { rank: 2, player: "阿马泰", team: "加纳", yellowCards: 3, redCards: 0 },
    { rank: 3, player: "麦克托米奈", team: "苏格兰", yellowCards: 2, redCards: 0 },
    { rank: 4, player: "卡塞米罗", team: "巴西", yellowCards: 2, redCards: 0 },
    { rank: 5, player: "阿坎吉", team: "瑞士", yellowCards: 1, redCards: 1 },
  ] satisfies PlayerStat[],
  singleMatchGoals: [
    { rank: 1, player: "基利安·姆巴佩", team: "法国", matchNo: 42, goals: 3 },
    { rank: 2, player: "维尼修斯", team: "巴西", matchNo: 49, goals: 2 },
    { rank: 3, player: "哈里·凯恩", team: "英格兰", matchNo: 45, goals: 2 },
  ] satisfies PlayerStat[],
};

export const storyEvents: StoryEvent[] = [
  { label: "第一支出线队", value: "法国", detail: "两连胜锁定前二", groupId: "I" },
  { label: "第一支出局队", value: "新西兰", detail: "两轮后提前无缘晋级", groupId: "G" },
  { label: "第一粒进球", value: "加拿大 12'", detail: "揭幕战首开纪录", groupId: "B" },
  { label: "第一张黄牌", value: "阿马杜", detail: "A 组第 18 分钟", groupId: "A" },
  { label: "第一张红牌", value: "奥塔门迪", detail: "战术犯规被罚下", groupId: "J" },
  { label: "第 50 个进球", value: "维尔茨", detail: "德国禁区前低射", groupId: "E" },
  { label: "第 100 个进球", value: "姆巴佩", detail: "法国反击破门", groupId: "I" },
  { label: "最快进球", value: "莱奥 02'", detail: "葡萄牙开场闪击", groupId: "K" },
  { label: "最大比分胜利", value: "葡萄牙 5-0 中国", detail: "J 组净胜球拉开", groupId: "J" },
  { label: "最年轻进球者", value: "恩德里克", detail: "18 岁刷新本届纪录", groupId: "C" },
  { label: "最老进球者", value: "梅西", detail: "任意球保住头名", groupId: "J" },
];

export const tickerItems = {
  top: ["今日赛程 8 场", "即时比分：C 组 USA 1-0 EGY", "开球提醒：B 组 19:00", "出线提醒：最佳第三实时门槛 4 分"],
  bottom: ["进球：法国第 62 分钟扩大比分", "红牌：A 组防线最后一人犯规", "伤病：巴西边锋接受队医检查", "VAR：H 组点球复核完成", "官方消息：赛后发布会延迟 15 分钟"],
};

export const newsPlaceholders = [
  {
    title: "固定阅读消息位",
    body: "后续用于承载可停留阅读的赛前情报、官方公告、出线规则解释和伤停更新。",
  },
  {
    title: "编辑精选提醒",
    body: "与底部动态快讯区分：这里保留上下文，适合赛事编辑台人工置顶。",
  },
];
