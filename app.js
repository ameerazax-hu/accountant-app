import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// 1. Supabase Setup
const SUPABASE_URL = 'https://iqfxbunxrnvmcsazmwvo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZnhidW54cm52bWNzYXptd3ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTI1NDEsImV4cCI6MjA3NTc2ODU0MX0.uVj2ioxJ5oaPsxLVbCaN3h1C3T0Wt8AUyobc5nkIE5c';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// هناااااااااااااا كود الوسييييييييييط 


// ... (بعد Supabase Setup)

// --- إعدادات شركة التوصيل الوسيط ---
// لم تعد هناك حاجة لتعريف Username/Password هنا، يتم إرسال الطلبات إلى الخادم الوسيط
const PROXY_BASE_URL = window.location.origin; // رابط تطبيقك المنشور (Vercel)

let waseetToken = null; 

// --- Global State ---
// ...

// فوووووووووووق كود الوسييييييييييط 
// --- Global State ---
let state = { products: [], users: [], sales: [], currentUser: null };
let currentInvoiceItems = [];


// --- DOM Elements ---
const loginSection = document.getElementById('login-section');
const adminContainer = document.getElementById('admin-container');
const repContainer = document.getElementById('rep-container');
const packerContainer = document.getElementById('packer-container');
const modalContainer = document.getElementById('modal-container');
const loadingOverlay = document.getElementById('loading-overlay');
const loginForm = document.getElementById('loginForm');
const messageDiv = document.getElementById('message');

// --- Utility Functions ---
const showLoader = () => loadingOverlay.classList.remove('hidden');
const hideLoader = () => loadingOverlay.classList.add('hidden');
const showToast = (message, isError = false) => {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show';
    if (isError) toast.classList.add('error');
    setTimeout(() => { toast.className = 'toast'; }, 3000);
};
const statusMap = { pending: 'قيد التجهيز', prepared: 'تم التجهيز', shipped: 'تم الشحن', delivered: 'تم الاستلام', cancelled: 'ملغي', returned: 'مرتجع' };
const getStatusClass = (status) => `status-${status}`;
const getStatusText = (status) => statusMap[status] || 'غير معروف';
const showConfirmationModal = (message) => {
    return new Promise((resolve) => {
        const modalId = `confirmationModal-${Date.now()}`;
        // تصحيح: إضافة المودال إلى modalContainer لضمان ظهوره
        modalContainer.innerHTML = `<div id="${modalId}" class="modal-backdrop"><div class="modal"><p style="margin-bottom: 1.5rem;">${message}</p><div class="modal-footer"><button id="confirm-no-${modalId}" class="button-secondary">لا</button><button id="confirm-yes-${modalId}" class="button-danger">نعم</button></div></div></div>`;
        const yesBtn = document.getElementById(`confirm-yes-${modalId}`);
        const noBtn = document.getElementById(`confirm-no-${modalId}`);
        const cleanup = () => document.getElementById(modalId)?.remove();
        yesBtn.onclick = () => { cleanup(); resolve(true); };
        noBtn.onclick = () => { cleanup(); resolve(false); };
    });
};

// --- Data Fetching ---
const fetchAllData = async () => {
    showLoader();
    try {
        // 1. تصفية المبيعات للمندوب
        const salesQuery = supabase.from('sales').select('*').order('created_at', { ascending: false });

        if (state.currentUser?.role === 'rep') {
            salesQuery.eq('repId', state.currentUser.id);
        }

        const [productsRes, salesRes, usersRes] = await Promise.all([
            supabase.from('products').select('*'),
            salesQuery,
            state.currentUser?.role === 'admin' ? supabase.from('users').select('*') : Promise.resolve({ data: [], error: null })
        ]);

        if (productsRes.error) throw productsRes.error;
        if (salesRes.error) throw salesRes.error;
        
        state.products = productsRes.data;
        state.sales = salesRes.data;
        if (usersRes.data) state.users = usersRes.data;
    } catch (error) {
        showToast(`فشل تحميل البيانات: ${error.message}`, true);
    } finally {
        hideLoader();
    }
};

// =================================================================


// الوسيططططططططط

const getWaseetToken = async () => {
    if (waseetToken) return waseetToken; 
    
    try {
        const response = await fetch(`${PROXY_BASE_URL}/api/waseet-login`, {
            method: 'POST',
            // لا حاجة لإرسال البيانات، الخادم الوسيط يستخدم المتغيرات
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}) // إرسال جسم فارغ أو أي شيء يتوقعه الخادم
        });

        const data = await response.json();

        if (response.ok && data.status === 'success' && data.token) {
            waseetToken = data.token;
            return waseetToken;
        } else {
            console.error("Waseet Login Error:", data.message || JSON.stringify(data));
            throw new Error(`فشل في الحصول على توكن التوثيق: ${data.message || JSON.stringify(data)}`);
        }
    } catch (error) {
        console.error("Waseet Login Connection Error:", error);
        throw new Error("خطأ اتصال أثناء محاولة الحصول على توكن التوثيق.");
    }
};




// الوسييييط فوق 


// الوسيييييييييط تحت 



