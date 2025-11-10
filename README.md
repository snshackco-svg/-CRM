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

## 機能エントリURI

### 開発環境
- **URL**: https://3000-i1mkx5q1zq4ia2cl2uplc-3844e1b6.sandbox.novita.ai
- **ローカル**: http://localhost:3000

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
- 本番環境へのデプロイ
- メール送信機能
- AI機能の統合（事前リサーチ、メールテンプレート自動生成など）
- 高度なレポート機能

## 推奨される次のステップ

1. **本番環境デプロイ**: Cloudflare Pagesに本番デプロイ
2. **AI機能統合**: OpenAI APIなどを使った自動化機能の追加
3. **メール機能**: SendGridなどのメールサービス統合
4. **認証強化**: OAuth、2FA などの追加
5. **レポート機能**: より詳細な分析・レポート機能の実装

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
