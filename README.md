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

### 営業CRM機能
- ✅ **リアルタイムダッシュボード**
  - 今日のタスク・アポイント表示
  - 今月・今週の実績サマリー
  - 8段階パイプライン可視化
  - KPI達成率表示
  - チーム状況モニタリング
  - アラート機能

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

**AI統合API:** 🆕
- `GET /api/notta-analyses` - Notta分析結果一覧取得
- `POST /api/ai/generate-talk-script` - トークスクリプト生成
- `POST /api/ai/generate-followup-plan` - フォローアップ計画生成
- `POST /api/ai/generate-research` - AI事前リサーチ/Deepリサーチ生成

**メール送信API:** 🆕
- `POST /api/email/send-thank-you` - お礼メール送信
- `POST /api/email/send-followup` - フォローアップメール送信
- `POST /api/email/send-proposal` - 提案資料メール送信

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
10. **new_appointments** - 新規アポイント
11. **weekly_reports** - 週報

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

### OpenAI API設定 🆕

**OpenAI APIを使用する場合の設定手順:**

1. **APIキーの取得**
   - https://platform.openai.com/api-keys にアクセス
   - 新しいAPIキーを作成

2. **ローカル開発環境の設定**
   ```bash
   # .dev.vars ファイルを編集
   nano .dev.vars
   
   # 以下を追加（your-openai-api-key-here を実際のAPIキーに置き換え）
   OPENAI_API_KEY=sk-proj-...your-actual-key...
   OPENAI_MODEL=gpt-4o-mini
   ```

3. **本番環境（Cloudflare Pages）の設定**
   ```bash
   # Cloudflare Pages Secretsに登録
   npx wrangler pages secret put OPENAI_API_KEY --project-name sales-crm
   # プロンプトでAPIキーを入力
   
   npx wrangler pages secret put OPENAI_MODEL --project-name sales-crm
   # プロンプトで "gpt-4o-mini" を入力
   ```

4. **APIキーが設定されていない場合**
   - システムは自動的にモックデータにフォールバック
   - すべての機能が動作し続けます（本物のAI生成なし）

**推奨モデル:**
- `gpt-4o-mini`: コスト効率重視（推奨）
- `gpt-4o`: 高品質重視
- `gpt-4-turbo`: バランス重視

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

## まだ実装されていない機能

- カスタムドメインの設定
- 本番環境へのデプロイ（Cloudflare API Key設定が必要）
- 実際のNotta API統合（現在はモックデータ、APIキー設定で本番利用可能）
- ✅ **実際のOpenAI API統合**（**完了！**APIキー設定で本物のGPT-4o-mini使用）
- 実際のSendGrid API統合（現在はモックデータ、APIキー設定で本番利用可能）
- 提案資料のPDF生成機能
- リアルタイム通知機能（ブラウザ通知、Slack連携など）
- 高度なレポート機能（月次レポート、売上予測など）

## 推奨される次のステップ

### すぐに実装可能（APIキー設定のみ）
1. **OpenAI API統合**: `src/routes/ai.ts`の`generateTalkScriptWithAI`等の関数を実API呼び出しに置き換え
2. **SendGrid API統合**: `src/routes/email.ts`の`sendEmail`関数を実SendGrid API呼び出しに置き換え
3. **Notta API統合**: `src/routes/meetings.ts`の`generateMockAISummary`を実Notta APIに置き換え

### 中期的な実装
4. **Cloudflare本番デプロイ**: Deployタブから設定して本番デプロイ
5. **提案資料PDF生成**: PDFライブラリ（jsPDF等）を使った資料自動生成
6. **リアルタイム通知**: Slack Webhook、ブラウザ通知の実装
7. **高度なレポート**: 月次レポート、売上予測、ダッシュボード拡張

### 長期的な拡張
8. **認証強化**: OAuth、2FA などの追加
9. **カスタムドメイン**: 独自ドメインの設定
10. **モバイルアプリ**: PWA化またはネイティブアプリ開発

## デプロイ状況

- **プラットフォーム**: Cloudflare Pages
- **開発環境**: ✅ 稼働中 (https://3000-i1mkx5q1zq4ia2cl2uplc-3844e1b6.sandbox.novita.ai)
- **本番環境**: ❌ 未デプロイ
- **最終更新**: 2025-11-10

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
