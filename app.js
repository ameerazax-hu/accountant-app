import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// 1. Supabase Setup
const SUPABASE_URL = 'https://iqfxbunxrnvmcsazmwvo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZnhidW54cm52bWNzYXptd3ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTI1NDEsImV4cCI6MjA3NTc2ODU0MX0.uVj2ioxJ5oaPsxLVbCaN3h1C3T0Wt8AUyobc5nkIE5c';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
// ===== ADMIN-SPECIFIC FUNCTIONS ==================================
// =================================================================
const renderAdminApp = async () => { loginSection.classList.add("hidden"), adminContainer.classList.remove("hidden"), adminContainer.innerHTML = `<div class="container"><header class="app-header"><h1>لوحة تحكم المدير</h1><button id="logout-btn" class="button-danger">تسجيل الخروج</button></header><main><div class="tabs"><button class="tab-button active" data-tab="products">المنتجات</button><button class="tab-button" data-tab="users">المستخدمين</button><button class="tab-button" data-tab="reports">تقارير الأرباح</button></div><div id="content-area"></div></main></div>`, document.getElementById("logout-btn").addEventListener("click", handleLogout), document.querySelectorAll("#admin-container .tab-button").forEach((e => { e.addEventListener("click", (() => switchAdminTab(e.dataset.tab))) })), await fetchAllData(), switchAdminTab("products") };
const switchAdminTab = e => { document.querySelectorAll("#admin-container .tab-button").forEach((t => t.classList.toggle("active", t.dataset.tab === e))); const t = document.querySelector("#admin-container #content-area"); "products" === e ? renderProductsView(t) : "users" === e ? renderUsersView(t) : "reports" === e && renderAdminReportsView(t) };

let quantityChanges = {},
    renderProductsView = e => {
        quantityChanges = {};
        e.innerHTML = `
        <div class="content-header">
            <h2>قائمة المنتجات (${state.products.length})</h2>
            <div>
                <button id="save-quantity-changes-btn" class="button-success hidden" style="width: auto; margin-left: 1rem;">حفظ التغييرات</button>
                <button id="add-product-btn">إضافة منتج جديد</button>
            </div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>صورة</th>
                    <th>الاسم</th>
                    <th>الكمية</th>
                    <th>سعر البيع للمندوب</th>
                </tr>
            </thead>
            <tbody>
                ${state.products.map((p => `
                    <tr>
                        <td><img class="table-img" src="${p.imageUrl || "https://placehold.co/100x100/e2e8f0/e2e8f0?text=."}" alt="${p.name}"></td>
                        <td>${p.name}</td>
                        <td>
                            <input type="number" class="quantity-input" value="${p.quantity}" data-product-id="${p.id}" min="0" style="padding: 0.5rem; text-align: center; width: 80px;">
                        </td>
                        <td>${p.repPrice} د.ع</td>
                    </tr>
                `)).join("")}
            </tbody>
        </table>
    `;
        document.getElementById("add-product-btn").addEventListener("click", renderAddProductModal);
        const saveChangesBtn = document.getElementById('save-quantity-changes-btn');
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', (event) => {
                const productId = event.target.dataset.productId;
                const newQuantity = parseInt(event.target.value, 10);
                if (!isNaN(newQuantity)) {
                    quantityChanges[productId] = newQuantity;
                    saveChangesBtn.classList.remove('hidden');
                }
            });
        });
        saveChangesBtn.addEventListener('click', handleBulkQuantityUpdate);
    },
    handleBulkQuantityUpdate = async () => {
        const changesCount = Object.keys(quantityChanges).length;
        if (changesCount === 0) return showToast("لا توجد تغييرات لحفظها.", true);
        const confirmed = await showConfirmationModal(`هل أنت متأكد من تحديث كمية ${changesCount} منتجات؟`);
        if (!confirmed) return;
        showLoader();
        try {
            const updatePromises = Object.entries(quantityChanges).map(([productId, quantity]) => {
                return supabase.from('products').update({ quantity: quantity }).eq('id', productId);
            });
            const results = await Promise.all(updatePromises);
            results.forEach(result => { if (result.error) throw result.error; });
            showToast(`تم تحديث كمية ${changesCount} منتجات بنجاح.`);
            await fetchAllData();
            switchAdminTab('products');
        } catch (error) {
            showToast(`فشل تحديث الكميات: ${error.message}`, true);
        } finally {
            hideLoader();
        }
    };

const renderUsersView = e => { const t = state.users.filter((e => "admin" !== e.role)); e.innerHTML = `<div class="content-header"><h2>قائمة المستخدمين (${t.length})</h2><button id="add-user-btn">إضافة مستخدم جديد</button></div><table><thead><tr><th>الاسم</th><th>البريد الإلكتروني</th><th>الصلاحية</th></tr></thead><tbody>${t.map((e => `<tr><td>${e.name}</td><td>${e.email}</td><td>${"rep" === e.role ? "مندوب" : "مجهز"}</td></tr>`)).join("")}</tbody></table>`, document.getElementById("add-user-btn").addEventListener("click", renderAddUserModal) }, renderAddProductModal = () => { modalContainer.innerHTML = `<div id="product-modal" class="modal-backdrop"><div class="modal"><div class="modal-header"><h3>إضافة منتج جديد</h3></div><form id="product-form"><div class="input-group"><label>اسم المنتج</label><input type="text" id="product-name" required></div><div class="input-group"><label>صورة المنتج</label><input type="file" id="product-image-file" accept="image/*"></div><div class="input-group"><label>الكمية</label><input type="number" id="product-quantity" required></div><div class="input-group"><label>سعر الشراء</label><input type="number" id="product-cost" required></div><div class="input-group"><label>سعر البيع للمندوب</label><input type="number" id="product-rep-price" required></div><div class="input-group"><label>سعر البيع للزبون</label><input type="number" id="product-customer-price" required></div><div class="modal-footer"><button type="button" class="button-secondary" id="cancel-product-btn">إلغاء</button><button type="submit">حفظ المنتج</button></div></form></div></div>`, document.getElementById("product-form").addEventListener("submit", handleAddNewProduct), document.getElementById("cancel-product-btn").addEventListener("click", (() => modalContainer.innerHTML = "")) }, renderAddUserModal = () => { modalContainer.innerHTML = `<div id="user-modal" class="modal-backdrop"><div class="modal"><div class="modal-header"><h3>إضافة مستخدم جديد</h3></div><form id="user-form"><div class="input-group"><label>الاسم</label><input type="text" id="user-name" required></div><div class="input-group"><label>البريد الإلكتروني</label><input type="email" id="user-email" required></div><div class="input-group"><label>كلمة السر</label><input type="password" id="user-password" required></div><div class="input-group"><label>الصلاحية</label><select id="user-role"><option value="rep">مندوب</option><option value="packer">مجهز</option></select></div><div class="modal-footer"><button type="button" class="button-secondary" id="cancel-user-btn">إلغاء</button><button type="submit">حفظ المستخدم</button></div></form></div></div>`, document.getElementById("user-form").addEventListener("submit", handleAddNewUser), document.getElementById("cancel-user-btn").addEventListener("click", (() => modalContainer.innerHTML = "")) }, handleAddNewProduct = async e => { e.preventDefault(), showLoader(); try { const e = document.getElementById("product-image-file").files[0]; let t = null; if (e) { const n = `public/${Date.now()}-${e.name}`, { error: a } = await supabase.storage.from("product_images").upload(n, e); if (a) throw a; const { data: r } = supabase.storage.from("product_images").getPublicUrl(n); t = r.publicUrl } const n = { name: document.getElementById("product-name").value, quantity: parseInt(document.getElementById("product-quantity").value), costPrice: parseFloat(document.getElementById("product-cost").value), repPrice: parseFloat(document.getElementById("product-rep-price").value), customerPrice: parseFloat(document.getElementById("product-customer-price").value), imageUrl: t }, { error: a } = await supabase.from("products").insert(n); if (a) throw a; showToast("تمت إضافة المنتج بنجاح."), modalContainer.innerHTML = "", await fetchAllData(), switchAdminTab("products") } catch (e) { showToast(`خطأ: ${e.details || e.message}`, !0) } finally { hideLoader() } }, handleAddNewUser = async e => { e.preventDefault(), showLoader(); try { const e = document.getElementById("user-name").value, t = document.getElementById("user-email").value, n = document.getElementById("user-password").value, a = document.getElementById("user-role").value, { data: r, error: i } = await supabase.auth.signUp({ email: t, password: n }); if (i) throw i; const { error: o } = await supabase.from("users").insert({ id: r.user.id, name: e, email: t, role: a }); if (o) throw o; showToast("تمت إضافة المستخدم بنجاح."), modalContainer.innerHTML = "", await fetchAllData(), switchAdminTab("users") } catch (e) { showToast(`خطأ: ${e.details || e.message}`, !0) } finally { hideLoader() } };

