---
name: drafting-daily-reviews
description: メンバーの振り返り投稿へのレビューを、実運用の構成（お礼→要約→所感→任意リンク→締め）とシンプル要約＋少し褒めの方針で下書きする。value-duty-review／将来 Gemini ハーネス用。「レビュー要約を作って」「毎日レビューの下書き」「レビュー構成」「drafting-daily-reviews」と依頼された際に使用する。
---

# 毎日レビュー下書き（構成＋要約＋少し褒め）

当番メンバーの振り返りに、リーダーとして返す文を下書きする。  
提案文書スキル（`writing-proposals`）は使わない。

## 依存

| 何 | どこ |
|----|------|
| **構成ルール（SSoT）** | [references/structure.md](references/structure.md) |
| 出力の味（SSoT） | [references/output-taste.md](references/output-taste.md) |
| 実プロセス・段階UI | 卒業制作 `DECISIONS.md` §2a（personal-visual-explainers） |
| 組み立て・スタブ実装 | `src/lib/review/draft.ts`（追従中。構成の正は structure） |
| 評価の見方 | [references/eval-scenarios.md](references/eval-scenarios.md) |

## 入力（優先順）

1. 投稿本文（必須）
2. 発表者の呼び名（お礼用・必須）
3. 今日のテーマ（Value帯・枝・何番目が分かると要約が安定）
4. 観点メモ（任意）
5. 参考リンク候補（任意・採否はトシオ）

## ワークフロー

- [ ] 1. [structure.md](references/structure.md) を読む（並び・入れないもの）
- [ ] 2. [output-taste.md](references/output-taste.md) を読む
- [ ] 3. お礼 → 要約共有 → 所感・着想 を書く
- [ ] 4. リンクは採択分だけ（無ければスキップ）
- [ ] 5. 締めの呼びかけ
- [ ] 6. 不合格の典型・「入れないもの」に当たってないか自己チェック

## 生成時のルール（短く）

- **構成**は structure の必須順を崩さない
- **要約**＝言い換え。全文再掲禁止
- **褒め**＝大げさにせず、具体かテーマ接続が分かる
- **トーン**＝職場グループ向け。皮肉・減点しない
- POC／実装の話を本文に書かない

## アプリとの関係

- UI スタブ（`stubDraftSummary` 等）は同方針の近似。**構成の正は structure**
- Gemini 差し替え時は本スキル一式をハーネスにする
- ローテは別スキル `rotation-fair-assign`
