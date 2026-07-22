#!/bin/bash

# ==============================================================================
# Automated SQLite Backup Script

PROJECT_DIR="/home/yazan/server-auto-monitor"
DB_FILE="${PROJECT_DIR}/notification-service/database.sqlite"
BACKUP_DIR="${PROJECT_DIR}/automation/backups"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="server_metrics_backup_${TIMESTAMP}.tar.gz"

echo "=== بدء عملية النسخ الاحتياطي المؤتمتة: $(date) ==="

if [ ! -d "$BACKUP_DIR" ]; then
    echo "📁 مجلد النسخ الاحتياطي غير موجود، جاري إنشاؤه: ${BACKUP_DIR}"
    mkdir -p "$BACKUP_DIR"
fi

if [ ! -f "$DB_FILE" ]; then
    echo "❌ خطأ حرج: ملف قاعدة البيانات غير موجود في المسار المعين: ${DB_FILE}"
    exit 1
fi

echo "📦 جاري ضغط قاعدة البيانات وأرشفتها..."
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}" -C "$(dirname "$DB_FILE")" "$(basename "$DB_FILE")"

if [ $? -eq 0 ]; then
    echo "✅ تم أخذ النسخة الاحتياطية بنجاح وحفظها تحت اسم:"
    echo "📂 ${BACKUP_DIR}/${BACKUP_NAME}"
else
    echo "❌ فشلت عملية ضغط وأرشفة قاعدة البيانات."
    exit 1
fi

echo "=== انتهت العملية بنجاح ==="
