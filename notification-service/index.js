// استبدل السطر الأول القديم بهذا السطر الذكي لتحديد المسار بدقة
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') }); 
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

// جلب البيانات السرية الحصينة من ملف البيئة
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// تفعيل مفسر الـ JSON لاستقبل بيانات البايثون
app.use(express.json());

// جعل السيرفر يشارك ملفات مجلد الواجهة الأمامية تلقائياً عند طلب المنفذ رئيسياً
//app.use(express.static(path.join(__dirname, '../dashboard-frontend')));

// 🗄️ إعداد وتجهيز قاعدة بيانات SQLite
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ فشل الاتصال بقاعدة البيانات:', err.message);
    } else {
        console.log('✅ متصل بنجاح بقاعدة بيانات SQLite المؤتمتة.');
        initializeDatabase();
    }
});

// وظيفة إنشاء الجداول لتخزين المقاييس وحالة الروابط
function initializeDatabase() {
    db.run(`
        CREATE TABLE IF NOT EXISTS system_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            cpu_usage REAL NOT NULL,
            ram_usage REAL NOT NULL,
            disk_usage REAL NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS website_status (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            url TEXT NOT NULL,
            status_code INTEGER,
            reachable INTEGER NOT NULL
        )
    `);
}


// 📢 دالة إرسال التنبيهات إلى تلغرام (مصححة)
async function sendTelegramAlert(message) {
    // تأكد من استخدام علامة الاقتباس المائلة ` وليس العلامة العادية '
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    try {
        await axios.post(telegramUrl, {
            chat_id: CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        });
        console.log('📢 [Telegram] تم إرسال تنبيه فوري بنجاح إلى هاتفك.');
    } catch (error) {
        console.error('❌ فشل إرسال التنبيه إلى تلغرام:', error.response ? error.response.data : error.message);
    }
}


// 🌐 نقطة اتصال استقبال البيانات الحية والفحص الذكي
app.post('/api/metrics', (req, requireResponse) => {
    const { timestamp, metrics, web_data } = req.body;

    if (!timestamp || !metrics) {
        return requireResponse.status(400).json({ status: 'error', message: 'بيانات تالفة أو ناقصة' });
    }

    // حفظ المقاييس في قاعدة البيانات
    
    const metricsQuery = `INSERT INTO system_metrics (timestamp, cpu_usage, ram_usage, disk_usage) VALUES (?, ?, ?, ?)`;
    db.run(metricsQuery, [timestamp, metrics.cpu_percent, metrics.ram_percent, metrics.disk_percent]);

    // 🔥 التصحيح الهندسي المتكامل لترتيب قيم قاعدة البيانات (تأكد من مطابقة المصفوفة للاستعلام)
 //   const metricsQuery = `INSERT INTO system_metrics (timestamp, cpu_usage, ram_usage, disk_usage) VALUES (?, ?, ?, ?)`;

//    // أضفنا متغير timestamp في بداية المصفوفة ليطابق حقول الـ SQL بدقة
//    db.run(metricsQuery, [timestamp, metrics.cpu_percent, metrics.ram_percent, metrics.disk_percent], function(err) {
//       if (err) {
//          console.error('❌ فشل حفظ مقاييس النظام في قاعدة البيانات:', err.message);
//        }
//     });


    // حفظ وفحص حالة المواقع
    if (web_data) {
        const webQuery = `INSERT INTO website_status (timestamp, url, status_code, reachable) VALUES (?, ?, ?, ?)`;
        for (const [url, data] of Object.entries(web_data)) {
            db.run(webQuery, [timestamp, url, data.status_code, data.reachable ? 1 : 0]);
            
            // 🔥 فحص فوري: إذا كان الموقع غير متاح، أرسل تنبيهاً عاجلاً فوراً!
            if (!data.reachable) {
                const alertMsg = `🚨 *تنبيه حرج: سقوط موقع!* \n\n🌐 الرابط: \`${url}\`\n❌ الحالة: غير متاح للخدمة\n⚠️ الخطأ: _${data.error || 'كود الحالة ' + data.status_code}_\n📅 الوقت: \`${timestamp}\``;
                sendTelegramAlert(alertMsg);
            }
        }
    }

    // 🔥 فحص فوري للموارد: إذا تجاوز المعالج أو الذاكرة 85%، أرسل تحذيراً
    if (metrics.cpu_percent > 85.0 || metrics.ram_percent > 85.0) {
        const resourceAlert = `⚠️ *تحذير: ضغط موارد مرتفع على السيرفر!* \n\n💻 استهلاك المعالج: \`${metrics.cpu_percent}%\`\n🧠 استهلاك الذاكرة: \`${metrics.ram_percent}%\`\n📅 الوقت: \`${timestamp}\``;
        sendTelegramAlert(resourceAlert);
    }

    console.log(`📥 [${new Date().toLocaleTimeString()}] تم الاستلام والفحص الذكي لشروط التنبيهات.`);
    requireResponse.status(201).json({ status: 'success', message: 'Metrics processed and checked.' });
});


// 📊 1. نقطة اتصال لجلب آخر قراءة حية فقط (Live Metrics)
app.get('/api/metrics/live', (req, res) => {
    // استعلام SQL لجلب آخر سطر تم إدخاله في جدول المقاييس
    const sql = `SELECT * FROM system_metrics ORDER BY id DESC LIMIT 1`;
    
    db.get(sql, [], (err, row) => {
        if (err) {
            console.error('❌ خطأ أثناء جلب القراءة الحية:', err.message);
            return res.status(500).json({ status: 'error', message: 'خطأ داخلي في الخادم' });
        }
        if (!row) {
            return res.status(404).json({ status: 'error', message: 'لا توجد بيانات مسجلة حتى الآن' });
        }
        res.json({ status: 'success', data: row });
    });
});

// 📈 2. نقطة اتصال لجلب السجلات التاريخية للرسوم البيانية (Historical Metrics)
app.get('/api/metrics/history', (req, res) => {
    // جلب آخر 30 قراءة لتجنب إثقال المتصفح بالبيانات (Pagination Principle)
    const sql = `SELECT * FROM system_metrics ORDER BY id DESC LIMIT 30`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ خطأ أثناء جلب البيانات التاريخية:', err.message);
            return res.status(500).json({ status: 'error', message: 'خطأ داخلي في الخادم' });
        }
        // نعكس المصفوفة لتظهر البيانات بالترتيب الزمني الصحيح من الأقدم إلى الأحدث على الرسم البياني
        res.json({ status: 'success', data: rows.reverse() });
    });
});


// تشغيل السيرفر والاستماع للمنفذ
app.listen(PORT, () => {
    console.log(`🚀 سيرفر المراقبة الخلفي يعمل الآن على المنفذ: ${PORT}`);
});