const renderAdminReportsView = (container) => {
    const reps = state.users.filter(u => u.role === 'rep');
    container.innerHTML = `
        <div class="content-header">
            <h2>تقارير أرباح المندوبين</h2>
        </div>
        <div class="form-section" style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; background-color: #f9fafb; padding: 1rem; border-radius: 8px;">
            <div style="flex: 1 1 150px;"><label>من تاريخ:</label><input type="date" id="start-date"></div>
            <div style="flex: 1 1 150px;"><label>إلى تاريخ:</label><input type="date" id="end-date"></div>
            <div style="flex: 1 1 200px;">
                <label>المندوب:</label>
                <select id="rep-filter">
                    <option value="all">كل المندوبين</option>
                    ${reps.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
                </select>
            </div>
            <div style="flex: 1 1 auto; align-self: flex-end;">
                <button id="generate-report-btn" class="button-success" style="width: 100%;">عرض التقرير</button>
            </div>
        </div>
        <div id="report-summary-area" class="report-summary" style="margin-top: 1.5rem; display: none;"></div>
        <div id="report-table-area" style="margin-top: 1.5rem;"></div>
    `;
    document.getElementById('generate-report-btn').addEventListener('click', generateAdminReport);
    
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const todayISO = today.toISOString().split('T')[0];
    document.getElementById('start-date').value = firstDayOfMonth;
    document.getElementById('end-date').value = todayISO;
    generateAdminReport();
};

