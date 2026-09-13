# Color Restore — Ball Sort Puzzle

色を揃えるたび、モノクロの Garden・Ocean・City に色が戻る、モバイルファーストのボールソートパズルです。

## Play

ビルドや依存パッケージは不要です。`index.html` を開くか、静的 HTTP サーバーを起動してください。

```bash
python3 -m http.server 8000
```

`http://localhost:8000/` を開きます。相対パスだけを使用しているため、そのまま GitHub Pages に公開できます。

## Features

- 解答可能な全85ステージ、11ワールド、ロック解除とベスト手数
- 1操作につき最上段のボール1個を、空の筒か同じ色のボールの上へ移動、Undo、Restart、Hint
- `localStorage` (`colorRestoreSave`) への安全な進捗保存
- 初回チュートリアル、紙吹雪、サウンド、振動、Color Restore 演出
- HTML5 / CSS3 / Vanilla JavaScript のみ。外部通信・ビルド不要

## Stage design

Garden のチュートリアル後は、交互色・分断色の盤面へ移行します。Stage 14 以降は空チューブを1本に制限し、6色から8色へ段階的に増やして、一時退避と取り出し順の計画を必要とする固定盤面にしています。移動先が空の場合、または移動元と移動先の最上段が同じ色で、移動先が満杯でない場合だけ移動できます。異なる色の上には置けません。全85ステージには、本番ルールで生成した開発用ソルバーの解法証明を保持し、テストで全手をリプレイして解答可能性を検証します。Hint は詰み判定と同じ本番の合法手判定を使う幅優先探索から、最短クリア距離を必ず1減らす操作だけを提示します。同距離では安定した順序で決定し、探索が完了しない場合は安全のため代替操作を表示しません。

### Advanced levels 31–85

- Level 31–35: 8色・空きチューブ1本の高難度盤面
- Level 36–40: 1本に5個入るトールチューブ
- Level 41–45: 1色完成すると永久解放される鍵付きチューブ
- Level 46–50: 指定された色を指定ゴールへ完成させる目標チューブ
- Level 51–55: 最短手数を基準に余裕が5手から1手へ狭まる規定手数チャレンジ
- Level 56–60: 指定色の完成順に1〜3本を段階解放する連鎖アンロック
- Level 61–65: 盤面を上下反転し、底側のボールへアクセスする FLIP LAB
- Level 66–70: 無色球の完成色を自分で決め、解答を組み立てる COLOR FORGE
- Level 71–75: 入口へ入れた1球を対になる出口へ即時転送し、移動経路を設計する PORTAL TUBES
- Level 76–80: 完成した注文色を出荷し、予告済みの次便を迎える SORT & SERVE
- Level 81–85: 同じ色を連続して重ね、次の1手で同色ブロックを運ぶ COMBO FLOW

鍵・指定ゴール・連鎖アンロック・FLIP・COLOR FORGE・PORTAL TUBES・SORT & SERVE・COMBO FLOWは通常操作、Undo、Restart、詰み判定、Hintで同じ本番ルールを共有します。連鎖中は各ロックに必要色と段階を表示し、解放進行もUndoで正確に戻ります。FLIPはステージごとに1〜2回だけ使え、全チューブのボール順を一斉に反転します。COLOR FORGEはトップの無色球1個を、明示された顔料候補から選んだ色へ確定します。PORTAL TUBESは通常ルールで入口へ移した1球を、空きのある出口へ即時転送します。入口・出口は同じ記号と接続線で示し、転送全体を1手・1履歴として扱います。Level 71〜75ではポータルを使わない探索がすべて解なしとなり、最短手数は7→20→21→23→24手です。Level 75は2ポータルに加え、FLIPと2色の染色もすべて必須です。

SORT & SERVEでは、各DOCKの現在注文、到着時の積荷、次便の順番を文字と色付き球で常時表示します。指定色4個がDOCKで完成すると、その4個の出荷と予告済み積荷の到着を1手・1履歴で確定します。出荷済み数と待機キューはSolverの状態キーに含まれるため、Hint・詰み判定・Undoも実画面と同じ到着後状態を評価します。Level 76〜80の最短手数は5→6→7→17→21手で、Level 78は2つの出荷順を選択でき、Level 79は2本の独立キュー、Level 80は必須のFLIPと組み合わせます。

