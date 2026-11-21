<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 作業前の必読（最小限）

1. まず `docs/program.md`（全体企画）と `docs/status.md`（現在地）を読む。
2. 詳しい仕様は正本をツールで読みに行く（ここに複製しない）。
   - レビュー構成・味：`.claude/skills/drafting-daily-reviews/SKILL.md`
   - ローテ規則：`.claude/skills/rotation-fair-assign/SKILL.md`
   - 実ローテ実績：`src/lib/rotation/seed.ts`（文書へ手書き複製しない）
3. 実名・理念全文・実チャット・API キーはリポジトリに書かない。
4. 仕様や現実が変わったら古い記述を残さず上書きする（経緯は Git 履歴に任せる）。
5. アプリの挙動を変えたコミットでは `.cursor/rules/app-changelog.mdc` に従い `node scripts/write-app-changelog.mjs` で改修履歴を更新する。