const generateAdminReport = () => {
    const startDateInput = document.getElementById('start-date').value;
    const endDateInput = document.getElementById('end-date').value;
    const repIdFilter = document.getElementById('rep-filter').value;

    const startDate = startDateInput ? new Date(startDateInput) : null;
    const endDate = endDateInput ? new Date(endDateInput) : null;
    
    // لضمان شمول اليوم الأخير كاملاً
    if (endDate) endDate.setHours(23, 59, 59, 999);

    // 1. تصفية المبيعات حسب الفلاتر المحددة (فقط الطلبات المستلمة)
    let filteredSales = state.sales.filter(sale => {
        const saleDate = new Date(sale.created_at);
        const isDelivered = sale.status === 'delivered';
        const isAfterStartDate = !startDate || saleDate >= startDate;
        const isBeforeEndDate = !endDate || saleDate <= endDate;
        const matchesRep = repIdFilter === 'all' || sale.repId === repIdFilter;
        return isDelivered && isAfterStartDate && isBeforeEndDate && matchesRep;
    });

    // 2. تجميع البيانات حسب المندوب
    const reportData = {};
    const processedInvoices = new Set(); // لتجنب حساب الخصم والتوصيل عدة مرات

    filteredSales.forEach(sale => {
        const repId = sale.repId;
        if (!reportData[repId]) {
            reportData[repId] = {
                repName: sale.repName,
                orderIds: new Set(),
                totalRevenue: 0,
                totalRepProfit: 0, // ربح المندوب
                totalAdminProfit: 0, // ربح الشركة (الجديد)
            };
        }
        
        const repEntry = reportData[repId];
        repEntry.orderIds.add(sale.invoiceId);
        
        // حساب إجمالي الإيرادات (سعر البيع للزبون)
        repEntry.totalRevenue += sale.finalPrice * sale.quantity;

        // حساب ربح المندوب من المنتج
        repEntry.totalRepProfit += (sale.finalPrice - sale.repPrice) * sale.quantity;
        
        // === الجزء الجديد: حساب ربح الشركة من المنتج ===
        // الربح هو (سعر البيع للمندوب - سعر التكلفة) * الكمية
        repEntry.totalAdminProfit += (sale.repPrice - sale.costPrice) * sale.quantity;
        // ===============================================

        // خصم الخصم وكلفة التوصيل من ربح المندوب (مرة واحدة لكل فاتورة)
        if (!processedInvoices.has(sale.invoiceId)) {
            repEntry.totalRepProfit -= (sale.discount || 0);
            repEntry.totalRepProfit -= (sale.delivery_cost || 0);
            processedInvoices.add(sale.invoiceId);
        }
    });

    const reportArray = Object.values(reportData);

    // 3. عرض النتائج
    const summaryArea = document.getElementById('report-summary-area');
    const tableArea = document.getElementById('report-table-area');

    if (reportArray.length === 0) {
        summaryArea.style.display = 'none';
        tableArea.innerHTML = `<p style="text-align: center; margin-top: 2rem;">لا توجد بيانات مطابقة لمعايير البحث المحددة.</p>`;
        return;
    }

    const overallTotalRevenue = reportArray.reduce((sum, rep) => sum + rep.totalRevenue, 0);
    const overallTotalRepProfit = reportArray.reduce((sum, rep) => sum + rep.totalRepProfit, 0);
    const overallTotalAdminProfit = reportArray.reduce((sum, rep) => sum + rep.totalAdminProfit, 0); // الجديد

    summaryArea.style.display = 'block';
    summaryArea.innerHTML = `
        <p style="margin: 0.5rem 0;">إجمالي قيمة المبيعات: <strong>${overallTotalRevenue.toFixed(2)} د.ع</strong></p>
        <p style="margin: 0.5rem 0;">إجمالي أرباح المندوبين: <strong>${overallTotalRepProfit.toFixed(2)} د.ع</strong></p>
        <p style="margin: 0.5rem 0; color: #059669;">إجمالي أرباح الشركة: <strong>${overallTotalAdminProfit.toFixed(2)} د.ع</strong></p>
    `;

    tableArea.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>اسم المندوب</th>
                    <th>عدد الطلبات</th>
                    <th>إجمالي قيمة المبيعات</th>
                    <th>صافي ربح المندوب</th>
                    <th>أرباح الشركة</th>
                </tr>
            </thead>
            <tbody>
                ${reportArray.map(rep => `
                    <tr>
                        <td>${rep.repName}</td>
                        <td>${rep.orderIds.size}</td>
                        <td>${rep.totalRevenue.toFixed(2)} د.ع</td>
                        <td><strong>${rep.totalRepProfit.toFixed(2)} د.ع</strong></td>
                        <td style="color: #059669; font-weight: bold;">${rep.totalAdminProfit.toFixed(2)} د.ع</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
};

////////////////////////////////////////

// --- دالة جديدة للتحقق من الرمز السري لتقارير المندوب ---
const handleShowRepReports = async () => {
    const pin = "666655";
    const enteredPin = prompt("الرجاء إدخال الرمز السري لعرض التقارير:");
    
    if (enteredPin === null) return; // ألغى المستخدم الإدخال
    
    if (enteredPin === pin) {
        switchRepTab('reports');
    } else {
        showToast("الرمز السري غير صحيح.", true);
    }
};

/////////////////
// =================================================================
// ===== REP-SPECIFIC FUNCTIONS ====================================
// =================================================================
// =================================================================
// ===== REP-SPECIFIC FUNCTIONS ====================================
// =================================================================
const renderRepApp=async()=>{loginSection.classList.add("hidden"),repContainer.classList.remove("hidden"),repContainer.innerHTML=`<div class="container"><header class="app-header"><h1>واجهة المندوب</h1><button id="logout-btn" class="button-danger">تسجيل الخروج</button></header><main><div class="tabs"><button class="tab-button active" data-tab="add-order">إضافة طلب</button><button class="tab-button" data-tab="previous-orders">الطلبات السابقة</button><button class="tab-button" data-tab="reports">تقارير الأرباح</button></div><div id="rep-content-area"></div></main></div>`,document.getElementById("logout-btn").addEventListener("click",handleLogout),
// --- بداية التعديل: تغيير آلية النقر على التبويبات ---
document.querySelectorAll("#rep-container .tab-button").forEach((btn=>{btn.addEventListener("click",(()=>{const tab=btn.dataset.tab;"reports"===tab?handleShowRepReports():switchRepTab(tab)}))})),
// --- نهاية التعديل ---
await fetchAllData(),switchRepTab("add-order")},switchRepTab=e=>{document.querySelectorAll("#rep-container .tab-button").forEach((t=>t.classList.toggle("active",t.dataset.tab===e)));const t=document.getElementById("rep-content-area");"add-order"===e?renderRepOrderCreationView(t):"previous-orders"===e?renderRepPreviousOrdersView(t):"reports"===e&&renderRepReportsView(t)};

////////////////////////////////////

const renderRepOrderCreationView = e => {
    const iraqProvinces = ["بغداد", "كربلاء", "النجف", "بابل", "الديوانية", "واسط", "ديالى", "صلاح الدين", "كركوك", "الأنبار", "نينوى", "أربيل", "دهوك", "السليمانية", "المثنى", "ذي قار", "ميسان", "البصرة"];
    // --- بداية التعديل: إضافة خانة البحث عن المنتج ---
    e.innerHTML = `<div class="rep-grid"><div><h2>الفاتورة الحالية</h2><div id="invoice-items-container"></div><div id="invoice-summary-container"></div><hr style="margin: 1.5rem 0;"><h2>معلومات الزبون</h2><form id="customer-info-form"><div class="input-group"><label>اسم الزبون</label><input type="text" id="customer-name" required></div><div class="input-group"><label>رقم الهاتف</label><input type="tel" id="customer-phone" required></div><div class="input-group"><label for="customer-province">المحافظة</label><select id="customer-province" required><option value="" disabled selected>-- اختر المحافظة --</option>${iraqProvinces.map(p => `<option value="${p}">${p}</option>`).join('')}</select></div><div class="input-group"><label>العنوان</label><textarea id="customer-address" rows="3" required></textarea></div><div class="input-group"><label>الملاحظات</label><textarea id="invoice-notes" rows="2"></textarea></div><button type="button" id="submit-invoice-btn" class="button-success" disabled>تثبيت الطلب</button></form></div><div><h2>اختر المنتجات</h2>
    <div class="input-group" style="margin-bottom: 0.5rem;"><input type="text" id="product-search-input" placeholder="اكتب اسم المنتج للبحث..."></div>
    <div id="product-grid" class="product-grid">${state.products.filter((p => p.quantity > 0)).map((p => `<div class="product-card"><img src="${p.imageUrl || "https://placehold.co/150x120/e2e8f0/e2e8f0?text=."}" alt="${p.name}"><div class="product-card-body"><h3>${p.name}</h3><button class="add-to-cart-btn" data-product-id="${p.id}">أضف للسلة</button></div></div>`)).join("")}</div></div></div>`;
    // --- نهاية التعديل ---
    
    document.querySelectorAll(".add-to-cart-btn").forEach((btn => { btn.addEventListener("click", (() => handleAddToCartClick(btn.dataset.productId))) }));
    document.getElementById("customer-province").addEventListener("change", renderInvoiceItems);
    document.getElementById("submit-invoice-btn").addEventListener("click", handleInvoiceSubmit);
    
    // --- بداية التعديل: ربط حدث البحث ---
    document.getElementById("product-search-input").addEventListener("input", handleProductSearch);
    // --- نهاية التعديل ---
    
    renderInvoiceItems();
};
///////////////////////////////////

// --- دالة جديدة للبحث عن المنتجات في واجهة المندوب ---
const handleProductSearch = (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const productGrid = document.getElementById("product-grid");
    if (!productGrid) return;
    
    const allProducts = state.products.filter(p => p.quantity > 0);
    const filteredProducts = allProducts.filter(p => p.name.toLowerCase().includes(searchTerm));
    
    if (filteredProducts.length === 0) {
        productGrid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">لا توجد منتجات مطابقة للبحث.</p>';
        return;
    }
    
    productGrid.innerHTML = filteredProducts.map((p => `<div class="product-card"><img src="${p.imageUrl || "https://placehold.co/150x120/e2e8f0/e2e8f0?text=."}" alt="${p.name}"><div class="product-card-body"><h3>${p.name}</h3><button class="add-to-cart-btn" data-product-id="${p.id}">أضف للسلة</button></div></div>`)).join("");
    
    // إعادة ربط الأحداث للأزرار الجديدة
    document.querySelectorAll(".add-to-cart-btn").forEach((btn => {
        btn.addEventListener("click", (() => handleAddToCartClick(btn.dataset.productId)))
    }));
};

// أضف هذه الدالة الجديدة في مكان مناسب ضمن الدوال الخاصة بالمندوب
// --- دالة جديدة لحذف الفاتورة بالكامل (إضافة جديدة) ---

////////////////////
const handleAddToCartClick=e=>{if(currentInvoiceItems.find((t=>t.product.id==e)))return showToast("هذا المنتج موجود بالفعل في السلة.",!0);const t=state.products.find((t=>t.id==e));t&&(currentInvoiceItems.push({product:t,quantity:1,finalPrice:t.customerPrice}),renderInvoiceItems())};

const renderInvoiceItems = () => {
    const itemsContainer = document.getElementById("invoice-items-container");
    const summaryContainer = document.getElementById("invoice-summary-container");
    const submitBtn = document.getElementById("submit-invoice-btn");
    if (!itemsContainer || !summaryContainer || !submitBtn) return;
    if (currentInvoiceItems.length === 0) return itemsContainer.innerHTML = "<p>السلة فارغة.</p>", summaryContainer.innerHTML = "", void(submitBtn.disabled = !0);
    itemsContainer.innerHTML = `<table id="invoice-items-table" style="width:100%"><thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th></th></tr></thead><tbody>${currentInvoiceItems.map(((item, index) => `<tr><td>${item.product.name}</td><td><input type="number" value="${item.quantity}" min="1" max="${item.product.quantity}" class="invoice-item-quantity" data-index="${index}" style="width: 60px; padding: 0.25rem;"></td><td><input type="number" value="${item.finalPrice}" min="0" class="invoice-item-price" data-index="${index}" style="width: 80px; padding: 0.25rem;"></td><td><button data-index="${index}" class="remove-item-btn button-danger" style="width:auto;padding:2px 8px;">X</button></td></tr>`)).join("")}</tbody></table>`;
    submitBtn.disabled = !1;
    const subtotal = currentInvoiceItems.reduce(((acc, item) => acc + item.quantity * item.finalPrice), 0);
    const provinceSelect = document.getElementById("customer-province");
    const deliveryCost = provinceSelect && provinceSelect.value === "كربلاء" ? 3000 : provinceSelect && provinceSelect.value !== "" ? 5000 : 0;
    let existingDiscount = 0;
    const discountInput = document.getElementById("invoice-discount");
    if (discountInput) existingDiscount = parseFloat(discountInput.value) || 0;
    summaryContainer.innerHTML = `<div class="invoice-summary"><p><span>الإجمالي الفرعي:</span> <span>${subtotal.toFixed(2)} د.ع</span></p><p><span>كلفة التوصيل:</span> <span>${deliveryCost.toFixed(2)} د.ع</span></p><div class="input-group" style="margin-bottom: 0.5rem;"><label for="invoice-discount" style="display:inline-block; margin-bottom:0;">الخصم:</label><input type="number" id="invoice-discount" value="${existingDiscount}" min="0" style="padding: 0.5rem; display: inline-block; width: auto;"></div><p class="final-total"><span>الإجمالي النهائي:</span> <span id="final-total-amount"></span></p></div>`;
    const newDiscountInput = document.getElementById("invoice-discount");
    const updateFinalTotal = () => {
        const discount = parseFloat(newDiscountInput.value) || 0;
        document.getElementById("final-total-amount").textContent = `${(subtotal - discount).toFixed(2)} د.ع`;
    };
    updateFinalTotal();
    document.querySelectorAll(".remove-item-btn").forEach((btn => { btn.onclick = e => { currentInvoiceItems.splice(e.currentTarget.dataset.index, 1), renderInvoiceItems() } }));
    document.querySelectorAll("input.invoice-item-quantity, input.invoice-item-price").forEach((input => {
        input.onchange = e => {
            const index = e.target.dataset.index;
            if (e.target.classList.contains("invoice-item-quantity")) {
                const newQuantity = parseInt(e.target.value);
                const maxQuantity = parseInt(e.target.max);
                currentInvoiceItems[index].quantity = Math.min(newQuantity, maxQuantity);
            } else {
                currentInvoiceItems[index].finalPrice = parseFloat(e.target.value);
            }
            renderInvoiceItems();
        };
    }));
    if (newDiscountInput) newDiscountInput.oninput = updateFinalTotal;
};

const handleInvoiceSubmit = async () => {
    if (currentInvoiceItems.length === 0) return showToast("الفاتورة فارغة!", !0);
    const customerName = document.getElementById("customer-name").value;
    const customerPhone = document.getElementById("customer-phone").value;
    const customerAddress = document.getElementById("customer-address").value;
    const province = document.getElementById("customer-province").value;
    const notes = document.getElementById("invoice-notes").value;
    const discountInput = document.getElementById("invoice-discount");
    const discount = discountInput ? parseFloat(discountInput.value) || 0 : 0;
    if (!customerName || !customerPhone || !customerAddress || !province) return showToast("الرجاء إدخال معلومات الزبون كاملة، بما في ذلك المحافظة.", !0);
    const deliveryCost = province === "كربلاء" ? 3000 : 5000;
    const totalAmount = currentInvoiceItems.reduce(((acc, item) => acc + item.quantity * item.finalPrice), 0) - discount;
    showLoader();
    const itemsForRPC = currentInvoiceItems.map((item => ({ product_id: parseInt(item.product.id), quantity: item.quantity, final_price: item.finalPrice, product_name: item.product.name, cost_price: item.product.costPrice, rep_price: item.product.repPrice })));
    try {
        const { error } = await supabase.rpc("submit_invoice", { p_invoice_id: `INV-${Date.now()}-${Math.floor(1e3 * Math.random())}`, p_items: itemsForRPC, p_rep_id: state.currentUser.id, p_rep_name: state.currentUser.name, p_customer_name: customerName, p_customer_phone: customerPhone, p_customer_address: customerAddress, p_total_amount: totalAmount, p_discount: discount, p_notes: notes, p_province: province, p_delivery_cost: deliveryCost });
        if (error) throw error;
        showToast("تم تثبيت الطلب بنجاح."), currentInvoiceItems = [], await fetchAllData(), switchRepTab("add-order");
    } catch (e) {
        showToast(`فشل تثبيت الطلب: ${e.message}`, !0);
    } finally {
        hideLoader();
    }
};
////////////////////////////

const renderRepPreviousOrdersView = e => {
    const n = state.sales.reduce(((e, t) => (e[t.invoiceId] || (e[t.invoiceId] = []), e[t.invoiceId].push(t), e)), {}),
        a = Object.values(n);
    e.innerHTML = `<div class="content-header"><h2>الطلبات السابقة (${a.length})</h2></div><table><thead><tr><th>رقم الفاتورة</th><th>الزبون</th><th>المحافظة</th><th>الإجمالي</th><th>الحالة</th><th>تاريخ الإنشاء</th><th>الإجراءات</th></tr></thead><tbody>` + a.map((e => {
        const n = e[0],
            t = n.invoiceId,
            r = n.customerName,
            i = n.province,
            o = (e.reduce(((e, t) => e + t.quantity * t.finalPrice), 0) - (n.discount || 0) + (n.delivery_cost || 0)).toFixed(2),
            s = getStatusText(n.status),
            l = new Date(n.created_at).toLocaleDateString();
        // تم إضافة زر الحذف هنا
        return `<tr><td>${t}</td><td>${r}</td><td>${i}</td><td>${o} د.ع</td><td><span class="${getStatusClass(n.status)}">${s}</span></td><td>${l}</td><td class="order-actions"><button onclick="editOrder('${n.invoiceId}')">تعديل</button><button class="button-danger delete-btn" onclick="handleDeleteOrder('${n.invoiceId}')">حذف</button></td></tr>`
    })).join("") + "</tbody></table>"
};


////////////////////////////
///////////////////////////////////////////////////////
// دالة حذف طلب المندوب بالكامل (إضافة جديدة)
///////////////////////////////////////////////////////
const handleDeleteOrder = async (invoiceId) => {
    // 1. طلب تأكيد من المستخدم
    const confirmed = await showConfirmationModal(`هل أنت متأكد من حذف الطلب رقم ${invoiceId} بالكامل؟ هذا الإجراء لا يمكن التراجع عنه.`);
    if (!confirmed) return;

    showLoader();
    try {
        // 2. حذف جميع صفوف الطلب المرتبطة برقم الفاتورة من جدول 'sales'
        // تأكيد الحذف برقم المندوب الحالي لضمان الأمان
        const { error: deleteError } = await supabase
            .from('sales')
            .delete()
            .eq('invoiceId', invoiceId)
            .eq('repId', state.currentUser.id); 

        if (deleteError) throw deleteError;

        showToast(`تم حذف الطلب رقم ${invoiceId} بنجاح.`);

        // 3. تحديث البيانات وإعادة عرض القائمة
        await fetchAllData();
        switchRepTab('previous-orders'); // إعادة عرض تبويب الطلبات السابقة لتحديث القائمة

    } catch (error) {
        showToast(`فشل في حذف الطلب: ${error.message}`, true);
    } finally {
        hideLoader();
    }
};

////////////////////////////////////////////////////////////
////////////////////////////////////////////////
////////////////////////////////////////////////
const renderRepReportsView = e => {
    const deliveredSales = state.sales.filter((s => s.status === "delivered" && !s.profit_received));
    const groupedDeliveredOrders = deliveredSales.reduce(((acc, sale) => (acc[sale.invoiceId] || (acc[sale.invoiceId] = []), acc[sale.invoiceId].push(sale), acc)), {});
    const deliveredOrders = Object.values(groupedDeliveredOrders);
    const totalProfit = calculateRepProfit(deliveredSales);
    if (e.innerHTML = `<div class="content-header"><h2>تقارير الأرباح (القابلة للاستلام)</h2><div><button id="print-selected-report-btn" class="button-secondary" style="width: auto;" disabled>طباعة المحدد</button><button id="receive-selected-profits-btn" class="button-success" style="width: auto; margin-right: 10px;" disabled>استلام أرباح المحدد</button></div></div><div class="report-summary"><p>إجمالي الأرباح الصافية القابلة للاستلام: <strong>${totalProfit} د.ع</strong></p></div><h3 style="margin-top: 2rem;">قائمة الطلبات المستلمة (غير مستلمة الأرباح) (${deliveredOrders.length})</h3><div id="profit-report-table-container"></div>`, 0 === deliveredOrders.length) return void(document.getElementById("profit-report-table-container").innerHTML = "<p>لا توجد أرباح قابلة للاستلام حالياً.</p>");
    document.getElementById("profit-report-table-container").innerHTML = `<table><thead><tr><th><input type="checkbox" id="select-all-orders"></th><th>الزبون / الفاتورة</th><th>رقم الزبون</th><th>تكلفة المندوب</th><th>سعر البيع</th><th>الربح الصافي</th></tr></thead><tbody>${deliveredOrders.map((orderItems => { const firstItem = orderItems[0], repCost = orderItems.reduce(((sum, item) => sum + item.quantity * (item.repPrice || 0)), 0), customerRevenue = orderItems.reduce(((sum, item) => sum + item.quantity * item.finalPrice), 0), orderDiscount = firstItem.discount || 0, orderProfit = customerRevenue - repCost - orderDiscount - (firstItem.delivery_cost || 0); return `<tr data-invoice-id="${firstItem.invoiceId}"><td><input type="checkbox" class="order-checkbox" data-invoice-id="${firstItem.invoiceId}"></td><td><div>${firstItem.customerName}</div><small>فاتورة: ${firstItem.invoiceId}</small></td><td>${firstItem.customerPhone}</td><td>${repCost.toFixed(2)} د.ع</td><td>${customerRevenue.toFixed(2)} د.ع</td><td><strong style="color: ${orderProfit >= 0 ? "#16a34a" : "#dc2626"}">${orderProfit.toFixed(2)} د.ع</strong></td></tr>` })).join("")}</tbody></table>`;
    const printBtn = document.getElementById("print-selected-report-btn"),
        receiveBtn = document.getElementById("receive-selected-profits-btn"),
        selectAllCheckbox = document.getElementById("select-all-orders"),
        orderCheckboxes = document.querySelectorAll(".order-checkbox"),
        updateButtonState = () => { const checkedCount = document.querySelectorAll(".order-checkbox:checked").length; printBtn.disabled = 0 === checkedCount, receiveBtn.disabled = 0 === checkedCount, printBtn.textContent = `طباعة المحدد (${checkedCount})`, receiveBtn.textContent = `استلام أرباح المحدد (${checkedCount})` };
    selectAllCheckbox.addEventListener("change", (e => { orderCheckboxes.forEach((cb => { cb.checked = e.target.checked })), updateButtonState() })), orderCheckboxes.forEach((cb => { cb.addEventListener("change", updateButtonState) })), printBtn.addEventListener("click", (() => { const selectedInvoiceIds = Array.from(document.querySelectorAll(".order-checkbox:checked")).map((cb => cb.dataset.invoiceId)); if (0 === selectedInvoiceIds.length) return void showToast("الرجاء تحديد طلب واحد على الأقل للطباعة.", !0); const selectedOrders = deliveredOrders.filter((order => selectedInvoiceIds.includes(order[0].invoiceId))); printInvoice(selectedOrders, "full_report") })), receiveBtn.addEventListener("click", handleReceiveSelectedProfits), updateButtonState();
};

const handleReceiveSelectedProfits = async () => {
    const selectedInvoiceIds = Array.from(document.querySelectorAll(".order-checkbox:checked")).map((e => e.dataset.invoiceId));
    if (0 === selectedInvoiceIds.length) return showToast("الرجاء تحديد الطلبات التي تود استلام أرباحها.", !0);
    const pin = "3491445", enteredPin = prompt("الرجاء إدخال الرمز السري للمحاسب للمتابعة:");
    if (null === enteredPin) return;
    if (enteredPin !== pin) return showToast("الرمز السري غير صحيح. تم إلغاء العملية.", !0);
    const confirmed = await showConfirmationModal(`هل أنت متأكد من استلام أرباح (${selectedInvoiceIds.length}) طلبات؟ لا يمكن التراجع عن هذه العملية.`);
    if (!confirmed) return;
    showLoader();
    try {
        const { error } = await supabase.from("sales").update({ profit_received: !0 }).in("invoiceId", selectedInvoiceIds);
        if (error) throw error;
        showToast("تم تسجيل استلام الأرباح بنجاح."), await fetchAllData(), switchRepTab("reports");
    } catch (e) {
        showToast(`حدث خطأ: ${e.message}`, !0);
    } finally {
        hideLoader();
    }
};

const calculateRepProfit = e => {
    let t = 0, n = 0;
    e.forEach((e => { const a = e.repPrice || 0; t += a * e.quantity, n += e.finalPrice * e.quantity }));
    const a = e.reduce(((e, t) => (e[t.invoiceId] || (e[t.invoiceId] = t.discount || 0), e)), {}),
        r = Object.values(a).reduce(((e, t) => e + t), 0),
        i = e.reduce(((e, t) => (e[t.invoiceId] || (e[t.invoiceId] = t.delivery_cost || 0), e)), {}),
        d = Object.values(i).reduce(((e, t) => e + t), 0);
    return (n - t - r - d).toFixed(2);
};

// =================================================================
// ===== PACKER-SPECIFIC FUNCTIONS =================================
// =================================================================

const renderPackerApp = async () => {
    loginSection.classList.add('hidden');
    packerContainer.classList.remove('hidden');
    packerContainer.innerHTML = `<div class="container"><header class="app-header"><h1>واجهة المجهز</h1><button id="logout-btn" class="button-danger">تسجيل الخروج</button></header><main><div class="tabs"><button class="tab-button active" data-tab="pending">طلبات قيد التجهيز</button><button class="tab-button" data-tab="followup">متابعة الطلبات</button></div><div id="packer-content-area" style="margin-top: 1.5rem;"></div></main></div>`;
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.querySelectorAll("#packer-container .tab-button").forEach(btn => {
        btn.addEventListener('click', () => switchPackerTab(btn.dataset.tab));
    });
    await fetchAllData();
    switchPackerTab('pending');
};

const switchPackerTab = (tab) => {
    document.querySelectorAll("#packer-container .tab-button").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === tab);
    });
    const container = document.getElementById("packer-content-area");
    if (tab === 'pending') {
        renderPackerPendingView(container);
    } else if (tab === 'followup') {
        renderPackerFollowupView(container);
    }
};


