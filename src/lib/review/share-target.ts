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

  const postBody = text || title;
  let researchLabel = title;
  if (!researchLabel) {
    let stripped = text;
    for (const u of urls) stripped = stripped.replace(u, "");
    researchLabel =
      stripped.replace(/\s+/g, " ").trim() || urls[0] || "共有リンク";
  }

  if (urls.length === 0) {
    return {
      suggested: "post",
      ambiguous: false,
      urls,
      postBody,
      researchLabel,
    };
  }

  // URL付きで本文が短い＝検索結果・ページ共有寄り
  if (postBody.length < 180) {
    return {
      suggested: "research",
      ambiguous: false,
      urls,
      postBody,
      researchLabel,
    };
  }

  // URL＋長文＝チャット全文か、リンク付き長文。選ばせる
  return {
    suggested: "post",
    ambiguous: true,
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
