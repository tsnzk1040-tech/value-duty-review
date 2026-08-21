import {
  CLOSING_VARIATIONS,
  stripTrailingClosingVariation,
} from "@/lib/review/closing";
import { stripGuidelineCodeRestate } from "@/lib/review/final-check";
import { buildCreedAlignmentBlock } from "@/lib/creed/corporate-creed";
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

function summaryLengthBlock(flavor: SummaryFlavor): string {
  if (flavor === "light") {
    return [
      "【分量・中身（あっさり版）】",
      "- 出力は言い換え本文のみ。だいたい1〜2文、70〜100字（日本語）。",
      "- 核は実践の一点を前面に（調べた／試したのどちらかが主でよい）。もう一方は短く触れてよいが、両方を同量にしない。",
      "- 場面の細部・次に試したいことは厚くしない（半文までなら可）。",
      "- 文末は「〜してみた」「〜したい」「〜ていて」などで止め、です・ます・ね・だね・ですねで終わらない。",
      "- 文末に「共有」「想いを共有」「のが伝わる」「という気づき」「という実践です」を自分で書かない。",
      "- 短すぎ（目安70字未満）や薄い抽象は不合格。所感めいた解説を足すのも不合格。",
    ].join("\n");
  }
  return [
    "【分量・中身（こってり版）】",
    "- 出力は言い換え本文のみ。だいたい2〜3文、150〜210字（日本語）。",
    "- 調べた／試したの両方に触れられるとよい。同じ事実を、誰・何・どうしたが見える程度まで厚くする。",
    "- 次に試したいことは薄くて可。投稿に無い場面・推測で水増ししない。",
    "- 文末は「〜してみた」「〜したい」「〜ていて」などで止め、です・ます・ね・だね・ですねで終わらない。",
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
    "- 堅い報告書にも、カジュアルな話し言葉にもしない。同僚向けの落ち着いたです・ます。",
    "- 「だね」「だよ」「ですね」「ね。」「！！」は使わない（「〜ですね。」も禁止）。上から目線・皮肉・減点も禁止。",
    "- 「考察した」「定義した」より、「〜と捉えて」「〜してみた」「〜したい」を優先。",
    "- 「調べた」「試した」などの事実は省略しない（評価は薄く、事実は残す）。",
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
    "- 例: 「誠実」を調べて意味を広げた → 正直さだけでなく思いやり・約束まで含めて捉えた、と取り上げる",
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
    "- 落ち着いたリーダー理解。ですね・だね・だよ・！！禁止。",
    "- お礼・実感（一歩前進など）・所感・提案は書かない。",
    "- 投稿本文といまの要約に無い事実・推測・別のエピソードは足さない。",
    `- Value帯名（${heading}）・行動指針コード・「想いを共有」は書かない。`,
    "- 文末は「〜してみた」「〜したい」「〜ていて」などで止め、です・ますで終わらない。",
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
  /** 同テーマの前回コメント（任意） */
  historyNotes?: string;
};

export type LeaderFlavor = "close" | "angle";

function leaderFlavorBlock(flavor: LeaderFlavor): string {
  if (flavor === "angle") {
    return [
      "【この案の味（切り口違い）】",
      "- 共感の入口・たとえ・『こうしたら？』の置き方を、近い言い換えとは変える。",
      "- 同テーマ前回があるときは必須で引用し、今日の具体へ会話としてつなぐ。",
      "- 投稿と要約にある事実だけ。書いていない場面は足さない。",
    ].join("\n");
  }
  return [
    "【この案の味（近い言い換え）】",
    "- 投稿・要約の語順に近い共感から入る。大きく組み替えない。",
    "- 同テーマ前回があるときは必須で引用し、今日の具体へ会話としてつなぐ。",
  ].join("\n");
}

export function leaderRetrySuffix(requireSameThemeQuote = false): string {
  const quoteLine = requireSameThemeQuote
    ? "同テーマ前回は必須。『同テーマ前回の〇〇さんは、『…』といっていて、』のあと今日の具体や提案へ自然につなぐ。形式的な『とも重なります』だけで終わるのは不合格。『前回の〇〇さん』だけは禁止。"
    : "同テーマ前回が入力にあれば必須で引用。無ければ②は省略。『前回の〇〇さん』だけは前日と読めるので禁止。";
  return [
    "【再出力指示】",
    "直前の出力は不合格（短すぎ／お礼や要約定型の混入／リンク解説が主役／締めの強い誘い／布教・標語調／薄すぎ／要点メモ等のアプリ用語／同テーマ前回の欠落や形式的つなぎ）。",
    "所感の型で再出力せよ: ①共感・感謝 ②同テーマ前回があれば『同テーマ前回の〇〇さんは、『…』といっていて、』で引用＋接続 ③テーマに会話っぽく一言 ④チームへの『こうしたら？』1点。",
    quoteLine,
    "検索に触れるなら『検索して調べた結果』と書く。『調べた要点』『要点メモ』は書かない。",
    "宣教師口調禁止。上司として寄り添うカジュアルなです・ます。『理念浸透』『指針の実践』連発は不可。",
    "参照は材料まで。『皆さんでやってみませんか』は書かない。共感の「ですね」は可。",
  ].join("\n");
}

/** 所感・着想の本文だけ。締めはアプリ側の別欄。 */
export function buildLeaderInstructions(
  input: LeaderGenerateInput,
  flavor: LeaderFlavor = "close",
): string {
  const keywords = input.keywords.trim()
    ? `検索キーワード: ${input.keywords.trim()}`
    : "検索キーワード: なし";
  const focus = input.researchFocus.trim()
    ? `所感向けフォーカス指示: ${input.researchFocus.trim()}`
    : "所感向けフォーカス指示: （要入力）";
  const links =
    input.selectedLinkTitles.length > 0
      ? `採択した参考（タイトルのみ・URLは書かない）: ${input.selectedLinkTitles.join(" / ")}`
      : "採択リンク: なし（不合格）";
  const heading = valueHeadingForLabel(input.themeLabel);
  const hasSameTheme = Boolean(input.historyNotes?.trim());
  const history = hasSameTheme
    ? [
        "【同テーマ前回（入力あり＝引用必須）】",
        "- 必ず本文に入れる。文型: 同テーマ前回の〇〇さんは、『…』といっていて、＋今日の投稿の具体や『こうしたら？』へ自然につなぐ。",
        "- 引用は **本人の振り返りコメント（投稿）** から。リーダー所感・要約の言い回しを本人の発言として使わない。",
        "- 引用核は言い回しを少し整えてよいが、意味は変えない。コピペの長文は不可。",
        "- 不合格: 名前だけ／『とも重なります』だけで終わる／今日の話と無関係な並列／リーダー所感の転用。",
        "- 『前回の〇〇さん』だけは前日と誤解されるので禁止。",
        input.historyNotes!.trim(),
        "",
      ].join("\n")
    : "";

  return [
    "あなたは職場のグループチャット向けに、リーダー（上司・同僚の先輩）が返す「所感・着想」の下書きを書く助手です。",
    "目的は企業理念の浸透だが、布教・訓示・スローガン押しは禁止。アレルギーを呼ぶ『宣教師』口調にしない。",
    "距離感は上司として寄り添う・一緒に考える側。カジュアルで話しやすいです・ます（堅い訓話にしない）。",
    "トシオが最終脚色する前提。参照リンクは提案の材料まで。リンク解説が主役になってはいけない。",
    "",
    "【トーン】",
    "- 寄り添い・共感が先。評価口調・上から目線・減点・皮肉は禁止。",
    "- 「〜ですね」「〜ますね」は共感に使ってよい。「だね」「だよ」「！！」は使わない。",
    "- 『理念浸透』『指針の実践』『リレー』『今日の一歩』など標語っぽい言い回しは避けるか、ごく薄く。",
    "- 行動指針は『今日のテーマのニュアンス』で自然に触れる。コード全文・帯名の長々再掲は禁止。",
    "- 個人宿題の『明日の案件で××してみましょう』『どこから試しそうですか』は禁止（軽薄に聞こえる）。",
    "",
    "【所感の型（この順・必須）】",
    "① 投稿の具体に共感・感謝（ですね可・カジュアル）",
    hasSameTheme
      ? "② 同テーマ前回を必ず引用する: 『同テーマ前回の〇〇さんは、『…』といっていて、』のあと、今日の具体や次の提案へ会話としてつなぐ（省略禁止）"
      : "② 同テーマ前回の入力が無いときだけ省略。入力があるときは②必須",
    "③ 今日のテーマに、会話の延長で一言つなぐ（訓示にしない）",
    "④ チーム／グループ全体への『こうしたら？』を1点だけ。",
    "   材料は今日の投稿の具体＋検索して調べた結果の一点を織る。",
    "   検索に触れるときの言い方は『検索して調べた結果』（『調べた要点』『要点メモ』は禁止。受け手はアプリを知らない）。",
    "   必ず半文で『なぜ今日のこの場面に効くか』を付ける。記事の要約にしてはいけない。",
    "   呼びかけの宛先は投稿者ひとりではなく、読んでいるメンバー全体。",
    "⑤ 所感では奨励の締め文を書かない（締め欄の仕事）。",
    "",
    "【分量】",
    "- 所感本文のみ（だいたい200〜320字・3〜5文）。お礼・Value要約定型・締めの奨励文は書かない。",
    "- 採択リンクのタイトルに触れるなら半文まで（URL・♯記法は書かない）。",
    "- 検索して調べた結果は『こうしたら？』の根拠に使う。2点以上盛らない。",
    "",
    "【絶対に書かない】",
    "  - お礼定型（「〜さん、振り返りコメント共有…」）",
    "  - Value要約定型（「Value…のN番目…想いを共有頂きました」）",
    "  - 締め専用の奨励（「考えてみてください」「また共有しましょう」等の閉じ）",
    "  - 個人向けの明日TODO（「明日は自分の一件で試して」）",
    "  - 布教調（『理念を体現』『指針を意識して』『浸透が進む』『チームの力に』など訓話フレーズの連発）",
    "  - Value帯名の長々した再掲、行動指針全文、次回テーマ／担当",
    "  - 参照記事の要約・解説が本文の半分以上を占めること",
    "  - 実装・POC・スキル名などのメタ",
    "  - アプリ内部の呼び方（『要点メモ』『調べた要点』『フォーカス指示』『所感向け』）",
    "  - 『前回の〇〇さん』『前回、〇〇さん』（前日のコメントと読める。同テーマ前回と書く）",
    "",
    "【良い例（中身は仮）】",
    "周囲に聞いて一次回答まで持っていったの、現場でも使えそうでいいですね。同テーマ前回の山田さんは、『期限を先に切ると曖昧な依頼が減る』といっていて、今日の聞き方の整理にも通じますね。『どうすればできるか』を先に置くと、同じ詰まりが減ります。検索して調べた結果も踏まえ、朝会で『誰に聞くか』を先に決める、に寄せてみたらどうでしょう。",
    "",
    leaderFlavorBlock(flavor),
    "",
    "【悪い例】",
    "指針の実践がチームの理念浸透の一歩につながると感じます。（宣教師・標語）",
    "記事では〇〇の3ステップが紹介されていて…（リンク解説が主役）",
    "明日は自分の案件で試してみると動きやすそうです。どこから試しそうですか。（個人宿題）",
    "皆さんでやってみませんか。（空の号令）",
    "調べた要点を踏まえ、朝会で型を揃えましょう。（アプリ用語が本文に出る）",
    "前回の山田さんが期限を先に切った話とも重なります。（前日のコメントと読める）",
    "同テーマ前回の山田さんの話とも重なります。（引用の中身がなく形式的）",
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
    "検索して調べた結果（提案の材料。主役にしない。この見出しも本文に書かない）:",
    input.researchBrief.trim() || "（なし）",
    "要約（共感の主材料）:",
    input.summary.trim() || "（未編集）",
    "投稿本文:",
    input.sourcePost.trim() || "（なし）",
  ].join("\n");
}

export function polishLeaderNote(raw: string): string {
  let out = raw.replace(/\r\n/g, "\n").trim();
  out = out.replace(/^```(?:\w+)?\n?/, "").replace(/\n?```$/, "").trim();
  out = out.replace(/^["「]|["」]$/g, "").trim();
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
  out = out.replace(/調べた要点メモ/g, "検索して調べた結果");
  out = out.replace(/要点メモ/g, "検索して調べた結果");
  out = out.replace(/調べた要点/g, "検索して調べた結果");
  out = out.replace(/同テーマの前回の/g, "同テーマ前回の");
  out = out.replace(/同テーマの前回、/g, "同テーマ前回の");
  out = out.replace(/(?<!同テーマ)前回の([^\s、。]{1,12}さん)/g, "同テーマ前回の$1");
  out = out.replace(/(?<!同テーマ)前回、([^\s、。]{1,12}さん)/g, "同テーマ前回の$1");
  out = out.replace(/(?<!同テーマ)前回は([^\s、。]{1,12}さん)/g, "同テーマ前回の$1");
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

export function isWeakLeaderNote(
  body: string,
  opts?: { requireSameThemeQuote?: boolean },
): boolean {
  if (body.length < 80) return true;
  if (/振り返りコメント共有頂き|想いを共有頂きました/.test(body)) return true;
  if (/明日は自分の(案件|一件)|どこから試しそうですか|皆さんでやってみませんか/.test(body)) return true;
  if (/理念浸透|指針の実践|体現|チームの力になります/.test(body)) return true;
  if (opts?.requireSameThemeQuote) {
    if (!/同テーマ前回の[^\s、。]{1,16}さん/.test(body)) return true;
    // 『…』といっていて、 を基本。言い回しゆれは許容しつつ、中身のない「とも重なります」だけは不合格
    const hasQuoteVerb = /といって(いて|いました|いた)|と言って(いて|いました|いた)/.test(
      body,
    );
    const hasQuotedChunk = /『[^』]{8,}』|「[^」]{8,}」/.test(body);
    if (!hasQuoteVerb && !hasQuotedChunk) return true;
    if (
      /同テーマ前回の[^\s、。]{1,16}さん[^。．]{0,40}とも重なります[。．]?/.test(body) &&
      !hasQuoteVerb
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
  opts?: { requireSameThemeQuote?: boolean },
): string | null {
  const body = polishLeaderNote(raw);
  if (isWeakLeaderNote(body, opts)) return null;
  return body;
}