//////////////////////////////////////////////////////////
const printInvoice = (ordersData, type = 'order') => {
    if (!ordersData || ordersData.length === 0) return showToast("لا يمكن طباعة محتوى فارغ.", true);
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>تقرير الطباعة</title>');
    printWindow.document.write('<style>@media print { .no-print { display: none; } .page-break { page-break-after: always; } } body { font-family: Tahoma, sans-serif; font-size: 14px; direction: rtl; text-align: right; } table { width: 100%; border-collapse: collapse; margin-top: 15px; } th, td { border: 1px solid #ccc; padding: 8px; text-align: right; } thead th { background-color: #f2f2f2; } h2, h3 { text-align: center; } .summary-box { padding: 10px; background-color: #e6ffed; border: 1px solid #b2e2c5; margin: 15px 0; text-align: center; } .details-list { margin: 0; padding: 0 1.5rem; } .print-container { padding: 20px; border: 1px solid #333; margin-bottom: 20px; }</style>');
    printWindow.document.write('</head><body>');
    if (type === 'order') {
        const orderItems = ordersData[0], firstItem = orderItems[0];
        let customerRevenue = 0;
        const detailsTable = `<table><thead><tr><th>المنتج</th><th>الكمية</th><th>السعر (فردي)</th><th>الإجمالي</th></tr></thead><tbody>${orderItems.map(item => (customerRevenue += item.quantity * item.finalPrice, `<tr><td>${item.productName}</td><td>${item.quantity}</td><td>${item.finalPrice.toFixed(2)} د.ع</td><td>${(item.quantity * item.finalPrice).toFixed(2)} د.ع</td></tr>`)).join("")}</tbody></table>`;
        const discount = firstItem.discount || 0, finalTotal = customerRevenue - discount, date = new Date(firstItem.created_at).toLocaleDateString('ar-EG');
        printWindow.document.write(`<div class="print-container"><h2 style="text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 10px;">فاتورة مبيعات</h2><p><strong>رقم الفاتورة:</strong> ${firstItem.invoiceId}</p><p><strong>التاريخ:</strong> ${date}</p><hr><h3>معلومات الزبون</h3><p><strong>الاسم:</strong> ${firstItem.customerName}</p><p><strong>الهاتف:</strong> ${firstItem.customerPhone}</p><p><strong>العنوان:</strong> ${firstItem.customerAddress}</p><hr>${detailsTable}<hr><p style="text-align: left;"><strong>الإجمالي الفرعي:</strong> ${customerRevenue.toFixed(2)} د.ع</p><p style="text-align: left;"><strong>الخصم:</strong> ${discount.toFixed(2)} د.ع</p><h3 style="text-align: left; color: #16a34a;">الإجمالي النهائي: ${finalTotal.toFixed(2)} د.ع</h3><p style="text-align: center; margin-top: 20px;">شكراً لتعاملكم معنا.</p></div>`);
    } else if (type === 'profit') {
        const orderItems = ordersData[0], firstItem = orderItems[0];
        let repCost = 0, customerRevenue = 0;
        const detailsTable = `<table><thead><tr><th>المنتج</th><th>الكمية</th><th>سعر المندوب</th><th>سعر البيع</th><th>ربح الوحدة</th><th>الربح الكلي</th></tr></thead><tbody>${orderItems.map(item => { const unitProfit = item.finalPrice - (item.repPrice || 0), totalItemProfit = unitProfit * item.quantity; return repCost += item.quantity * (item.repPrice || 0), customerRevenue += item.quantity * item.finalPrice, `<tr><td>${item.productName}</td><td>${item.quantity}</td><td>${(item.repPrice || 0).toFixed(2)} د.ع</td><td>${item.finalPrice.toFixed(2)} د.ع</td><td>${unitProfit.toFixed(2)} د.ع</td><td>${totalItemProfit.toFixed(2)} د.ع</td></tr>` }).join("")}</tbody></table>`;
        const discount = firstItem.discount || 0, finalTotal = customerRevenue - discount, profit = finalTotal - repCost, date = new Date(firstItem.created_at).toLocaleDateString('ar-EG');
        printWindow.document.write(`<div class="print-container"><h2 style="text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 10px;">تقرير ربح الفاتورة</h2><p><strong>رقم الفاتورة:</strong> ${firstItem.invoiceId}</p><p><strong>التاريخ:</strong> ${date}</p><p><strong>اسم المندوب:</strong> ${firstItem.repName || state.currentUser?.name || 'غير معروف'}</p><hr><h3>معلومات الزبون</h3><p><strong>الاسم:</strong> ${firstItem.customerName}</p><p><strong>الهاتف:</strong> ${firstItem.customerPhone}</p><hr>${detailsTable}<hr><p style="text-align: left;"><strong>الإجمالي النهائي (للزبون):</strong> ${finalTotal.toFixed(2)} د.ع</p><p style="text-align: left;"><strong>تكلفة البضاعة على المندوب:</strong> ${repCost.toFixed(2)} د.ع</p><h3 style="text-align: left; color: #007bff;">الربح الصافي للمندوب: ${profit.toFixed(2)} د.ع</h3></div>`);
    } else if (type === 'full_report') {
        let totalProfit = 0, allItems = [], totalRepCost = 0, totalCustomerRevenue = 0, totalDiscount = 0;
        ordersData.forEach(orderItems => { const firstItem = orderItems[0], orderRepCost = orderItems.reduce(((sum, item) => sum + item.quantity * (item.repPrice || 0)), 0), orderCustomerRevenue = orderItems.reduce(((sum, item) => sum + item.quantity * item.finalPrice), 0), orderDiscount = firstItem.discount || 0, orderProfit = orderCustomerRevenue - orderRepCost - orderDiscount; totalRepCost += orderRepCost, totalCustomerRevenue += orderCustomerRevenue, totalDiscount += orderDiscount, totalProfit += orderProfit, allItems.push({ invoiceId: firstItem.invoiceId, customerName: firstItem.customerName, customerPhone: firstItem.customerPhone, repCost: orderRepCost, customerRevenue: orderCustomerRevenue, orderProfit: orderProfit }) });
        printWindow.document.write(`<div class="print-container"><h2 style="border-bottom: 2px solid #ccc; padding-bottom: 10px;">تقرير الأرباح الشامل للطلبات المحددة</h2><p><strong>تاريخ التقرير:</strong> ${new Date().toLocaleDateString('ar-EG')}</p><p><strong>اسم المندوب:</strong> ${state.currentUser?.name || 'غير معروف'}</p><div class="summary-box"><p style="font-size: 1.2rem; margin: 0;"><strong>إجمالي الأرباح الصافية:</strong> <span style="color: #007bff;">${totalProfit.toFixed(2)} د.ع</span></p></div><h3>تفاصيل الطلبات (${allItems.length})</h3><table><thead><tr><th>الفاتورة</th><th>الزبون</th><th>الهاتف</th><th>تكلفة المندوب</th><th>سعر البيع</th><th>الربح الصافي</th></tr></thead><tbody>${allItems.map(item => `<tr><td>${item.invoiceId}</td><td>${item.customerName}</td><td>${item.customerPhone}</td><td>${item.repCost.toFixed(2)} د.ع</td><td>${item.customerRevenue.toFixed(2)} د.ع</td><td style="color: ${item.orderProfit >= 0 ? '#16a34a' : '#dc2626'}; font-weight: bold;">${item.orderProfit.toFixed(2)} د.ع</td></tr>`).join("")}</tbody></table><hr><div style="text-align: left;"><p><strong>الإجمالي الكلي للتكلفة:</strong> ${totalRepCost.toFixed(2)} د.ع</p><p><strong>الإجمالي الكلي للبيع:</strong> ${totalCustomerRevenue.toFixed(2)} د.ع</p><p><strong>الإجمالي الكلي للخصم:</strong> ${totalDiscount.toFixed(2)} د.ع</p><h3 style="color: #007bff;">الإجمالي الصافي للأرباح: ${totalProfit.toFixed(2)} د.ع</h3></div></div>`);
    } else if (type === 'packing_slip') {
        let allSlipsContent = '';
        ordersData.forEach(((orderItems, index) => { 
            const firstItem = orderItems[0];
            const isLastItem = index === ordersData.length - 1; 
            allSlipsContent += `
                <div class="print-container ${isLastItem ? '' : 'page-break'}">
                    <h2 style="border-bottom: 2px solid #ccc; padding-bottom: 10px;">قسيمة تجهيز طلب</h2>
                    <p><strong>رقم الفاتورة:</strong> ${firstItem.invoiceId}</p>
                    <p><strong>تاريخ الطلب:</strong> ${new Date(firstItem.created_at).toLocaleString('ar-EG')}</p>
                    <hr>
                    <h3>معلومات الزبون</h3>
                    <p><strong>الاسم:</strong> ${firstItem.customerName}</p>
                    <p><strong>الهاتف:</strong> ${firstItem.customerPhone}</p>
                    <p><strong>العنوان:</strong> ${firstItem.customerAddress} - ${firstItem.province}</p>
                    
                    ${firstItem.notes ? `<hr><h3>الملاحظات</h3><p style="background-color: #fffbdd; padding: 10px; border-radius: 4px; border: 1px solid #ffeb3b;">${firstItem.notes}</p>` : ''}
                    
                    <hr>
                    <h3>المنتجات المطلوبة</h3>
                    <table>
                        <thead><tr><th>المنتج</th><th>الكمية</th><th>سعر البيع</th></tr></thead>
                        <tbody>${orderItems.map(item => `<tr><td>${item.productName}</td><td><strong>${item.quantity}</strong></td><td>${item.finalPrice.toFixed(2)} د.ع</td></tr>`).join("")}</tbody>
                        </table>

                    <hr>
                    <div style="text-align: left; margin-top: 15px;">
                        <h3 style="color: #16a34a;">المبلغ الإجمالي مع التوصيل: ${(firstItem.totalAmount || 0).toFixed(2)} د.ع</h3>
                    </div>
                    </div>
            `;
        }));
        printWindow.document.write(allSlipsContent);
    }
    printWindow.document.write('</body></html>'), printWindow.document.close(), printWindow.focus(), printWindow.print();
};

