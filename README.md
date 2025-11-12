# 営業CRMシステム (Sales CRM)

## プロジェクト概要
- **名前**: 営業CRMシステム
- **目的**: ナーチャリング特化型の営業管理システム
- **技術スタック**: Hono + TypeScript + Vite + Wrangler + Cloudflare D1
- **GitHub**: https://github.com/snshackco-svg/-CRM

## ✅ 現在完了している機能

### 基本機能
- ✅ 認証システム（ログイン・ログアウト）
- ✅ ユーザー管理（Admin, PM, Sales）
- ✅ Cloudflare D1データベース統合
- ✅ PM2による開発サーバー管理

### 🔍 新機能: グローバル検索 🆕
- ✅ **横断検索機能**
  - 見込み客、商談、マスター連絡先、アポイント履歴を一括検索
  - リアルタイム検索（300msデバウンス）
  - 優先度付きの結果表示
  - 企業名、担当者名、業界、メモなど全フィールド対応
  - 検索結果から直接詳細ページへ遷移可能

### 🔥 新機能: ホットリード機能 🆕
- ✅ **自動優先度スコアリング**
  - フォローアップ期限切れ（7日以上更新なし）
  - 商談予定が1週間以内
  - 商談中だが3日以上動きなし
  - 高額案件（100万円以上）で進展なし
  - 優先度スコアによる自動ソート
  - ダッシュボードにウィジェット統合済み

### 🏷️ 新機能: タグ管理機能 🆕
- ✅ **柔軟なタグシステム**
  - 見込み客ごとに複数のタグを付与可能
  - タグのオートコンプリート機能（既存タグ候補を表示）
  - 案件詳細画面でタグ追加・削除が可能
  - タグによる見込み客の分類・整理
  - 各タグの使用数カウント表示

### 営業CRM機能
- ✅ **リアルタイムダッシュボード**
  - 今日のタスク・アポイント表示
  - 今月・今週の実績サマリー
  - 8段階パイプライン可視化
  - KPI達成率表示
  - チーム状況モニタリング
  - アラート機能
  - ホットリード自動抽出 🆕

- ✅ **3層データモデル**
  - Layer 1: マスター連絡先管理
  - Layer 2: 案件管理（8段階パイプライン）
  - Layer 3: 接点ログ管理

- ✅ **営業支援機能**
  - 見込み客管理
  - 人脈・紹介者管理
  - 名刺スキャン機能
  - 新規アポイント登録
  - 商談記録管理
  - 週報管理

- ✅ **Notta自動分析機能** 🆕
  - 商談作成時にNotta URLがあれば自動でAI分析を実行
  - 初回アポ・フォローアップ商談の両方で動作
  - AI要約、キーポイント、アクションアイテム自動生成
  - 感情分析、予算・スケジュール議論の自動検出
  - 決裁者情報の抽出
  - 次回商談のポイント提案

- ✅ **8つのアポイント準備機能** 🆕
  1. **準備チェックリスト** - 4項目のタスク管理と進捗視覚化
  2. **当日アポ通知** - 残り時間カウントダウン表示
  3. **トークスクリプト生成** - 初回/フォローアップで異なるAI生成スクリプト
  4. **競合比較表** - Deepリサーチデータからの自動表示
  5. **提案資料テンプレート** - 3種類の資料ダウンロード
  6. **フォローアップ計画** - アポ後のToDoと次回商談推奨
  7. **場所・移動情報** - Googleマップ連携と所要時間推定
  8. **商談履歴タイムライン** - 過去の商談履歴を時系列表示

- ✅ **AI API統合機能（実OpenAI統合完了）** 🆕
  - **トークスクリプト生成**: GPT-4o-miniで企業情報に基づくパーソナライズスクリプト生成
  - **フォローアップ計画**: 商談情報から即時・フォローアップタスクを自動生成
  - **AI事前リサーチ**: 企業概要・キーパーソン・課題・アプローチ戦略をAI分析
  - **Deepリサーチ**: 財務分析・競合分析・SWOT・戦略提案まで包括生成
  - **実OpenAI API使用**: APIキー設定で本物のGPT-4o-mini使用
  - **フォールバック機能**: APIキー未設定時は自動的にモックデータで動作継続
  - **JSON structured output**: 構造化されたJSON形式で確実に出力

- ✅ **メール送信機能** 🆕
  - **お礼メール**: 商談後の自動お礼メール（商談サマリー付き）
  - **フォローアップメール**: カスタムメッセージ対応、次回日程調整
  - **提案資料メール**: 導入効果・スケジュール・見積もり案内
  - HTMLメールテンプレート（レスポンシブデザイン）
  - SendGrid統合準備完了（APIキー設定のみで本番利用可能）

