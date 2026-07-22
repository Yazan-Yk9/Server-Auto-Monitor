# 1. استخدام نسخة بايثون مصغرة وخفيفة للإنتاج
FROM python:3.11-slim

# 2. تحديد مجلد العمل
WORKDIR /app

# 3. نسخ ملف المتطلبات وتثبيت المكتبات
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. نسخ السكربت البرمجي الرئيسي
COPY . .

# 5. السكربت يعمل بشكل دوري مستمر، لذا سنطلقه مباشرة
CMD ["python", "monitor.py"]
