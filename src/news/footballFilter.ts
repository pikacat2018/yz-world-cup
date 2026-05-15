import type { NewsItem } from "./types";

const footballKeywords = [
  "世界杯",
  "世预赛",
  "国足",
  "女足",
  "U17",
  "U20",
  "中超",
  "英超",
  "西甲",
  "意甲",
  "德甲",
  "法甲",
  "欧冠",
  "欧联",
  "欧协联",
  "亚冠",
  "皇马",
  "巴萨",
  "曼城",
  "曼联",
  "阿森纳",
  "利物浦",
  "切尔西",
  "热刺",
  "拜仁",
  "巴黎",
  "国米",
  "米兰",
  "尤文",
  "马竞",
  "葡萄牙",
  "阿根廷",
  "巴西",
  "法国",
  "德国",
  "西班牙",
  "英格兰",
  "日本",
  "韩国",
  "荷兰",
  "克罗地亚",
  "梅西",
  "C罗",
  "姆巴佩",
  "哈兰德",
  "贝林厄姆",
  "维尼修斯",
  "罗马诺",
  "转会",
  "主帅",
  "门将",
  "前锋",
  "中场",
  "后卫",
  "进球",
  "助攻",
  "点球",
  "红牌",
  "黄牌",
  "伤停",
  "首发",
  "阵容",
  "足球",
  "足协",
  "国家队",
  "俱乐部",
  "主场",
  "客场",
  "联赛",
  "杯赛",
  "淘汰赛",
  "小组赛",
  "决赛",
  "半决赛",
  "四分之一决赛",
  "八分之一决赛",
];

const excludedKeywords = [
  "NBA",
  "CBA",
  "湖人",
  "勇士",
  "火箭",
  "骑士",
  "活塞",
  "凯尔特人",
  "独行侠",
  "掘金",
  "森林狼",
  "雷霆",
  "快船",
  "哈登",
  "詹姆斯",
  "杜兰特",
  "库里",
  "约基奇",
  "字母哥",
  "东契奇",
  "塔图姆",
  "恩比德",
  "篮球",
  "男篮",
  "女篮",
  "LOL",
  "LPL",
  "LCK",
  "T1",
  "Faker",
  "Jiejie",
  "Knight",
  "BLG",
  "JDG",
  "TES",
  "电竞",
  "KPL",
  "王者荣耀",
  "英雄联盟",
  "DOTA",
  "CSGO",
  "无畏契约",
];

export function isZhibo8FootballByUrl(url: string): boolean {
  return url.includes("/zuqiu/");
}

export function isFootballNews(title: string): boolean {
  const normalized = title.toLowerCase();

  return footballKeywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

export function hasExcludedNewsKeyword(title: string): boolean {
  const normalized = title.toLowerCase();

  return excludedKeywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

export function shouldKeepZhibo8News(item: Pick<NewsItem, "title" | "url">): boolean {
  if (item.url && isZhibo8FootballByUrl(item.url)) return true;
  if (hasExcludedNewsKeyword(item.title)) return false;
  if (isFootballNews(item.title)) return true;

  return false;
}
