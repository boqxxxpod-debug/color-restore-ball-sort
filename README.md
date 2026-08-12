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
