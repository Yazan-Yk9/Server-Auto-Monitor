#!/bin/bash

# ==============================================================================
# TICKET ID: ENG-005 | Automated SQLite Backup Script
# الوظيفة: أخذ نسخة احتياطية دورية ومضغوطة من قاعدة بيانات النظام
# ==============================================================================

# 1. تحديد المسارات الأساسية للمشروع (تغيير المسار ليطابق بيئتك المحلية)
PROJECT_DIR="/home/yazan/server-auto-monitor"
DB_FILE="${PROJECT_DIR}/notification-service/database.sqlite"
BACKUP_DIR="${PROJECT_DIR}/automation/backups"

# 2. توليد الطابع الزمني الموحد لاسم الملف
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="server_metrics_backup_${TIMESTAMP}.tar.gz"

echo "=== بدء عملية النسخ الاحتياطي المؤتمتة: $(date) ==="

# 3. التأكد من وجود مجلد الحفظ أو إنشائه تلقائياً إذا لم يكن موجوداً
if [ ! -d "$BACKUP_DIR" ]; then
    echo "📁 مجلد النسخ الاحتياطي غير موجود، جاري إنشاؤه: ${BACKUP_DIR}"
    mkdir -p "$BACKUP_DIR"
fi

# 4. التحقق الفوري من وجود ملف قاعدة البيانات قبل البدء
if [ ! -f "$DB_FILE" ]; then
    echo "❌ خطأ حرج: ملف قاعدة البيانات غير موجود في المسار المعين: ${DB_FILE}"
    exit 1
fi

# 5. ضغط وأرشفة ملف قاعدة البيانات بأمان بأمر tar القياسي
echo "📦 جاري ضغط قاعدة البيانات وأرشفتها..."
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}" -C "$(dirname "$DB_FILE")" "$(basename "$DB_FILE")"

# 6. التحقق الهندي من نجاح عملية الضغط والأرشفة
if [ $? -eq 0 ]; then
    echo "✅ تم أخذ النسخة الاحتياطية بنجاح وحفظها تحت اسم:"
    echo "📂 ${BACKUP_DIR}/${BACKUP_NAME}"
else
    echo "❌ فشلت عملية ضغط وأرشفة قاعدة البيانات."
    exit 1
fi

echo "=== انتهت العملية بنجاح ==="
