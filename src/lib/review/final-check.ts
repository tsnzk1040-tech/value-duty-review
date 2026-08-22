export type FinalCheckIssue = {
  id: string;
  severity: "error" | "warn";
  message: string;
};

export type FinalCheckResult = {
  ok: boolean;
  issues: FinalCheckIssue[];
};

/** 想いを共有…のあとの所感ブロック（♯リンクの手前・最初の段落） */
export function extractLeaderOpeningFromPost(text: string): string {
  const marker = "想いを共有頂きました";
  const idx = text.indexOf(marker);
  if (idx < 0) return "";
  let rest = text.slice(idx + marker.length).replace(/^[。．\s]+/, "");
  const sharp = rest.search(/\n\s*♯/);
  if (sharp >= 0) rest = rest.slice(0, sharp);
  const para = rest.trim().split(/\n\n+/)[0] ?? "";
  return para.trim();
}

/** 投稿末尾の締め（♯リンクのあと、または所感の次の最終段落） */
export function extractClosingFromPost(text: string): string {
  const t = text.replace(/\r\n/g, "\n").trim();
  const sharpBlocks = [...t.matchAll(/\n♯[^\n]*\nhttps?:\/\/\S+/g)];
  if (sharpBlocks.length > 0) {
    const last = sharpBlocks[sharpBlocks.length - 1]!;
    const after = t.slice(last.index! + last[0].length).trim();
    if (after) return after.split(/\n\n+/)[0]?.trim() ?? after;
  }
  const parts = t.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) return "";
  return parts[parts.length - 1] ?? "";
}

/**
 * 鉤括弧の開き「が抜けている疑い。
 * 閉じ」があるのに、それより前に開き「が無い。
 */
export function textMayMissOpeningKagi(text: string): boolean {
  const s = text.trim();
  if (!s || !s.includes("」")) return false;
  let depth = 0;
  for (const ch of s) {
    if (ch === "「") depth += 1;
    if (ch === "」") {
      if (depth === 0) return true;
      depth -= 1;
    }
  }
  return false;
}

/**
 * 閉じ」に対する開き「が無い箇所へ、「を補う。
 * 挿入位置は文頭（直前の句点・改行の直後／先頭）。
 */
export function repairMissingOpeningKagi(text: string): string {
  if (!textMayMissOpeningKagi(text)) return text;
  let out = "";
  let depth = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    if (ch === "「") {
      depth += 1;
      out += ch;
      continue;
    }
    if (ch === "」") {
      if (depth === 0) {
        let insertAt = 0;
        for (let j = out.length - 1; j >= 0; j -= 1) {
          if (/[。．！？!?\n]/.test(out[j]!)) {
            insertAt = j + 1;
            break;
          }
        }
        while (insertAt < out.length && /[ \t　]/.test(out[insertAt]!)) {
          insertAt += 1;
        }
        out = `${out.slice(0, insertAt)}「${out.slice(insertAt)}」`;
        continue;
      }
      depth -= 1;
      out += ch;
      continue;
    }
    out += ch;
  }
  return out;
}