const sendOrderToAlWaseet = async (orderData) => {
    
    const token = await getWaseetToken();
    if (!token) return { success: false, message: "تعذر الحصول على توكن التوثيق." };

    // نجهز حمولة JSON التي سنرسلها إلى الخادم الوسيط
    const proxyPayload = {
        token: token, 
        client_name: orderData.customerName,
        client_mobile: orderData.customerPhone, 
        location: orderData.customerAddress,
        type_name: 'بضائع متنوعة', 
        items_number: orderData.currentInvoiceItems.length,
        price: orderData.totalAmount, 
        replacement: '0', 
        city_id: '1',      
        region_id: '1',    
        package_size: '1', 
        currentInvoiceItems: orderData.currentInvoiceItems // للمساعدة في الإرسال
    };

    try {
        const response = await fetch(`${PROXY_BASE_URL}/api/waseet-create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(proxyPayload),
        });

        const data = await response.json();

        if (data.status === 'success' || data.success === true) {
            return {
                success: true,
                trackingId: data.data.qr_id,
                message: "تم الإرسال بنجاح."
            };
        } else {
            console.error("Waseet API Error via Proxy:", data.message || JSON.stringify(data));
            return { success: false, message: data.message || "فشل الإرسال. تحقق من البيانات." };
        }

    } catch (error) {
        console.error("Waseet API Connection Error:", error);
        return { success: false, message: "فشل الاتصال بالخادم الوسيط." };
    }
};


// الوسيييط فوق
// ===== ADMIN-SPECIFIC FUNCTIONS (UNCHANGED) ======================
// =================================================================
const renderAdminApp=async()=>{loginSection.classList.add("hidden"),adminContainer.classList.remove("hidden"),adminContainer.innerHTML=`<div class="container"><header class="app-header"><h1>لوحة تحكم المدير</h1><button id="logout-btn" class="button-danger">تسجيل الخروج</button></header><main><div class="tabs"><button class="tab-button active" data-tab="products">المنتجات</button><button class="tab-button" data-tab="users">المستخدمين</button></div><div id="content-area"></div></main></div>`,document.getElementById("logout-btn").addEventListener("click",handleLogout),document.querySelectorAll("#admin-container .tab-button").forEach((e=>{e.addEventListener("click",(()=>switchAdminTab(e.dataset.tab)))})),await fetchAllData(),switchAdminTab("products")},switchAdminTab=e=>{document.querySelectorAll("#admin-container .tab-button").forEach((t=>t.classList.toggle("active",t.dataset.tab===e)));const t=document.querySelector("#admin-container #content-area");"products"===e?renderProductsView(t):"users"===e&&renderUsersView(t)},renderProductsView=e=>{e.innerHTML=`<div class="content-header"><h2>قائمة المنتجات (${state.products.length})</h2><button id="add-product-btn">إضافة منتج جديد</button></div><table><thead><tr><th>صورة</th><th>الاسم</th><th>الكمية</th><th>سعر البيع للمندوب</th></tr></thead><tbody>${state.products.map((e=>`<tr><td><img class="table-img" src="${e.imageUrl||"https://placehold.co/100x100/e2e8f0/e2e8f0?text=."}" alt="${e.name}"></td><td>${e.name}</td><td>${e.quantity}</td><td>${e.repPrice} د.ع</td></tr>`)).join("")}</tbody></table>`,document.getElementById("add-product-btn").addEventListener("click",renderAddProductModal)},renderUsersView=e=>{const t=state.users.filter((e=>"admin"!==e.role));e.innerHTML=`<div class="content-header"><h2>قائمة المستخدمين (${t.length})</h2><button id="add-user-btn">إضافة مستخدم جديد</button></div><table><thead><tr><th>الاسم</th><th>البريد الإلكتروني</th><th>الصلاحية</th></tr></thead><tbody>${t.map((e=>`<tr><td>${e.name}</td><td>${e.email}</td><td>${"rep"===e.role?"مندوب":"مجهز"}</td></tr>`)).join("")}</tbody></table>`,document.getElementById("add-user-btn").addEventListener("click",renderAddUserModal)},renderAddProductModal=()=>{modalContainer.innerHTML=`<div id="product-modal" class="modal-backdrop"><div class="modal"><div class="modal-header"><h3>إضافة منتج جديد</h3></div><form id="product-form"><div class="input-group"><label>اسم المنتج</label><input type="text" id="product-name" required></div><div class="input-group"><label>صورة المنتج</label><input type="file" id="product-image-file" accept="image/*"></div><div class="input-group"><label>الكمية</label><input type="number" id="product-quantity" required></div><div class="input-group"><label>سعر الشراء</label><input type="number" id="product-cost" required></div><div class="input-group"><label>سعر البيع للمندوب</label><input type="number" id="product-rep-price" required></div><div class="input-group"><label>سعر البيع للزبون</label><input type="number" id="product-customer-price" required></div><div class="modal-footer"><button type="button" class="button-secondary" id="cancel-product-btn">إلغاء</button><button type="submit">حفظ المنتج</button></div></form></div></div>`,document.getElementById("product-form").addEventListener("submit",handleAddNewProduct),document.getElementById("cancel-product-btn").addEventListener("click",(()=>modalContainer.innerHTML=""))},renderAddUserModal=()=>{modalContainer.innerHTML=`<div id="user-modal" class="modal-backdrop"><div class="modal"><div class="modal-header"><h3>إضافة مستخدم جديد</h3></div><form id="user-form"><div class="input-group"><label>الاسم</label><input type="text" id="user-name" required></div><div class="input-group"><label>البريد الإلكتروني</label><input type="email" id="user-email" required></div><div class="input-group"><label>كلمة السر</label><input type="password" id="user-password" required></div><div class="input-group"><label>الصلاحية</label><select id="user-role"><option value="rep">مندوب</option><option value="packer">مجهز</option></select></div><div class="modal-footer"><button type="button" class="button-secondary" id="cancel-user-btn">إلغاء</button><button type="submit">حفظ المستخدم</button></div></form></div></div>`,document.getElementById("user-form").addEventListener("submit",handleAddNewUser),document.getElementById("cancel-user-btn").addEventListener("click",(()=>modalContainer.innerHTML=""))},handleAddNewProduct=async e=>{e.preventDefault(),showLoader();try{const e=document.getElementById("product-image-file").files[0];let t=null;if(e){const n=`public/${Date.now()}-${e.name}`,{error:a}=await supabase.storage.from("product_images").upload(n,e);if(a)throw a;const{data:r}=supabase.storage.from("product_images").getPublicUrl(n);t=r.publicUrl}const n={name:document.getElementById("product-name").value,quantity:parseInt(document.getElementById("product-quantity").value),costPrice:parseFloat(document.getElementById("product-cost").value),repPrice:parseFloat(document.getElementById("product-rep-price").value),customerPrice:parseFloat(document.getElementById("product-customer-price").value),imageUrl:t},{error:a}=await supabase.from("products").insert(n);if(a)throw a;showToast("تمت إضافة المنتج بنجاح."),modalContainer.innerHTML="",await fetchAllData(),switchAdminTab("products")}catch(e){showToast(`خطأ: ${e.details||e.message}`,!0)}finally{hideLoader()}},handleAddNewUser=async e=>{e.preventDefault(),showLoader();try{const e=document.getElementById("user-name").value,t=document.getElementById("user-email").value,n=document.getElementById("user-password").value,a=document.getElementById("user-role").value,{data:r,error:i}=await supabase.auth.signUp({email:t,password:n});if(i)throw i;const{error:o}=await supabase.from("users").insert({id:r.user.id,name:e,email:t,role:a});if(o)throw o;showToast("تمت إضافة المستخدم بنجاح."),modalContainer.innerHTML="",await fetchAllData(),switchAdminTab("users")}catch(e){showToast(`خطأ: ${e.details||e.message}`,!0)}finally{hideLoader()}};

// =================================================================
// ===== REP-SPECIFIC FUNCTIONS (MODIFIED) =========================
// =================================================================

const renderRepApp = async () => {
    loginSection.classList.add("hidden");
    repContainer.classList.remove("hidden");
    repContainer.innerHTML = `<div class="container"><header class="app-header"><h1>واجهة المندوب</h1><button id="logout-btn" class="button-danger">تسجيل الخروج</button></header><main><div class="tabs"><button class="tab-button active" data-tab="add-order">إضافة طلب</button><button class="tab-button" data-tab="previous-orders">الطلبات السابقة</button><button class="tab-button" data-tab="reports">تقارير الأرباح</button></div><div id="rep-content-area"></div></main></div>`;
    document.getElementById("logout-btn").addEventListener("click", handleLogout);
    document.querySelectorAll("#rep-container .tab-button").forEach((e => {
        e.addEventListener("click", (() => switchRepTab(e.dataset.tab)))
    }));
    await fetchAllData();
    switchRepTab("add-order");
};

const switchRepTab = e => {
    document.querySelectorAll("#rep-container .tab-button").forEach((t => t.classList.toggle("active", t.dataset.tab === e)));
    const t = document.getElementById("rep-content-area");
    "add-order" === e ? renderRepOrderCreationView(t) : 
    "previous-orders" === e ? renderRepPreviousOrdersView(t) :
    "reports" === e && renderRepReportsView(t); 
};

const renderRepOrderCreationView = e => {
    e.innerHTML = `<div class="rep-grid"><div><h2>الفاتورة الحالية</h2><div id="invoice-items-container"></div><div id="invoice-summary-container"></div><hr style="margin: 1.5rem 0;"><h2>معلومات الزبون</h2><form id="customer-info-form"><div class="input-group"><label>اسم الزبون</label><input type="text" id="customer-name" required></div><div class="input-group"><label>رقم الهاتف</label><input type="tel" id="customer-phone" required></div><div class="input-group"><label>العنوان</label><textarea id="customer-address" rows="3" required></textarea></div><button type="button" id="submit-invoice-btn" class="button-success" disabled>تثبيت الطلب</button></form></div><div><h2>اختر المنتجات</h2><div id="product-grid" class="product-grid">${state.products.filter((e=>e.quantity>0)).map((e=>`<div class="product-card"><img src="${e.imageUrl||"https://placehold.co/150x120/e2e8f0/e2e8f0?text=."}" alt="${e.name}"><div class="product-card-body"><h3>${e.name}</h3><button class="add-to-cart-btn" data-product-id="${e.id}">أضف للسلة</button></div></div>`)).join("")}</div></div></div>`;
    document.querySelectorAll(".add-to-cart-btn").forEach((e => {
        e.addEventListener("click", (() => handleAddToCartClick(e.dataset.productId)))
    }));
    document.getElementById("submit-invoice-btn").addEventListener("click", handleInvoiceSubmit);
    renderInvoiceItems();
};

const handleAddToCartClick = e => {
    if (currentInvoiceItems.find((t => t.product.id == e))) return showToast("هذا المنتج موجود بالفعل في السلة.", !0);
    const t = state.products.find((t => t.id == e));
    t && (currentInvoiceItems.push({
        product: t,
        quantity: 1,
        finalPrice: t.customerPrice
    }), renderInvoiceItems())
};

const renderInvoiceItems = () => {
    const itemsContainer = document.getElementById("invoice-items-container");
    const summaryContainer = document.getElementById("invoice-summary-container");
    const submitBtn = document.getElementById("submit-invoice-btn");

    if (!itemsContainer || !summaryContainer || !submitBtn) return;

    if (currentInvoiceItems.length === 0) {
        itemsContainer.innerHTML = "<p>السلة فارغة.</p>";
        summaryContainer.innerHTML = "";
        submitBtn.disabled = true;
        return;
    }

    // 1. عرض جدول المنتجات
    itemsContainer.innerHTML = `<table id="invoice-items-table" style="width:100%"><thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th></th></tr></thead><tbody>${currentInvoiceItems.map(((e,t)=>`<tr><td>${e.product.name}</td><td><input type="number" value="${e.quantity}" min="1" max="${e.product.quantity}" class="invoice-item-quantity" data-index="${t}" style="width: 60px; padding: 0.25rem;"></td><td><input type="number" value="${e.finalPrice}" min="0" class="invoice-item-price" data-index="${t}" style="width: 80px; padding: 0.25rem;"></td><td><button data-index="${t}" class="remove-item-btn button-danger" style="width:auto;padding:2px 8px;">X</button></td></tr>`)).join("")}</tbody></table>`;
    submitBtn.disabled = false;

    // 2. حساب الإجمالي الفرعي
    const subtotal = currentInvoiceItems.reduce(((acc, item) => acc + item.quantity * item.finalPrice), 0);
    
    // 3. عرض ملخص الفاتورة
    // البحث عن قيمة الخصم الحالية، إذا كانت موجودة، للاحتفاظ بها عند إعادة بناء الـ DOM
    let existingDiscount = 0;
    const discountInput = document.getElementById("invoice-discount");
    if (discountInput) {
        existingDiscount = parseFloat(discountInput.value) || 0;
    }
    
    summaryContainer.innerHTML = `<div class="invoice-summary"><p><span>الإجمالي الفرعي:</span> <span id="subtotal-amount">${subtotal.toFixed(2)} د.ع</span></p><div class="input-group"><label for="invoice-discount">الخصم:</label><input type="number" id="invoice-discount" value="${existingDiscount}" min="0" style="padding: 0.5rem;"></div><p class="final-total"><span>الإجمالي النهائي:</span> <span id="final-total-amount"></span></p></div>`;

    // 4. تحديث الإجمالي النهائي والربط بالأحداث
    const newDiscountInput = document.getElementById("invoice-discount");
    const updateFinalTotal = () => {
        const discount = parseFloat(newDiscountInput.value) || 0;
        document.getElementById("final-total-amount").textContent = `${(subtotal - discount).toFixed(2)} د.ع`;
    };

    updateFinalTotal(); // تحديث الإجمالي الأولي

    document.querySelectorAll(".remove-item-btn").forEach((e => {
        e.onclick = t => {
            currentInvoiceItems.splice(t.currentTarget.dataset.index, 1);
            renderInvoiceItems();
        }
    }));

    document.querySelectorAll("input.invoice-item-quantity, input.invoice-item-price").forEach((e => {
        e.onchange = t => {
            const index = t.target.dataset.index;
            if (t.target.classList.contains("invoice-item-quantity")) {
                const newQuantity = parseInt(t.target.value);
                // منع تجاوز الكمية المتاحة (للتأكد)
                const maxQuantity = parseInt(t.target.max);
                currentInvoiceItems[index].quantity = Math.min(newQuantity, maxQuantity);
            } else {
                currentInvoiceItems[index].finalPrice = parseFloat(t.target.value);
            }
            // إعادة عرض العناصر لتحديث الإجمالي
            renderInvoiceItems(); 
        }
    }));
    
    if(newDiscountInput) {
        newDiscountInput.oninput = updateFinalTotal;
    }
};

const handleInvoiceSubmit = async () => {
    if (0 === currentInvoiceItems.length) return showToast("الفاتورة فارغة!", !0);
    const customerName = document.getElementById("customer-name").value;
    const customerPhone = document.getElementById("customer-phone").value;
    const customerAddress = document.getElementById("customer-address").value;
    const discountElement = document.getElementById("invoice-discount");
    const discount = discountElement ? parseFloat(discountElement.value) || 0 : 0;
    
    if (!customerName || !customerPhone || !customerAddress) return showToast("الرجاء إدخال معلومات الزبون كاملة.", !0);

    showLoader();
    
    // حساب المبلغ الصافي (المدفوع من الزبون)
    const totalAmount = currentInvoiceItems.reduce((acc, item) => acc + item.quantity * item.finalPrice, 0) - discount;

    const itemsForRPC = currentInvoiceItems.map((e => ({
        product_id: parseInt(e.product.id),
        quantity: e.quantity,
        final_price: e.finalPrice,
        product_name: e.product.name,
        cost_price: e.product.costPrice,
        rep_price: e.product.repPrice
    })));

    try {
        const {
            error: r
        } = await supabase.rpc("submit_invoice", {
            p_invoice_id: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`, // قيمة فريدة نسبياً
            p_items: itemsForRPC,
            p_rep_id: state.currentUser.id,
            p_rep_name: state.currentUser.name,
            p_customer_name: customerName,
            p_customer_phone: customerPhone,
            p_customer_address: customerAddress,
            p_total_amount: totalAmount, // تمرير الإجمالي بعد الخصم
            p_discount: discount,
            p_notes: ""
        });

        if (r) throw r;
        showToast("تم تثبيت الطلب بنجاح.");
        currentInvoiceItems = [];
        await fetchAllData();
        switchRepTab("add-order");
    } catch (e) {
        showToast(`فشل تثبيت الطلب: ${e.message}`, !0);
    } finally {
        hideLoader();
    }
};

