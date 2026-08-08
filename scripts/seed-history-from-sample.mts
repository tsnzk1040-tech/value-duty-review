/**
 * data/local/sample-20260808.txt（gitignored）を当面の履歴として Neon に投入する。
 * 本番コピーで貯まったら、keywords=__seed__:sample-20260808 を古い順に消す。
 *
 * Usage: npx tsx scripts/seed-history-from-sample.mts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ensureReviewsSchema,
  isDatabaseConfigured,
  sql,
} from "../src/lib/db/neon.ts";
import { saveReviewHistory } from "../src/lib/review/history.ts";
import { POC_VALUE_ITEMS } from "../src/lib/rotation/seed.ts";

const SEED_TAG = "__seed__:sample-20260808";
const SAMPLE_PATH = resolve(process.cwd(), "data/local/sample-20260808.txt");

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
    const key = trimmed.slice(0, i).trim();
    const value = trimmed.slice(i + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function stripLineNumbers(raw: string): string {
  return raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^\d+:\s?/, ""))
    .join("\n");
}

function isMetaLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (/^(詳細|その他|既読)/.test(t)) return true;
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(t)) return true;
  if (/^\d{4,}$/.test(t)) return true;
  return false;
}

function isThanksLine(line: string): boolean {
  return /さん、振り返りコメント/.test(line) && /ありがとう/.test(line);
}

function presenterFromThanks(line: string): string {
  const m = line.match(/^(.+?)さん、/);
  return m ? m[1].replace(/　/g, "").trim() : "（不明）";
}

function findTheme(summary: string): { themeId: string; themeLabel: string } {
  const valueNum = summary.match(/Value\s*([０-９0-9])/);
  const ordinal = summary.match(/の(\d+)番目の行動指針/);
  if (valueNum && ordinal) {
    const vn = "０１２３４５６７８９".includes(valueNum[1])
      ? "０１２３４５６７８９".indexOf(valueNum[1])
      : Number(valueNum[1]);
    const on = Number(ordinal[1]);
    const id = `v${vn}-${on}`;
    const hit = POC_VALUE_ITEMS.find((v) => v.id === id);
    if (hit) return { themeId: hit.id, themeLabel: hit.label };
  }
  const heading = summary.match(/Value[０-９0-9][^\n]*?(?=の\d)/);
  return {
    themeId: "",
    themeLabel: heading?.[0]?.trim() ?? "",
  };
}

/** 要約は複数行にまたがることがある（共有頂きましたが次行）。 */
function extractSummary(block: string[]): {
  summary: string;
  afterIndex: number;
} | null {
  const start = block.findIndex((l) => /行動指針について/.test(l));
  if (start < 0) return null;
  const parts = [block[start].trim()];
  let end = start;
  if (!/共有頂|考察頂|表明頂|頂きました/.test(parts[0])) {
    for (let i = start + 1; i < Math.min(start + 4, block.length); i++) {
      const line = block[i].trim();
      if (!line) continue;
      parts.push(line);
      end = i;
      if (/共有頂|考察頂|表明頂|頂きました/.test(line)) break;
    }
  }
  const summary = parts.join("");
  if (!/共有頂|考察頂|表明頂|頂きました/.test(summary)) return null;
  return { summary, afterIndex: end + 1 };
}

type ParsedReview = {
  presenterName: string;
  opener: string;
  summary: string;
  leaderNote: string;
  closing: string;
  links: { title: string; url: string }[];
  sourcePost: string;
  fullText: string;
};

