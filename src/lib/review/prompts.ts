import {
  CLOSING_VARIATIONS,
  stripTrailingClosingVariation,
} from "@/lib/review/closing";
import { stripGuidelineCodeRestate } from "@/lib/review/final-check";
import { buildCreedAlignmentBlock } from "@/lib/creed/corporate-creed";
import { buildHumanVoiceBlock } from "@/lib/review/human-voice";
import {
  summaryPrefix,
  summarySuffix,
  valueHeadingForLabel,
} from "@/lib/review/theme-meta";

export type SummaryGenerateInput = {
  sourcePost: string;
  themeLabel: string;
  lens: string;
  /** 同テーマ／同担当の過去レビュー要旨（任意） */
  historyNotes?: string;
};

/** 要約2案の密度。あっさり＝短く／こってり＝同じ事実を厚く。 */
export type SummaryFlavor = "light" | "rich";

export function summaryFlavorLabel(flavor: SummaryFlavor): string {
  return flavor === "light" ? "あっさり" : "こってり";
}

const SUMMARY_SENTENCE_END_RULE = [
  "- 途中の文は紹介する丁寧語で結ぶ。「〜ていた。」「〜した。」の常体で終えない。",
  "- 文末の動詞は、その文が書いた投稿の行為に合わせる。調べたなら「調べていました。」試したなら「試していました。」返した・確認した・声をかけた・言葉にした、も投稿どおり。",
  "- 「捉えなおしていました」「捉え直していました」「と捉えていました」は、投稿自身が意味の見直し・捉え直しを書いているときだけ。それ以外の日の定型にしない。",
  "- 呼び名（「○○さんが」）は書かない。お礼ですでに出る。",
  "- 自然さは動詞の選び方だけ。温度を出すために事実を別の行為へ言い換えない。投稿に無い「しっかり」「深く」「丁寧に」などの程度も足さない。",
  "- 最後の文だけは句点を付けず「〜してみたいという」「〜を大切にしたいという」のように止める（アプリが「想いを共有頂きました！」を続ける）。ね・だね・ですねは使わない。",
].join("\n");

function summaryLengthBlock(flavor: SummaryFlavor): string {
  if (flavor === "light") {
    return [
      "【分量・中身（あっさり版）】",
      "- 出力は言い換え本文のみ。だいたい1〜2文、70〜100字（日本語）。",
      "- 核は実践の一点を前面に（調べた／試したのどちらかが主でよい）。もう一方は短く触れてよいが、両方を同量にしない。",
      "- 場面の細部・次に試したいことは厚くしない（半文までなら可）。",
      "- 文の区切りは「。」を使う。一文が終わったら「、」ではなく「。」。全部を「、」でつながない。",
      SUMMARY_SENTENCE_END_RULE,
      "- 文末に「共有」「想いを共有」「のが伝わる」「という気づき」「という実践です」を自分で書かない。",
      "- 短すぎ（目安70字未満）や薄い抽象は不合格。所感めいた解説を足すのも不合格。",
    ].join("\n");
  }
  return [
    "【分量・中身（こってり版）】",
    "- 出力は言い換え本文のみ。だいたい2〜3文、150〜210字（日本語）。",
    "- 調べた／試したの両方に触れられるとよい。同じ事実を、誰・何・どうしたが見える程度まで厚くする。",
    "- 次に試したいことは薄くて可。投稿に無い場面・推測で水増ししない。",
    "- 文の区切りは「。」を使う。一文が終わったら「、」ではなく「。」。全部を「、」でつながない。",
    SUMMARY_SENTENCE_END_RULE,
    "- 文末に「共有」「想いを共有」「のが伝わる」「という気づき」「という実践です」を自分で書かない。",
    "- 短すぎ（目安150字未満）や薄い抽象は不合格。投稿に無いことを足して伸ばすのも不合格。",
  ].join("\n");
}

function summaryFlavorBlock(flavor: SummaryFlavor): string {
  if (flavor === "light") {
    return [
      "【この案の味（あっさり・マイルド）】",
      "- 投稿の事実を、すっきり短く言い換える。語順は投稿に近づけてよい。",
      "- 主役は一点。二点目は添え物まで。飾り・一般論は削る。",
      "- 投稿に無い場面・推測は足さない。",
    ].join("\n");
  }
  return [
    "【この案の味（こってり・マイルド）】",
    "- 投稿にある事実だけを使う。書いていない場面・行為・推測は足さない。",
    "- あっさりより場面が追える程度に厚くする（盛り・評価はしない）。",
    "- 同じ事実の「調べた→試した」の流れが見えるとよい。",
  ].join("\n");
}

