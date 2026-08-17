/**
 * パスキー登録済みの Android Chrome では、navigator.clipboard も
 * textarea への focus も Credential Manager（パスキーと同じシート）に
 * 繋がることがある。通勤コピーは Web Share を本線にする。
 */

export type CopyOrShareResult = "shared" | "copied" | "aborted" | "failed";

export function prefersShareSheet(): boolean {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.share !== "function") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export async function shareText(
  text: string,
): Promise<"shared" | "aborted" | "unavailable"> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return "unavailable";
  }
  try {
    if (navigator.canShare && !navigator.canShare({ text })) {
      return "unavailable";
    }
    await navigator.share({ text });
    return "shared";
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return "aborted";
    return "unavailable";
  }
}

/** PC 向け。フォーム部品・focus は使わない。スマホでは呼ばない。 */
export function copyText(text: string): boolean {
  if (typeof document === "undefined") return false;
  const pre = document.createElement("pre");
  pre.textContent = text;
  pre.setAttribute("aria-hidden", "true");
  pre.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;margin:0;padding:0;opacity:0;pointer-events:none;white-space:pre;";
  document.body.appendChild(pre);

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(pre);
  selection?.removeAllRanges();
  selection?.addRange(range);

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }

  selection?.removeAllRanges();
  document.body.removeChild(pre);
  return ok;
}

/**
 * スマホ: 共有シートのみ（クリップボードに載せない）。
 * PC: 選択コピー。失敗時は呼び出し側で長押しを案内する。
 */
export async function copyOrShare(text: string): Promise<CopyOrShareResult> {
  if (prefersShareSheet()) {
    const result = await shareText(text);
    if (result === "shared") return "shared";
    if (result === "aborted") return "aborted";
    return "failed";
  }
  return copyText(text) ? "copied" : "failed";
}

export function copyOrShareHint(result: CopyOrShareResult, copiedOk: string): string {
  if (result === "shared") {
    return "共有シートを開いた。WowTalk 等を選んで。クリップボードは使っていない";
  }
  if (result === "copied") return copiedOk;
  if (result === "aborted") {
    return "共有をやめた。パスキー回避のためクリップボードには載せない。下のテキストを長押ししてコピーできる";
  }
  return "送れなかった。下のテキストを長押ししてコピーして";
}
