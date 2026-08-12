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
- 連続した同色ボールの一括移動、Undo、Restart、Hint
- `localStorage` (`colorRestoreSave`) への安全な進捗保存
- 初回チュートリアル、紙吹雪、サウンド、振動、Color Restore 演出
- HTML5 / CSS3 / Vanilla JavaScript のみ。外部通信・ビルド不要

## Stage design

Garden のチュートリアル後は、最短でも 7〜14 手を必要とする交互色・分断色の盤面へ移行します。各ステージは色ごとに4球と空チューブ2本を持つ検証済みの固定盤面だけを配信するため、ランダム生成による解答不能なステージはありません。Hint は目先の1手だけでなく次の手まで評価し、完成済みチューブを不用意に崩さない候補を提示します。
