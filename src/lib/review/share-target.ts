import { googleAiModeSearchUrl } from "@/lib/review/google-ai-mode";

export const SHARE_PENDING_KEY = "vdr.share.pending";
/** POST 共有の一時置き。/share-target が読んで消す */
export const SHARE_INCOMING_KEY = "vdr.share.incoming";

export type ShareIntent = "post" | "research";

export type ShareIncoming = {
  title: string;
  text: string;
  url: string;
};

export type PendingShare = {
  intent: ShareIntent;
  title: string;
  text: string;
  /** 調べる用の主URL（あれば） */
  url: string;
};

const URL_RE = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
const BARE_URL_RE = /^https?:\/\/\S+$/i;
const KNOWN_SHARE_KEYS = new Set([
  "title",
  "stitle",
  "text",
  "stext",
  "url",
  "slink",
  "link",
]);

function isBareUrl(value: string): boolean {
  return BARE_URL_RE.test(value.trim());
}

/** 投稿欄向け: 単体URLより本文を優先（WowTalkは title=本文 / text=URL になりがち） */
export function preferPostBody(title: string, text: string): string {
  const t = text.trim();
  const h = title.trim();
  if (t && !isBareUrl(t)) return t;
  if (h && !isBareUrl(h)) return h;
  return t || h;
}

async function entryToText(value: FormDataEntryValue): Promise<string> {
  if (typeof value === "string") return value;
  if (
    value &&
    typeof value === "object" &&
    "text" in value &&
    typeof value.text === "function" &&
    "size" in value &&
    typeof value.size === "number" &&
    value.size > 0 &&
    value.size < 500_000
  ) {
    try {
      const text = await value.text();
      return typeof text === "string" ? text : "";
    } catch {
      return "";
    }
  }
  return "";
}

/** POST の text が File になる共有（チャットアプリ）も拾う */
export async function incomingFromFormData(
  form: FormData,
): Promise<ShareIncoming> {
  let title = "";
  let text = "";
  let url = "";
  const extras: string[] = [];
  for (const [key, value] of form.entries()) {
    const raw = (await entryToText(value)).trim();
    if (!raw) continue;
    const lower = key.toLowerCase();
    if (lower === "title" || lower === "stitle") {
      if (!title) title = raw;
      continue;
    }
    if (lower === "url" || lower === "slink" || lower === "link") {
      if (!url) url = raw;
      continue;
    }
    if (lower === "text" || lower === "stext" || lower === "file") {
      if (!text) text = raw;
      continue;
    }
    if (!KNOWN_SHARE_KEYS.has(lower)) extras.push(raw);
  }
  if (!text && extras.length > 0) text = extras.join("\n\n");
  if (!url) {
    const harvested = extractUrls(title, text, extras.join("\n"))[0];
    if (harvested) url = harvested;
  }
  return { title, text, url };
}

export async function incomingFromRequest(
  request: Request,
): Promise<ShareIncoming> {
  try {
    return fillMissingShareUrl(
      await incomingFromFormData(await request.formData()),
    );
  } catch {
    return { title: "", text: "", url: "" };
  }
}

export function fillMissingShareUrl(incoming: ShareIncoming): ShareIncoming {
  const url = coerceHttpUrl(incoming.url);
  if (url && /^https?:\/\//i.test(url)) {
    return { ...incoming, url };
  }
  const harvested =
    extractUrls(incoming.url, incoming.text, incoming.title)[0] ??
    firstHttpUrl(incoming.text) ??
    firstHttpUrl(incoming.title);
  return {
    ...incoming,
    url: harvested ? coerceHttpUrl(harvested) : url,
  };
}

export function extractUrls(...parts: string[]): string[] {
  const found: string[] = [];
  for (const part of parts) {
    const matches = part.match(URL_RE) ?? [];
    for (const m of matches) {
      found.push(m.replace(/[),.;]+$/g, ""));
    }
    const schemeless = part.match(
      /(?:^|[\s"'<>(])((?:www\.)?google\.[^\s<>"']+)/gi,
    );
    for (const raw of schemeless ?? []) {
      const hostPath = raw.replace(/^[^\w.]+/, "").replace(/[),.;]+$/g, "");
      if (hostPath) found.push(`https://${hostPath}`);
    }
  }
  return [...new Set(found)];
}

export function isGoogleUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === "google.com" ||
      host.endsWith(".google.com") ||
      /(^|\.)google\./.test(host)
    );
  } catch {
    return /google\./i.test(url);
  }
}

const SHARE_QUERY_KEYS = new Set([
  "title",
  "stitle",
  "text",
  "stext",
  "url",
  "slink",
  "link",
]);

