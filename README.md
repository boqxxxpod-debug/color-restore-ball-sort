# Color Restore — Ball Sort Puzzle

色を揃えるたび、モノクロの Garden・Ocean・City に色が戻る、モバイルファーストのボールソートパズルです。

## Play

ビルドや依存パッケージは不要です。`index.html` を開くか、静的 HTTP サーバーを起動してください。

```bash
python3 -m http.server 8000
```

`http://localhost:8000/` を開きます。相対パスだけを使用しているため、そのまま GitHub Pages に公開できます。

## Features

- 解答可能な全30ステージ、3ワールド、ロック解除とベスト手数
- 1操作につき最上段のボール1個を、空の筒か同じ色のボールの上へ移動、Undo、Restart、Hint
- `localStorage` (`colorRestoreSave`) への安全な進捗保存
- 初回チュートリアル、紙吹雪、サウンド、振動、Color Restore 演出
- HTML5 / CSS3 / Vanilla JavaScript のみ。外部通信・ビルド不要

## Stage design

Garden のチュートリアル後は、交互色・分断色の盤面へ移行します。Stage 14 以降は空チューブを1本に制限し、6色から8色へ段階的に増やして、一時退避と取り出し順の計画を必要とする固定盤面にしています。移動先が空の場合、または移動元と移動先の最上段が同じ色で、移動先が満杯でない場合だけ移動できます。異なる色の上には置けません。全30ステージには、この1手で1個だけ移動するルールで生成した開発用ソルバーの解法証明を保持し、テストで全手を本番の合法手判定によりリプレイして解答可能性を検証します。Hint も同じ合法手判定と1個移動を前提に、目先の1手だけでなく次の手まで評価し、完成済みチューブを不用意に崩さない候補を提示します。

## Development analysis

依存パッケージなしで、全レベルの再解析とテストを実行できます。

```bash
node tools/analyze-levels.js --state-limit=5000
node tests/logic.test.js
```

Analyzer は別ルールを実装せず `js/game.js` を VM で読み込み、本番の `isLegalMove` / `applyMove` / `isCleared` / `stateKey` を直接使います。チューブ順を正規化した BFS、解答証明のリプレイ、合法手分岐、強制手、空チューブ依存、完成チューブの崩し、終端詰みを計測します。大規模探索コードは `tools/` だけにあり、本番 HTML から読み込まれません。結果は [`docs/level-analysis.md`](docs/level-analysis.md) と機械可読な [`docs/level-analysis.json`](docs/level-analysis.json) に生成されます。設計判断と既知の制約は [`docs/solver-audit.md`](docs/solver-audit.md) を参照してください。

## Level generation research pipeline

候補の生成、production-rule Solver 評価、canonical dedup、score、reject、難易度帯別 ranking は次のコマンドで再実行できます。

```bash
node tools/generate-levels.js --count=10000 --seed=20260812 --state-limit=60 --max-states=4000
node tools/generate-levels.js --count=10000 --colors=7 --empty=1 --shuffle-depth=24 --seed=1234
```

`--colors` と `--empty` を省略すると Easy〜Final 用の構成を均等に生成します。seed は盤面を完全再現し、`artifacts/candidates/checkpoint.jsonl` は候補ごと、`progress.json` は定期的に更新されるため、中断時も処理済み結果が残ります。探索処理は Node 専用でゲーム本体からロードされません。今回の 10,000 件の実測、score 式、reject 内訳、既存30面との比較は [`docs/generator-report.md`](docs/generator-report.md) に記録しています。
