export type FinalCheckIssue = {
  id: string;
  severity: "error" | "warn";
  message: string;
};

export type FinalCheckResult = {
  ok: boolean;
  issues: FinalCheckIssue[];
};

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

  // 定型の二重
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

  if ((t.match(/想いを共有頂きました/g) ?? []).length >= 2) {
    issues.push({
      id: "dup-suffix",
      severity: "error",
      message: "「想いを共有頂きました」が複数回ある",
    });
  }

  if (/ですね/.test(t) || /ますね[。．]/.test(t)) {
    issues.push({
      id: "desune",
      severity: "error",
      message: "「ですね／ますね」が残っている",
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

  const errors = issues.filter((i) => i.severity === "error");
  return { ok: errors.length === 0, issues };
}

/** 既に組み立て済みの要約行から、二重定型だけ機械修正する。 */
export function repairDuplicatedGuidelinePhrase(text: string): string {
  return text
    .replace(/の(\d+番目|当該)の行動指針について、(という)?行動指針について、/g, "の$1の行動指針について、")
    .replace(/行動指針について、という行動指針について、/g, "行動指針について、")
    .replace(/(行動指針について、)\1+/g, "$1");
}