- ✅ **PDF生成機能** 🆕
  - **提案資料PDF**: 企業概要・提案内容・導入効果・スケジュールを含む完全な提案書
  - **商談議事録PDF**: 商談内容・決定事項・アクションアイテムを含む議事録
  - pdf-lib使用（Cloudflare Workers互換）
  - ワンクリックでPDFダウンロード

- ✅ **フロントエンドUI統合** 🆕
  - 提案資料PDFダウンロードボタン（詳細ビュー）
  - 商談議事録PDFダウンロードボタン（商談履歴タイムライン）
  - お礼メール送信ボタン（商談履歴タイムライン）
  - フォローアップメール送信ボタン（商談履歴タイムライン）
  - Axiosでバイナリデータ対応（responseType: 'blob'）

## 機能エントリURI

### 開発環境
- **URL**: https://3000-i1mkx5q1zq4ia2cl2uplc-3844e1b6.sandbox.novita.ai
- **ローカル**: http://localhost:3000

### API エンドポイント

**基本API:**
- `GET /api/prospects` - 見込み客一覧取得
- `POST /api/prospects` - 見込み客登録
- `GET /api/meetings` - 商談一覧取得
- `POST /api/meetings` - 商談登録（Notta URL含む場合は自動AI分析）
- `GET /api/networking` - 人脈一覧取得
- `GET /api/sales-dashboard` - ダッシュボードデータ取得
- `GET /api/sales-weekly-reports` - 週報一覧取得

**検索API:** 🆕
- `GET /api/search?q=検索キーワード` - グローバル横断検索

**ホットリードAPI:** 🆕
- `GET /api/sales-crm/dashboard/hot-leads` - 優先対応が必要な見込み客を自動抽出

**タグ管理API:** 🆕
- `GET /api/tags/prospect/:prospectId` - 特定案件のタグ一覧取得
- `POST /api/tags/prospect/:prospectId` - 案件にタグ追加（body: `{tag: "タグ名"}`）
- `DELETE /api/tags/prospect/:prospectId/:tag` - 案件からタグ削除
- `GET /api/tags/all` - 全タグ一覧取得（使用数カウント付き）

**AI統合API:** 🆕
- `GET /api/notta-analyses` - Notta分析結果一覧取得
- `POST /api/ai/generate-talk-script` - トークスクリプト生成
- `POST /api/ai/generate-followup-plan` - フォローアップ計画生成
- `POST /api/ai/generate-research` - AI事前リサーチ/Deepリサーチ生成

**メール送信API:** 🆕
- `POST /api/email/send-thank-you` - お礼メール送信
- `POST /api/email/send-follow-up` - フォローアップメール送信
- `POST /api/email/send-proposal` - 提案資料メール送信

**PDF生成API:** 🆕
- `POST /api/pdf/generate-proposal` - 提案資料PDF生成（バイナリ出力）
- `POST /api/pdf/generate-minutes` - 商談議事録PDF生成（バイナリ出力）

### GitHub
- **リポジトリ**: https://github.com/snshackco-svg/-CRM

## データアーキテクチャ

### データベース: Cloudflare D1 (SQLite)
- **Database ID**: a7832015-b690-451c-998a-cb3d86a63e69
- **Database Name**: sales-crm-db

### 主要テーブル
1. **users** - ユーザー管理
2. **prospects** - 見込み客管理
3. **master_contacts** - マスター連絡先
4. **deals** - 案件管理（8段階パイプライン）
5. **interactions** - 接点ログ
6. **meetings** - 商談記録
7. **networking_connections** - 人脈管理
8. **referrals** - 紹介者管理
9. **business_card_scans** - 名刺スキャン
10. **new_appointments** - 新規アポイント（meeting_id連携対応 🆕）
11. **weekly_reports** - 週報
12. **prospect_tags** - 見込み客タグ管理 🆕

### パイプライン段階
1. 初回コンタクト
2. ヒアリング
3. 提案準備
4. 提案・プレゼン
5. 見積提出
6. 交渉中
7. クロージング
8. 受注 / 失注

## 使い方

### 開発環境のセットアップ

