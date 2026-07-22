require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') }); 
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

app.use(express.json());

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ فشل الاتصال بقاعدة البيانات:', err.message);
    } else {
        console.log('✅ متصل بنجاح بقاعدة بيانات SQLite المؤتمتة.');
        initializeDatabase();
    }
});

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



async function sendTelegramAlert(message) {

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


app.post('/api/metrics', (req, requireResponse) => {
    const { timestamp, metrics, web_data } = req.body;

    if (!timestamp || !metrics) {
        return requireResponse.status(400).json({ status: 'error', message: 'بيانات تالفة أو ناقصة' });
    }

    const metricsQuery = `INSERT INTO system_metrics (timestamp, cpu_usage, ram_usage, disk_usage) VALUES (?, ?, ?, ?)`;
    db.run(metricsQuery, [timestamp, metrics.cpu_percent, metrics.ram_percent, metrics.disk_percent]);

    if (web_data) {
        const webQuery = `INSERT INTO website_status (timestamp, url, status_code, reachable) VALUES (?, ?, ?, ?)`;
        for (const [url, data] of Object.entries(web_data)) {
            db.run(webQuery, [timestamp, url, data.status_code, data.reachable ? 1 : 0]);

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


app.get('/api/metrics/live', (req, res) => {
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

app.get('/api/metrics/history', (req, res) => {
    const sql = `SELECT * FROM system_metrics ORDER BY id DESC LIMIT 30`;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ خطأ أثناء جلب البيانات التاريخية:', err.message);
            return res.status(500).json({ status: 'error', message: 'خطأ داخلي في الخادم' });
        }
        res.json({ status: 'success', data: rows.reverse() });
    });
});


app.listen(PORT, () => {
    console.log(`🚀 سيرفر المراقبة الخلفي يعمل الآن على المنفذ: ${PORT}`);
});
