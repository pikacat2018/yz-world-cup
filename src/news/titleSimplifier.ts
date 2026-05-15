const LEADING_SOURCE_PATTERN =
  /^(?:官方|记者|罗马诺|here\s*we\s*go|重磅|突发|独家|确认)\s*[：:]\s*/i;

const EMOTIONAL_PREFIX_PATTERN =
  /^(?:太强了|什么水平|真要来了|届时[^！!。；;，,]*岁)\s*[！!。；;，,]\s*/;

const AGE_PATTERN = /(?:\d+\s*岁|[零〇一二两三四五六七八九十百]+\s*岁)/g;

const cleanupSpaces = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .replace(/\s*([，。！？；：、,.!?:;])\s*/g, "$1")
    .trim();

const removeLeadingNoise = (value: string) => {
  let next = value;

  for (let index = 0; index < 6; index += 1) {
    const cleaned = next.replace(EMOTIONAL_PREFIX_PATTERN, "").replace(LEADING_SOURCE_PATTERN, "");
    if (cleaned === next) break;
    next = cleaned.trim();
  }

  return next;
};

const removeNoisyColonPrefix = (value: string) => {
  const colonIndex = value.search(/[：:]/);
  if (colonIndex < 0 || colonIndex > 18) return value;

  const prefix = value.slice(0, colonIndex).trim();
  const rest = value.slice(colonIndex + 1).trim();
  if (!rest) return value;

  if (/^(?:官方|记者|罗马诺|here\s*we\s*go|重磅|突发|独家|确认)$/i.test(prefix)) return rest;
  if (prefix.length <= 8 && /[!！?？]|消息|快讯|曝|称|宣布|确认/.test(prefix)) return rest;

  return value;
};

const trimLongTitle = (value: string) => {
  if (value.length <= 36) return value;

  const firstClause = value.split(/[，。；;、]/)[0]?.trim();
  if (firstClause && firstClause.length >= 12 && firstClause.length <= 36) return firstClause;

  return `${value.slice(0, 34)}…`;
};

export function simplifyNewsTitle(title: string): string {
  const original = cleanupSpaces(title);
  if (!original) return title;

  let simplified = original
    .replace(/^[【\[][^】\]]+[】\]]\s*/, "")
    .replace(/届时[^！!。；;，,]*岁[！!。；;，,]?/g, "")
    .trim();

  simplified = removeLeadingNoise(simplified);
  simplified = removeNoisyColonPrefix(simplified);
  simplified = removeLeadingNoise(simplified);
  simplified = simplified
    .replace(AGE_PATTERN, "")
    .replace(/([\u4e00-\u9fa5A-Za-z0-9])和([\u4e00-\u9fa5A-Za-z0-9])/g, "$1与$2")
    .replace(/[，,]\s*$/, "");

  simplified = trimLongTitle(cleanupSpaces(simplified));

  return simplified || original;
}