function parseReviews(text: string): ParsedReview[] {
  const lines = text.split(/\n/);
  const thanksIdx: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (isThanksLine(lines[i])) thanksIdx.push(i);
  }

  const out: ParsedReview[] = [];
  const seen = new Set<string>();

  for (let t = 0; t < thanksIdx.length; t++) {
    const start = thanksIdx[t];
    const nextThanks = thanksIdx[t + 1] ?? lines.length;
    const block = lines.slice(start, nextThanks).filter((l) => !isMetaLine(l));
    if (!block.length) continue;

    const opener = block[0].trim();
    const presenterName = presenterFromThanks(opener);
    const extracted = extractSummary(block);
    if (!extracted) continue;
    const { summary, afterIndex } = extracted;
    const key = summary.slice(0, 100);
    if (seen.has(key)) continue;
    seen.add(key);

    const after = block.slice(afterIndex);
    const links: { title: string; url: string }[] = [];
    const noteLines: string[] = [];
    let closing = "";

    for (let i = 0; i < after.length; i++) {
      const line = after[i].trim();
      if (line.startsWith("♯") || line.startsWith("#")) {
        const title = line.replace(/^[♯#]\s*/, "").trim();
        const url = (after[i + 1] ?? "").trim();
        if (url.startsWith("http")) {
          links.push({ title, url });
          i++;
          continue;
        }
      }
      if (
        /^(皆さんと|諸々ご負担|一緒にやって|このバリューの中で)/.test(line)
      ) {
        closing = line;
        const rest = after
          .slice(i + 1)
          .map((l) => l.trim())
          .filter(Boolean);
        if (
          rest.length &&
          rest[0].length < 100 &&
          !rest[0].startsWith("http")
        ) {
          closing = [closing, rest[0]].join("\n");
        }
        break;
      }
      noteLines.push(line);
    }

    const leaderNote = noteLines.join("\n").trim();
    if (!leaderNote) continue;

    const prevEnd = t === 0 ? 0 : thanksIdx[t - 1];
    const sourceLines = lines
      .slice(prevEnd === 0 ? 0 : prevEnd, start)
      .map((l) => l.trim())
      .filter((l) => l && !isMetaLine(l) && !isThanksLine(l));
    let srcStart = 0;
    for (let i = sourceLines.length - 1; i >= 0; i--) {
      if (
        /Value[０-９0-9]/.test(sourceLines[i]) ||
        /^テーマは/.test(sourceLines[i]) ||
        /^\d+\s*[-－]\s*[①-⑩]/.test(sourceLines[i])
      ) {
        srcStart = Math.max(0, i - 2);
        break;
      }
    }
    const sourcePost = sourceLines.slice(srcStart).join("\n").trim();
    const fullText = [opener, "", summary, "", leaderNote, "", closing]
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    out.push({
      presenterName,
      opener,
      summary,
      leaderNote,
      closing: closing || "皆さんと一緒にやっていきましょう。",
      links,
      sourcePost,
      fullText,
    });
  }
  return out;
}

function seedDate(index: number, total: number): string {
  const end = new Date("2026-08-07T12:00:00+09:00");
  const d = new Date(end);
  d.setDate(end.getDate() - (total - 1 - index));
  return d.toISOString().slice(0, 10);
}

loadEnvLocal();

if (!isDatabaseConfigured()) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

await ensureReviewsSchema();
const db = sql();

const delSmoke =
  await db`DELETE FROM reviews WHERE theme_id = 'smoke' RETURNING id`;
const delSeed =
  await db`DELETE FROM reviews WHERE keywords = ${SEED_TAG} RETURNING id`;
console.log("cleared smoke", delSmoke.length, "old seed", delSeed.length);

const raw = readFileSync(SAMPLE_PATH, "utf8");
const parsed = parseReviews(stripLineNumbers(raw));
console.log("parsed reviews", parsed.length);

let ok = 0;
for (let i = 0; i < parsed.length; i++) {
  const item = parsed[i];
  const theme = findTheme(item.summary);
  await saveReviewHistory({
    presenterName: item.presenterName,
    themeId: theme.themeId,
    themeLabel: theme.themeLabel || item.summary.slice(0, 40),
    sourcePost: item.sourcePost.slice(0, 4000),
    opener: item.opener,
    summary: item.summary,
    leaderNote: item.leaderNote,
    closing: item.closing,
    links: item.links,
    fullText: item.fullText,
    keywords: SEED_TAG,
    researchBrief:
      "provisional seed from sample-20260808.txt; delete oldest seed rows as real history accumulates",
    reviewDate: seedDate(i, parsed.length),
  });
  ok++;
  console.log(
    `  ${i + 1}. ${seedDate(i, parsed.length)} ${item.presenterName} · ${theme.themeId || "?"} · ${theme.themeLabel || "(no theme)"}`,
  );
}

const count = await db`SELECT count(*)::int AS n FROM reviews`;
console.log("inserted", ok, "total rows", count[0]?.n);
