#!/bin/bash
# 本番データベースのバックアップスクリプト

BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/sales-crm-db_${TIMESTAMP}.sql"

# バックアップディレクトリを作成
mkdir -p $BACKUP_DIR

echo "=== 本番データベースバックアップ開始 ==="
echo "日時: $(date)"
echo ""

# 全テーブルのデータをエクスポート
echo "📦 データをエクスポート中..."

# users
npx wrangler d1 execute sales-crm-db --remote --command="SELECT * FROM users;" > "${BACKUP_DIR}/users_${TIMESTAMP}.json"

# prospects
npx wrangler d1 execute sales-crm-db --remote --command="SELECT * FROM prospects;" > "${BACKUP_DIR}/prospects_${TIMESTAMP}.json"

# meetings
npx wrangler d1 execute sales-crm-db --remote --command="SELECT * FROM meetings;" > "${BACKUP_DIR}/meetings_${TIMESTAMP}.json"

# business_card_scans
npx wrangler d1 execute sales-crm-db --remote --command="SELECT * FROM business_card_scans;" > "${BACKUP_DIR}/business_card_scans_${TIMESTAMP}.json"

# new_appointments
npx wrangler d1 execute sales-crm-db --remote --command="SELECT * FROM new_appointments;" > "${BACKUP_DIR}/new_appointments_${TIMESTAMP}.json"

# networking_connections
npx wrangler d1 execute sales-crm-db --remote --command="SELECT * FROM networking_connections;" > "${BACKUP_DIR}/networking_connections_${TIMESTAMP}.json"

# kpi_monthly_goals
npx wrangler d1 execute sales-crm-db --remote --command="SELECT * FROM kpi_monthly_goals;" > "${BACKUP_DIR}/kpi_monthly_goals_${TIMESTAMP}.json"

# kpi_weekly_goals
npx wrangler d1 execute sales-crm-db --remote --command="SELECT * FROM kpi_weekly_goals;" > "${BACKUP_DIR}/kpi_weekly_goals_${TIMESTAMP}.json"

echo ""
echo "✅ バックアップ完了！"
echo "📁 バックアップ先: ${BACKUP_DIR}/"
echo ""
echo "バックアップファイル:"
ls -lh ${BACKUP_DIR}/*${TIMESTAMP}*
