import {
  ensureReviewsSchema,
  isDatabaseConfigured,
  REVIEW_HISTORY_LIMIT,
  sql,
} from "@/lib/db/neon";

export type ReviewHistoryLink = {
  title: string;
  url: string;
};

export type ReviewHistoryRecord = {
  id: string;
  createdAt: string;
  reviewDate: string;
  presenterName: string;
  themeId: string;
  themeLabel: string;
  sourcePost: string;
  opener: string;
  summary: string;
  leaderNote: string;
  closing: string;
  links: ReviewHistoryLink[];
  fullText: string;
  keywords: string;
  researchBrief: string;
};

export type SaveReviewHistoryInput = {
  presenterName: string;
  themeId: string;
  themeLabel: string;
  sourcePost: string;
  opener: string;
  summary: string;
  leaderNote: string;
  closing: string;
  links: ReviewHistoryLink[];
  fullText: string;
  keywords?: string;
  researchBrief?: string;
  reviewDate?: string;
};

type ReviewRow = {
  id: string;
  created_at: string | Date;
  review_date: string | Date;
  presenter_name: string;
  theme_id: string;
  theme_label: string;
  source_post: string;
  opener: string;
  summary: string;
  leader_note: string;
  closing: string;
  links_json: ReviewHistoryLink[] | string;
  full_text: string;
  keywords: string;
  research_brief: string;
};

function toIsoDate(value: string | Date): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function toIsoDateTime(value: string | Date): string {
  if (typeof value === "string") return value;
  return value.toISOString();
}

function parseLinks(raw: ReviewHistoryLink[] | string): ReviewHistoryLink[] {
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw) as ReviewHistoryLink[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapRow(row: ReviewRow): ReviewHistoryRecord {
  return {
    id: row.id,
    createdAt: toIsoDateTime(row.created_at),
    reviewDate: toIsoDate(row.review_date),
    presenterName: row.presenter_name,
    themeId: row.theme_id,
    themeLabel: row.theme_label,
    sourcePost: row.source_post,
    opener: row.opener,
    summary: row.summary,
    leaderNote: row.leader_note,
    closing: row.closing,
    links: parseLinks(row.links_json),
    fullText: row.full_text,
    keywords: row.keywords,
    researchBrief: row.research_brief,
  };
}

export async function saveReviewHistory(
  input: SaveReviewHistoryInput,
): Promise<ReviewHistoryRecord> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not set");
  }
  await ensureReviewsSchema();
  const db = sql();
  const id = crypto.randomUUID();
  const links = input.links ?? [];
  const reviewDate = input.reviewDate?.slice(0, 10) || null;

  const rows = reviewDate
    ? await db`
        INSERT INTO reviews (
          id, review_date, presenter_name, theme_id, theme_label,
          source_post, opener, summary, leader_note, closing,
          links_json, full_text, keywords, research_brief
        ) VALUES (
          ${id},
          ${reviewDate}::date,
          ${input.presenterName.trim()},
          ${input.themeId.trim()},
          ${input.themeLabel.trim()},
          ${input.sourcePost},
          ${input.opener},
          ${input.summary},
          ${input.leaderNote},
          ${input.closing},
          ${JSON.stringify(links)}::jsonb,
          ${input.fullText},
          ${input.keywords?.trim() ?? ""},
          ${input.researchBrief?.trim() ?? ""}
        )
        RETURNING *
      `
    : await db`
        INSERT INTO reviews (
          id, presenter_name, theme_id, theme_label,
          source_post, opener, summary, leader_note, closing,
          links_json, full_text, keywords, research_brief
        ) VALUES (
          ${id},
          ${input.presenterName.trim()},
          ${input.themeId.trim()},
          ${input.themeLabel.trim()},
          ${input.sourcePost},
          ${input.opener},
          ${input.summary},
          ${input.leaderNote},
          ${input.closing},
          ${JSON.stringify(links)}::jsonb,
          ${input.fullText},
          ${input.keywords?.trim() ?? ""},
          ${input.researchBrief?.trim() ?? ""}
        )
        RETURNING *
      `;

  return mapRow(rows[0] as ReviewRow);
}

export async function listRecentReviews(
  limit = REVIEW_HISTORY_LIMIT,
): Promise<ReviewHistoryRecord[]> {
  if (!isDatabaseConfigured()) return [];
  await ensureReviewsSchema();
  const db = sql();
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const rows = await db`
    SELECT * FROM reviews
    ORDER BY created_at DESC
    LIMIT ${safeLimit}
  `;
  return (rows as ReviewRow[]).map(mapRow);
}

/** 同テーマ or 同担当の直近（ソフト重複・所感一貫性の材料）。 */
export async function listRelatedReviews(input: {
  themeId?: string;
  presenterName?: string;
  limit?: number;
}): Promise<ReviewHistoryRecord[]> {
  if (!isDatabaseConfigured()) return [];
  await ensureReviewsSchema();
  const db = sql();
  const safeLimit = Math.min(Math.max(input.limit ?? 10, 1), 30);
  const themeId = input.themeId?.trim() ?? "";
  const presenterName = input.presenterName?.trim() ?? "";

  if (!themeId && !presenterName) {
    return listRecentReviews(safeLimit);
  }

  if (themeId && presenterName) {
    const rows = await db`
      SELECT * FROM reviews
      WHERE theme_id = ${themeId} OR presenter_name = ${presenterName}
      ORDER BY created_at DESC
      LIMIT ${safeLimit}
    `;
    return (rows as ReviewRow[]).map(mapRow);
  }

  if (themeId) {
    const rows = await db`
      SELECT * FROM reviews
      WHERE theme_id = ${themeId}
      ORDER BY created_at DESC
      LIMIT ${safeLimit}
    `;
    return (rows as ReviewRow[]).map(mapRow);
  }

  const rows = await db`
    SELECT * FROM reviews
    WHERE presenter_name = ${presenterName}
    ORDER BY created_at DESC
    LIMIT ${safeLimit}
  `;
  return (rows as ReviewRow[]).map(mapRow);
}
