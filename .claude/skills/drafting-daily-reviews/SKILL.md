---
name: drafting-daily-reviews
description: メンバーの振り返り投稿へのレビューを、実運用の構成（お礼→要約→所感→任意リンク→締め）で下書きする。要約はリーダー理解の体裁で浸透リレー実践の事実を見せ、所感は共感・指針引きつけ・具体提案・薄い問い（理念浸透）。value-duty-review／Gemini ハーネス用。「レビュー要約を作って」「毎日レビューの下書き」「レビュー構成」「drafting-daily-reviews」と依頼された際に使用する。
---

# 毎日レビュー下書き（構成＋要約／所感分担）

当番メンバーの振り返りに、リーダーとして返す文を下書きする。  
提案文書スキル（`writing-proposals`）は使わない。

## 依存

| 何 | どこ |
|----|------|
| **構成ルール（SSoT）** | [references/structure.md](references/structure.md) |
| 出力の味（SSoT） | [references/output-taste.md](references/output-taste.md) |
| 実プロセス・段階UI | 卒業制作 `DECISIONS.md` §2a（personal-visual-explainers） |
| 組み立て・スタブ実装 | `src/lib/review/draft.ts` / `generate.ts` / `POST /api/review/draft` |
| プロンプト | `src/lib/review/prompts.ts` |
| 評価の見方 | [references/eval-scenarios.md](references/eval-scenarios.md) |
| **投稿前チェック** | [references/final-check.md](references/final-check.md)（アプリ通読＋Cursorサブエージェント） |

## 入力（優先順）

1. 投稿本文（必須）
2. 発表者の呼び名（お礼用・必須）
3. 今日のテーマ（Value帯・枝・何番目が分かると要約が安定）
4. 観点メモ（任意）
5. 参考リンク候補（任意・採否はトシオ）

## ワークフロー

- [ ] 1. [structure.md](references/structure.md) を読む（並び・役割分担・入れないもの）
- [ ] 2. [output-taste.md](references/output-taste.md) を読む
- [ ] 3. お礼 → 要約共有 → 所感・着想 を書く
- [ ] 4. リンクは採択分だけ（無ければスキップ）
- [ ] 5. 締めの呼びかけ
- [ ] 6. [final-check.md](references/final-check.md) に従い投稿前チェック（定型二重・ですね等）。Cursor上ならサブエージェントに全文を渡して報告させる
- [ ] 7. 不合格の典型・「入れないもの」に当たってないか自己チェック

## 生成時のルール（短く）

- **構成**は structure の必須順を崩さない
- **要約**＝リーダー理解として、浸透リレー実践の事実を見せる（お礼・実感フレーズは書かない）
- **所感**＝寄り添いカジュアルで、共感 → 同テーマ前回は『同テーマ前回の〇〇さんは、『…』といっていて、』で引用＋接続 → 検索して調べた結果を織った組織への「こうしたら？」（布教禁止。個人宿題禁止。『調べた要点』『前回の〇〇さん』は本文に出さない）
- **締め**＝奨励・考える余白（所感の提案は復唱しない）
- **トーン**＝上司として近い距離。皮肉・減点・宣教師口調禁止。所感の「ですね」は可／要約では禁止
- POC／実装の話を本文に書かない

## アプリとの関係

- 要約本線は **`POST /api/review/draft` `kind=summary`（Gemini＝あっさり／こってり 2案）**
- 要約直しは **`kind=summary-revise`（専用プロンプト）**。厚く≈1.2倍（投稿に無い事実は足さない）／簡潔≈0.8倍。初回の字数制限は適用しない
- 所感本線は **同 API `kind=leader`（常に Gemini。同テーマの前回コメントを渡す）**。stub は退避のみ
- `lens` は要約を厚くする。`researchFocus` は所感専用
- 構成の正は structure。ローテは別スキル `rotation-fair-assign`
- **要約方針は本スキル＋`prompts.ts` でロック**（触るときは structure／taste と一緒に）