COMBO FLOWでは、同じ色の球を、その色が最上段にある筒へ連続して移すとゲージが増えます。途中で空の筒へ移す、別の色へ切り替える、FLIPなどの特殊操作を行うと充填中のゲージはリセットされます。規定値に達したFLOWは選択待ちでは消えず、次の合法な筒移動で、トップに連続する同色球を移動先の空き容量までまとめて運びます。移動元を選ぶと各合法な移動先へ `FLOW ×2`、`FLOW ×3`、`RESET`、`色替え` を事前表示します。ゲージ・FLOW保有・使用回数・直前の移動球数はUndo、Restart、Hint、Solverの状態へ統合されています。Level 81〜85の最短手数は7→9→11→13→15手で、Level 82はFLOWの使用先を選び、Level 83は3連続を維持し、Level 84は2回使用、Level 85は必須のFLIPと指定色ゴールを組み合わせます。

## Development analysis

依存パッケージなしで、オリジナル30面の詳細解析と全85面の検証を実行できます。

```bash
node tools/analyze-levels.js --state-limit=5000
node tests/logic.test.js
node tests/advanced-levels.test.js
node tests/flip-levels.test.js
node tests/forge-levels.test.js
node tests/portal-levels.test.js
node tests/serve-levels.test.js
node tests/combo-levels.test.js
node tools/find-serve-levels.js
node tools/find-combo-levels.js
```

Analyzer は別ルールを実装せず `js/game.js` を VM で読み込み、本番の `isLegalMove` / `applyMove` / `isCleared` / `stateKey` を直接使います。チューブ順を正規化した BFS、解答証明のリプレイ、合法手分岐、強制手、空チューブ依存、完成チューブの崩し、終端詰みを計測します。大規模探索コードは `tools/` だけにあり、本番 HTML から読み込まれません。結果は [`docs/level-analysis.md`](docs/level-analysis.md) と機械可読な [`docs/level-analysis.json`](docs/level-analysis.json) に生成されます。設計判断と既知の制約は [`docs/solver-audit.md`](docs/solver-audit.md) を参照してください。

## Level generation research pipeline

候補の生成、production-rule Solver 評価、canonical dedup、score、reject、難易度帯別 ranking は次のコマンドで再実行できます。

```bash
node tools/generate-levels.js --count=10000 --seed=20260812 --state-limit=60 --max-states=4000
node tools/generate-levels.js --count=10000 --colors=7 --empty=1 --shuffle-depth=24 --seed=1234
```

`--colors` と `--empty` を省略すると Easy〜Final 用の構成を均等に生成します。seed は盤面を完全再現し、`artifacts/candidates/checkpoint.jsonl` は候補ごと、`progress.json` は定期的に更新されるため、中断時も処理済み結果が残ります。探索処理は Node 専用でゲーム本体からロードされません。今回の 10,000 件の実測、score 式、reject 内訳、既存30面との比較は [`docs/generator-report.md`](docs/generator-report.md) に記録しています。


## Hint safety verification (Issue #23)

`node tests/hint-safety.test.js` は全30面の到達可能16,708局面を逆向きBFSで分類し、解あり非クリア15,857局面すべてで、推奨可能な次手が本番ルールで合法、別状態、解あり、かつ最短距離を1減らすことを検証します。さらに本番Hint探索だけを反復して30/30面を最短手数でクリアし、ループと解なし誘導がないこと、および Level 14/20/26/28 の既知の危険初手を回帰検証します。

2026-08-13 の Node.js 実測は15,857/15,857局面成功、Hintのみ30/30面成功、最大探索3,265局面・316.38ms、全テスト5.48秒でした。ブラウザー性能は端末依存ですが、UIは6ms単位で探索を分割してイベントループへ制御を戻し、1.2秒で安全に打ち切ります。実機Android Chrome/iPhone Safariの自動計測環境はなく、pointer操作自体には変更を加えていません。
