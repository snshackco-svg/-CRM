# webapp

## プロジェクト概要
- **名前**: webapp
- **目的**: Cloudflare Pages上で動作する軽量なWebアプリケーション
- **技術スタック**: Hono + TypeScript + Vite + Wrangler

## 現在完了している機能
- ✅ Honoフレームワークのセットアップ
- ✅ Cloudflare Pages対応の開発環境構築
- ✅ PM2による開発サーバー管理
- ✅ Gitリポジトリの初期化
- ✅ ローカル開発サーバーの起動

## 機能エントリURI
- **開発環境**: https://3000-i1mkx5q1zq4ia2cl2uplc-3844e1b6.sandbox.novita.ai
- **ローカル**: http://localhost:3000

## まだ実装されていない機能
- GitHub連携（設定が必要）
- Cloudflare Pagesへのデプロイ（APIキーの設定が必要）
- カスタムルート・API
- データベース統合

## 推奨される次のステップ
1. **GitHub連携**: GitHubタブで認証を設定
2. **Cloudflare API設定**: DeployタブでAPIキーを設定
3. **本番環境デプロイ**: `npm run deploy:prod`でCloudflare Pagesにデプロイ
4. **機能追加**: API routes、データベース、認証などの追加

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

### 本番デプロイ（Cloudflare APIキー設定後）
```bash
# Cloudflare Pagesにデプロイ
npm run deploy:prod
```

## デプロイ状況
- **プラットフォーム**: Cloudflare Pages
- **開発環境**: ✅ 稼働中
- **本番環境**: ❌ 未デプロイ（APIキー設定が必要）
- **最終更新**: 2025-11-10

## 次に必要な設定
1. **GitHub認証**: GitHubタブで認証を完了させてください
2. **Cloudflare APIキー**: DeployタブでクラウドフレアのAPIキーを設定してください
