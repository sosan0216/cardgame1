# cardgame1

簡単な協力型カードゲームのサンプルです。

## 使い方

1. このフォルダーで依存関係をインストールします。

```bash
npm install
```

2. サーバーを起動します。

```bash
npm start
```

3. ブラウザで次のURLを開きます。

```
http://localhost:3000
```

4. プレイヤー名とキャラクターを選んで、ルームを作成または参加します。

## ファイル構成

- `src/index.html` - ゲームの画面
- `src/style.css` - シンプルな見た目
- `src/client.js` - ゲームロジックと socket.io の通信
- `server.js` - socket.io のサーバーと静的ファイル配信
- `package.json` - 実行に必要な依存関係

## 注意

- GitHub Pages は静的サイト公開用です。`socket.io` を使う場合は、この `server.js` を別のサーバーで動かす必要があります。
- このサンプルは最小限の協力ゲームの動作を確認するためのものです。

## 公開手順

### 1. GitHub リポジトリを作成

1. GitHub で新しいリポジトリを作成します。
2. `cardgame1` フォルダーで次のコマンドを実行します。

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <YOUR_REPO_URL>
git push -u origin main
```

### 2. `socket.io` サーバーを別ホストにデプロイ

GitHub Pages では `socket.io` サーバーを動かせないので、サーバーは別のホスティングサービスで公開します。

#### 例: Railway での公開

1. [Railway](https://railway.app) に登録します。
2. 新しいプロジェクトを作成し、GitHub リポジトリを接続します。
3. `Environment` と `Deploy` を進めます。
4. `Start Command` を次のように設定します。

```bash
npm install
npm start
```

5. デプロイが完了すると、`https://...railway.app` のような URL が発行されます。

> Render や Heroku でも同じように `package.json` の `npm start` で動きます。

### 3. GitHub Pages で静的ファイルを公開

1. プロジェクトの `src/index.html`, `src/style.css`, `src/client.js` を `docs/` フォルダーにコピーします。
2. `docs/client.js` の先頭を次のように変更します。

```js
const socket = io('https://YOUR_SOCKET_SERVER_URL');
```

3. `index.html` の `<script src="client.js"></script>` が `docs/client.js` を読み込むことを確認します。
4. 変更をコミットして `main` ブランチにプッシュします。

```bash
git add docs/index.html docs/style.css docs/client.js
git commit -m "Deploy static client to GitHub Pages"
git push
```

5. GitHub のリポジトリ設定 > Pages で、公開ソースを `main` ブランチの `/docs` フォルダーに設定します。

### 4. 動作確認

1. GitHub Pages の公開 URL にアクセスします。
2. ブラウザを2つ以上開き、同じルームコードで接続してみます。
3. ホストがゲームを開始し、カードを使って敵を倒せることを確認します。

### 5. 注意点

- GitHub Pages の URL と `socket.io` サーバーの URL が同じドメインでなくても問題ありません。
- サーバー URL を間違えると、クライアントが接続できません。
- `server.js` は、`src/` フォルダーを静的に配信するだけのシンプルサーバーです。

## 例 - 公開構成

- GitHub Pages: `docs/` フォルダーの静的ファイル
- Railway / Render / Heroku: `server.js` の `socket.io` サーバー

> 重要: GitHub Pages は静的サイトのみの公開です。`socket.io` は別ホストで動かしてください。
