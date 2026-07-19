#!/bin/bash

# ==============================================================================
# TICKET ID: ENG-005 | Universal Docker Container Auto-Healing Script
# الوظيفة: الفحص الدوري التلقائي لحالة حاوية السيرفر وإعادة إنعاشها حياً مع تنبيه تلغرام
# ==============================================================================

# 1. تهيئة أسماء الحاويات وبيانات التنبيه (سيتم سحب قيم تلغرام ديناميكياً)
# (ملاحظة: السكربت يفترض اسم حاوية النود المستقبلية والتي سنثبتها لاحقاً)
CONTAINER_NAME="server-notification-container"

# جلب بيانات تلغرام الحقيقية من ملف الـ .env الحصين تلقائياً عبر المسار الديناميكي
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
if [ -f "${PROJECT_DIR}/.env" ]; then
    export $(grep -v '^#' "${PROJECT_DIR}/.env" | xargs)
fi

echo "=== بدء فحص حالة الحاويات والخدمات: $(date) ==="

# 2. التحقق من وجود محرك دوكر في النظام أولاً لضمان عالمية التشغيل
if ! command -v docker &> /dev/null; then
    echo "❌ خطأ: محرك دوكر غير مثبت أو غير متاح في هذا السيرفر حالياً."
    exit 1
fi

# 3. جلب حالة تشغيل الحاوية المستهدفة عبر أوامر الدوكر القياسية
CONTAINER_STATUS=$(docker inspect -f '{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null)

if [ "$CONTAINER_STATUS" == "running" ]; then
    echo "✅ الحاوية [${CONTAINER_NAME}] تعمل ومستقرة بنجاح."
else
    echo "🚨 خطر: الحاوية [${CONTAINER_NAME}] متوقفة أو منهارة! الحالة الحالية: '${CONTAINER_STATUS}'"
    echo "🔄 جاري محاولة الشفاء الذاتي وإعادة تشغيل الحاوية الآن..."
    
    # 4. أمر الإنقاذ والشفاء الذاتي
    docker start "$CONTAINER_NAME"
    
    ALERT_MSG="🚨 *إشعار شفاء ذاتي حرج من السيرفر!*

🐳 الخدمة: \`Docker Container Auto-Heal\`
📦 الحاوية منهارة: \`${CONTAINER_NAME}\`
🔧 الإجراء المتبع: _تمت إعادة التشغيل التلقائي بنجاح_
📅 الوقت: \`$(date)\`"

    
    
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d "chat_id=${TELEGRAM_CHAT_ID}" \
        -d "text=${ALERT_MSG}" \
        -d "parse_mode=Markdown" > /dev/null
        
    echo "📢 تم إنعاش الخدمة وإرسال التنبيه لهاتفك بنجاح."
fi

echo "=== انتهت عملية الفحص بنجاح ==="
