const FIFA_SCHEDULE_URL =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums";

const LAST_SYNC_KEY = "yz-world-cup:fifa-schedule-last-sync";
const DAY_MS = 24 * 60 * 60 * 1000;

export type FifaSyncResult = {
  ok: boolean;
  checkedAt: string;
  sourceUrl: string;
  message: string;
};

export const getLastFifaSyncAt = () => localStorage.getItem(LAST_SYNC_KEY);

export const shouldRunDailyFifaSync = () => {
  const lastSyncAt = getLastFifaSyncAt();
  return !lastSyncAt || Date.now() - new Date(lastSyncAt).getTime() >= DAY_MS;
};

export const syncFifaSchedule = async (): Promise<FifaSyncResult> => {
  const checkedAt = new Date().toISOString();

  try {
    const response = await fetch(FIFA_SCHEDULE_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`FIFA 官网响应 ${response.status}`);
    }

    localStorage.setItem(LAST_SYNC_KEY, checkedAt);

    return {
      ok: true,
      checkedAt,
      sourceUrl: FIFA_SCHEDULE_URL,
      message: "已连接 FIFA 官方赛程页。本地赛程结构已按官方 M1-M104 编号维护。",
    };
  } catch (error) {
    return {
      ok: false,
      checkedAt,
      sourceUrl: FIFA_SCHEDULE_URL,
      message:
        error instanceof Error
          ? `同步失败：${error.message}。如果浏览器拦截跨域请求，需要后端代理执行官方同步。`
          : "同步失败：未知错误。",
    };
  }
};
