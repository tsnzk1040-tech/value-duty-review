import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/** 2周分の目安（21営業日×2）。履歴一覧の既定上限。 */
export const REVIEW_HISTORY_LIMIT = 50;

let schemaReady: Promise<void> | null = null;

export function getDatabaseUrl(): string | null {
  const url = process.env.DATABASE_URL?.trim();
  return url || null;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}

export function sql(): NeonQueryFunction<false, false> {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return neon(url);
}

/** 起動時／初回クエリで reviews を用意（マイグレーション代替の最小）。 */
export async function ensureReviewsSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = sql();
      await db`
        CREATE TABLE IF NOT EXISTS reviews (
          id TEXT PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          review_date DATE NOT NULL DEFAULT CURRENT_DATE,
          presenter_name TEXT NOT NULL,
          theme_id TEXT NOT NULL DEFAULT '',
          theme_label TEXT NOT NULL DEFAULT '',
          source_post TEXT NOT NULL DEFAULT '',
          opener TEXT NOT NULL DEFAULT '',
          summary TEXT NOT NULL DEFAULT '',
          leader_note TEXT NOT NULL DEFAULT '',
          closing TEXT NOT NULL DEFAULT '',
          links_json JSONB NOT NULL DEFAULT '[]'::jsonb,
          full_text TEXT NOT NULL DEFAULT '',
          keywords TEXT NOT NULL DEFAULT '',
          research_brief TEXT NOT NULL DEFAULT ''
        )
      `;
      await db`
        CREATE INDEX IF NOT EXISTS reviews_theme_created
        ON reviews (theme_id, created_at DESC)
      `;
      await db`
        CREATE INDEX IF NOT EXISTS reviews_presenter_created
        ON reviews (presenter_name, created_at DESC)
      `;
      await db`
        CREATE INDEX IF NOT EXISTS reviews_created
        ON reviews (created_at DESC)
      `;
      // 同じ review_date は1件だけ（古い重複を消してから UNIQUE）
      await db`
        DELETE FROM reviews a
        USING reviews b
        WHERE a.review_date = b.review_date
          AND a.created_at < b.created_at
      `;
      await db`
        DELETE FROM reviews a
        USING reviews b
        WHERE a.review_date = b.review_date
          AND a.created_at = b.created_at
          AND a.id < b.id
      `;
      await db`
        CREATE UNIQUE INDEX IF NOT EXISTS reviews_review_date_unique
        ON reviews (review_date)
      `;
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
}
