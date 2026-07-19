import psutil
import requests
import datetime
import time

# إعدادات الروابط المستهدفة للفحص المستقبلي
# (ملاحظة: سأكتبها بالمسافات لضمان عدم اقتطاعها في الشات، قم بتعديلها لروابط حقيقية في ملفك)
TARGET_URLS = [
    "https://arksrv.cam",
    "https://arksrv.cam"
]

def get_system_metrics():
    """
    تقوم بجلب نسب استهلاك المعالج، الذاكرة العشوائية، ومساحة القرص الحالية.
    """
    try:
        # 1. جلب استهلاك المعالج (%) - نحدد interval=1 ليعطينا القراءة الإجمالية خلال ثانية واحدة
        cpu = psutil.cpu_percent(interval=1)
        
        # 2. جلب نسبة استهلاك الذاكرة العشوائية (%) مباشرة من خيار percent
        ram = psutil.virtual_memory().percent
        
        # 3. جلب نسبة استهلاك القرص الصلب للمسار الرئيسي '/'
        disk = psutil.disk_usage('/').percent
        
        # تجميع البيانات في قاموس (Dictionary) منظم مع توثيق زمني بنظام ISO
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
        # معالجة الأخطاء لضمان عدم تجميد السكربت بالكامل في حال فشل القراءة
        return {
            "status": "error",
            "message": f"فشل في جلب مقاييس النظام: {str(e)}"
        }

def check_website_status(urls):
    """
    تمر هذه الدالة على قائمة الروابط وتتحقق من كود الحالة (Status Code) لكل منها
    مع معالجة استثناءات انقطاع الشبكة أو انتهاء وقت الاستجابة (Timeout).
    """
    results = {}
    
    for url in urls:
        try:
            # نرسل طلب GET مع تحديد مهلة زمنية بـ 5 ثوانٍ لمنع تجميد السكربت عند بطء الشبكة
            # (طبقنا هنا معمارية الحماية المقترحة لمنع تجميد العمليات)
            response = requests.get(url, timeout=5)
            
            # نخزن النتائج؛ إذا كان رمز الحالة 200 فالخدمة تعمل بنجاح (True)
            results[url] = {
                "status_code": response.status_code,
                "reachable": response.status_code == 200,
                "error": None
            }
        except requests.exceptions.Timeout:
            # التقاط حالة انتهاء المهلة الزمنية (السيرفر بطيء جداً أو لا يستجيب)
            results[url] = {
                "status_code": None,
                "reachable": False,
                "error": "Request Timed Out"
            }
        except requests.exceptions.RequestException as e:
            # التقاط أي خطأ شبكة آخر (مثل عدم القدرة على حل الـ DNS أو سقوط السيرفر تماماً)
            results[url] = {
                "status_code": None,
                "reachable": False,
                "error": str(e)
            }
            
    return results


def main():
    print("=== بدء نظام المراقبة والأتمتة الذكي ===")
    
    # 1. جلب مقاييس السيرفر الحية
    system_data = get_system_metrics()
    print("\n[البيانات المستخرجة من النظام]:")
    print(system_data)
    
    # 2. فحص حالة صفحات الويب
    print("\n[بدء فحص شبكة الويب وجهوزية المواقع]...")
    web_data = check_website_status(TARGET_URLS)
    print("[حالة استجابة المواقع]:")
    print(web_data)

if __name__ == "__main__":
    main()

