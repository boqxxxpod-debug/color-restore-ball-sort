# Level Generator / Solver / Ranker report

## Run and reproducibility

2026-08-12 に `node tools/generate-levels.js --count=10000 --seed=20260812 --state-limit=60 --max-states=4000` を実行した。依存なしの Node CLI で、乱数、色数、チューブ/空き数、shuffle depth、seed を指定できる。通常ゲームの JavaScript bundle には探索コードを追加していない。

| Generated | Solver evaluated | Canonically unique | Accepted | Wall time |
|---:|---:|---:|---:|---:|
| 10,000 | 10,000 | 7,381 | 5,902 | 12.2 s |

Reject は tube-order/color-shape duplicate 2,535、初期クリア 84、簡単すぎ 2、unsolvable 1,477、search limit 0、certificate invalid 0。全レコードは `artifacts/candidates/checkpoint.jsonl`、完了 checkpoint は `progress.json`、要約は `summary.json` に保存した。

## Metrics and scoring

全候補で solve 可否、証明手数、探索状態数、初期合法手、平均/最大分岐、dead end、重要分岐、cycle exclusion、空チューブ使用率、同色分散、上段同色pair、埋没率を保存する。Difficulty は `1.25 * solution length + 2.2 * average path branching + one-empty premium 12 + 25 * dead-end rate`（0〜100）。Quality は 5 前後の分岐を中心に、重要な選択と色分散を加点し、一本道、多すぎる分岐、循環を減点する（0〜100）。certificate は候補ごとに production `isLegalMove` / `applyMove` で再検証される。

## Ranking and current-level comparison

Quality、Difficulty の順で Easy 20、Normal 30、Hard 30、Expert 30、Final 20 を `rankings.json` に保存した。既存30面も同じ production rule analyzer で再評価し、30/30 が solve 可能、全証明手が合法、完全到達グラフ 16,708 状態を調査した（`docs/level-analysis.json`）。

候補探索は基盤の妥当性と大量処理を優先し、上位候補も既存後半面より色数が少ない。Level 1〜3 の tutorial progression と Level 30 の8色・42手を保つという条件を同時に、定量的かつ明確に改善すると証明できる候補はなかった。そのため差し替えは **なし** とした。無理な交換を避け、既存30面を維持したうえで全30面を再度 Solver 検証した。

## Artifacts

- `tools/level-pipeline.js`: seeded generator、canonical key、Solver、Analyzer/Scorer
- `tools/generate-levels.js`: batch CLI、incremental JSONL、checkpoint、reject、ranking
- `artifacts/candidates/`: 10,000 件の実行結果と各帯130件の上位候補
- `docs/level-analysis.{json,md}`: 現在30面の再評価

今後7〜8色を探索する場合は `--colors=7 --empty=1 --max-states=50000` のように上限を引き上げ、checkpoint をseed別ディレクトリへ出力する。今回、環境制約による打ち切りはなく10,000件を完遂した。