```bash
# 1. リポジトリをクローン
git clone https://github.com/snshackco-svg/-CRM.git
cd webapp

# 2. 依存関係のインストール
npm install

# 3. D1データベースの作成（既に作成済みの場合はスキップ）
npx wrangler d1 create sales-crm-db

# 4. マイグレーションの実行
npm run db:migrate:local

# 5. usersテーブルを作成（必要に応じて）
npx wrangler d1 execute sales-crm-db --local --command="CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hashed TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'Sales' CHECK(role IN ('Admin', 'PM', 'Sales')), created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);"

# 6. シードデータの投入
npm run db:seed

# 7. プロジェクトをビルド
npm run build

# 8. 開発サーバーを起動
pm2 start ecosystem.config.cjs

# 9. サーバーの状態確認
pm2 list

# 10. ログを確認
pm2 logs sales-crm --nostream
```

### デフォルトユーザー

シードデータで以下のユーザーが作成されます：

1. **管理者**
   - Email: admin@snshack.com
   - Role: Admin

2. **PM担当**
   - Email: pm@snshack.com
   - Role: PM

3. **営業担当**
   - Email: sales@snshack.com
   - Role: Sales

※ パスワードはダミーハッシュ（認証システムは実装済み）

### データベース管理

```bash
# ローカルデータベースリセット
npm run db:reset

# マイグレーション適用（ローカル）
npm run db:migrate:local

# マイグレーション適用（本番）
npm run db:migrate:prod

# データベースコンソール（ローカル）
npm run db:console:local

# データベースコンソール（本番）
npm run db:console:prod
```

### PM2管理

```bash
# サービス起動
pm2 start ecosystem.config.cjs

# サービス一覧
pm2 list

# サービス再起動
pm2 restart sales-crm

# サービス停止
pm2 stop sales-crm

# サービス削除
pm2 delete sales-crm

# ログ確認（リアルタイム）
pm2 logs sales-crm

# ログ確認（スナップショット）
pm2 logs sales-crm --nostream
```

### ポート管理

```bash
# ポート3000をクリーンアップ
npm run clean-port

# または
fuser -k 3000/tcp
```

### 🔑 API統合設定 🆕

このシステムは複数の外部APIと統合されています。以下の手順でAPIキーを設定してください。

#### 1. OpenAI API（GPT-4o-mini）✅ 設定済み

**用途:** AI生成全般（トークスクリプト、リサーチ、フォローアップ計画、名刺情報抽出）

**取得方法:**
1. https://platform.openai.com/api-keys にアクセス
2. 新しいAPIキーを作成

**設定方法:**
```bash
# ローカル環境（.dev.varsファイル）
OPENAI_API_KEY=sk-proj-...your-actual-key...
OPENAI_MODEL=gpt-4o-mini

# 本番環境
npx wrangler pages secret put OPENAI_API_KEY --project-name sales-crm
npx wrangler pages secret put OPENAI_MODEL --project-name sales-crm
```

**料金:** $0.150/1M input tokens, $0.600/1M output tokens（月$5-20程度）

#### 2. Google Cloud Vision API（OCR）✅ 設定済み

**用途:** 名刺スキャン機能（画像からテキスト抽出）

**取得方法:**
1. https://console.cloud.google.com にアクセス
2. プロジェクトを作成
3. Cloud Vision APIを有効化
4. APIキーを作成

**設定方法:**
```bash
# ローカル環境
GOOGLE_VISION_API_KEY=AIza...your-actual-key...

# 本番環境
npx wrangler pages secret put GOOGLE_VISION_API_KEY --project-name sales-crm
```

**料金:** 1,000枚/月無料、超過分 $1.50/1,000枚

#### 3. Perplexity API（リアルタイムWeb検索）✅ 設定済み

**用途:** AI事前リサーチでのリアルタイムWeb検索、最新企業情報の取得

**取得方法:**
1. https://www.perplexity.ai/settings/api にアクセス
2. 新しいAPIキーを作成

**設定方法:**
```bash
# ローカル環境
PERPLEXITY_API_KEY=pplx-...your-actual-key...

# 本番環境
npx wrangler pages secret put PERPLEXITY_API_KEY --project-name sales-crm
```

**料金:** $5無料クレジット、sonar-proモデル $0.001-0.006/リクエスト

**機能:**
- リアルタイムWeb検索による最新企業情報の取得
- 競合分析、財務情報、ニュースの自動収集
- AI事前リサーチの精度向上

#### 4. Resend API（メール送信）⚠️ 推奨

**用途:** お礼メール、フォローアップメール、提案資料メール送信

**取得方法:**
1. https://resend.com/signup にアクセス（メールアドレスのみで登録可能）
2. https://resend.com/api-keys でAPIキーを作成

**設定方法:**
```bash
# ローカル環境
RESEND_API_KEY=re_...your-actual-key...

# 本番環境
npx wrangler pages secret put RESEND_API_KEY --project-name sales-crm
```