///////////////////////////////////////////////////////////////////

const renderPackerPendingView = (container) => {
    const groupedOrders = state.sales.reduce(((acc, sale) => ((acc[sale.invoiceId] = acc[sale.invoiceId] || []).push(sale), acc)), {});
    const allPendingOrders = Object.values(groupedOrders).filter(o => o[0].status === 'pending');
    const repsWithPendingOrders = [...new Map(allPendingOrders.flat().filter(sale => sale.repId && sale.repName).map(sale => [sale.repId, { id: sale.repId, name: sale.repName }])).values()];
    
    // --- بداية التعديل: إضافة فلاتر التاريخ وتغيير الترتيب ---
    container.innerHTML = `<div class="content-header"><h2>الطلبات قيد التجهيز (<span id="pending-order-count">${allPendingOrders.length}</span>)</h2>
    <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 1rem; width: 100%;">
        <div style="flex: 1 1 150px;"><label for="rep-filter-pending" style="font-size: 0.9rem;">المندوب:</label><select id="rep-filter-pending" style="width: 100%; padding: 0.5rem;"><option value="all">كل المندوبين</option>${repsWithPendingOrders.map(rep => `<option value="${rep.id}">${rep.name}</option>`).join('')}</select></div>
        <div style="flex: 1 1 150px; align-self: flex-end;"><button id="bulk-process-btn" class="button-success" style="width: 100%;" disabled>تجهيز وطباعة المحدد (0)</button></div>
        
        <div style="flex: 1 1 150px;"><label for="start-date-pending" style="font-size: 0.9rem;">من تاريخ:</label><input type="date" id="start-date-pending" style="width: 100%; padding: 0.5rem;"></div>
        <div style="flex: 1 1 150px;"><label for="end-date-pending" style="font-size: 0.9rem;">إلى تاريخ:</label><input type="date" id="end-date-pending" style="width: 100%; padding: 0.5rem;"></div>
        <div style="flex: 1 1 auto; align-self: flex-end;"><button id="clear-date-filter-pending-btn" class="button-secondary" style="width: 100%; padding: 0.5rem; font-size: 0.9rem;">مسح التاريخ</button></div>

        <div style="width: 100%; margin-top: 0.5rem;"><label for="packer-customer-search-pending" style="font-size: 0.9rem;">البحث باسم الزبون:</label><input type="text" id="packer-customer-search-pending" placeholder="اكتب اسم الزبون..."></div>
    </div></div><table><thead><tr><th><input type="checkbox" id="select-all-pending-orders"></th><th>الزبون / الفاتورة</th><th>المنتجات</th><th>تغيير فردي</th></tr></thead><tbody id="pending-orders-tbody"></tbody></table>`;
    // --- نهاية التعديل ---

    const renderTableBody = (ordersToRender) => {
        const tbody = document.getElementById('pending-orders-tbody'), countSpan = document.getElementById('pending-order-count');
        if (!tbody || !countSpan) return;
        countSpan.textContent = ordersToRender.length;
        tbody.innerHTML = ordersToRender.length > 0 ? ordersToRender.map(orderItems => { const firstItem = orderItems[0]; return `<tr><td><input type="checkbox" class="packer-order-checkbox" data-invoice-id="${firstItem.invoiceId}"></td><td><div>${firstItem.customerName}</div><small>${firstItem.invoiceId}</small></td><td><ul class="item-list-in-table">${orderItems.map(item => `<li>${item.productName} (الكمية: ${item.quantity})</li>`).join('')}</ul></td><td><select class="status-changer" data-invoice-id="${firstItem.invoiceId}" data-old-status="${firstItem.status}"><option value="pending" selected>قيد التجهيز</option><option value="prepared">تم التجهيز</option><option value="cancelled">إلغاء</option></select></td></tr>` }).join('') : `<tr><td colspan="4" style="text-align: center;">لا توجد طلبات تطابق هذا الفلتر.</td></tr>`;
        attachPendingViewListeners(ordersToRender);
    };
    const attachPendingViewListeners = (currentOrders) => {
        const bulkProcessBtn = document.getElementById('bulk-process-btn'), selectAllCheckbox = document.getElementById('select-all-pending-orders'), orderCheckboxes = document.querySelectorAll('.packer-order-checkbox');
        const updateButtonState = () => { const checkedCount = document.querySelectorAll('.packer-order-checkbox:checked').length; if (bulkProcessBtn) bulkProcessBtn.disabled = checkedCount === 0, bulkProcessBtn.textContent = `تجهيز وطباعة المحدد (${checkedCount})`; if (selectAllCheckbox) selectAllCheckbox.checked = checkedCount > 0 && checkedCount === orderCheckboxes.length; };
        if (selectAllCheckbox) selectAllCheckbox.addEventListener('change', (e => { orderCheckboxes.forEach(checkbox => checkbox.checked = e.target.checked), updateButtonState() }));
        orderCheckboxes.forEach(checkbox => checkbox.addEventListener('change', updateButtonState));
        if (bulkProcessBtn) bulkProcessBtn.addEventListener('click', (() => handleBulkProcessOrders(currentOrders)));
        document.querySelectorAll('.status-changer').forEach(select => select.addEventListener('change', (e => handleUpdateOrderStatus(e, 'pending'))));
        updateButtonState();
    };

    // --- بداية التعديل: تفعيل الفلاتر (مندوب + بحث + تاريخ) ---
    const repFilter = document.getElementById('rep-filter-pending');
    const searchInput = document.getElementById('packer-customer-search-pending');
    const startDateInput = document.getElementById('start-date-pending');
    const endDateInput = document.getElementById('end-date-pending');
    const clearDateBtn = document.getElementById('clear-date-filter-pending-btn');
    
    const applyPackerFilters = () => {
        const selectedRepId = repFilter.value;
        const searchTerm = searchInput.value.toLowerCase();
        
        const startDateVal = startDateInput.value;
        const endDateVal = endDateInput.value;
        const startDate = startDateVal ? new Date(startDateVal) : null;
        const endDate = endDateVal ? new Date(endDateVal) : null;
        
        if (startDate) startDate.setHours(0, 0, 0, 0);
        if (endDate) endDate.setHours(23, 59, 59, 999);
        
        let filteredOrders = allPendingOrders;
        
        if (selectedRepId !== 'all') {
            filteredOrders = filteredOrders.filter(order => order[0].repId == selectedRepId);
        }
        
        if (searchTerm) {
            filteredOrders = filteredOrders.filter(order => order[0].customerName.toLowerCase().includes(searchTerm));
        }
        
        if (startDate) {
            filteredOrders = filteredOrders.filter(order => new Date(order[0].created_at) >= startDate);
        }
        if (endDate) {
            filteredOrders = filteredOrders.filter(order => new Date(order[0].created_at) <= endDate);
        }
        
        renderTableBody(filteredOrders);
    };

    repFilter.addEventListener('change', applyPackerFilters);
    searchInput.addEventListener('input', applyPackerFilters);
    startDateInput.addEventListener('change', applyPackerFilters);
    endDateInput.addEventListener('change', applyPackerFilters);
    clearDateBtn.addEventListener('click', () => {
        startDateInput.value = '';
        endDateInput.value = '';
        applyPackerFilters();
    });
    
    applyPackerFilters(); // العرض الأولي
    // --- نهاية التعديل ---
};




