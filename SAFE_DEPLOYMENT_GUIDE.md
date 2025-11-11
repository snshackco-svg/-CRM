# 安全なデプロイメントガイド

## 📋 本番データ保護の原則

### ✅ 安全な操作
- **コードのデプロイ**: 本番データには影響なし
- **新しいカラムの追加**: 既存データは保持される
- **新しいテーブルの追加**: 既存データは保持される

### ⚠️ 注意が必要な操作
- **カラムの削除**: データが失われる可能性
- **テーブルの削除**: データが完全に失われる
- **テーブル構造の大幅変更**: データ移行が必要

---

## 🔄 日常的な開発フロー

### **修正が必要になったら:**

```bash
# 1. ローカル環境で開発
cd /home/user/webapp

# 2. コード修正
# src/ 内のファイルを編集...

# 3. ローカルでビルド＆テスト
npm run build
pm2 restart sales-crm

# 4. ブラウザでテスト
# http://localhost:3000 でテスト

# 5. 問題なければコミット
git add -A
git commit -m "fix: 修正内容"
git push origin main

# 6. 本番デプロイ
npm run build
npx wrangler pages deploy dist --project-name sales-crm
```

**重要**: この手順では**本番データは一切変更されません**。

---

## 🗄️ データベース変更が必要な場合

### **新しいカラムを追加する場合:**

```bash
# 1. マイグレーションファイルを作成
nano migrations/0014_add_new_feature.sql

# 内容例:
# ALTER TABLE prospects ADD COLUMN new_field TEXT;

# 2. ローカルでテスト
npx wrangler d1 migrations apply sales-crm-db --local

# 3. ローカルで動作確認
npm run build && pm2 restart sales-crm

# 4. 問題なければ本番適用
npx wrangler d1 migrations apply sales-crm-db --remote

# 5. コードをデプロイ
git add -A
git commit -m "feat: 新機能追加"
git push origin main
npm run build
npx wrangler pages deploy dist --project-name sales-crm
```

---

## 💾 定期的なバックアップ

### **週次バックアップ（推奨）:**

```bash
# バックアップスクリプトを実行
cd /home/user/webapp
./scripts/backup-production-db.sh
```

### **重要な変更前のバックアップ:**

```bash
# データベース構造を大きく変更する前に必ずバックアップ
./scripts/backup-production-db.sh

# バックアップが成功したことを確認
ls -lh backups/
```

---

## 🔍 本番データの確認方法

### **データ量を確認:**

```bash
# 各テーブルのレコード数を確認
npx wrangler d1 execute sales-crm-db --remote --command="
SELECT 
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM prospects) as prospects,
  (SELECT COUNT(*) FROM meetings) as meetings,
  (SELECT COUNT(*) FROM business_card_scans) as cards,
  (SELECT COUNT(*) FROM new_appointments) as appointments
"
```

### **最新データを確認:**

```bash
# 最新のアポイントを確認
npx wrangler d1 execute sales-crm-db --remote --command="
SELECT * FROM new_appointments ORDER BY created_at DESC LIMIT 5
"
```

---

## 🚨 データが消える可能性がある操作（絶対に避ける）

### **❌ これらのコマンドは絶対に実行しない:**

```bash
# ❌ データベース全体を削除
npx wrangler d1 delete sales-crm-db

# ❌ テーブルを削除
DROP TABLE prospects;

# ❌ 全データを削除
DELETE FROM prospects;

# ❌ データベースをリセット
npx wrangler d1 migrations apply sales-crm-db --remote --force
```

---

## 📊 現在の環境構成

### **開発環境（ローカル）:**
- **場所**: `/home/user/webapp/`
- **データベース**: `.wrangler/state/v3/d1/` (ローカルSQLite)
- **URL**: `http://localhost:3000`
- **データ**: テストデータのみ

### **本番環境（Cloudflare）:**
- **場所**: Cloudflare Pages
- **データベース**: `sales-crm-db` (Cloudflare D1)
- **URL**: `https://90e5f9c4.sales-crm.pages.dev`
- **データ**: **実際の業務データ（保護対象）**

---

## ✅ チェックリスト

### **デプロイ前の確認:**
- [ ] ローカル環境でテスト済み
- [ ] git commitでコードをバックアップ
- [ ] 重要な変更の場合はデータベースをバックアップ
- [ ] マイグレーションが必要な場合は`--local`で先にテスト

### **デプロイ後の確認:**
- [ ] 本番URLで動作確認
- [ ] エラーが出ていないか確認
- [ ] データが正常に表示されるか確認

---

## 📞 トラブルシューティング

### **本番で問題が発生したら:**

1. **すぐに前のバージョンに戻す:**
   ```bash
   # Cloudflare Pagesダッシュボードで前のデプロイに戻す
   # または、gitで前のコミットに戻してデプロイ
   git revert HEAD
   git push origin main
   npm run build
   npx wrangler pages deploy dist --project-name sales-crm
   ```

2. **データベースに問題がある場合:**
   ```bash
   # バックアップから復元（スクリプトは別途作成が必要）
   # 緊急の場合はCloudflareサポートに連絡
   ```

---

## 🎯 まとめ

**最も重要なルール:**
1. ✅ コードのデプロイは安全（データは消えない）
2. ✅ マイグレーションは`--local`で先にテスト
3. ✅ 重要な変更前は必ずバックアップ
4. ❌ `DELETE`, `DROP`, `d1 delete`は絶対に使わない

**開発環境と本番環境のデータは完全に分離されているため、通常のコードデプロイで本番データが消えることはありません。**
