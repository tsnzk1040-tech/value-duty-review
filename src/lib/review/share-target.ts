/** PWA Web Share Target → レビュー画面への橋渡し */

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

export function incomingFromSearchParams(
  params: URLSearchParams,
): ShareIncoming {
  return {
    title: params.get("title") ?? params.get("stitle") ?? "",
    text: params.get("text") ?? params.get("stext") ?? "",
    url: params.get("url") ?? params.get("slink") ?? params.get("link") ?? "",
  };
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
  return { title, text, url };
}

export function extractUrls(...parts: string[]): string[] {
  const found: string[] = [];
  for (const part of parts) {
    const matches = part.match(URL_RE) ?? [];
    for (const m of matches) {
      found.push(m.replace(/[),.;]+$/g, ""));
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

/** 調べる向け: Google URL を優先して1本だけ */
export function pickResearchUrl(urls: string[], fallback = ""): string {
  if (urls.length === 0) return fallback;
  const google = urls.find(isGoogleUrl);
  return google ?? urls[0] ?? fallback;
}

export function classifyShare(input: ShareIncoming): {
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
  const urlField = input.url.trim();
  const urls = extractUrls(
    urlField && /^https?:\/\//i.test(urlField) ? urlField : "",
    text,
    title,
  );

  const postBody = preferPostBody(title, text);
  let researchLabel = title;
  if (!researchLabel) {
    let stripped = text;
    for (const u of urls) stripped = stripped.replace(u, "");
    researchLabel =
      stripped.replace(/\s+/g, " ").trim() || urls[0] || "共有リンク";
  }

  // Google検索の共有だけ調べるへ。WowTalk等の本文＋permalinkは投稿欄へ。
  const hasGoogle = urls.some(isGoogleUrl);
  return {
    suggested: hasGoogle ? "research" : "post",
    ambiguous: false,
    urls,
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
        ? pickResearchUrl(classified.urls, input.url.trim())
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