///////////////////////////////////////////////////

const renderPackerFollowupView = (container) => {
    const groupedOrders = state.sales.reduce(((acc, sale) => ((acc[sale.invoiceId] = acc[sale.invoiceId] || []).push(sale), acc)), {});
    const allFollowupOrders = Object.values(groupedOrders).filter(o => ['prepared', 'shipped'].includes(o[0].status));
    const repsWithFollowupOrders = [...new Map(allFollowupOrders.flat().filter(sale => sale.repId && sale.repName).map(sale => [sale.repId, { id: sale.repId, name: sale.repName }])).values()];
    
    // --- بداية التعديل: إضافة فلاتر التاريخ وتغيير الترتيب ---
    container.innerHTML = `<div class="content-header"><h2>متابعة الطلبات (<span id="followup-order-count">${allFollowupOrders.length}</span>)</h2>
    <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 1rem; width: 100%;">
        <div style="flex: 1 1 150px;"><label for="rep-filter-followup" style="font-size: 0.9rem;">المندوب:</label><select id="rep-filter-followup" style="width: 100%; padding: 0.5rem;"><option value="all">كل المندوبين</option>${repsWithFollowupOrders.map(rep => `<option value="${rep.id}">${rep.name}</option>`).join('')}</select></div>
        <div style="flex: 1 1 150px;"><label for="bulk-status-changer" style="font-size: 0.9rem;">تحديث جماعي:</label><select id="bulk-status-changer" style="width: 100%; padding: 0.5rem;"><option value="">-- اختر الحالة --</option><option value="shipped">تم الشحن</option><option value="delivered">تم الاستلام</option><option value="cancelled">ملغي</option></select></div>
        <div style="flex: 1 1 auto; align-self: flex-end;"><button id="bulk-update-btn" class="button-secondary" style="width: 100%;" disabled>تحديث المحدد (0)</button></div>
        
        <div style="flex: 1 1 150px;"><label for="start-date-followup" style="font-size: 0.9rem;">من تاريخ:</label><input type="date" id="start-date-followup" style="width: 100%; padding: 0.5rem;"></div>
        <div style="flex: 1 1 150px;"><label for="end-date-followup" style="font-size: 0.9rem;">إلى تاريخ:</label><input type="date" id="end-date-followup" style="width: 100%; padding: 0.5rem;"></div>
        <div style="flex: 1 1 auto; align-self: flex-end;"><button id="clear-date-filter-followup-btn" class="button-secondary" style="width: 100%; padding: 0.5rem; font-size: 0.9rem;">مسح التاريخ</button></div>

        <div style="width: 100%; margin-top: 0.5rem;"><label for="packer-customer-search-followup" style="font-size: 0.9rem;">البحث باسم الزبون:</label><input type="text" id="packer-customer-search-followup" placeholder="اكتب اسم الزبون..."></div>
    </div></div><table><thead><tr><th><input type="checkbox" id="select-all-followup-orders"></th><th>الزبون / الفاتورة</th><th>المنتجات</th><th>الحالة الحالية</th></tr></thead><tbody id="followup-orders-tbody"></tbody></table>`;
    // --- نهاية التعديل ---

    const renderTableBody = (ordersToRender) => {
        const tbody = document.getElementById('followup-orders-tbody'), countSpan = document.getElementById('followup-order-count');
        if (!tbody || !countSpan) return;
        countSpan.textContent = ordersToRender.length;
        tbody.innerHTML = ordersToRender.length > 0 ? ordersToRender.map(orderItems => { const firstItem = orderItems[0]; return `<tr><td><input type="checkbox" class="packer-followup-checkbox" data-invoice-id="${firstItem.invoiceId}"></td><td><div>${firstItem.customerName}</div><small>${firstItem.invoiceId}</small></td><td><ul class="item-list-in-table">${orderItems.map(item => `<li>${item.productName} (الكمية: ${item.quantity})</li>`).join('')}</ul></td><td><span class="status-badge ${getStatusClass(firstItem.status)}">${getStatusText(firstItem.status)}</span></td></tr>` }).join('') : `<tr><td colspan="4" style="text-align: center;">لا توجد طلبات للمتابعة تطابق هذا الفلتر.</td></tr>`;
        attachFollowupViewListeners();
    };
    const attachFollowupViewListeners = () => {
        const bulkUpdateBtn = document.getElementById('bulk-update-btn'), selectAllCheckbox = document.getElementById('select-all-followup-orders'), orderCheckboxes = document.querySelectorAll('.packer-followup-checkbox');
        const updateButtonState = () => { const checkedCount = document.querySelectorAll('.packer-followup-checkbox:checked').length; if (bulkUpdateBtn) bulkUpdateBtn.disabled = checkedCount === 0, bulkUpdateBtn.textContent = `تحديث المحدد (${checkedCount})`; if (selectAllCheckbox) selectAllCheckbox.checked = checkedCount > 0 && checkedCount === orderCheckboxes.length; };
        if (selectAllCheckbox) selectAllCheckbox.addEventListener('change', (e => { orderCheckboxes.forEach(checkbox => checkbox.checked = e.target.checked), updateButtonState() }));
        orderCheckboxes.forEach(checkbox => checkbox.addEventListener('change', updateButtonState));
        if (bulkUpdateBtn) bulkUpdateBtn.addEventListener('click', handleBulkStatusUpdate);
        updateButtonState();
    };

    // --- بداية التعديل: تفعيل الفلاتر (مندوب + بحث + تاريخ) ---
    const repFilter = document.getElementById('rep-filter-followup');
    const searchInput = document.getElementById('packer-customer-search-followup');
    const startDateInput = document.getElementById('start-date-followup');
    const endDateInput = document.getElementById('end-date-followup');
    const clearDateBtn = document.getElementById('clear-date-filter-followup-btn');
    
    const applyPackerFilters = () => {
        const selectedRepId = repFilter.value;
        const searchTerm = searchInput.value.toLowerCase();

        const startDateVal = startDateInput.value;
        const endDateVal = endDateInput.value;
        const startDate = startDateVal ? new Date(startDateVal) : null;
        const endDate = endDateVal ? new Date(endDateVal) : null;
        
        if (startDate) startDate.setHours(0, 0, 0, 0);
        if (endDate) endDate.setHours(23, 59, 59, 999);

        let filteredOrders = allFollowupOrders;
        
        if (selectedRepId !== 'all') {
            filteredOrders = filteredOrders.filter(order => order[0].repId == selectedRepId);
        }
        
        if (searchTerm) {
            filteredOrders = filteredOrders.filter(order => order[0].customerName.toLowerCase().includes(searchTerm));
        }

        if (startDate) {
            filteredOrders = filteredOrders.filter(order => new Date(order[0].created_at) >= startDate);
        }
        if (endDate) {
            filteredOrders = filteredOrders.filter(order => new Date(order[0].created_at) <= endDate);
        }
        
        renderTableBody(filteredOrders);
    };

    repFilter.addEventListener('change', applyPackerFilters);
    searchInput.addEventListener('input', applyPackerFilters);
    startDateInput.addEventListener('change', applyPackerFilters);
    endDateInput.addEventListener('change', applyPackerFilters);
    clearDateBtn.addEventListener('click', () => {
        startDateInput.value = '';
        endDateInput.value = '';
        applyPackerFilters();
    });

    applyPackerFilters(); // العرض الأولي
    // --- نهاية التعديل ---
};


