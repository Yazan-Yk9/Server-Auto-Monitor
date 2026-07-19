document.addEventListener('DOMContentLoaded', () => {
    // ⬇️ انقل كافة أكواد ملف app.js القديمة بالكامل داخل هذا القوس ⬇️
    const ctx = document.getElementById('metricsChart').getContext('2d');
    const metricsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'المعالج (CPU %)',
                    data: [],
                    borderColor: '#fbbf24',
                    backgroundColor: 'rgba(251, 191, 36, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'الذاكرة (RAM %)',
                    data: [],
                    borderColor: '#60a5fa',
                    backgroundColor: 'rgba(96, 165, 250, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'مساحة القرص (% Disk)',
                    data: [],
                    borderColor: '#a855f7',
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: '#374151' } },
                x: { grid: { display: false } }
            },
            plugins: { legend: { labels: { color: '#9ca3af' } } }
        }
    });

    async function fetchMetricsDashboard() {
        try {
            const response = await fetch('/api/metrics/history');
            const jsonResult = await response.json();
            
            if (jsonResult.status === 'success' && jsonResult.data.length > 0) {
                const dataRows = jsonResult.data;
                const lastRecord = dataRows[dataRows.length - 1];

                document.getElementById('cpu-live').innerText = `${lastRecord.cpu_usage}%`;
                document.getElementById('ram-live').innerText = `${lastRecord.ram_usage}%`;
                document.getElementById('disk-live').innerText = `${lastRecord.disk_usage}%`;

                metricsChart.data.labels = dataRows.map(row => new Date(row.timestamp).toLocaleTimeString('ar-SY'));
                metricsChart.data.datasets[0].data = dataRows.map(row => row.cpu_usage); // تصحيح معرف المصفوفة index 0
                metricsChart.data.datasets[1].data = dataRows.map(row => row.ram_usage);
                metricsChart.data.datasets[2].data = dataRows.map(row => row.disk_usage);
                metricsChart.update();
            }
        } catch (error) {
            console.error('❌ فشل جلب مقاييس الواجهة:', error);
        }
    }

    fetchMetricsDashboard();
    setInterval(fetchMetricsDashboard, 5000);
    // ⬆️ نهاية الكود القديم ⬆️
});
