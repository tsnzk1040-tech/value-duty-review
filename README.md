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

## POC 証拠（〜8/15）

1. 段階UIを通し、投稿用テキスト＋参考リンク付きがコピーできる  
2. 公平ルール付きで 1 サイクル分アサイン → ノート用コピーできる  