////////////////////////////////////////////////
const handleBulkProcessOrders = async (pendingOrders) => {
    const selectedInvoiceIds = Array.from(document.querySelectorAll('.packer-order-checkbox:checked')).map(cb => cb.dataset.invoiceId);
    if (selectedInvoiceIds.length === 0) return showToast("الرجاء تحديد طلب واحد على الأقل.", true);
    const confirmed = await showConfirmationModal(`هل أنت متأكد من تحويل حالة (${selectedInvoiceIds.length}) طلبات إلى "تم التجهيز"؟`);
    if (!confirmed) return;
    showLoader();
    try {
        const { error } = await supabase.from('sales').update({ status: 'prepared' }).in('invoiceId', selectedInvoiceIds);
        if (error) throw error;
        showToast(`تم تحديث حالة (${selectedInvoiceIds.length}) طلبات بنجاح.`);
        const processedOrdersData = pendingOrders.filter(order => selectedInvoiceIds.includes(order[0].invoiceId));
        if (processedOrdersData.length > 0) printInvoice(processedOrdersData, 'packing_slip');
        await fetchAllData();
        switchPackerTab('pending');
    } catch (error) {
        showToast(`فشل تحديث الطلبات: ${error.message}`, true);
    } finally {
        hideLoader();
    }
};