// --- REP ORDER VIEW (UNCHANGED) ---
const renderRepPreviousOrdersView = (container) => {
    container.innerHTML = `
        <div class="content-header">
            <h2>الطلبات السابقة</h2>
            <div>
                <label for="status-filter">تصفية حسب الحالة:</label>
                <select id="status-filter" style="width: auto; padding: 0.5rem;">
                    <option value="all">جميع الحالات</option>
                    <option value="delivered">تم الاستلام</option>
                    <option value="prepared">تم التجهيز</option>
                    <option value="shipped">تم الشحن</option>
                    <option value="cancelled">ملغي</option>
                </select>
            </div>
        </div>
        <div id="rep-orders-list"></div>
    `;

    document.getElementById('status-filter').addEventListener('change', filterRepOrders);
    filterRepOrders();
};

const filterRepOrders = () => {
    const filter = document.getElementById('status-filter').value;
    const ordersContainer = document.getElementById('rep-orders-list');
    
    // Group sales by invoiceId
    const groupedOrders = state.sales
        .reduce((acc, sale) => {
            if (!acc[sale.invoiceId]) {
                acc[sale.invoiceId] = [];
            }
            acc[sale.invoiceId].push(sale);
            return acc;
        }, {});

    let orders = Object.values(groupedOrders);
    
    // Apply filter
    if (filter !== 'all') {
        orders = orders.filter(orderItems => orderItems[0].status === filter);
    }

    if (orders.length === 0) {
        ordersContainer.innerHTML = `<p>لا توجد طلبات مطابقة للمعايير المحددة.</p>`;
        return;
    }

    ordersContainer.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>الفاتورة / الزبون</th>
                    <th>المنتجات</th>
                    <th>الإجمالي</th>
                    <th>الحالة</th>
                    <th>الإجراء</th>
                </tr>
            </thead>
            <tbody>
                ${orders.map(orderItems => {
                    const firstItem = orderItems[0];
                    const totalAmount = orderItems.reduce((sum, item) => sum + (item.quantity * item.finalPrice), 0) - (firstItem.discount || 0);
                    const orderStatus = firstItem.status;
                    return `
                    <tr>
                        <td>
                            <div>${firstItem.customerName}</div>
                            <small>${firstItem.invoiceId}</small>
                            <small>${new Date(firstItem.created_at).toLocaleDateString('ar-EG')}</small>
                        </td>
                        <td>
                            <ul class="item-list-in-table">
                                ${orderItems.map(item => `<li>${item.productName} (الكمية: ${item.quantity})</li>`).join('')}
                            </ul>
                        </td>
                        <td>${totalAmount.toFixed(2)} د.ع</td>
                        <td><span class="status-badge ${getStatusClass(orderStatus)}">${getStatusText(orderStatus)}</span></td>
                        <td>
                            <button class="button-secondary print-btn" 
                                data-invoice-id="${firstItem.invoiceId}" 
                                data-print-type="order"
                                style="width: auto; padding: 0.5rem 1rem;">طباعة الفاتورة</button>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    `;

    document.querySelectorAll('.print-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const invoiceId = e.currentTarget.dataset.invoiceId;
            // يجب علينا استخدام المجموعة الكاملة من الطلبات (groupedOrders)
            const orderData = Object.values(groupedOrders).find(o => o[0].invoiceId === invoiceId);
            if (orderData) {
                printInvoice([orderData], 'order'); // تمرير الطلب داخل مصفوفة لطباعة فاتورة واحدة
            }
        });
    });
};

