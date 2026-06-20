# サボり癖クリア（v3）

自分で選んだサボり癖に毎日向き合い、記録が育つ習慣化アプリ。

## 起動方法

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

`http://localhost:5173` が開きます。`.env.local` の中身は空のままでOK。
この状態では、データはブラウザに保存され、画像判定はモック（常に受理）で動きます。
APIキーは不要、課金も発生しません。

## 使い方の流れ

1. 新規登録（ユーザー名とパスワード）→ ログイン
2. 治したいサボり癖をチェックで選ぶ
3. マイページの「今日の課題を始める」
4. 選んだ癖からランダムで1つ、質問10問に答える
5. ガチャで課題が決まる
6. タイマー内で課題に挑戦、写真かコメントで完了
7. マイページに記録が積まれる（円グラフ・連続記録・履歴）

## モード切り替え（発表用）

`.env.local` のスイッチを変えるだけ。変更後は devサーバーを再起動（Ctrl+C → npm run dev）。

### Claude APIの画像判定を使う

```
VITE_USE_API=true
VITE_CLAUDE_API_KEY=（本物のキー）
```

### Firebaseでクラウド保存する

```
VITE_USE_FIREBASE=true
VITE_FB_API_KEY=...（Firebaseコンソールの firebaseConfig の値）
VITE_FB_AUTH_DOMAIN=...
VITE_FB_PROJECT_ID=...
VITE_FB_STORAGE_BUCKET=...
VITE_FB_SENDER_ID=...
VITE_FB_APP_ID=...
```

Firebaseを使う場合は、コンソールで Firestore（テストモード）と
Authentication（メール/パスワードを有効化）の設定が必要です。

### 注意

- 発表でAPIキーを使うときは、本番URL（公開）には入れず、自分のPCのローカルだけで使うこと。
- Claude APIは Anthropic Console で使用上限金額を低く設定しておくと安全。
- 発表が終わったらキーを空に戻し、Consoleで該当キーを無効化する。

## カスタマイズ

- サボり癖カテゴリの増減 → `src/data/habits.js`
- 質問の編集 → `src/data/questionsByHabit.js`
- 課題（ペナルティ）の編集 → `src/data/tasksByHabit.js`

## ドキュメント

- 設計書_v3.md … 仕様の詳細
- アピール文書.md … 発表・記事用