const handleBulkStatusUpdate = async () => {
    const newStatus = document.getElementById('bulk-status-changer').value;
    if (!newStatus) return showToast("الرجاء اختيار الحالة الجديدة من القائمة.", true);
    const selectedInvoiceIds = Array.from(document.querySelectorAll('.packer-followup-checkbox:checked')).map(cb => cb.dataset.invoiceId);
    if (selectedInvoiceIds.length === 0) return showToast("الرجاء تحديد طلب واحد على الأقل.", true);
    const confirmed = await showConfirmationModal(`هل أنت متأكد من تغيير حالة (${selectedInvoiceIds.length}) طلبات إلى "${getStatusText(newStatus)}"?`);
    if (!confirmed) return;
    showLoader();
    try {
        const { error } = await supabase.from('sales').update({ status: newStatus }).in('invoiceId', selectedInvoiceIds);
        if (error) throw error;
        showToast(`تم تحديث حالة (${selectedInvoiceIds.length}) طلبات بنجاح.`);
        await fetchAllData();
        switchPackerTab('followup');
    } catch (error) {
        showToast(`فشل تحديث الطلبات: ${error.message}`, true);
    } finally {
        hideLoader();
    }
};

const handleUpdateOrderStatus = async (event, currentTab) => {
    const select = event.target;
    const { invoiceId, oldStatus } = select.dataset;
    const newStatus = select.value;
    if (newStatus === oldStatus) return;
    const confirmed = await showConfirmationModal(`هل أنت متأكد من تغيير حالة الطلب كاملاً إلى "${getStatusText(newStatus)}"?`);
    if (!confirmed) return select.value = oldStatus;
    showLoader();
    try {
        const { error } = await supabase.rpc('update_order_status', { p_invoice_id: invoiceId, p_new_status: newStatus });
        if (error) throw error;
        showToast("تم تحديث حالة الطلب بنجاح.");
        await fetchAllData();
        switchPackerTab(currentTab);
    } catch (error) {
        showToast(`فشل تحديث الحالة: ${error.message}`, true);
        select.value = oldStatus;
    } finally {
        hideLoader();
    }
};

// --- Authentication Flow ---
loginForm.addEventListener('submit',async e=>{e.preventDefault(),showLoader(),messageDiv.textContent="";try{const{data:e,error:t}=await supabase.auth.signInWithPassword({email:document.getElementById("email").value,password:document.getElementById("password").value});if(t)throw t;const{data:n,error:a}=await supabase.from("users").select("*").eq("id",e.user.id).single();if(a)throw a;state.currentUser=n,"admin"===n.role?await renderAdminApp():"rep"===n.role?await renderRepApp():"packer"===n.role?await renderPackerApp():(()=>{throw new Error("صلاحية المستخدم غير معروفة.")})()}catch(e){messageDiv.textContent=`فشل تسجيل الدخول: ${e.message}`,messageDiv.className="error"}finally{hideLoader()}});
const handleLogout=async()=>{showLoader(),await supabase.auth.signOut(),state.currentUser=null,adminContainer.classList.add("hidden"),repContainer.classList.add("hidden"),packerContainer.classList.add("hidden"),adminContainer.innerHTML="",repContainer.innerHTML="",packerContainer.innerHTML="",loginSection.classList.remove("hidden"),messageDiv.textContent="تم تسجيل الخروج.",messageDiv.className="success",hideLoader()};
//اضافة خانة للبحث عن المنتج حسب الاسم في واجهة المندوب عند اضافة فاتورة