/** Gemini には「あいだの文」だけ出させる。定型の枠はアプリが付ける。 */
export function buildSummaryInstructions(
  input: SummaryGenerateInput,
  flavor: SummaryFlavor = "rich",
): string {
  const lens = input.lens.trim()
    ? [
        "観点メモ（要約を厚くする指示・必ず反映）:",
        input.lens.trim(),
        "この観点で、投稿のどの具体を前面に出すかを厚くする。所感・提案は書かない。",
      ].join("\n")
    : "観点メモ: なし（投稿の実践事実を定型どおり）";
  const heading = valueHeadingForLabel(input.themeLabel);
  const history = input.historyNotes?.trim()
    ? [
        "【過去レビュー（同テーマ／同担当・ソフト重複の材料）】",
        "- 今日の投稿の事実を優先。過去の言い回しを丸写ししない。",
        "- 同じ型の要約になりそうなら、今日の固有の実践を前面に出す。",
        "- 過去との連続が見える場合だけ、薄い一言で触れてもよい（必須ではない）。",
        input.historyNotes.trim(),
        "",
      ].join("\n")
    : "";

  return [
    "あなたは職場のグループチャット向けに、リーダーが返す要約文の「中身」を書く助手です。",
    "体裁はリーダーの理解の共有。目的は、投稿者が今日「企業理念の浸透リレー」を実践した事実を、メンバーに見える化すること。",
    "評価や「今日も一歩進んだ」実感の言葉は所感パートの仕事なので、要約には書かない。",
    "",
    "【トーン】",
    "- リーダーが理解した内容として、実践の事実を淡々と見せる。褒め・盛り・大げさな評価語は控える。",
    "- 目線は、リーダーが投稿者の実践を他のメンバーに紹介する立場。したことは投稿の動詞のまま、丁寧語で伝える。",
    "- 堅い報告書にも、カジュアルな話し言葉にもしない。同僚向けの落ち着いたです・ます。",
    "- 「だね」「だよ」「ですね」「ね。」「！！」は使わない（「〜ですね。」も禁止）。上から目線・皮肉・減点も禁止。",
    "- 投稿の動詞を丁寧語にする。投稿に無い「捉えなおす」へまとめない。",
    "- 「調べた」「試した」などの事実は省略しない（評価は薄く、事実は残す）。",
    "- 文が二つ以上なら「。」で区切る。「、」だけで長くつながない（読点だらけにしない）。",
    "",
    buildHumanVoiceBlock("summary"),
    "",
    summaryLengthBlock(flavor),
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
    "- 例: 投稿が「誠実」を調べ、正直さだけでなく思いやりや約束まで含めると書いたときだけ、その範囲をそのまま書く。投稿に無い捉え直しは足さない",
    "- 投稿に「調べた」「調べてみると」等があれば、要約の前半でその行為を事実として必ず書く（結果の言い換えだけにしない）",
    "- 調べただけで終わらず、今日どう実践したか（または明日どう試したいか）もセットで拾えるとよい",
    "",
    "【絶対に書かない】",
    "  - Value帯の名称（例: Value６　妥協なき信念、貫くは正道）",
    "  - 「○番目の行動指針について」／「という行動指針について」／「想いを共有頂きました」",
    "  - 行動指針コードや指針の全文（例: 6-④…／「行動指針3-②について」）",
    "  - お礼・定型挨拶（「ありがとう」「本日／今日の振り返りです」など。お礼パートの仕事）",
    "  - 「一歩前進」「浸透が進んだ」「良い循環」など実感・評価フレーズ（所感の仕事）",
    "  - 「ですね」「〜ですね。」などの語尾",
    "  - 次回テーマ／担当／箇条書き／前置き説明",
    "",
    "【良い例（分量の参考。中身は仮。文末は投稿の行為に合わせ、毎回同じにしない）】",
    "誠実という言葉を自分で調べていました。今日は関係者への返答を曖昧にせず、期限どおり返していました。明日も同じ基準で返答してみたいという",
    "朝の連絡で、相手の予定を先に確認していました。そのあと自分の返答期限を一言そえていました。明日も同じ順で確認してみたいという",
    "",
    "【悪い例】",
    "期限どおり返しただけなのに、仕事の意味を捉えなおしていました（投稿に無い捉え直しへすり替えた）",
    "○○さんが、捉えなおしていました（呼び名の繰り返しと、行為と違う定型）",
    "思いやりまで含めて捉え直していた。明日も同じ基準で返答してみたい（途中の文が常体で、紹介の丁寧さがない）",
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
    summaryFlavorBlock(flavor),
    "",
    history,
    buildCreedAlignmentBlock(input.themeLabel),
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
  body = body.replace(/想いを共有頂きました[。．！]?/g, "").trim();
  body = body.replace(/^Value[０-９0-9]\s*[　 ].*?について、?/g, "");
  body = body.replace(new RegExp(escapeRegExp(heading), "g"), "");
  // 定型と二重になりやすいフレーズを落とす
  body = body.replace(/の?\d+番目の行動指針について、?/g, "");
  body = body.replace(/(という)?行動指針について、?/g, "");
  body = stripGuidelineCodeRestate(body);
  body = body.replace(/^について、?/g, "");

  const fullLabel = themeLabel.trim();
  if (fullLabel) body = body.split(fullLabel).join("");
  const withoutCode = fullLabel.replace(/^\d+\s*[-－]\s*[①-⑩]\s*/, "").trim();
  if (withoutCode.length >= 8) body = body.split(withoutCode).join("");
  body = body.replace(/^\d+\s*[-－]\s*[①-⑩]\s*/g, "");
  body = stripGuidelineCodeRestate(body);

  return body.replace(/^[,、。\s]+|[,、。\s]+$/g, "").replace(/\s{2,}/g, " ").trim();
}

export type SummaryReviseLengthMode = "thicken" | "shorten" | "keep";

/** 直し指示から分量モードを読む。両方ある／どちらでもないときは字数は据え置き。 */
export function summaryReviseLengthMode(
  instruction: string,
): SummaryReviseLengthMode {
  const t = instruction.trim();
  const thicken = /厚|詳しく|長く|膨ら|足して|増や/.test(t);
  const shorten = /簡潔|短く|削|圧縮|短め/.test(t);
  if (thicken && !shorten) return "thicken";
  if (shorten && !thicken) return "shorten";
  return "keep";
}

/** 直し専用。初回のあっさり／こってり字数制限は載せない。 */
export function buildSummaryReviseInstructions(
  input: SummaryGenerateInput,
  currentSummary: string,
  instruction: string,
): string {
  const heading = valueHeadingForLabel(input.themeLabel);
  const currentMid = extractSummaryBody(currentSummary, input.themeLabel);
  const n = currentMid.length;
  const mode = summaryReviseLengthMode(instruction);
  const thickenTarget = Math.max(1, Math.round(n * 1.2));
  const shortenTarget = Math.max(1, Math.round(n * 0.8));

  const lengthLines =
    mode === "thicken"
      ? [
          "【分量（この直しが最優先。初回のあっさり／こってり字数は使わない）】",
          `いまの言い換え本文は約${n}字。目安は約${thickenTarget}字（1.2倍）。`,
          "厚くする＝いまの要約と投稿本文に既にある事実を、言い回しで少し丁寧にするだけ。",
          "投稿に書いていない場面・行為・推測・一般論は足さない。所感・評価も足さない。",
        ]
      : mode === "shorten"
        ? [
            "【分量（この直しが最優先。初回のあっさり／こってり字数は使わない）】",
            `いまの言い換え本文は約${n}字。目安は約${shortenTarget}字（0.8倍）。`,
            "重複と飾りを削る。調べた／試した事実は落とさない。",
          ]
        : [
            "【分量（初回のあっさり／こってり字数は使わない）】",
            `いまの言い換え本文は約${n}字。指示が分量に触れていないので、字数は大きく変えない。`,
            "指示の軸だけ直す。",
          ];

  const lens = input.lens.trim()
    ? [
        "観点メモ（新しい材料ではない。要約に既にある範囲だけ維持）:",
        input.lens.trim(),
        "",
      ].join("\n")
    : "";

  return [
    "いまある要約の「あいだ」だけを、直し指示に従って書き直す。",
    "出力は言い換え本文のみ。定型枠（Value帯・何番目・想いを共有頂きました）は書かない。アプリが付ける。",
    "",
    "【直し指示（最優先）】",
    instruction.trim(),
    "",
    ...lengthLines,
    "",
    "【守る】",
    "- 落ち着いたリーダー理解。投稿者の実践を他のメンバーに紹介する目線。ですね・だね・だよ・！！禁止。",
    "- お礼・実感（一歩前進など）・所感・提案は書かない。",
    "- 投稿本文といまの要約に無い事実・推測・別のエピソードは足さない。",
    `- Value帯名（${heading}）・行動指針コード・「想いを共有」は書かない。`,
    "- 文の区切りは「。」を使う。「、」だけで長くつながない。",
    SUMMARY_SENTENCE_END_RULE,
    "",
    buildHumanVoiceBlock("summary"),
    "",
    lens,
    "【いまの要約全文】",
    currentSummary.trim(),
    "",
    "投稿本文:",
    input.sourcePost.trim() || "（なし）",
  ].join("\n");
}

export function isWeakSummaryBody(
  body: string,
  themeLabel: string,
  minBodyChars = 70,
): boolean {
  if (body.length < minBodyChars) return true;
  const heading = valueHeadingForLabel(themeLabel);
  if (heading && body.includes(heading)) return true;
  if (/^Value[０-９0-9]/.test(body)) return true;
  if (themeLabel.trim() && body.includes(themeLabel.trim())) return true;
  if (/管理本部として|後方支援する立場/.test(body)) return true;
  if (/一歩前進|浸透が進んだ|良い循環/.test(body)) return true;
  if (/ありがとう|(本日|今日)の振り返り/.test(body)) return true;
  if (/行動指針について/.test(body)) return true;
  if (/行動指針\s*\d+\s*[-－]/.test(body)) return true;
  if (/^\d+\s*[-－]\s*[①-⑩]\s*について/.test(body)) return true;
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
  out = out.replace(/の?\d+番目の行動指針について、?/g, "");
  out = out.replace(/(という)?行動指針について、?/g, "");
  out = stripGuidelineCodeRestate(out);
  out = out.replace(/^について、?/g, "");
  // 途中の文のです・ますは紹介の丁寧語として残す。「ね」「よ」だけ落とす
  out = out.replace(/ますね[。．]/g, "ます。");
  out = out.replace(/ですね[。．]/g, "です。");
  out = out.replace(/ですよ[。．]/g, "です。");
  out = out.replace(/ていますね/g, "ていて、");
  out = out.replace(/ますね/g, "、");
  out = out.replace(/ですね/g, "、");
  out = out.replace(/ですよ/g, "、");
  out = out.replace(/[、,]{2,}/g, "、");
  out = out.replace(/[。．]{2,}/g, "。");
  out = out.replace(/[。．！？]$/, "").replace(/[、,]$/, "");
  // 最後の文は「想いを共有頂きました！」へつなぐので、丁寧語の言い切りを連体形に寄せる
  out = out.replace(/と(考えて|話して|語って|思って)いました$/, "という");
  out = out.replace(/(て|で)いました$/, "$1いた");
  out = out.replace(/(て|で)います$/, "$1いる");
  out = out.replace(/しました$/, "した");
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
  // 文中の「。」は残す（全部「、」に潰さない）。定型枠の直前だけ末尾句点を外す
  out = out.replace(/[。．]+$/g, "");
  out = out.replace(/[、,]{2,}/g, "、");
  out = out.replace(/[。．]{2,}/g, "。");
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
  minBodyChars = 70,
): string | null {
  let mid = extractSummaryBody(rawBody, themeLabel);
  if (sourcePost) mid = ensurePenetrationFacts(mid, sourcePost);
  mid = polishSummaryMid(mid);
  if (isWeakSummaryBody(mid, themeLabel, minBodyChars)) return null;
  return `${summaryPrefix(themeLabel)}${mid}${summarySuffix()}`;
}

export type LeaderGenerateInput = {
  sourcePost: string;
  themeLabel: string;
  keywords: string;
  /** 直したあとの要約（接続用） */
  summary: string;
  /** 採択リンクの短いタイトル */
  selectedLinkTitles: string[];
  /** 採択後の所感向けフォーカス指示（ハーネス） */
  researchFocus: string;
  /** 調べた要点メモ */
  researchBrief: string;
  /** 同テーマの参考メモ（任意） */
  historyNotes?: string;
  /** アプリが②に差し込む固定文（前回レビュー要約の一言） */
  sameThemeFixedSentence?: string;
  /** 引用整文用の要約あいだなど（任意） */
  sameThemeQuoteMaterial?: string;
};

export type LeaderFlavor = "standard" | "reframe" | "light";

export const LEADER_FLAVORS: readonly LeaderFlavor[] = [
  "standard",
  "reframe",
  "light",
] as const;

export function leaderFlavorMeta(flavor?: string): {
  title: string;
  blurb: string;
} {
  switch (flavor) {
    case "standard":
      return {
        title: "スタンダード（一手提案）",
        blurb: "共感→検索の具体→明日の小さな一手",
      };
    case "reframe":
      return {
        title: "視点ずらし（見方を広げる）",
        blurb: "手順ではなく、判断の軸や見方を広げる",
      };
    case "light":
      return {
        title: "軽め・寄りそい（短め）",
        blurb: "投稿の工夫を主役に、要点を軽く添えて返す",
      };
    default:
      return {
        title: "所感案",
        blurb: "",
      };
  }
}

/** 所感（スタンダード）で検索結果に触れるときの定型の書き出し。 */
export const LEADER_SEARCH_RESULT = "今日のコメントに関連したキーワードを検索した結果";
export const LEADER_SEARCH_LEAD = `${LEADER_SEARCH_RESULT}によると、`;

function leaderFlavorRules(
  flavor: LeaderFlavor,
  hasSameTheme: boolean,
): string {
  const sameThemeLine = hasSameTheme
    ? "② 同テーマ前回はアプリが入れるので書かない"
    : "② 同テーマ前回なし（省略）";

  if (flavor === "reframe") {
    return [
      "【この案の型：視点ずらし（見方を広げる）】",
      "- スタンダード案（手順の提案）とははっきり違う角度で書く。明日の具体手順を指示するのではなく、検索の知見を『見方・判断の軸』としてチームへ返す。",
      "- 構成:",
      "  ① 投稿の具体に共感・感謝（ですね可・カジュアル）。今日のテーマは半文で自然に溶かす。",
      `  ${sameThemeLine}`,
      "  ③ 検索結果の主要な箇所を自然な入り方で引く（例:『関連して調べてみると、「〜」という考え方もありました。』『調べてみると、「〜」という見方もありました。』）。『今日のコメントに関連したキーワードを検索した結果によると、』の固定文は使わない。",
      "  ④ 検索の知見と今日の場面をつなぎ、管理本部の仕事で見方を少し広げる一言で結ぶ（例:『普段の〜も、その目線で見直すと見え方が変わりそうですね。』『我々の仕事だと、〜の場面で思い出したい視点ですね。』）。『〜してみたらどうでしょう。』の固定結びは使わない。",
      "- 分量: だいたい200〜320字・3〜5文。引用は30〜60字、検索結果の原文に近い言い回しを使う。",
      "- 狙いが特定の役割に限られるときはその役割に言及してよい（個人名なし）。",
      "",
      "【この型のお手本（中身は仮・言い回しは写さない）】",
      "周囲に聞いて一次回答まで持っていったの、迷いを長引かせない良い動きですね。関連して調べてみると、「相談先を先に決めておくと、判断に迷う時間そのものが短くなる」という考え方もありました。やり方だけでなく、誰に聞くかの地図を頭の中に持っておく見方は、管理本部の確認仕事でも効いてきそうです。",
    ].join("\n");
  }

  if (flavor === "light") {
    return [
      "【この案の型：軽め・寄りそい（短め）】",
      "- 忙しい日や重くしたくない日向けの、短めで肩の力を抜いた返し。投稿者の工夫そのものを主役にする。",
      "- 構成:",
      "  ① 投稿者の具体的な工夫や気づきを受け止めてほめる（ですね可・カジュアル）。今日のテーマは半文で薄く溶かす。",
      `  ${sameThemeLine}`,
      "  ③ 検索結果の核心を短い1フレーズだけ自然に添える（例:『調べてみたところ、「〜」ともありました。』『関連する記事でも、「〜」と触れられていました。』）。引用は短め（20〜45字）で、補足文は付けない。",
      "  ④ 投稿の工夫をチームの身近な仕事へそっと引き寄せる短い一文で終える（例:『こういう小さな確認が、周りの動きやすさにも効いてきそうですね。』『まずは〜のひと声から取り入れてみるのもありですね。』）。『我々も、〜してみたらどうでしょう。』の固定結びは使わない。",
      "- 分量: だいたい150〜240字・2〜4文。説明を盛りすぎずスッキリ終える。",
      "",
      "【この型のお手本（中身は仮・言い回しは写さない）】",
      "分からないまま抱えず、先に周囲へ聞いて一次回答までつないだのが心強いですね。調べてみたところ、「早めの一次回答が相手の段取りを助ける」ともありました。こういう小さな確認の積み重ねが、部内の動きやすさにも効いてきそうですね。",
    ].join("\n");
  }

  return [
    "【この案の型：スタンダード（一手提案・王道）】",
    "① 投稿の具体に共感・感謝（ですね可・カジュアル）。したことをほめる。ほめ言葉は投稿の具体に寄せる。",
    sameThemeLine,
    "③ 今日のテーマは、①の文の中に半文で溶かす。独立した一文にしない。『〜の姿勢』『〜するときは〜が合っています』のような一般論にしない。",
    "④ 『こうしたら？』を1点だけ。宛先は既定でチーム全体（我々も）。狙いが特定の役割の人に限られるときだけ一定の対象者にする。",
    "   材料は今日の投稿の具体＋キーワード検索の結果の主要な箇所。提案の芯は【所感の提案の狙い】。",
    `   検索に触れるときは、次の流れで書く: 『${LEADER_SEARCH_LEAD}「主要な箇所」とありました。（理由・条件を1文まで）我々も、〜してみたらどうでしょう。』`,
    "   引用文＝検索結果の主要な箇所を「」で引き、「〜とありました。」で結ぶ（提案は混ぜない）。」の直前に。を入れない。引用の中に「」があれば『』に替える。",
    "   引用の中身は、検索結果にある言い回しをなるべくそのまま使う。何を・どんな条件で・どうすると何が変わるかが分かる長さ（だいたい30〜60字）にする。要約しすぎて一般論にしない。",
    "   検索結果に『主要な箇所:』の行があれば、それを引用の第一候補にする（狙いにもっと効く箇所が要点にあればそちら）。『主要な箇所』という言葉は本文に書かない。",
    "   補足文（任意・1文まで）＝同じ検索結果にある理由・条件・例を一つ。検索結果に無いことは足さない。",
    "   提案文＝引用を受けた対応策。既定は「我々も、」で始める。狙いが特定の役割の人に限られるときだけ「〇〇の方は、」で始める（15字以内。例: 締めの作業を持つ方は／新しく担当を持った方は）。書類の確認・メールの返信など管理本部のほぼ全員に当てはまる対象は「我々も、」にする。",
    "   結びは必ず「〜してみたらどうでしょう。」。「〜してみてはどうでしょう」「〜してはどうでしょう」にしない。",
    "   提案文は引用のどの部分を受けた動きなのかが読んで分かるようにし、引用にある動作・条件に合わせる。検索結果に無い数字を作らない。",
    "   提案は明日の仕事で実際にできる小さな動き（いつ・どの場面で・何をするかの二つ以上が見える）。『意識してみる』『共有する』だけで終えない。",
    "   提案の形は日ごとに変える（手順を一つ足す／基準をそろえる／確認のタイミング／相手への一言／迷ったときの問い）。",
    "- 分量: だいたい220〜340字・3〜5文（引用が60字を超えるときは補足を省く）。",
    "",
    "【この型のお手本（中身は仮・②なし。言い回しは写さない）】",
    `周囲に聞いて一次回答まで持っていったの、現場でも使えそうでいいですね。${LEADER_SEARCH_LEAD}「依頼を受けた時点で相談先を一人決めておくと、曖昧なまま抱え込む時間が減る」とありました。迷ってから相談先を探すと、その間に締めが近づくからだそうです。我々も、朝会で依頼を受けたらその場で『誰に聞くか』まで決めてみたらどうでしょう。`,
    `（対象者向けの形）${LEADER_SEARCH_LEAD}「返答の期限を先に伝えると、相手は待つ間の段取りを組める」とありました。締めの作業を持つ方は、依頼を受けた返信の一行目に『〇日までに返します』と書いてみたらどうでしょう。`,
  ].join("\n");
}

export function leaderRetrySuffix(
  hasSameThemeFixed = false,
  flavor: LeaderFlavor = "standard",
): string {
  const quoteLine = hasSameThemeFixed
    ? "同テーマ前回の文はアプリが入れるので所感本文に書かない。"
    : "同テーマ前回の入力が無いので②は省略。";
  const flavorLine =
    flavor === "standard"
      ? `検索に触れるなら『${LEADER_SEARCH_LEAD}「主要な箇所」とありました。（理由・条件を1文まで）我々も、〜してみたらどうでしょう。』で書く。対象を絞るときは『〇〇の方は、〜してみたらどうでしょう。』。`
      : flavor === "reframe"
        ? "視点ずらし型で書く。自然な入り方で検索の知見を引き、明日の手順ではなく見方・判断の軸を広げる一言で結ぶ。"
        : "軽め・寄りそい型で書く。投稿者の工夫を主役にし、検索の核心を1フレーズ軽く添えて150〜240字でスッキリ終える。";
  return [
    "【再出力指示】",
    "直前の出力は不合格（短すぎ／お礼や要約定型の混入／リンク解説が主役／締めの強い誘い／布教・標語調／要点メモ等のアプリ用語／前置きや見出し）。",
    quoteLine,
    flavorLine,
    "出力は所感本文だけ。『以下』『下書きです』『承知しました』『【所感】』『注』は書かない。",
    "『調べた要点』『要点メモ』『主要な箇所』は書かない。宣教師口調・個人宿題禁止。決まり文句と記号（——、：、箇条書き）は使わない。",
  ].join("\n");
}

/** 所感・着想の本文だけ。締めはアプリ側の別欄。 */
export function buildLeaderInstructions(
  input: LeaderGenerateInput,
  flavor: LeaderFlavor = "standard",
): string {
  const keywords = input.keywords.trim()
    ? `検索キーワード: ${input.keywords.trim()}`
    : "検索キーワード: なし";
  const focusText = input.researchFocus.trim();
  const focus = focusText
    ? [
        "【所感の提案の狙い（芯・必ず反映）】",
        focusText,
        "- 引用は検索結果のうちこの狙いに一番効く箇所を選ぶ。狙いの言葉や『狙い』という語は本文にそのまま書かない。",
      ].join("\n")
    : "【所感の提案の狙い】（未入力。投稿の場面に一番効く検索結果の箇所を選ぶ）";
  const links =
    input.selectedLinkTitles.length > 0
      ? `採択した参考（タイトルのみ・URLは書かない）: ${input.selectedLinkTitles.join(" / ")}`
      : "採択リンク: なし（不合格）";
  const heading = valueHeadingForLabel(input.themeLabel);
  const fixed = input.sameThemeFixedSentence?.trim() ?? "";
  const hasSameTheme = Boolean(fixed || input.historyNotes?.trim());
  // 固定文の中身はプロンプトに出さない（モデルが本文外コメントに写すため）。有無だけ伝える。
  const history = hasSameTheme
    ? [
        "【同テーマ前回】",
        "- ②の文はアプリが所感本文へ後から差し込む。所感本文にも注釈にも『同テーマ前回の…』を自分で書かない。",
        "- 『固定文幹』『参考』『メモ』として引用文を出力しない。",
        "",
      ].join("\n")
    : "";

  return [
    "あなたは職場のグループチャット向けに、リーダー（上司・同僚の先輩）が返す「所感・着想」の下書きを書く助手です。",
    "目的は企業理念の浸透だが、布教・訓示・スローガン押しは禁止。アレルギーを呼ぶ『宣教師』口調にしない。",
    "距離感は上司として寄り添う・一緒に考える側。カジュアルで話しやすいです・ます（堅い訓話にしない）。",
    "トシオが最終脚色する前提。参照リンクは材料まで。リンク解説が主役になってはいけない。",
    "",
    "【共通トーン】",
    "- 寄り添い・共感が先。評価口調・上から目線・減点・皮肉は禁止。",
    "- 「〜ですね」「〜ますね」は共感に使ってよい。「だね」「だよ」「！」は使わない。",
    "- ほめる文は投稿の具体に寄せる。『理念浸透』『指針の実践』『リレー』『今日の一歩』など標語っぽい言い回しは避ける。",
    "- 行動指針は『今日のテーマのニュアンス』で自然に触れる。コード全文・帯名の長々再掲は禁止。",
    "- 個人宿題（『明日の案件で××してみましょう』『どこから試しそうですか』）や空号令（『皆さんでやってみませんか』）は禁止。",
    "- 引用は検索結果にある具体（一般論にしない）。引用と補足を合わせても所感の半分を超えない。",
    "- 締めの奨励文は書かない（締め欄の仕事）。",
    "",
    buildHumanVoiceBlock("leader"),
    "",
    leaderFlavorRules(flavor, hasSameTheme),
    "",
    "【絶対に書かない】",
    "  - お礼定型／Value要約定型／締め専用の奨励文／個人向け明日TODO",
    "  - 布教調（『理念を体現』『指針を意識して』『浸透が進む』『チームの力に』等）",
    "  - アプリ内部の呼び方（『要点メモ』『調べた要点』『フォーカス指示』『提案の狙い』『主要な箇所』）",
    "  - 『同テーマ前回の〇〇さん』『前回の〇〇さん』（②はアプリ担当）",
    "  - 前置き・見出し・番号・注釈（『以下が下書き』『所感：』『【所感】』等）",
    "",
    "【悪い例】",
    "コミュニケーションが大切とありました。我々も、日頃から意識してみたらどうでしょう。（一般論＋何をするか無い）",
    "受け取った営業の方も嬉しかったですね。（投稿に無い相手の気持ちを推測している）",
    "指針の実践がチームの理念浸透の一歩につながると感じます。（宣教師・標語）",
    "明日は自分の案件で試してみると動きやすそうです。どこから試しそうですか。（個人宿題）",
    "調べた要点を踏まえ、朝会で型を揃えましょう。（アプリ用語が本文に出る）",
    "同テーマ前回の山田さんの共有にあった、「期限を先に切る」と通じるものがありますね。（②はアプリが入れるので書かない）",
    "",
    history,
    buildCreedAlignmentBlock(input.themeLabel),
    "",
    "【入力】",
    `今日の枠の識別用（所感にコード全文を書かない）: ${input.themeLabel}`,
    `Value帯名（長々再掲しない）: ${heading}`,
    keywords,
    focus,
    links,
    "キーワード検索の結果（材料。主役にしない。この見出しも本文に書かない）:",
    input.researchBrief.trim() || "（なし）",
    "要約（共感の主材料）:",
    input.summary.trim() || "（未編集）",
    "投稿本文:",
    input.sourcePost.trim() || "（なし）",
  ].join("\n");
}

export function polishLeaderNote(
  raw: string,
  flavor: LeaderFlavor = "standard",
): string {
  let out = raw.replace(/\r\n/g, "\n").trim();
  out = out.replace(/^```(?:\w+)?\n?/, "").replace(/\n?```$/, "").trim();
  out = out.replace(/^["「]|["」]$/g, "").trim();
  out = stripLeaderPreambleAndMeta(out);
  out = out.replace(/想いを共有頂きました[。．！]?/g, "").trim();
  out = out.replace(/^Value[０-９0-9]\s*[　 ].*?について、?/gm, "");
  // 所感の共感「ですね／ますね」は残す（要約側では除去）
  out = out.replace(/ですよ[。．]?/g, "。");
  out = out.replace(/[。．]{2,}/g, "。");
  out = out.replace(
    /^[^\n]*(さん、)?振り返りコメント共有頂きありがとうございます[。．]?\s*/m,
    "",
  );
  out = stripTrailingClosingVariation(out);
  if (flavor === "standard") {
    out = out.replace(
      /検索して調べ(?:てみ)?た結果(?:では|によると|から|を踏まえ(?:ると|て)?)?[、,]/g,
      LEADER_SEARCH_LEAD,
    );
    out = out.replace(/調べた要点メモ/g, LEADER_SEARCH_RESULT);
    out = out.replace(/要点メモ/g, LEADER_SEARCH_RESULT);
    out = out.replace(/調べた要点/g, LEADER_SEARCH_RESULT);
    out = out.replace(/検索して調べ(?:てみ)?た結果/g, LEADER_SEARCH_RESULT);
    out = out.replace(/主要な箇所\s*[:：]\s*/g, "");
    out = out.replace(/てみてはどうでしょう/g, "てみたらどうでしょう");
    out = out.replace(/てはどうでしょう/g, "てみたらどうでしょう");
    out = shapeLeaderSearchSentences(out);
  } else {
    // 視点ずらし・軽めでは自然な書き出しと結びを活かし、アプリ用語だけ掃除する
    out = out.replace(/調べた要点メモ/g, "関連して調べた内容");
    out = out.replace(/要点メモ/g, "関連して調べた内容");
    out = out.replace(/調べた要点/g, "関連して調べた内容");
    out = out.replace(/主要な箇所\s*[:：]\s*/g, "");
  }
  out = out.replace(/同テーマの前回の/g, "同テーマ前回の");
  out = out.replace(/同テーマの前回、/g, "同テーマ前回の");
  out = out.replace(/(?<!同テーマ)前回の([^\s、。]{1,12}さん)/g, "同テーマ前回の$1");
  out = out.replace(/(?<!同テーマ)前回、([^\s、。]{1,12}さん)/g, "同テーマ前回の$1");
  out = out.replace(/(?<!同テーマ)前回は([^\s、。]{1,12}さん)/g, "同テーマ前回の$1");
  out = stripLeaderPreambleAndMeta(out);
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * 検索の書き出しのあとを「〇〇とありました。我々も、〜どうでしょう。」の流れに寄せる。
 * 書き出しの直後が提案文なら、紹介文を作れないので触らない。
 */
export function shapeLeaderSearchSentences(text: string): string {
  const idx = text.indexOf(LEADER_SEARCH_LEAD);
  if (idx < 0) return text;
  const start = idx + LEADER_SEARCH_LEAD.length;
  const end = indexOfSentenceEnd(text, start);
  if (end < 0) return text;
  let found = text.slice(start, end);
  if (/(どうでしょう|しませんか|しましょう)$/.test(found)) return text;
  found = found.replace(/(?:そうです|ようです|とのことです|とされています|と書かれていました|と書かれています|とありました)$/, "");
  const quoted = found.match(/^「([\s\S]+)」$/u);
  if (quoted) {
    const inner = quoted[1]!
      .replace(/「/g, "『")
      .replace(/」/g, "』")
      .replace(/[。．]$/u, "");
    found = `「${inner}」`;
  }
  found = `${found}とありました`;

  // 補足の1文を挟んでもよいので、引用後2文以内の最初の提案文に宛先を付ける
  let rest = text.slice(end + 1);
  let offset = 0;
  for (let i = 0; i < 2 && offset < rest.length; i++) {
    const sentEnd = indexOfSentenceEnd(rest, offset);
    const sentence = sentEnd >= 0 ? rest.slice(offset, sentEnd + 1) : rest.slice(offset);
    if (/どうでしょう/.test(sentence)) {
      const targetsAudience = /^\s*[^、。]{1,24}(?:方|人|担当)は、/.test(sentence);
      if (!/^\s*我々も/.test(sentence) && !targetsAudience) {
        const fixed = sentence.replace(
          /^\s*(?:(?:チームでも|チームで|皆さんも|私たちも|みんなで)、?)?/,
          "我々も、",
        );
        rest = `${rest.slice(0, offset)}${fixed}${rest.slice(offset + sentence.length)}`;
      }
      break;
    }
    if (sentEnd < 0) break;
    offset = sentEnd + 1;
  }
  return `${text.slice(0, start)}${found}。${rest}`;
}

/** 「」『』の中の「。」は文末として数えない。 */
function indexOfSentenceEnd(text: string, from: number): number {
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (ch === "「" || ch === "『") depth += 1;
    else if ((ch === "」" || ch === "』") && depth > 0) depth -= 1;
    else if (ch === "。" && depth === 0) return i;
  }
  return -1;
}

/**
 * 再生成時に増えやすい前置き・注釈・見出しだけ落とす（所感本文は残す）。
 */
export function stripLeaderPreambleAndMeta(text: string): string {
  let out = text.replace(/\r\n/g, "\n").trim();
  if (!out) return "";

  // 先頭の括弧注釈・ラベル
  out = out.replace(/^[（(][^）\n]{0,100}[）)]\s*/u, "");
  out = out.replace(
    /^(?:所感(?:・着想)?(?:の下書き)?|下書き|出力)[：:\s]*/u,
    "",
  );

  const preambleLine =
    /^(?:以下に?|こちらが?|下記が?|次が?|所感|下書き|了解|承知|かしこまり|再出力|出力|はい[。．]?$|注[：:]|※|【[^】]{0,40}】|#+\s|[-*・]\s*(?:注|参考|メモ)|(?:①|1[．.、)])\s*(?:共感|所感|型)|Here\b|Sure\b|Okay\b|Got it|企業理念|Vision\b|Mission\b|Value\b|固定文|参考[：:]|メモ[：:]|アプリが|トシオ|脚色)/iu;

  const lines = out.split("\n");
  let start = 0;
  while (start < lines.length) {
    const line = lines[start]!.trim();
    if (!line) {
      start += 1;
      continue;
    }
    if (preambleLine.test(line)) {
      start += 1;
      continue;
    }
    // 「〜下書きです。」だけの短い前置き
    if (
      line.length <= 40 &&
      /下書きです|示します|お示しします|作成しました|出力します/.test(line)
    ) {
      start += 1;
      continue;
    }
    break;
  }
  out = lines.slice(start).join("\n").trim();

  // 末尾のメタ締め
  out = out.replace(
    /\n+(?:以上です|いかがでしょう|ご確認ください|ご検討ください|必要なら直します)[。．！]?\s*$/u,
    "",
  );
  // 行末の（注：…）
  out = out.replace(/[（(](?:注|参考|メモ)[^）\n]{0,80}[）)]\s*$/gu, "").trim();
  return out;
}

export function isWeakLeaderNote(
  body: string,
  opts?: { requireSameThemeQuote?: boolean; flavor?: LeaderFlavor },
): boolean {
  const minLen = opts?.flavor === "light" ? 70 : 80;
  if (body.length < minLen) return true;
  if (/振り返りコメント共有頂き|想いを共有頂きました/.test(body)) return true;
  if (/明日は自分の(案件|一件)|どこから試しそうですか|皆さんでやってみませんか/.test(body)) return true;
  if (/理念浸透|指針の実践|体現|チームの力になります/.test(body)) return true;
  // 前置き・メタが本文に残っている
  if (
    /^(?:以下|こちら|承知|了解|かしこまり|再出力|所感の下書き|下書きです)/m.test(
      body,
    )
  ) {
    return true;
  }
  if (/企業理念の方向性|固定文幹|【所感】|【入力】/.test(body)) return true;
  if (opts?.requireSameThemeQuote) {
    if (!/同テーマ前回の[^\s、。]{1,16}さん/.test(body)) return true;
    const hasQuotedChunk = /『[^』]{6,}』|「[^」]{6,}」/.test(body);
    if (!hasQuotedChunk) return true;
    if (
      /同テーマ前回の[^\s、。]{1,16}さん[^。．]{0,40}とも重なります[。．]?/.test(
        body,
      ) &&
      !hasQuotedChunk
    ) {
      return true;
    }
  }
  const trimmed = body.trim();
  if (
    CLOSING_VARIATIONS.some((c) => {
      const bare = c.replace(/[。．]$/u, "");
      return trimmed === c || trimmed === bare || trimmed.startsWith(bare);
    })
  ) {
    return true;
  }
  return false;
}

export function assembleLeaderNote(
  raw: string,
  opts?: { requireSameThemeQuote?: boolean; flavor?: LeaderFlavor },
): string | null {
  const flavor = opts?.flavor ?? "standard";
  const body = polishLeaderNote(raw, flavor);
  if (isWeakLeaderNote(body, opts)) return null;
  return body;
}
