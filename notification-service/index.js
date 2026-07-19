const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// تفعيل مفسر الـ JSON لاستقبال البيانات القادمة من السكربتات الخارجية
app.use(express.json());

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
    `, (err) => {
        if (err) console.error('❌ خطأ أثناء إنشاء جدول المقاييس:', err.message);
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS website_status (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            url TEXT NOT NULL,
            status_code INTEGER,
            reachable INTEGER NOT NULL
        )
    `, (err) => {
        if (err) console.error('❌ خطأ أثناء إنشاء جدول الحالات:', err.message);
    });
}

// 🌐 نقطة اتصال لاستقبال البيانات الحية من سكربت البايثون وحفظها
app.post('/api/metrics', (req, requireResponse) => {
    const { timestamp, metrics, web_data } = req.body;

    // 1. التحقق الفوري من سلامة هيكل البيانات المستقبلة (Data Validation)
    if (!timestamp || !metrics) {
        return requireResponse.status(400).json({ status: 'error', message: 'بيانات غير مكتملة أو تالفة' });
    }

    // 2. إدخال مقاييس النظام (CPU, RAM, Disk) في جدول system_metrics
    const metricsQuery = `INSERT INTO system_metrics (timestamp, cpu_usage, ram_usage, disk_usage) VALUES (?, ?, ?, ?)`;
    db.run(metricsQuery, [timestamp, metrics.cpu_percent, metrics.ram_percent, metrics.disk_percent], function(err) {
        if (err) {
            console.error('❌ فشل حفظ مقاييس النظام:', err.message);
        }
    });

    // 3. إذا كانت بيانات فحص المواقع موجودة، نقوم بالمرور عليها وحفظها
    if (web_data) {
        const webQuery = `INSERT INTO website_status (timestamp, url, status_code, reachable) VALUES (?, ?, ?, ?)`;
        for (const [url, data] of Object.entries(web_data)) {
            db.run(webQuery, [timestamp, url, data.status_code, data.reachable ? 1 : 0], function(err) {
                if (err) {
                    console.error(`❌ فشل حفظ حالة الرابط ${url}:`, err.message);
                }
            });
        }
    }

    console.log(`📥 [${new Date().toLocaleTimeString()}] تم استقبال وحفظ حزمة مقاييس جديدة بنجاح في قاعدة البيانات.`);
    
    // إرسال رد سريع لسكربت البايثون لتأكيد الاستلام الناجح
    requireResponse.status(201).json({ status: 'success', message: 'Metrics persisted successfully.' });
});


// تشغيل السيرفر والاستماع للمنفذ المعين
app.listen(PORT, () => {
    console.log(`🚀 سيرفر المراقبة الخلفي يعمل الآن على المنفذ: ${PORT}`);
});
