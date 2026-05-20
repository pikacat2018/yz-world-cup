import type { NewsItem } from "./types";

export type RecentKeyword = {
  keyword: string;
  count: number;
  latestAt: string;
};

export type RecentKeywordResult = {
  keywords: RecentKeyword[];
  recentItemCount: number;
};

export type RecentKeywordWindowHours = 12 | 6 | 3 | 1;

export const recentKeywordWindowOptions: RecentKeywordWindowHours[] = [12, 6, 3, 1];
export const RECENT_KEYWORD_SEARCH_EVENT = "recent-keyword-search";

const MIN_RECENT_ITEMS = 5;
const MIN_KEYWORD_COUNT = 2;
const MAX_RECENT_KEYWORDS = 6;
const keywordAliases: Record<string, string> = {
  穆帅: "穆里尼奥",
  Mourinho: "穆里尼奥",
  皇家马德里: "皇马",
  "Real Madrid": "皇马",
  巴塞罗那: "巴萨",
  Barcelona: "巴萨",
  "Manchester United": "曼联",
  "Man United": "曼联",
  "Manchester City": "曼城",
  Liverpool: "利物浦",
  Arsenal: "阿森纳",
  Chelsea: "切尔西",
  Tottenham: "热刺",
  Bayern: "拜仁",
  Dortmund: "多特",
  PSG: "巴黎",
  Juventus: "尤文",
  Inter: "国米",
  Milan: "米兰",
  Messi: "梅西",
  Ronaldo: "C罗",
  Mbappe: "姆巴佩",
  Haaland: "哈兰德",
};
const normalizedKeywordAliases = new Map(
  Object.entries(keywordAliases).map(([keyword, canonicalKeyword]) => [keyword.toLowerCase(), canonicalKeyword]),
);
const keywordSearchAliases = new Map<string, string[]>();

for (const [keyword, canonicalKeyword] of Object.entries(keywordAliases)) {
  const aliases = keywordSearchAliases.get(canonicalKeyword) ?? [canonicalKeyword];
  if (!aliases.some((alias) => alias.toLowerCase() === keyword.toLowerCase())) aliases.push(keyword);
  keywordSearchAliases.set(canonicalKeyword, aliases);
}

export type RecentKeywordSearchDetail = {
  keyword: string;
  terms: string[];
};

export const getRecentKeywordSearchTerms = (keyword: string) => {
  const canonicalKeyword = getCanonicalKeyword(normalizeKeyword(keyword));
  return keywordSearchAliases.get(canonicalKeyword) ?? [canonicalKeyword];
};

export const dispatchRecentKeywordSearch = (keyword: string) => {
  window.dispatchEvent(
    new CustomEvent<RecentKeywordSearchDetail>(RECENT_KEYWORD_SEARCH_EVENT, {
      detail: {
        keyword,
        terms: getRecentKeywordSearchTerms(keyword),
      },
    }),
  );
};

const reporterKeywords = ["罗马诺", "Romano", "TA"];

const mediaAttributionKeywords = [
  "马卡",
  "马卡报",
  "阿斯",
  "阿斯报",
  "足球报",
  "体坛周报",
  "图片报",
  "体育图片报",
  "每日邮报",
  "每日电讯报",
  "卫报",
  "泰晤士报",
  "太阳报",
  "镜报",
  "天空体育",
  "队报",
  "巴黎人报",
  "法国足球",
  "世界体育报",
  "每日体育报",
  "罗马体育报",
  "米兰体育报",
  "都体",
  "都灵体育",
  "都灵体育报",
  "晚邮报",
  "共和报",
  "踢球者",
  "进球网",
  "法新社",
  "美联社",
  "路透社",
  "加泰电台",
  "科贝电台",
  "塞尔电台",
  "零点电台",
  "米兰新闻网",
  "BBC",
  "ESPN",
  "ESPN FC",
  "Sky Sports",
  "Sky Germany",
  "The Athletic",
  "Daily Mail",
  "The Telegraph",
  "The Guardian",
  "The Times",
  "The Sun",
  "Mirror",
  "L'Equipe",
  "Le Parisien",
  "France Football",
  "Bild",
  "Sport Bild",
  "Kicker",
  "Marca",
  "AS",
  "Mundo Deportivo",
  "Sport",
  "Relevo",
  "Jijantes",
  "COPE",
  "Cadena SER",
  "Onda Cero",
  "RMC",
  "DAZN",
  "TNT Sports",
  "CBS Sports",
  "NBC Sports",
  "Sports Illustrated",
  "Goal",
  "AP",
  "AFP",
  "Reuters",
];

const eventKeywords = [
  "官宣",
  "续约",
  "伤缺",
  "受伤",
  "红牌",
  "黄牌",
  "点球",
  "VAR",
  "绝杀",
  "逆转",
  "爆冷",
  "出线",
  "出局",
  "晋级",
  "淘汰",
  "争议",
  "门将",
  "转会",
];