/** 投稿前の決定論チェック（サブエージェント／人手レビューの下地）。 */
export function checkFinalReviewPost(text: string): FinalCheckResult {
  const issues: FinalCheckIssue[] = [];
  const t = text.replace(/\r\n/g, "\n").trim();

  if (!t) {
    return {
      ok: false,
      issues: [{ id: "empty", severity: "error", message: "本文が空" }],
    };
  }

  const guidelineAbout = t.match(/行動指針について/g) ?? [];
  if (guidelineAbout.length >= 2) {
    issues.push({
      id: "dup-guideline-about",
      severity: "error",
      message:
        "「行動指針について」が複数回ある（定型の二重の可能性）。要約のあいだ文を直して",
    });
  }
  if (/について、という行動指針について/.test(t)) {
    issues.push({
      id: "dup-prefix-phrase",
      severity: "error",
      message: "「〜について、という行動指針について」の重複がある",
    });
  }
  if (/行動指針について、行動指針\s*\d+\s*[-－]/.test(t)) {
    issues.push({
      id: "dup-guideline-code",
      severity: "error",
      message:
        "定型のあとに「行動指針○-①について」が続いてる。コード再掲を消して",
    });
  }

  if ((t.match(/想いを共有頂きました/g) ?? []).length >= 2) {
    issues.push({
      id: "dup-suffix",
      severity: "error",
      message: "「想いを共有頂きました」が複数回ある",
    });
  }

  // ですねは所感・締めで共感として容認。要約・お礼側だけ禁止。
  const preLeader = (() => {
    const marker = "想いを共有頂きました";
    const idx = t.indexOf(marker);
    if (idx < 0) return "";
    return t.slice(0, idx + marker.length);
  })();
  if (
    preLeader &&
    (/ですね/.test(preLeader) || /ますね[。．]/.test(preLeader))
  ) {
    issues.push({
      id: "desune-summary",
      severity: "error",
      message:
        "お礼・要約に「ですね／ますね」がある（所感側は可。要約は事実共有のため直して）",
    });
  }

  if (!/振り返りコメント共有頂きありがとうございます/.test(t)) {
    issues.push({
      id: "missing-thanks",
      severity: "warn",
      message: "お礼定型が見つからない",
    });
  }

  if (!/想いを共有頂きました/.test(t)) {
    issues.push({
      id: "missing-summary-suffix",
      severity: "warn",
      message: "要約の締め「想いを共有頂きました」が見つからない",
    });
  }

  if (!/Value[０-９0-9].*行動指針について/.test(t)) {
    issues.push({
      id: "missing-value-summary",
      severity: "warn",
      message: "Value要約の定型行が見つからない／形が崩れている可能性",
    });
  }

  const leaderOpening = extractLeaderOpeningFromPost(t);
  if (leaderOpening && textMayMissOpeningKagi(leaderOpening)) {
    issues.push({
      id: "leader-missing-kagi",
      severity: "warn",
      message:
        "所感で鉤括弧の開き「が抜けている可能性（」だけある）。文頭の「を足して",
    });
  }

  const closing = extractClosingFromPost(t);
  if (closing && textMayMissOpeningKagi(closing)) {
    issues.push({
      id: "closing-missing-kagi",
      severity: "warn",
      message:
        "締めで鉤括弧の開き「が抜けている可能性（」だけある）。文頭の「を足して",
    });
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { ok: errors.length === 0, issues };
}

/** 定型のあとに出やすい「行動指針3-②について」等の再掲を落とす（改行は維持）。 */
export function stripGuidelineCodeRestate(text: string): string {
  return text
    .replace(/行動指針\s*\d+\s*[-－]\s*[①-⑩０-９0-9]+\s*について、?/g, "")
    .replace(/(?:^|[、,])[^\S\n]*\d+\s*[-－]\s*[①-⑩]\s*について、?/gm, (m) =>
      /^[、,]/.test(m) ? "、" : "",
    )
    .replace(/[^\S\n]{2,}/g, " ")
    .replace(/^[、,。．\s]+/m, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 既に組み立て済みの要約行から、二重定型だけ機械修正する。 */
export function repairDuplicatedGuidelinePhrase(text: string): string {
  return stripGuidelineCodeRestate(
    text
      .replace(
        /の(\d+番目|当該)の行動指針について、(という)?行動指針について、/g,
        "の$1の行動指針について、",
      )
      .replace(
        /の(\d+番目|当該)の行動指針について、行動指針\s*\d+\s*[-－]\s*[①-⑩０-９0-9]+\s*について、?/g,
        "の$1の行動指針について、",
      )
      .replace(/行動指針について、という行動指針について、/g, "行動指針について、")
      .replace(/(行動指針について、)\1+/g, "$1"),
  );
}
