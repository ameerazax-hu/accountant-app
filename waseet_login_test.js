// waseet_login_test.js - اختبار الحصول على التوكن فقط
console.log("Waseet API Login Test Script Loaded.");

// ----------------------------------------------------
//          1. بيانات التوثيق وروابط API
// ----------------------------------------------------

// نستخدم القيم التي زودتني بها في أمر curl
const TEST_USERNAME = '07800892525'; 
const TEST_PASSWORD = '07800892525'; 
const WASEET_LOGIN_URL = 'https://api.alwaseet-iq.net/v1/merchant/login'; 

let waseetToken = null; 

// ----------------------------------------------------
//           2. دالة الحصول على التوكن
// ----------------------------------------------------
const getWaseetToken = async () => {
    
    console.log("Attempting to get Waseet Merchant Token...");

    // بناء جسم الطلب باستخدام FormData (كما يتطلبه الـ API)
    const formData = new FormData();
    formData.append('username', TEST_USERNAME); 
    formData.append('password', TEST_PASSWORD);

    try {
        const response = await fetch(WASEET_LOGIN_URL, {
            method: 'POST',
            body: formData, // هذا يرسل الطلب بصيغة multipart/form-data
        });

        const data = await response.json();

        // تحليل الاستجابة
        if (response.ok && data.status === 'success' && data.token) {
            waseetToken = data.token;
            console.log("🎉 SUCCESS: Token received successfully!");
            console.log("✅ Received Token:", waseetToken);
            return waseetToken;
        } else {
            console.error("❌ FAILURE: Waseet Login Failed!");
            console.error("Waseet API Error Response:", data);
            throw new Error(`Waseet Auth Failed: ${data.message || JSON.stringify(data)}`);
        }
    } catch (error) {
        console.error("❌ CRITICAL ERROR during token retrieval:", error);
        throw new Error("خطأ اتصال أثناء محاولة الحصول على توكن التوثيق.");
    }
};

// ----------------------------------------------------
//       3. تشغيل الاختبار
// ----------------------------------------------------
getWaseetToken();