const builtInKeywords = [
  ...eventKeywords,
  "皇马",
  "皇家马德里",
  "巴萨",
  "巴塞罗那",
  "曼联",
  "曼城",
  "利物浦",
  "阿森纳",
  "切尔西",
  "热刺",
  "拜仁",
  "多特",
  "巴黎",
  "马竞",
  "尤文",
  "国米",
  "米兰",
  "罗马",
  "本菲卡",
  "葡萄牙",
  "阿根廷",
  "巴西",
  "法国",
  "德国",
  "西班牙",
  "英格兰",
  "意大利",
  "日本",
  "韩国",
  "穆里尼奥",
  "穆帅",
  "安切洛蒂",
  "C罗",
  "梅西",
  "姆巴佩",
  "哈兰德",
  "维尼修斯",
  "贝林厄姆",
  "亚马尔",
  "Mourinho",
  "Real Madrid",
  "Manchester United",
  "Man United",
  "Manchester City",
  "Liverpool",
  "Arsenal",
  "Chelsea",
  "Tottenham",
  "Barcelona",
  "Bayern",
  "Dortmund",
  "PSG",
  "Juventus",
  "Inter",
  "Milan",
  "Messi",
  "Ronaldo",
  "Mbappe",
  "Haaland",
];

const cjkStopWords = new Set([
  "官方",
  "比赛",
  "球队",
  "世界杯",
  "新闻",
  "视频",
  "今日",
  "最新",
  "直播",
  "赛后",
  "赛前",
  "表示",
  "进行",
  "相关",
  "目前",
  "已经",
  "记者",
  "报道",
  "消息",
  "透露",
  "称",
]);

const englishStopWords = new Set([
  "the",
  "a",
  "an",
  "of",
  "to",
  "in",
  "on",
  "for",
  "and",
  "with",
  "from",
  "is",
  "are",
  "vs",
  "fc",
  "have",
  "their",
  "next",
  "leave",
  "season",
  "fans",
  "welcome",
  "end",
  "will",
  "club",
  "ta",
]);

const splitChineseTerms = new RegExp(
  [...cjkStopWords, "他的", "他们", "我们", "这个", "那个", "一个", "成为", "没有", "因为", "以及", "可能", "不会"]
    .sort((a, b) => b.length - a.length)
    .join("|"),
  "g",
);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseItemTime = (item: NewsItem) => {
  const value = item.publishedAt || item.collectedAt || item.fetchedAt;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const normalizeKeyword = (keyword: string) => keyword.trim().replace(/\s+/g, " ");

const normalizedMediaKeywords = new Set(mediaAttributionKeywords.map((keyword) => normalizeKeyword(keyword).toLowerCase()));

const isMediaKeyword = (keyword: string) => normalizedMediaKeywords.has(normalizeKeyword(keyword).toLowerCase());

const buildKeywordPattern = (keyword: string, flags: string) => {
  const normalized = normalizeKeyword(keyword);
  if (!normalized) return null;

  const isLatin = /[A-Za-z]/.test(normalized);
  return isLatin
    ? new RegExp(`\\b${escapeRegExp(normalized)}\\b`, flags)
    : new RegExp(escapeRegExp(normalized), flags);
};

const stripMediaAttributions = (title: string) =>
  mediaAttributionKeywords.reduce((cleanTitle, keyword) => {
    const normalized = normalizeKeyword(keyword);
    if (!normalized) return cleanTitle;

    const escaped = escapeRegExp(normalized);
    const isLatin = /[A-Za-z]/.test(normalized);
    const flags = isLatin ? "gi" : "g";
    const quotedPrefix = new RegExp(`^[\\s【\\[]*${escaped}[】\\]]?\\s*[：:]\\s*`, flags);
    const citedReport = new RegExp(`据\\s*${escaped}\\s*(?:报道|消息|透露|称)?[，,：:\\s]*`, flags);
    const reportPrefix = new RegExp(`${escaped}\\s*(?:报道|消息|透露|称)[，,：:\\s]*`, flags);

    return cleanTitle.replace(quotedPrefix, " ").replace(citedReport, " ").replace(reportPrefix, " ");
  }, title);

const stripReporterKeywords = (title: string) =>
  reporterKeywords.reduce((cleanTitle, keyword) => {
    const pattern = buildKeywordPattern(keyword, "gi");
    if (!pattern) return cleanTitle;
    return cleanTitle.replace(pattern, " ");
  }, title);

const prepareTitleForExtraction = (title: string) => stripReporterKeywords(stripMediaAttributions(title));

const getCanonicalKeyword = (keyword: string) => keywordAliases[keyword] ?? normalizedKeywordAliases.get(keyword.toLowerCase()) ?? keyword;

const addKeywordCandidate = (keyword: string, candidates: Set<string>) => {
  const canonicalKeyword = getCanonicalKeyword(normalizeKeyword(keyword));
  if (!canonicalKeyword) return;
  if (isMediaKeyword(canonicalKeyword)) return;
  const comparableKeyword = canonicalKeyword.toLowerCase();

  for (const existing of Array.from(candidates)) {
    const comparableExisting = existing.toLowerCase();
    if (comparableExisting === comparableKeyword) return;
    if (comparableExisting.includes(comparableKeyword) && existing.length > canonicalKeyword.length) return;
    if (comparableKeyword.includes(comparableExisting) && canonicalKeyword.length > existing.length) candidates.delete(existing);
  }

  candidates.add(canonicalKeyword);
};

const shouldKeepChineseTerm = (term: string) => {
  if (term.length < 2 || term.length > 8) return false;
  if (cjkStopWords.has(term) || isMediaKeyword(term)) return false;
  if (/第$/.test(term)) return false;
  if (/^(中超|英超|西甲|意甲|德甲|法甲|欧冠|亚冠|世界杯|世俱杯)第$/.test(term)) return false;
  if (/^(报道|消息|透露|称)/.test(term) || /(报道|消息|透露|称)$/.test(term)) return false;
  return true;
};

const shouldKeepEnglishTerm = (term: string) => {
  const normalized = term.toLowerCase();
  if (normalized.length < 2 || englishStopWords.has(normalized) || isMediaKeyword(term)) return false;
  return /^[A-Z]{2,5}$/.test(term);
};

const addBuiltInKeywordMatches = (title: string, candidates: Set<string>) => {
  const sortedKeywords = builtInKeywords
    .map(normalizeKeyword)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const keyword of sortedKeywords) {
    const normalized = normalizeKeyword(keyword);
    if (!normalized) continue;

    const isLatin = /[A-Za-z]/.test(normalized);
    const pattern = isLatin ? new RegExp(`\\b${escapeRegExp(normalized)}\\b`, "i") : new RegExp(escapeRegExp(normalized));
    if (pattern.test(title)) addKeywordCandidate(normalized, candidates);
  }
};