function firstHttpUrl(value: string): string {
  const match = value.match(/https?:\/\/[^\s]+/i);
  return match ? match[0].replace(/[),.;]+$/g, "") : "";
}

function coerceHttpUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(www\.)?google\./i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

/** GET の url= が Google の & で壊れたとき、はみ出したクエリを戻す */
function mergeSplitGoogleUrl(params: URLSearchParams, baseUrl: string): string {
  if (!baseUrl || !isGoogleUrl(baseUrl)) return baseUrl;
  try {
    const parsed = new URL(baseUrl);
    for (const [key, value] of params.entries()) {
      if (SHARE_QUERY_KEYS.has(key)) continue;
      if (!parsed.searchParams.has(key)) parsed.searchParams.append(key, value);
    }
    return parsed.toString();
  } catch {
    return baseUrl;
  }
}

/** url が落ちて udm / q だけ残った Google 検索共有を組み立てる */
function reconstructGoogleFromLooseParams(
  params: URLSearchParams,
): string {
  const reserved = SHARE_QUERY_KEYS;
  const loose: [string, string][] = [];
  for (const [key, value] of params.entries()) {
    if (reserved.has(key)) continue;
    loose.push([key, value]);
  }
  if (loose.length === 0) return "";
  const keys = new Set(loose.map(([key]) => key));
  const looksLikeGoogleSearch =
    keys.has("udm") ||
    keys.has("ved") ||
    keys.has("oq") ||
    keys.has("tbm") ||
    (keys.has("q") && (keys.has("hl") || keys.has("gl") || keys.has("source")));
  if (!looksLikeGoogleSearch) return "";
  const parsed = new URL("https://www.google.com/search");
  for (const [key, value] of loose) parsed.searchParams.append(key, value);
  return parsed.toString();
}

export function incomingFromSearchParams(
  params: URLSearchParams,
): ShareIncoming {
  const title =
    params.get("title") ??
    params.get("stitle") ??
    params.get("subject") ??
    "";
  const text =
    params.get("text") ??
    params.get("stext") ??
    params.get("body") ??
    params.get("content") ??
    params.get("message") ??
    "";
  let url = coerceHttpUrl(
    params.get("url") ?? params.get("slink") ?? params.get("link") ?? "",
  );
  const googleBase =
    [url, firstHttpUrl(text), firstHttpUrl(title)].find(
      (candidate) => candidate && isGoogleUrl(candidate),
    ) ?? "";
  if (googleBase) url = mergeSplitGoogleUrl(params, googleBase);
  else {
    const reconstructed = reconstructGoogleFromLooseParams(params);
    if (reconstructed) url = reconstructed;
  }
  return { title, text, url };
}

/** 調べる向け: Google URL を優先して1本だけ */
export function pickResearchUrl(urls: string[], fallback = ""): string {
  if (urls.length === 0) return fallback;
  const google = urls.find(isGoogleUrl);
  return google ?? urls[0] ?? fallback;
}

const CHAT_HINT_RE =
  /振り返りコメント|想いを共有|共有頂き|浸透リレー/;

const THEME_CODE_RE =
  /(?:^|[^\d０-９])[1-6１-６]\s*[-－﹣]\s*(?:[①②③④⑤⑥]|[1-6１-６])(?:[^\d０-９]|$)/;

const REFLECTION_RE =
  /意識した|してみた|できた|感じた|今日は|お客様|取り組|実践|振り返/;

const SEARCH_QUERY_RE = /(?:とは|意味|方法|例|違い|コツ|ポイント)$/;

const DEFINITION_RE = /とは[、,]?|という意味|意味は|について|とは何|って何|refers to/i;

const STRONG_SCORE = 80;
const CLEAR_GAP = 25;

export type ClassifyShareOptions = {
  /** 共有直前のレビュー手順（1=投稿, 3=調べる）。曖昧時の寄せに使う */
  draftStep?: number;
};

function hasThemeCode(body: string): boolean {
  return THEME_CODE_RE.test(body);
}

function looksLikeMemberComment(body: string): boolean {
  return CHAT_HINT_RE.test(body) || hasThemeCode(body);
}

/** Google 検索／AIモードの共有っぽい（チャット定型が無い） */
export function looksLikeSearchResultShare(
  title: string,
  text: string,
  postBody: string,
  urls: string[],
): boolean {
  if (looksLikeMemberComment(postBody) || looksLikeMemberComment(title)) {
    return false;
  }
  const combined = `${title}\n${text}`;
  if (urls.some(isGoogleUrl) || /Google\s*(検索|Search)/i.test(combined)) {
    return true;
  }
  const query = researchQuery(title, text);
  if (query && SEARCH_QUERY_RE.test(query.trim())) return true;
  if (DEFINITION_RE.test(text) || DEFINITION_RE.test(title)) return true;
  if (
    title &&
    text.length > title.length + 8 &&
    text.startsWith(title.slice(0, Math.min(title.length, 12)))
  ) {
    return true;
  }
  if (
    title &&
    text &&
    title === text &&
    title.length < 60 &&
    !REFLECTION_RE.test(text)
  ) {
    return true;
  }
  return false;
}

