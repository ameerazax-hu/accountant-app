// waseet_test.js
// ...
// روابط API حسب التوثيق (المحدثة)
const WASEET_LOGIN_URL = 'https://api.alwaseet-iq.net/v1/login'; // <--- تم تغيير 'auth/login' إلى 'login'
const WASEET_CREATE_ORDER_URL = 'https://api.alwaseet-iq.net/v1/merchant/create-order';
// ...
// waseet_test.js
console.log("Waseet API Test Script Loaded.");

// ----------------------------------------------------
//          1. بيانات التوثيق وروابط API
// ----------------------------------------------------

// ⚠️ يجب تغيير هذه القيم إلى بيانات حسابك الحقيقية في الوسيط
const WASEET_USERNAME = 'murtaza99@murtaza99'; 
const WASEET_PASSWORD = '12345'; 

// روابط API حسب التوثيق
//const WASEET_LOGIN_URL = 'https://api.alwaseet-iq.net/v1/auth/login'; 
//const WASEET_CREATE_ORDER_URL = 'https://api.alwaseet-iq.net/v1/merchant/create-order';

let waseetToken = null; 

// ----------------------------------------------------
//           2. دالة الحصول على التوكن (Login)
// ----------------------------------------------------
const getWaseetToken = async () => {
    if (waseetToken) return waseetToken; 
    
    console.log("Attempting to get Waseet Token...");

    const requestBody = new URLSearchParams({
        username: WASEET_USERNAME,
        password: WASEET_PASSWORD
    });

    try {
        const response = await fetch(WASEET_LOGIN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: requestBody.toString(),
        });

        const data = await response.json();

        if (data.status === 'success' && data.token) {
            waseetToken = data.token;
            console.log("✅ Token received successfully:", waseetToken);
            return waseetToken;
        } else {
            console.error("❌ Waseet Login Error:", data.message || JSON.stringify(data));
            throw new Error(`فشل في الحصول على توكن التوثيق: ${data.message || JSON.stringify(data)}`);
        }
    } catch (error) {
        console.error("❌ Waseet Login Connection Error:", error);
        throw new Error("خطأ اتصال أثناء محاولة الحصول على توكن التوثيق.");
    }
};

// ----------------------------------------------------
//       3. دالة إرسال الطلب (Create Order)
// ----------------------------------------------------
const testOrderSubmission = async () => {
    try {
        const token = await getWaseetToken();
        if (!token) return;

        console.log("Attempting to send test order...");

        // بيانات طلب اختبارية (يجب أن تكون قيمها مقبولة من الوسيط)
        const TEST_ORDER_DATA = {
            invoiceId: `TEST-${Date.now()}`,
            customerName: "زبون تجريبي احمد",
            customerPhone: "+9647801234567", // يجب أن يكون +9647xxxxxxxxxx
            customerAddress: "حي اليرموك - قرب جامع المتقين",
            itemsNumber: 2,
            totalAmount: 35000, // الإجمالي (يجب أن يشمل التوصيل إذا كان الوسيط يطلبه)
            
            // ⚠️ القيم التي يجب أن تكون رقمية وصحيحة:
            city_id: '1',      // <--- رقم المحافظة
            region_id: '1',    // <--- رقم المنطقة
            package_size: '1' // <--- رقم حجم الطرد
        };
        
        // بناء الـ FormData
        const formData = new FormData();
        formData.append('client_name', TEST_ORDER_DATA.customerName);
        formData.append('client_mobile', TEST_ORDER_DATA.customerPhone);
        formData.append('location', TEST_ORDER_DATA.customerAddress);
        
        // البيانات الرقمية المطلوبة
        formData.append('city_id', TEST_ORDER_DATA.city_id); 
        formData.append('region_id', TEST_ORDER_DATA.region_id); 
        formData.append('package_size', TEST_ORDER_DATA.package_size);
        formData.append('items_number', TEST_ORDER_DATA.itemsNumber);
        formData.append('price', TEST_ORDER_DATA.totalAmount); // السعر
        
        // بيانات أخرى
        formData.append('type_name', 'بضائع متنوعة'); 
        formData.append('replacement', '0'); 
        // formData.append('merchant_notes', TEST_ORDER_DATA.invoiceId); // يمكن إرسال رقم الفاتورة هنا كملاحظة

        // إرسال الطلب عبر POST مع التوكن في الـ URL
        const response = await fetch(`${WASEET_CREATE_ORDER_URL}?token=${token}`, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        // تحليل الاستجابة
        if (data.status === 'success' || data.success === true) {
            console.log("🎉 SUCCESS: Order submitted successfully!");
            console.log("Tracking ID (qr_id):", data.data.qr_id);
            console.log("Full Response:", data);
        } else {
            console.error("❌ FAILURE: Order submission failed!");
            console.error("Waseet API Error Response:", data);
        }

    } catch (error) {
        console.error("❌ CRITICAL ERROR during order test:", error.message);
    }
};

// تشغيل الاختبار بعد تحميل الصفحة
testOrderSubmission();
