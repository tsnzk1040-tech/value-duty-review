# value-duty-review

ADS 卒業制作用の **トシオ専用モバイル Web**。  
企業理念浸透の通勤運用（毎日レビュー＋日別ローテアサイン）を、アプリ内で回しやすくする。

## 設計の正本

範囲・段階UI・POC・公平ローテルールなどは学習リポ側:

`C:\Users\pc\personal-visual-explainers\docs\course\monthly\2026-08-graduation\DECISIONS.md`

このリポは **実装**。方針が変わったら先に DECISIONS を更新する。

## スタック

- Next.js App Router（16）
- TypeScript / Tailwind CSS v4
- shadcn/ui（base-nova）

## 画面の入口（予定）

| パス | 役割 |
|------|------|
| `/` | ホーム（今日のレビュー / ローテ） |
| `/review` | 毎日レビュー（段階UI） |
| `/rotation` | ローテアサイン（公平スキル） |

## 秘密情報

- API キー・理念全文・実名・実チャットはリポに置かない
- ローカルは `.env.local`（`.gitignore` 済み）。雛形は `.env.example`

## コマンド

```bash
npm run dev
npm run build
npm run lint
```

## POC 進捗

| 証拠 | 状態 |
|------|------|
| ローテ公平スキル → 1サイクル → 手直し → ノート用コピー | **済み**（`/rotation`・設定マスタ連動） |
| 設定 JSON（localStorage）＋認証ゲート | **済み**（`/settings`・`/login`） |
| 段階レビュー＋参考リンク | 未着手 |

### データ／認証

- マスタ正本: **localStorage**（JSON）。端末またぎなし
- バックアップ: 設定画面で JSON コピー／取り込み
- 認証: 設定でパスワード有効化（ハッシュ保存）。タブ単位の session 解除
- 理念全文はリポに置かない

ローテスキル正本: `.claude/skills/rotation-fair-assign/SKILL.md`  
実装: `src/lib/rotation/fair-assign.ts`