function scoreShare(
  input: ShareIncoming,
  urls: string[],
  postBody: string,
  title: string,
  text: string,
  options?: ClassifyShareOptions,
): { post: number; research: number } {
  let post = 0;
  let research = 0;
  const combined = `${title}\n${text}`;
  const searchLike = looksLikeSearchResultShare(title, text, postBody, urls);

  if (
    looksLikeMemberComment(postBody) ||
    looksLikeMemberComment(title) ||
    looksLikeMemberComment(text)
  ) {
    post += STRONG_SCORE;
  }

  if (urls.some(isGoogleUrl) || isGoogleUrl(input.url.trim())) {
    research += STRONG_SCORE;
  }
  if (/Google\s*(検索|Search)/i.test(combined)) {
    research += STRONG_SCORE;
  }
  if (searchLike) {
    research += 50;
  }
  if (DEFINITION_RE.test(text) || DEFINITION_RE.test(title)) {
    research += 25;
  }

  if (!searchLike || looksLikeMemberComment(postBody)) {
    if (postBody.length >= 40) post += 20;
    else if (postBody.length >= 20) post += 10;
    if (/\n/.test(postBody)) post += 25;
  }
  if (REFLECTION_RE.test(postBody)) post += 15;
  if (/さん、/.test(postBody)) post += 20;
  if (urls.length > 0 && !urls.some(isGoogleUrl)) post += 25;

  const query = researchQuery(title, text);
  if (query && SEARCH_QUERY_RE.test(query.trim())) research += 20;
  if (
    title &&
    text &&
    (title === text || text.startsWith(title)) &&
    title.length < 60
  ) {
    research += 15;
  }
  if (
    postBody.length > 0 &&
    postBody.length < 25 &&
    !/\n/.test(postBody) &&
    !looksLikeMemberComment(postBody)
  ) {
    research += 20;
  }
  if (
    text.length >= 80 &&
    /\n/.test(text) &&
    !looksLikeMemberComment(postBody) &&
    !REFLECTION_RE.test(postBody) &&
    (title.length < 50 || text.startsWith(title))
  ) {
    research += 60;
  }

  if (options?.draftStep === 3) research += 40;
  if (options?.draftStep === 1) post += 20;

  return { post, research };
}

function researchQuery(title: string, text: string): string {
  const strippedTitle = title.replace(/\s*[-–—]\s*Google\s*検索\s*$/i, "").trim();
  if (strippedTitle && strippedTitle.length < 80 && !isBareUrl(strippedTitle)) {
    return strippedTitle;
  }
  const firstLine = text
    .split(/\n/)[0]
    ?.replace(/\s*[-–—]\s*Google\s*検索\s*$/i, "")
    .trim() ?? "";
  if (firstLine && firstLine.length < 80 && !isBareUrl(firstLine)) {
    return firstLine;
  }
  return (strippedTitle || firstLine).slice(0, 80);
}

