import {
  summaryPrefix,
  summarySuffix,
  valueHeadingForLabel,
} from "@/lib/review/theme-meta";

export type SummaryGenerateInput = {
  sourcePost: string;
  themeLabel: string;
  lens: string;
};

/** Gemini には「あいだの文」だけ出させる。定型の枠はアプリが付ける。 */
export function buildSummaryInstructions(input: SummaryGenerateInput): string {
  const lens = input.lens.trim()
    ? `観点メモ（任意）: ${input.lens.trim()}`
    : "観点メモ: なし";
  const heading = valueHeadingForLabel(input.themeLabel);

  return [
    "あなたは職場のグループチャット向けに、リーダーが返す要約文の「中身」を書く助手です。",
    "体裁はリーダーの理解の共有。目的は、投稿者が今日「企業理念の浸透リレー」を実践した事実を、メンバーに見える化すること。",
    "評価や「今日も一歩進んだ」実感の言葉は所感パートの仕事なので、要約には書かない。",
    "",
    "【トーン】",
    "- リーダーが理解した内容として、実践の事実を淡々と見せる。褒め・盛り・大げさな評価語は控える。",
    "- 堅い報告書にも、カジュアルな話し言葉にもしない。同僚向けの落ち着いたです・ます。",
    "- 「だね」「だよ」「ですね」「ね。」「！！」は使わない（「〜ですね。」も禁止）。上から目線・皮肉・減点も禁止。",
    "- 「考察した」「定義した」より、「〜と捉えて」「〜してみた」「〜したい」を優先。",
    "- 「調べた」「試した」などの事実は省略しない（評価は薄く、事実は残す）。",
    "",
    "【分量・中身】",
    "- 出力は言い換え本文のみ。2〜3文相当、だいたい120〜180字（日本語）。短く洗練させる。",
    "- できれば次を含める: ①理解を深めたポイント ②自分に取り入れた／試した具体（必要なら次に試したいことを薄く）",
    "- 文末は「〜してみた」「〜したい」「〜ていて」などで止め、です・ます・ね・だね・ですねで終わらない。",
    "- 文末に「共有」「想いを共有」「のが伝わる」「という気づき」「という実践です」を自分で書かない。",
    "- 短すぎ（目安120字未満）や薄い抽象は不合格。長すぎて所感めいた解説を足すのも不合格。",
    "",
    "【読み手・現場の前提（出力には書かない）】",
    "- 書き手・読み手は管理本部。お客様と直接接点がある現場ではなく、専門性で現場に寄り添い後方支援するのがミッション。",
    "- この前提は解釈のガイドだけ。要約本文に「管理本部として〜」「後方支援する立場でも〜」など自己紹介・所感コメントを書かない。",
    "- 投稿の具体を、間接部門でも通じる言動（約束・返答・配慮など）として淡々と整理する。",
    "",
    "【理念浸透リレーとして特に拾う（重要）】",
    "- 投稿者の「自分ごと化」の痕跡＝リレー実践の事実。あれば要約で必ず触れる:",
    "  - 言葉や意味を調べる／定義を確かめるなど、理解を深めようとしたこと",
    "  - 自分の言動に取り入れようとした・試した具体アクション",
    "- 例: 「誠実」を調べて意味を広げた → 正直さだけでなく思いやり・約束まで含めて捉えた、と取り上げる",
    "- 投稿に「調べた」「調べてみると」等があれば、要約の前半でその行為を事実として必ず書く（結果の言い換えだけにしない）",
    "- 調べただけで終わらず、今日どう実践したか（または明日どう試したいか）もセットで拾えるとよい",
    "",
    "【絶対に書かない】",
    "  - Value帯の名称（例: Value６　妥協なき信念、貫くは正道）",
    "  - 「○番目の行動指針について」／「想いを共有頂きました」",
    "  - 行動指針コードや指針の全文（例: 6-④…）",
    "  - お礼・定型挨拶（「ありがとう」「本日／今日の振り返りです」など。お礼パートの仕事）",
    "  - 「一歩前進」「浸透が進んだ」「良い循環」など実感・評価フレーズ（所感の仕事）",
    "  - 「ですね」「〜ですね。」などの語尾",
    "  - 次回テーマ／担当／箇条書き／前置き説明",
    "",
    "【良い例（分量・洗練の参考・中身は仮）】",
    "誠実という言葉を自分で調べて、正直さだけでなく思いやりや約束を守ることまで含めて捉え直していて、今日は関係者への返答を曖昧にせず期限どおり返すことを意識し、明日も同じ基準で返答してみたい",
    "",
    "【悪い例】",
    `${heading} の想い`,
    "今日の振り返り、ありがとうございます、誠実さについて考えた",
    "誠実さについて考えた一日",
    "指針を意識して過ごした",
    "思いやりまで含めて捉えていますね。",
    "今日も浸透リレーが一歩前進した",
    "できないで終わらせず一次回答できたという実践です、調べながら進めたという気づき",
    "管理本部として現場を後方支援する立場でも信頼が大事だという整理",
    "店舗でお客様に感動を届けた素晴らしい接客だった",
    "",
    "【入力】",
    `今日の枠の識別用（出力に書かない）: ${input.themeLabel}`,
    `Value帯名（出力に書かない）: ${heading}`,
    lens,
    "投稿本文:",
    input.sourcePost.trim() || "（なし）",
  ].join("\n");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** モデルが出した「あいだ」だけを掃除。 */
export function extractSummaryBody(raw: string, themeLabel: string): string {
  let body = raw.replace(/\r\n/g, "\n").trim();
  body = body.replace(/^```(?:\w+)?\n?/, "").replace(/\n?```$/, "").trim();
  body = body.replace(/^["「]|["」]$/g, "").trim();

  const prefix = summaryPrefix(themeLabel);
  const suffix = summarySuffix();
  const heading = valueHeadingForLabel(themeLabel);

  if (body.startsWith(prefix)) body = body.slice(prefix.length).trim();
  body = body.replace(new RegExp(`${escapeRegExp(suffix)}$`), "").trim();
  body = body.replace(/想いを共有頂きました。?/g, "").trim();
  body = body.replace(/^Value[０-９0-9]\s*[　 ].*?について、?/g, "");
  body = body.replace(new RegExp(escapeRegExp(heading), "g"), "");
  body = body.replace(/の\d+番目の行動指針について、?/g, "");

  const fullLabel = themeLabel.trim();
  if (fullLabel) body = body.split(fullLabel).join("");
  const withoutCode = fullLabel.replace(/^\d+\s*[-－]\s*[①-⑩]\s*/, "").trim();
  if (withoutCode.length >= 8) body = body.split(withoutCode).join("");
  body = body.replace(/^\d+\s*[-－]\s*[①-⑩]\s*/g, "");

  return body.replace(/^[,、。\s]+|[,、。\s]+$/g, "").replace(/\s{2,}/g, " ").trim();
}

export function isWeakSummaryBody(body: string, themeLabel: string): boolean {
  if (body.length < 70) return true;
  const heading = valueHeadingForLabel(themeLabel);
  if (heading && body.includes(heading)) return true;
  if (/^Value[０-９0-9]/.test(body)) return true;
  if (themeLabel.trim() && body.includes(themeLabel.trim())) return true;
  if (/管理本部として|後方支援する立場/.test(body)) return true;
  if (/一歩前進|浸透が進んだ|良い循環/.test(body)) return true;
  if (/ありがとう|(本日|今日)の振り返り/.test(body)) return true;
  if (/ですね/.test(body)) return true;
  return false;
}

/** 投稿にある「調べた」等の事実が要約から落ちていたら、軽く補う。 */
export function ensurePenetrationFacts(body: string, sourcePost: string): string {
  let out = body;
  const src = sourcePost;
  if (/調べ/.test(src) && !/調べ|検索|意味を(確かめ|確認)|定義を/.test(out)) {
    out = `言葉の意味を自分で調べたうえで、${out}`;
  }
  return out;
}

function polishSummaryMid(mid: string): string {
  let out = mid;
  out = out.replace(/[「」『』"']/g, "");
  // お礼・定型の混入を落とす
  out = out.replace(/^(本日の|今日の)?振り返り(です|コメント)?[、,。．]?\s*/g, "");
  out = out.replace(/^ありがとう(ございます)?[、,。．]?\s*/g, "");
  out = out.replace(/[、,。．]?\s*ありがとう(ございます)?[、,。．]?\s*/g, "、");
  out = out.replace(/(本日の|今日の)振り返り(です|コメント)?[、,。．]?\s*/g, "");
  // 「〜ていますね。」を先に落とす（「ですね」だけ消すと「捉えていま」になる）
  out = out.replace(/ていますね[。．]?/g, "ていて、");
  out = out.replace(/していますね[。．]?/g, "していて、");
  out = out.replace(/ますね[。．]?/g, "、");
  out = out.replace(/ですね[。．]?/g, "、");
  out = out.replace(/ですよ[。．]?/g, "、");
  out = out.replace(/です(?=[、,。．])/g, "");
  out = out.replace(/[、,]{2,}/g, "、");
  out = out.replace(/[。．]{2,}/g, "。");
  out = out.replace(/[。．！？]$/, "").replace(/[、,]$/, "");
  out = out.replace(/(という内容|とのこと)$/, "");
  out = out.replace(/共有の想い$/, "");
  out = out.replace(/(という)?(前向きな|実践の)?共有$/, "");
  out = out.replace(/の共有$/, "");
  out = out.replace(/という前向きな$/, "という");
  out = out.replace(/という振り返り$/, "");
  out = out.replace(/という整理に繋がり$/, "");
  out = out.replace(/という整理$/, "");
  out = out.replace(/という気づき$/, "");
  out = out.replace(/という実践です$/, "という実践");
  out = out.replace(
    /(と感じ(ます|た)?|振り返り|理解を深めています|しています|ています|です|でした|ます|ました|だった|である|だね|だよ|よね|のが伝わる)$/,
    "",
  );
  out = out.replace(
    /[。．]?管理本部として[^。．]*?(?:という整理|につながる|になる)[^。．]*/g,
    "",
  );
  out = out.replace(/[。．]?お客様と直接接しない管理本部[^。．]*/g, "");
  out = out.replace(/[、,]$/, "");
  out = out.replace(/という$/, "");
  out = out.replace(/。+/g, "、");
  out = out.replace(/[、,]{2,}/g, "、");
  out = out.replace(/^[,、。\s]+|[,、。\s]+$/g, "");
  // 「実践の想いを共有」は自然。「気づきの想い」はくどいので の を足さない
  if (/(日|こと|実践)$/.test(out)) out = `${out}の`;
  return out.trim();
}

/** 定型枠＋本文。本文が弱いときは null。 */
export function assembleSummary(
  rawBody: string,
  themeLabel: string,
  sourcePost = "",
): string | null {
  let mid = extractSummaryBody(rawBody, themeLabel);
  if (sourcePost) mid = ensurePenetrationFacts(mid, sourcePost);
  mid = polishSummaryMid(mid);
  if (isWeakSummaryBody(mid, themeLabel)) return null;
  return `${summaryPrefix(themeLabel)}${mid}${summarySuffix()}`;
}