// --- NEW REP REPORTS VIEW (MODIFIED for Checkboxes) ---
const renderRepReportsView = (container) => {
    // 1. تجميع الطلبات المستلمة
    const deliveredSales = state.sales.filter(s => s.status === 'delivered');
    const groupedDeliveredOrders = deliveredSales
        .reduce((acc, sale) => {
            if (!acc[sale.invoiceId]) {
                acc[sale.invoiceId] = [];
            }
            acc[sale.invoiceId].push(sale);
            return acc;
        }, {});
    
    // مصفوفة الطلبات المستلمة (كل عنصر هو مصفوفة من مبيعات الطلب الواحد)
    const deliveredOrders = Object.values(groupedDeliveredOrders);
    
    // 2. حساب الربح الكلي الأولي
    const totalProfit = calculateRepProfit(deliveredSales);
    
    container.innerHTML = `
        <div class="content-header">
            <h2>تقارير الأرباح (الطلبات المستلمة)</h2>
            <button id="print-selected-report-btn" class="button-success" style="width: auto;" disabled>طباعة الطلبات المحددة</button>
        </div>
        <div class="report-summary">
            <p>إجمالي الأرباح الصافية من جميع الطلبات المستلمة: <strong>${totalProfit} د.ع</strong></p>
        </div>
        <h3 style="margin-top: 2rem;">قائمة الطلبات المستلمة (${deliveredOrders.length})</h3>
        <div id="profit-report-table-container">
        </div>
    `;

    const reportTableContainer = document.getElementById('profit-report-table-container');

    if (deliveredOrders.length === 0) {
        reportTableContainer.innerHTML = `<p>لا توجد طلبات مستلمة لعرض التقرير.</p>`;
        document.getElementById('print-selected-report-btn').disabled = true;
        return;
    }

    reportTableContainer.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th><input type="checkbox" id="select-all-orders"></th>
                    <th>الزبون / الفاتورة</th>
                    <th>رقم الزبون</th>
                    <th>سعر التكلفة على المندوب</th>
                    <th>سعر البيع للزبون</th>
                    <th>الربح الصافي</th>
                    <th>الإجراء</th>
                </tr>
            </thead>
            <tbody>
                ${deliveredOrders.map(orderItems => {
                    const firstItem = orderItems[0];
                    const repCost = orderItems.reduce((sum, item) => sum + (item.quantity * (item.repPrice || 0)), 0);
                    const customerRevenue = orderItems.reduce((sum, item) => sum + (item.quantity * item.finalPrice), 0);
                    const orderDiscount = firstItem.discount || 0;
                    const orderProfit = customerRevenue - repCost - orderDiscount;

                    return `
                    <tr data-invoice-id="${firstItem.invoiceId}">
                        <td><input type="checkbox" class="order-checkbox" data-invoice-id="${firstItem.invoiceId}"></td>
                        <td>
                            <div>${firstItem.customerName}</div>
                            <small>فاتورة: ${firstItem.invoiceId}</small>
                        </td>
                        <td>${firstItem.customerPhone}</td>
                        <td>${repCost.toFixed(2)} د.ع</td>
                        <td>${customerRevenue.toFixed(2)} د.ع</td>
                        <td><strong style="color: ${orderProfit >= 0 ? '#16a34a' : '#dc2626'}">${orderProfit.toFixed(2)} د.ع</strong></td>
                        <td>
                            <button class="button-secondary print-single-profit-btn" 
                                data-invoice-id="${firstItem.invoiceId}"
                                style="width: auto; padding: 0.5rem 1rem;">طباعة تفاصيل الربح</button>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    `;

    // 3. ربط أزرار وإجراءات الطباعة
    const printSelectedBtn = document.getElementById('print-selected-report-btn');
    const selectAllCheckbox = document.getElementById('select-all-orders');
    const orderCheckboxes = document.querySelectorAll('.order-checkbox');

    const updatePrintButtonState = () => {
        const checkedCount = document.querySelectorAll('.order-checkbox:checked').length;
        printSelectedBtn.disabled = checkedCount === 0;
        printSelectedBtn.textContent = `طباعة الطلبات المحددة (${checkedCount})`;
    };

    selectAllCheckbox.addEventListener('change', (e) => {
        orderCheckboxes.forEach(checkbox => {
            checkbox.checked = e.target.checked;
        });
        updatePrintButtonState();
    });

    orderCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updatePrintButtonState);
    });

    printSelectedBtn.addEventListener('click', () => {
        const selectedInvoiceIds = Array.from(document.querySelectorAll('.order-checkbox:checked')).map(cb => cb.dataset.invoiceId);
        
        if (selectedInvoiceIds.length === 0) {
            showToast("الرجاء تحديد طلب واحد على الأقل للطباعة.", true);
            return;
        }

        // تصفية الطلبات المحددة لطباعة التقرير الشامل
        const selectedOrdersData = deliveredOrders.filter(order => selectedInvoiceIds.includes(order[0].invoiceId));
        printInvoice(selectedOrdersData, 'full_report');
    });

    // ربط أزرار طباعة تفاصيل الربح للطلب الفردي
    document.querySelectorAll('.print-single-profit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const invoiceId = e.currentTarget.dataset.invoiceId;
            const orderData = deliveredOrders.find(o => o[0].invoiceId === invoiceId);
            if (orderData) {
                printInvoice([orderData], 'profit'); // تمرير الطلب داخل مصفوفة
            }
        });
    });

    // تحديث الحالة الأولية للزر
    updatePrintButtonState();
};