export function extractRecentKeywordCandidates(title: string): string[] {
  const normalizedTitle = normalizeKeyword(prepareTitleForExtraction(title));
  const candidates = new Set<string>();

  addBuiltInKeywordMatches(normalizedTitle, candidates);

  for (const chunk of normalizedTitle.match(/[\u4e00-\u9fff]{2,}/g) ?? []) {
    const parts = chunk
      .replace(splitChineseTerms, " ")
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    for (const part of parts) {
      if (shouldKeepChineseTerm(part)) {
        addKeywordCandidate(part, candidates);
      }
    }
  }

  for (const word of normalizedTitle.match(/[A-Za-z][A-Za-z'-]*/g) ?? []) {
    const normalizedWord = normalizeKeyword(word);
    if (shouldKeepEnglishTerm(normalizedWord)) addKeywordCandidate(normalizedWord, candidates);
  }

  return Array.from(candidates);
}

export function getRecentKeywords(
  items: NewsItem[],
  windowHours: RecentKeywordWindowHours = 12,
  now = Date.now(),
): RecentKeywordResult {
  const windowMs = windowHours * 60 * 60 * 1000;
  const recentItems = items.filter((item) => {
    const time = parseItemTime(item);
    return time > 0 && now - time <= windowMs;
  });

  if (recentItems.length < MIN_RECENT_ITEMS) {
    return { keywords: [], recentItemCount: recentItems.length };
  }

  const keywordStats = new Map<string, { count: number; latestAt: number; keyword: string }>();

  for (const item of recentItems) {
    const title = normalizeKeyword(item.translatedTitle || item.title || "");
    if (!title) continue;

    const itemTime = parseItemTime(item);
    for (const keyword of extractRecentKeywordCandidates(title)) {
      const key = keyword.toLowerCase();
      const existing = keywordStats.get(key);

      keywordStats.set(key, {
        count: (existing?.count ?? 0) + 1,
        latestAt: Math.max(existing?.latestAt ?? 0, itemTime),
        keyword: existing?.keyword ?? keyword,
      });
    }
  }

  const keywords = Array.from(keywordStats.values())
    .filter((entry) => entry.count >= MIN_KEYWORD_COUNT)
    .sort((a, b) => b.count - a.count || b.latestAt - a.latestAt)
    .slice(0, MAX_RECENT_KEYWORDS)
    .map((entry) => ({
      keyword: entry.keyword,
      count: entry.count,
      latestAt: new Date(entry.latestAt).toISOString(),
    }));

  return { keywords, recentItemCount: recentItems.length };
}