export function resolveResearchUrl(
  classified: ReturnType<typeof classifyShare>,
  input: ShareIncoming,
): string {
  const found = pickResearchUrl(
    classified.urls,
    coerceHttpUrl(input.url.trim()),
  );
  if (found && /^https?:\/\//i.test(found)) return found;
  const harvested =
    extractUrls(input.url, input.text, input.title)[0] ??
    firstHttpUrl(input.text) ??
    firstHttpUrl(input.title);
  if (harvested && /^https?:\/\//i.test(coerceHttpUrl(harvested))) {
    return coerceHttpUrl(harvested);
  }
  const query = (classified.researchLabel || classified.postBody || input.title || input.text)
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s*[-–—]\s*Google\s*検索\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (query) return googleAiModeSearchUrl(query.slice(0, 120));
  return googleAiModeSearchUrl("検索");
}

export function researchUrlFromPending(pending: {
  title: string;
  text: string;
  url: string;
}): string {
  const direct = pending.url.trim();
  if (direct && /^https?:\/\//i.test(direct)) return direct;
  const harvested =
    extractUrls(pending.url, pending.text, pending.title)[0] ??
    firstHttpUrl(pending.text) ??
    firstHttpUrl(pending.title);
  if (harvested) return coerceHttpUrl(harvested);
  const query = (pending.title || pending.text)
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s*[-–—]\s*Google\s*検索\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (query) return googleAiModeSearchUrl(query.slice(0, 120));
  return "";
}

export function classifyShare(
  input: ShareIncoming,
  options?: ClassifyShareOptions,
): {
  suggested: ShareIntent;
  /** 両方あり得るときユーザーに選ばせる */
  ambiguous: boolean;
  urls: string[];
  /** 投稿欄向け本文 */
  postBody: string;
  /** 調べるフォーカス／♯向け短文 */
  researchLabel: string;
} {
  const title = input.title.trim();
  const text = input.text.trim();
  const urlField = coerceHttpUrl(input.url.trim());
  const urls = extractUrls(
    urlField && /^https?:\/\//i.test(urlField) ? urlField : "",
    text,
    title,
  );

  const postBody = preferPostBody(title, text);
  const query = researchQuery(title, text);
  let researchLabel = query;
  if (!researchLabel) {
    let stripped = text;
    for (const u of urls) stripped = stripped.replace(u, "");
    researchLabel =
      stripped.replace(/\s+/g, " ").trim().slice(0, 80) || urls[0] || "共有リンク";
  }

  const resolvedUrls =
    urls.length > 0
      ? urls
      : urlField && isGoogleUrl(urlField)
        ? [urlField]
        : urls;

  const hasGoogle = resolvedUrls.some(isGoogleUrl);
  const substantialPost =
    postBody.length >= 80 && !isBareUrl(postBody) && !looksLikeMemberComment(postBody);
  const searchLike = looksLikeSearchResultShare(
    title,
    text,
    postBody,
    resolvedUrls,
  );

  if (
    options?.draftStep === 3 &&
    !looksLikeMemberComment(postBody) &&
    !looksLikeMemberComment(title)
  ) {
    return {
      suggested: "research",
      ambiguous: false,
      urls: resolvedUrls,
      postBody,
      researchLabel,
    };
  }

  if (searchLike && !looksLikeMemberComment(postBody)) {
    return {
      suggested: "research",
      ambiguous: false,
      urls: resolvedUrls,
      postBody,
      researchLabel,
    };
  }

  if (hasGoogle && substantialPost && looksLikeMemberComment(postBody)) {
    return {
      suggested: "research",
      ambiguous: true,
      urls: resolvedUrls,
      postBody,
      researchLabel,
    };
  }

  const scores = scoreShare(input, resolvedUrls, postBody, title, text, options);
  const maxScore = Math.max(scores.post, scores.research);
  const suggested: ShareIntent =
    scores.post >= scores.research ? "post" : "research";

  const ambiguous =
    maxScore < STRONG_SCORE &&
    Math.abs(scores.post - scores.research) < CLEAR_GAP &&
    !searchLike;

  return {
    suggested,
    ambiguous,
    urls: resolvedUrls,
    postBody,
    researchLabel,
  };
}

export function buildPendingShare(
  intent: ShareIntent,
  input: ShareIncoming,
  classified: ReturnType<typeof classifyShare>,
): PendingShare {
  return {
    intent,
    title: input.title.trim(),
    text: intent === "post" ? classified.postBody : classified.researchLabel,
    url:
      intent === "research"
        ? resolveResearchUrl(classified, input)
        : (classified.urls[0] ?? input.url.trim()),
  };
}

export function writePendingShare(payload: PendingShare): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SHARE_PENDING_KEY, JSON.stringify(payload));
}

export function consumePendingShare(): PendingShare | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SHARE_PENDING_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(SHARE_PENDING_KEY);
    const parsed = JSON.parse(raw) as PendingShare;
    if (parsed.intent !== "post" && parsed.intent !== "research") return null;
    return {
      intent: parsed.intent,
      title: parsed.title ?? "",
      text: parsed.text ?? "",
      url: parsed.url ?? "",
    };
  } catch {
    return null;
  }
}

export function hasShareIncoming(input: ShareIncoming): boolean {
  return Boolean(
    input.title.trim() || input.text.trim() || input.url.trim(),
  );
}

/** POST 受け口が置いた一時データ。読んだら消す。 */
export function consumeShareIncoming(): ShareIncoming | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SHARE_INCOMING_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(SHARE_INCOMING_KEY);
    const parsed = JSON.parse(raw) as Partial<ShareIncoming>;
    const incoming: ShareIncoming = {
      title: typeof parsed.title === "string" ? parsed.title : "",
      text: typeof parsed.text === "string" ? parsed.text : "",
      url: typeof parsed.url === "string" ? parsed.url : "",
    };
    return hasShareIncoming(incoming) ? incoming : null;
  } catch {
    return null;
  }
}
