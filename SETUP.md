# セットアップ手順

このドキュメントでは、sabori-app を本番環境で動かすために必要なすべての設定を説明します。

---

## 1. 環境変数

`.env.local.example` を `.env.local` にコピーして、各値を設定してください。

```bash
cp .env.local.example .env.local
```

| 変数 | 説明 |
|------|------|
| `VITE_USE_SUPABASE` | `true` でクラウド保存を有効化 |
| `VITE_USE_API` | `true` でClaudeAI機能を有効化 |
| `VITE_USE_EMAIL` | `true` でメール通知を実際に送信 |
| `VITE_TIMER_DEBUG` | `true` でタイマーを10秒に短縮（開発用） |
| `VITE_CLAUDE_API_KEY` | Claude APIキー |
| `VITE_SUPABASE_URL` | SupabaseプロジェクトURL |
| `VITE_SUPABASE_ANON_KEY` | Supabase公開キー |

---

## 2. Supabase テーブル作成

Supabase ダッシュボードの **SQL Editor** で以下を実行してください。

### 2-1. user_data テーブル

```sql
create table if not exists user_data (
  username        text primary key,
  data            jsonb not null default '{}',
  notify_email    text,
  last_login_at   timestamptz,
  email_log       jsonb not null default '[]'
);

-- RLS を有効化
alter table user_data enable row level security;

-- 全ユーザーが自分のレコードを読み書きできる（簡易設定）
create policy "allow all" on user_data for all using (true) with check (true);
```

### 2-2. criminal_records テーブル

```sql
create table if not exists criminal_records (
  user_id         text primary key,
  data            jsonb not null default '{}'
);

alter table criminal_records enable row level security;
create policy "allow all" on criminal_records for all using (true) with check (true);
```

### 2-3. 既存テーブルへのカラム追加（既にテーブルがある場合）

```sql
alter table user_data
  add column if not exists notify_email  text,
  add column if not exists last_login_at timestamptz,
  add column if not exists email_log     jsonb not null default '[]';
```

---

## 3. Supabase Auth 設定

Supabase ダッシュボード → **Authentication → Providers → Email** を開き、

- **Confirm email** を **OFF** にする

> ユーザー名を `username@sabori-app.local` という仮メールに変換して登録するため、
> メール確認をオフにしないとサインアップが完了しません。

---

## 4. メール通知 (Resend + Edge Function)

### 4-1. Resend アカウント設定

1. [resend.com](https://resend.com) でアカウントを作成
2. 送信ドメインを認証（DNS に TXT/CNAME レコードを追加）
3. API キーを発行

### 4-2. Supabase CLI のインストール

```bash
npm install -g supabase
supabase login
```

### 4-3. Edge Function へシークレットを登録

```bash
# プロジェクトIDは Supabase ダッシュボード → Settings → General で確認
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx \
  --project-ref <your-project-ref>
```

### 4-4. Edge Function のデプロイ

```bash
supabase functions deploy notify --project-ref <your-project-ref>
```

デプロイ後、[ダッシュボード → Edge Functions] に `notify` 関数が表示されれば成功です。

### 4-5. FROM アドレスの変更

`supabase/functions/notify/index.ts` の `FROM_ADDRESS` を
Resend で認証済みのドメインのアドレスに変更してください：

```ts
const FROM_ADDRESS = "noreply@your-verified-domain.com";
```

変更後は再デプロイが必要です：

```bash
supabase functions deploy notify --project-ref <your-project-ref>
```

---

## 5. BGM 音声ファイルの配置

`public/sounds/` に以下のファイルを追加してください。
フリー素材サイト（魔王魂・DOVA-SYNDROME など）から mp3 をダウンロードして
ファイル名を合わせて配置するだけで OK です。

| ファイル名 | 用途 |
|-----------|------|
| `bgm_question.mp3` | 質問10問画面のBGM（ループ） |
| `bgm_gacha.mp3` | ガチャ演出画面のBGM（ループ） |

その他の効果音については `public/sounds/README.md` を参照してください。

---

## 6. 動作確認

```bash
npm install
npm run dev
```

デモ動作（すべてのスイッチが `false`）でも、以下が正常に動作することを確認：

- [ ] ログイン / 新規登録
- [ ] サボり癖選択
- [ ] 質問 → 診断（モック文言）→ ガチャ → タスク
- [ ] タイマーカウントダウン（`VITE_TIMER_DEBUG=true` で10秒確認）
- [ ] 成功/失敗の記録
- [ ] マイページに履歴が表示、クリックで詳細ログ
- [ ] 失敗3回でモックメール表示

---

## 7. ビルド

```bash
npm run build
```
