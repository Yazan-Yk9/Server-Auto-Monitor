import os
import sys

if os.path.exists('/host/proc'):
    os.environ['HOST_PROC'] = '/host/proc'

import psutil
import requests
import datetime
import time

from pathlib import Path
env_path = Path(__file__).resolve().parent.parent / '.env'

TARGET_DOMAIN = os.getenv("DOMAIN_NAME", "localhost")
API_HOST = os.getenv("HOST", "localhost")
API_PORT = os.getenv("PORT", "5000")

TARGET_URLS = [
    f"https://{TARGET_DOMAIN}",
]

API_URL = f"http://{API_HOST}:{API_PORT}/api/metrics"

def get_system_metrics():
    """
    """
    try:
        cpu = psutil.cpu_percent(interval=1)
        ram = psutil.virtual_memory().percent
        if os.path.exists('/host/root'):
            disk = psutil.disk_usage('/host/root').percent
        else:
            disk = psutil.disk_usage('/').percent

        return {
            "status": "success",
            "timestamp": datetime.datetime.now().isoformat(),
            "metrics": {
                "cpu_percent": cpu,
                "ram_percent": ram,
                "disk_percent": disk
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"فشل في جلب مقاييس النظام: {str(e)}"
        }

def check_website_status(urls):
    """
    """
    results = {}

    for url in urls:
        try:
            response = requests.get(url, timeout=5)

            results[url] = {
                "status_code": response.status_code,
                "reachable": response.status_code == 200,
                "error": None
            }
        except requests.exceptions.Timeout:

            results[url] = {
                "status_code": None,
                "reachable": False,
                "error": "Request Timed Out"
         }
        except requests.exceptions.RequestException as e:
            results[url] = {
                "status_code": None,
                "reachable": False,
                "error": str(e)
            }

    return results


def main():
    print("=== بدء نظام المراقبة والأتمتة الذكي ===")

    while True:
        system_data = get_system_metrics()

        print("\n[بدء فحص شبكة الويب وجهوزية المواقع]...")
        web_data = check_website_status(TARGET_URLS)

        payload = {
            "timestamp": system_data["timestamp"],
            "metrics": system_data["metrics"],
            "web_data": web_data
        }

        try:
            print(f"\n[جاري إرسال البيانات إلى السيرفر الخلفي على المسار {API_URL}]...")
            response = requests.post(API_URL, json=payload, timeout=5)

            if response.status_code == 201:
                print("✅ تم تسليم وحفظ المقاييس في قاعدة البيانات بنجاح!")
                print(f"استجابة السيرفر: {response.json()}")
            else:
                print(f"❌ رفض السيرفر الحزمة. رمز الحالة: {response.status_code}")
                print(f"السبب: {response.text}")

        except requests.exceptions.RequestException as e:
            print(f"❌ فشل الاتصال بالسيرفر الخلفي. تأكد أن سيرفر Node.js يعمل: {str(e)}")
        time.sleep(5)


if __name__ == "__main__":
    main()