**料金:** 3,000通/月無料、$20/月で50,000通

**送信元メールアドレス設定:**
- Resendの`onboarding@resend.dev`が無料で使用可能
- 独自ドメインの場合はDNS設定が必要

#### 5. SendGrid API（メール送信・代替）

**用途:** Resend APIの代替メール送信サービス

**取得方法:**
1. https://signup.sendgrid.com にアクセス
2. Sender認証を完了
3. APIキーを作成

**設定方法:**
```bash
# ローカル環境
SENDGRID_API_KEY=SG....your-actual-key...

# 本番環境
npx wrangler pages secret put SENDGRID_API_KEY --project-name sales-crm
```

**料金:** 100通/日無料、$19.95/月で50,000通

#### 📋 現在の設定状況

**ローカル環境を確認:**
```bash
cat .dev.vars
```

**本番環境を確認:**
```bash
npx wrangler pages secret list --project-name sales-crm
```

#### 🔄 フォールバック機能

全てのAPI統合機能は、APIキーが未設定でも動作します：
- **OpenAI**: モックデータでAI生成を模擬
- **Google Vision**: モックOCRテキストを返す
- **Resend/SendGrid**: コンソールにメール内容を出力（実際には送信しない）

### Git操作

```bash
# 変更を確認
git status

# 変更をコミット
git add .
git commit -m "コミットメッセージ"

# GitHubにプッシュ
git push origin main

# コミット履歴確認
git log --oneline
```

## ✅ 実装済み・使用可能な機能

### API統合機能（実装済み・APIキー設定で本番利用可能）
- ✅ **OpenAI API統合** - トークスクリプト、リサーチ、フォローアップ計画生成
- ✅ **Google Cloud Vision API統合** - 名刺スキャン・OCR処理
- ✅ **Resend API統合** - メール送信機能（SendGridの代替）
- ✅ **SendGrid API統合** - メール送信機能（Resendのフォールバック）
- ✅ **pdf-lib統合** - 提案資料PDF・議事録PDF生成
- ✅ **html2pdf.js統合** - 週報PDF出力

### フロントエンド機能
- ✅ **PDFダウンロードボタン** - 提案資料、商談議事録
- ✅ **メール送信ボタン** - お礼メール、フォローアップメール
- ✅ **週報PDF出力ボタン** - html2pdf.jsで日本語対応

## まだ実装されていない機能

- カスタムドメインの設定
- Notta API統合（現在はモックデータで動作中、API取得が必要）
- リアルタイム通知機能（ブラウザ通知、Slack連携など）
- 高度なレポート機能（月次レポート、売上予測など）

## 推奨される次のステップ

### すぐに実装可能（APIキー設定のみ）
1. ✅ **OpenAI API統合**（**完了！**）- `.dev.vars`にAPIキーを設定して実GPT-4o-mini使用
2. ✅ **SendGrid API統合**（**完了！**）- `.dev.vars`にAPIキーを設定して実メール送信可能
3. ✅ **PDF生成機能**（**完了！**）- 提案資料と議事録のPDF生成を実装
4. **Notta API統合**: `src/routes/meetings.ts`の`generateMockAISummary`を実Notta APIに置き換え

### 中期的な実装
5. **本番環境のAPIキー設定**: `wrangler pages secret put`でOpenAI/SendGridキーを本番に設定
6. **リアルタイム通知**: Slack Webhook、ブラウザ通知の実装
7. **高度なレポート**: 月次レポート、売上予測、ダッシュボード拡張

### 長期的な拡張
8. **認証強化**: OAuth、2FA などの追加
9. **カスタムドメイン**: 独自ドメインの設定
10. **モバイルアプリ**: PWA化またはネイティブアプリ開発

## デプロイ状況

- **プラットフォーム**: Cloudflare Pages
- **開発環境**: ✅ 稼働中 (https://3000-i1mkx5q1zq4ia2cl2uplc-3844e1b6.sandbox.novita.ai)
- **本番環境**: ✅ デプロイ済み (https://227683d1.sales-crm.pages.dev)
- **プロジェクト名**: sales-crm
- **最終更新**: 2025-11-11
- **最新機能**: グローバル検索、ホットリード、タグ管理（UI実装完了）

## トラブルシューティング

### ビルドエラー
```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

### データベースエラー
```bash
# データベースをリセット
npm run db:reset
```

### ポートが使用中
```bash
# ポートをクリーンアップ
npm run clean-port
```

## ライセンス

このプロジェクトはプライベートプロジェクトです。

## サポート

問題が発生した場合は、GitHubのIssuesを使用してください。