const calculateRepProfit = (salesItems) => {
    let totalRepCost = 0;
    let totalCustomerRevenue = 0;
    
    // 1. حساب الإجمالي لجميع مبيعات الطلبات المستلمة
    salesItems.forEach(item => {
        const repPrice = item.repPrice || 0; 
        totalRepCost += repPrice * item.quantity;
        totalCustomerRevenue += item.finalPrice * item.quantity;
    });

    // 2. حساب الخصم الكلي لجميع الفواتير المستلمة
    // نحتاج إلى الحصول على الخصم مرة واحدة لكل فاتورة (نستخدم التجميع بواسطة invoiceId)
    const uniqueDeliveredInvoices = state.sales
        .filter(s => s.status === 'delivered')
        .reduce((acc, sale) => {
            // نستخدم أول عنصر لكل فاتورة لتضمين الخصم
            if (!acc[sale.invoiceId]) {
                 acc[sale.invoiceId] = sale.discount || 0;
            }
            return acc;
        }, {});
        
    const totalDiscount = Object.values(uniqueDeliveredInvoices).reduce((sum, discount) => sum + discount, 0);

    const totalProfit = totalCustomerRevenue - totalRepCost - totalDiscount;
    return totalProfit.toFixed(2);
};

// --- PRINT FUNCTION (MODIFIED) ---
const printInvoice = (ordersData, type = 'order') => {
    if (!ordersData || ordersData.length === 0) {
        showToast("لا يمكن طباعة محتوى فارغ.", true);
        return;
    }
    
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>تقرير الطباعة</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
        @media print { .no-print { display: none; } }
        body { font-family: Tahoma, sans-serif; font-size: 14px; direction: rtl; text-align: right; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: right; }
        thead th { background-color: #f2f2f2; }
        h2, h3 { text-align: center; }
        .summary-box { padding: 10px; background-color: #e6ffed; border: 1px solid #b2e2c5; margin: 15px 0; text-align: center; }
        .details-list { margin: 0; padding: 0 1.5rem; }
    `);
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');


    if (type === 'order') {
        // طباعة فاتورة للزبون (توقع طباعة طلب واحد فقط)
        const orderItems = ordersData[0];
        const firstItem = orderItems[0];
        let customerRevenue = 0;
        
        const detailsTable = `
            <table>
                <thead>
                    <tr>
                        <th>المنتج</th>
                        <th>الكمية</th>
                        <th>السعر (فردي)</th>
                        <th>الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${orderItems.map(item => {
                        customerRevenue += item.quantity * item.finalPrice;
                        return `
                            <tr>
                                <td>${item.productName}</td>
                                <td>${item.quantity}</td>
                                <td>${item.finalPrice.toFixed(2)} د.ع</td>
                                <td>${(item.quantity * item.finalPrice).toFixed(2)} د.ع</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        
        const discount = firstItem.discount || 0;
        const finalTotal = customerRevenue - discount;
        const date = new Date(firstItem.created_at).toLocaleDateString('ar-EG');

        let printContent = `
            <div style="padding: 20px;">
                <h2 style="text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 10px;">فاتورة مبيعات</h2>
                <p><strong>رقم الفاتورة:</strong> ${firstItem.invoiceId}</p>
                <p><strong>التاريخ:</strong> ${date}</p>
                <hr style="margin: 10px 0;">
                <h3>معلومات الزبون</h3>
                <p><strong>الاسم:</strong> ${firstItem.customerName}</p>
                <p><strong>الهاتف:</strong> ${firstItem.customerPhone}</p>
                <p><strong>العنوان:</strong> ${firstItem.customerAddress}</p>
                <hr style="margin: 10px 0;">
                ${detailsTable}
                <hr style="margin: 10px 0;">
                <p style="text-align: left;"><strong>الإجمالي الفرعي:</strong> ${customerRevenue.toFixed(2)} د.ع</p>
                <p style="text-align: left;"><strong>الخصم:</strong> ${discount.toFixed(2)} د.ع</p>
                <h3 style="text-align: left; color: #16a34a;">الإجمالي النهائي: ${finalTotal.toFixed(2)} د.ع</h3>
                <p style="text-align: center; margin-top: 20px;">شكراً لتعاملكم معنا.</p>
            </div>
        `;
        printWindow.document.write(printContent);

    } else if (type === 'profit') {
        // طباعة تقرير ربح لطلب واحد (توقع طباعة طلب واحد فقط)
        const orderItems = ordersData[0];
        const firstItem = orderItems[0];
        
        let repCost = 0;
        let customerRevenue = 0;

        const detailsTable = `
            <table>
                <thead>
                    <tr>
                        <th>المنتج</th>
                        <th>الكمية</th>
                        <th>سعر المندوب (فردي)</th>
                        <th>سعر البيع (فردي)</th>
                        <th>ربح الوحدة</th>
                        <th>الربح الكلي</th>
                    </tr>
                </thead>
                <tbody>
                    ${orderItems.map(item => {
                        const unitProfit = item.finalPrice - (item.repPrice || 0);
                        const totalItemProfit = unitProfit * item.quantity;
                        repCost += item.quantity * (item.repPrice || 0);
                        customerRevenue += item.quantity * item.finalPrice;
                        return `
                            <tr>
                                <td>${item.productName}</td>
                                <td>${item.quantity}</td>
                                <td>${(item.repPrice || 0).toFixed(2)} د.ع</td>
                                <td>${item.finalPrice.toFixed(2)} د.ع</td>
                                <td>${unitProfit.toFixed(2)} د.ع</td>
                                <td>${totalItemProfit.toFixed(2)} د.ع</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        
        const discount = firstItem.discount || 0;
        const finalTotal = customerRevenue - discount;
        const profit = finalTotal - repCost;
        const date = new Date(firstItem.created_at).toLocaleDateString('ar-EG');

        let printContent = `
            <div style="padding: 20px;">
                <h2 style="text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 10px;">تقرير ربح الفاتورة</h2>
                <p><strong>رقم الفاتورة:</strong> ${firstItem.invoiceId}</p>
                <p><strong>التاريخ:</strong> ${date}</p>
                <p><strong>اسم المندوب:</strong> ${firstItem.repName || state.currentUser?.name || 'غير معروف'}</p>
                <hr style="margin: 10px 0;">
                <h3>معلومات الزبون</h3>
                <p><strong>الاسم:</strong> ${firstItem.customerName}</p>
                <p><strong>الهاتف:</strong> ${firstItem.customerPhone}</p>
                <hr style="margin: 10px 0;">
                ${detailsTable}
                <hr style="margin: 10px 0;">
                <p style="text-align: left;"><strong>الإجمالي النهائي (للزبون):</strong> ${finalTotal.toFixed(2)} د.ع</p>
                <p style="text-align: left;"><strong>تكلفة البضاعة على المندوب:</strong> ${repCost.toFixed(2)} د.ع</p>
                <h3 style="text-align: left; color: #007bff;">الربح الصافي للمندوب: ${profit.toFixed(2)} د.ع</h3>
            </div>
        `;
        printWindow.document.write(printContent);

    } else if (type === 'full_report') {
        // طباعة التقرير الإجمالي للأرباح (للطلبات المحددة)
        let totalProfit = 0;
        let allItems = []; // قائمة بجميع عناصر المبيعات من الطلبات المحددة
        let totalRepCost = 0;
        let totalCustomerRevenue = 0;
        let totalDiscount = 0;
        
        ordersData.forEach(orderItems => {
            const firstItem = orderItems[0];
            const orderRepCost = orderItems.reduce((sum, item) => sum + (item.quantity * (item.repPrice || 0)), 0);
            const orderCustomerRevenue = orderItems.reduce((sum, item) => sum + (item.quantity * item.finalPrice), 0);
            const orderDiscount = firstItem.discount || 0;
            const orderProfit = orderCustomerRevenue - orderRepCost - orderDiscount;

            totalRepCost += orderRepCost;
            totalCustomerRevenue += orderCustomerRevenue;
            totalDiscount += orderDiscount;
            totalProfit += orderProfit;

            allItems.push({
                invoiceId: firstItem.invoiceId,
                customerName: firstItem.customerName,
                customerPhone: firstItem.customerPhone,
                repCost: orderRepCost,
                customerRevenue: orderCustomerRevenue,
                orderProfit: orderProfit
            });
        });

        let reportContent = `
            <div style="padding: 20px;">
                <h2 style="border-bottom: 2px solid #ccc; padding-bottom: 10px;">تقرير الأرباح الشامل للطلبات المحددة</h2>
                <p><strong>تاريخ التقرير:</strong> ${new Date().toLocaleDateString('ar-EG')}</p>
                <p><strong>اسم المندوب:</strong> ${state.currentUser?.name || 'غير معروف'}</p>
                
                <div class="summary-box">
                    <p style="font-size: 1.2rem; margin: 0;"><strong>إجمالي الأرباح الصافية للطلبات المحددة:</strong> <span style="color: #007bff;">${totalProfit.toFixed(2)} د.ع</span></p>
                </div>
                
                <h3 style="margin-top: 20px;">تفاصيل الطلبات المحددة (${allItems.length})</h3>
                <table>
                    <thead>
                        <tr>
                            <th>رقم الفاتورة</th>
                            <th>اسم الزبون</th>
                            <th>رقم الزبون</th>
                            <th>سعر التكلفة (المندوب)</th>
                            <th>سعر البيع (الزبون)</th>
                            <th>الربح الصافي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${allItems.map(item => `
                            <tr>
                                <td>${item.invoiceId}</td>
                                <td>${item.customerName}</td>
                                <td>${item.customerPhone}</td>
                                <td>${item.repCost.toFixed(2)} د.ع</td>
                                <td>${item.customerRevenue.toFixed(2)} د.ع</td>
                                <td style="color: ${item.orderProfit >= 0 ? '#16a34a' : '#dc2626'}; font-weight: bold;">${item.orderProfit.toFixed(2)} د.ع</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <hr style="margin: 20px 0;">
                <div style="text-align: left;">
                    <p><strong>الإجمالي الكلي لسعر التكلفة على المندوب:</strong> ${totalRepCost.toFixed(2)} د.ع</p>
                    <p><strong>الإجمالي الكلي لسعر البيع للزبون:</strong> ${totalCustomerRevenue.toFixed(2)} د.ع</p>
                    <p><strong>الإجمالي الكلي للخصم الممنوح:</strong> ${totalDiscount.toFixed(2)} د.ع</p>
                    <h3 style="color: #007bff;">الإجمالي الصافي للأرباح: ${totalProfit.toFixed(2)} د.ع</h3>
                </div>
            </div>
        `;
        printWindow.document.write(reportContent);
    }
    
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
};


// =================================================================
// ===== PACKER-SPECIFIC FUNCTIONS (UNCHANGED) =====================
// =================================================================

const renderPackerApp = async () => {
    loginSection.classList.add('hidden');
    packerContainer.classList.remove('hidden');

    packerContainer.innerHTML = `
        <div class="container">
            <header class="app-header"><h1>واجهة المجهز</h1><button id="logout-btn" class="button-danger">تسجيل الخروج</button></header>
            <main>
                <div id="packer-content-area"></div>
            </main>
        </div>
    `;

    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    await fetchAllData();
    renderPackerOrdersView(document.getElementById('packer-content-area'));
};

const renderPackerOrdersView = (container) => {
    const groupedOrders = state.sales
        .filter(s => ['pending', 'prepared', 'shipped'].includes(s.status))
        .reduce((acc, sale) => {
            if (!acc[sale.invoiceId]) {
                acc[sale.invoiceId] = [];
            }
            acc[sale.invoiceId].push(sale);
            return acc;
        }, {});

    const orders = Object.values(groupedOrders);

    container.innerHTML = `
        <div class="content-header"><h2>الطلبات قيد المعالجة (${orders.length})</h2></div>
        <table>
            <thead>
                <tr>
                    <th>الزبون / الفاتورة</th>
                    <th>المنتجات</th>
                    <th>الحالة الحالية</th>
                    <th>تغيير الحالة إلى</th>
                </tr>
            </thead>
            <tbody>
                ${orders.map(orderItems => {
                    const firstItem = orderItems[0];
                    return `
                    <tr>
                        <td>
                            <div>${firstItem.customerName}</div>
                            <small>${firstItem.invoiceId}</small>
                        </td>
                        <td>
                            <ul class="item-list-in-table">
                                ${orderItems.map(item => `<li>${item.productName} (الكمية: ${item.quantity})</li>`).join('')}
                            </ul>
                        </td>
                        <td><span class="status-badge ${getStatusClass(firstItem.status)}">${getStatusText(firstItem.status)}</span></td>
                        <td>
                            <select class="status-changer" 
                                data-invoice-id="${firstItem.invoiceId}" 
                                data-old-status="${firstItem.status}">
                                <option value="prepared" ${firstItem.status === 'prepared' ? 'selected' : ''}>تم التجهيز</option>
                                <option value="shipped" ${firstItem.status === 'shipped' ? 'selected' : ''}>تم الشحن</option>
                                <option value="delivered" ${firstItem.status === 'delivered' ? 'selected' : ''}>تم الاستلام</option>
                                <option value="cancelled" ${firstItem.status === 'cancelled' ? 'selected' : ''}>إلغاء</option>
                            </select>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    `;

    document.querySelectorAll('.status-changer').forEach(select => {
        select.addEventListener('change', handleUpdateOrderStatus);
    });
};

const handleUpdateOrderStatus = async (event) => {
    const select = event.target;
    const { invoiceId, oldStatus } = select.dataset;
    const newStatus = select.value;

    if (newStatus === oldStatus) return;

    const confirmed = await showConfirmationModal(`هل أنت متأكد من تغيير حالة الطلب كاملاً إلى "${getStatusText(newStatus)}"?`);
    if (!confirmed) {
        select.value = oldStatus;
        return;
    }

    showLoader();
    try {
        const { error } = await supabase.rpc('update_order_status', {
            p_invoice_id: invoiceId,
            p_new_status: newStatus
        });
        if (error) throw error;
        
        showToast("تم تحديث حالة الطلب بنجاح.");
        await fetchAllData();
        renderPackerOrdersView(document.getElementById('packer-content-area'));

    } catch (error) {
        showToast(`فشل تحديث الحالة: ${error.message}`, true);
        select.value = oldStatus;
    } finally {
        hideLoader();
    }
};


// --- Authentication Flow ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader();
    messageDiv.textContent = '';
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
        });
        if (error) throw error;

        const { data: userProfile, error: profileError } = await supabase.from('users').select('*').eq('id', data.user.id).single();
        if (profileError) throw profileError;
        state.currentUser = userProfile;

        if (userProfile.role === 'admin') {
            await renderAdminApp();
        } else if (userProfile.role === 'rep') {
            await renderRepApp();
        } else if (userProfile.role === 'packer') {
            await renderPackerApp();
        } else {
            throw new Error('صلاحية المستخدم غير معروفة.');
        }
    } catch (error) {
        messageDiv.textContent = `فشل تسجيل الدخول: ${error.message}`;
        messageDiv.className = 'error';
    } finally {
        hideLoader();
    }
});

const handleLogout = async () => {
    showLoader();
    await supabase.auth.signOut();
    state.currentUser = null; 
    adminContainer.classList.add('hidden');
    repContainer.classList.add('hidden');
    packerContainer.classList.add('hidden');
    adminContainer.innerHTML = '';
    repContainer.innerHTML = '';
    packerContainer.innerHTML = '';
    loginSection.classList.remove('hidden');
    messageDiv.textContent = 'تم تسجيل الخروج.';
    messageDiv.className = 'success';
    hideLoader();
};

