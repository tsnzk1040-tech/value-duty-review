# value-duty-review（企業理念リレー）

管理本部の企業理念浸透リレー（毎日レビュー下書き＋月次ローテ設計）を、通勤中でも手早く回すための自分用モバイル Web アプリ。

## まず見る場所

- 全体企画・SSoT の地図：[`docs/program.md`](docs/program.md)
- 現在の稼働状況・次の一手：[`docs/status.md`](docs/status.md)
- 保留中のアイデア：[`ideas-parking.md`](ideas-parking.md)
- AI エージェント向け最小指示：[`AGENTS.md`](AGENTS.md)

## 主な画面

| パス | 役割 |
|------|------|
| `/` | `/review` へリダイレクト |
| `/review` | 毎日レビューの下書き作成（お礼→要約→調べる→所感→締め→最終チェック） |
| `/rotation` | 日別ローテの公平アサイン・手直し・ノート貼付用コピー |
| `/history` | 端末内に保存したレビュー履歴の確認 |
| `/settings` | マスタ設定・理念チャートの端末取込・認証設定・改修履歴 |
| `/share-target` | PWA 共有の受け口 |

## スタックとデータ方針

- **スタック**：Next.js App Router（16）／TypeScript／Tailwind CSS v4／shadcn/ui（base-nova）／Gemini API
- **データ保存**：マスタ・レビュー履歴・理念チャートはすべて **端末の `localStorage`**。外部 DB は使わない。
- **秘密情報**：API キー・理念全文・実名・実チャットはリポジトリに置かない。環境変数は `.env.local`（`.gitignore` 済み、雛形は `.env.example`）。

## コマンド

```bash
npm run dev    # 開発サーバー起動
npm run build  # 本番ビルド（改修履歴 JSON の更新を含む）
npm run lint   # ESLint
```
