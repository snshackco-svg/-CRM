# webapp

## プロジェクト概要
- **名前**: webapp
- **目的**: Cloudflare Pages上で動作する軽量なWebアプリケーション
- **技術スタック**: Hono + TypeScript + Vite + Wrangler
- **GitHub**: https://github.com/snshackco-svg/-CRM

## 現在完了している機能
- ✅ Honoフレームワークのセットアップ
- ✅ Cloudflare Pages対応の開発環境構築
- ✅ PM2による開発サーバー管理
- ✅ Gitリポジトリの初期化
- ✅ ローカル開発サーバーの起動
- ✅ Cloudflare Pagesへのデプロイ完了

## 機能エントリURI
- **GitHub**: https://github.com/snshackco-svg/-CRM
- **開発環境**: https://3000-i1mkx5q1zq4ia2cl2uplc-3844e1b6.sandbox.novita.ai
- **本番環境**: https://49d4f52f.webapp-2-1j8.pages.dev
- **本番URL（メイン）**: https://webapp-2-1j8.pages.dev
- **ローカル**: http://localhost:3000

## まだ実装されていない機能
- GitHub連携（設定が必要）
- カスタムルート・API
- データベース統合
- カスタムドメインの設定

## 推奨される次のステップ
1. **CRM機能実装**: 顧客管理機能の設計と実装
2. **API routes追加**: RESTful APIエンドポイントの作成
3. **データベース統合**: Cloudflare D1で顧客データを永続化
4. **認証機能**: ユーザーログイン・認可機能の追加
5. **カスタムドメイン**: Cloudflare Pagesでカスタムドメインを設定

## データアーキテクチャ
- **データモデル**: 現在未設定
- **ストレージサービス**: 現在未使用（必要に応じてD1/KV/R2を追加可能）

## 使い方

### 開発環境
```bash
# 依存関係のインストール（既に完了）
npm install

# プロジェクトをビルド
npm run build

# PM2で開発サーバーを起動
pm2 start ecosystem.config.cjs

# サーバーの状態確認
pm2 list

# ログを確認
pm2 logs webapp --nostream

# サーバーを停止
pm2 delete webapp
```

### ポート管理
```bash
# ポート3000をクリーンアップ
npm run clean-port
```

### Git操作
```bash
# Gitの状態を確認
npm run git:status

# 変更をコミット
npm run git:commit "コミットメッセージ"

# コミット履歴を確認
npm run git:log
```

### 本番デプロイ
```bash
# ビルドしてCloudflare Pagesにデプロイ
export CLOUDFLARE_API_TOKEN="your-api-token"
npm run build
npx wrangler pages deploy dist --project-name webapp-2
```

## デプロイ状況
- **プラットフォーム**: Cloudflare Pages
- **プロジェクト名**: webapp-2
- **開発環境**: ✅ 稼働中 (https://3000-i1mkx5q1zq4ia2cl2uplc-3844e1b6.sandbox.novita.ai)
- **本番環境**: ✅ 稼働中 (https://webapp-2-1j8.pages.dev)
- **最終デプロイ**: 2025-11-10
- **最終更新**: 2025-11-10

## 次に推奨される設定
1. **GitHub認証**: GitHubタブで認証を完了させ、コードをリモートリポジトリに保存
2. **機能拡張**: APIエンドポイント、データベース、認証機能などを追加
