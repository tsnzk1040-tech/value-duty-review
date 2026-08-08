-- value-duty-review: reviews（履歴正本・Neon最小）
-- アプリ起動時にも CREATE IF NOT EXISTS する。手動実行用の正本。

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
);

CREATE INDEX IF NOT EXISTS reviews_theme_created
  ON reviews (theme_id, created_at DESC);

CREATE INDEX IF NOT EXISTS reviews_presenter_created
  ON reviews (presenter_name, created_at DESC);

CREATE INDEX IF NOT EXISTS reviews_created
  ON reviews (created_at DESC);
