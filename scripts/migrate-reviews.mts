import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ensureReviewsSchema, isDatabaseConfigured } from "../src/lib/db/neon.ts";

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

loadEnvLocal();

if (!isDatabaseConfigured()) {
  console.error("DATABASE_URL missing in .env.local");
  process.exit(1);
}

await ensureReviewsSchema();
console.log("reviews schema ready");
