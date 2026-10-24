#!/usr/bin/env node
/**
 * 設定の「改修履歴」ページ用。
 * 新しい順に残す。先頭の head は、このビルドのコミット
 * （リポと Vercel のデプロイを照合する番号）。
 * 浅い clone でも、JSON に残っている行は落ちない。
 *
 * このリポの過去コミットは feat / fix ではじまらない。
 * 画面に出すのは、パークと docs 以外。feat / fix の接頭辞は外して残す。
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(import.meta.dirname, "..", "src", "lib", "app-changelog.json");
const ROOT = join(import.meta.dirname, "..");
const FEAT = /^(feat|fix)(\([^)]*\))?!?:\s*/;

function hideFromHistory(subject) {
  return (
    /^パーク[:：]/.test(subject) ||
    /^park\b/i.test(subject) ||
    /^docs(\(|[:：]|\s)/i.test(subject) ||
    /^merge\b/i.test(subject)
  );
}

function loadExisting() {
  try {
    const raw = JSON.parse(readFileSync(OUT, "utf8"));
    const entries = Array.isArray(raw)
      ? raw
      : Array.isArray(raw.entries)
        ? raw.entries
        : [];
    const head = typeof raw.head === "string" ? raw.head : "";
    return { head, entries };
  } catch {
    return { head: "", entries: [] };
  }
}

function git(command) {
  return execSync(command, { encoding: "utf8", cwd: ROOT }).trim();
}

function fromGit() {
  const text = git(
    "git log --abbrev=7 --pretty=format:%h%x09%ad%x09%s --date=short",
  );
  if (!text) return [];
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, date, ...rest] = line.split("\t");
      return { hash, date, subject: rest.join("\t") };
    })
    .filter(
      (entry) =>
        entry.hash &&
        entry.date &&
        entry.subject &&
        !hideFromHistory(entry.subject),
    )
    .map((entry) => ({
      hash: entry.hash,
      date: entry.date,
      subject: entry.subject.replace(FEAT, ""),
    }));
}

function isEntry(entry) {
  return (
    entry &&
    typeof entry.hash === "string" &&
    typeof entry.date === "string" &&
    typeof entry.subject === "string" &&
    entry.subject.length > 0
  );
}

const existing = loadExisting();
let head = existing.head;
let fresh = [];
try {
  head = git("git rev-parse --short=7 HEAD") || existing.head;
  fresh = fromGit();
} catch (error) {
  console.warn(
    "write-app-changelog: git を読めなかったので、既存の履歴を使う",
  );
  console.warn(error instanceof Error ? error.message : error);
}

const seen = new Set();
const merged = [];
for (const entry of [...fresh, ...existing.entries]) {
  if (!isEntry(entry) || seen.has(entry.hash)) continue;
  seen.add(entry.hash);
  merged.push({
    hash: entry.hash,
    date: entry.date,
    subject: entry.subject,
  });
}

const next = { head, entries: merged };
writeFileSync(OUT, `${JSON.stringify(next, null, 2)}\n`);
console.log(`write-app-changelog: ${next.head} / ${next.entries.length} 件`);
