/**
 * keywords=__seed__:sample-20260808 のシード履歴を Neon から消す。
 * 本番コピーが貯まってから使う。誤実行防止で CONFIRM_DELETE_SEED=1 が必須。
 *
 * Usage: CONFIRM_DELETE_SEED=1 npx tsx scripts/delete-seed-history.mts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ensureReviewsSchema, isDatabaseConfigured, sql } from "../src/lib/db/neon.ts";

const SEED_TAG = "__seed__:sample-20260808";

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

async function main() {
  loadEnvLocal();
  if (process.env.CONFIRM_DELETE_SEED?.trim() !== "1") {
    console.error("Refusing: set CONFIRM_DELETE_SEED=1");
    process.exit(1);
  }
  if (!isDatabaseConfigured()) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  await ensureReviewsSchema();
  const db = sql();
  const deleted = await db`
    DELETE FROM reviews
    WHERE keywords = ${SEED_TAG}
    RETURNING id
  `;
  console.log(`deleted ${deleted.length} seed row(s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
