import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// 1. Supabase Setup
// NOTE: For security in a real app, the service role key should NEVER be exposed here.
const SUPABASE_URL = 'https://iqfxbunxrnvmcsazmwvo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZnhidW54cm52bWNzYXptd3ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTI1NDEsImV4cCI6MjA3NTc2ODU0MX0.uVj2ioxJ5oaPsxLVbCaN3h1C3T0Wt8AUyobc5nkIE5c';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Global State ---
let state = { products: [], users: [], sales: [], regions: [], currentUser: null, cityMap: {} };
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
        const salesQuery = supabase.from('sales_items').select('*, order_header:orders(client_name, client_mobile, province, alwaseet_qr_id, is_finance_confirmed, rep_id, rep_name, delivery_cost, total_price, discount_amount, status_internal)').order('created_at', { ascending: false });
        
        if (state.currentUser?.role === 'rep') {
            // فلترة الطلبات الخاصة بالمندوب
            salesQuery.eq('rep_id', state.currentUser.id);
        }

        const [productsRes, salesItemsRes, usersRes, regionsRes] = await Promise.all([
            supabase.from('products').select('*'),
            salesQuery,
            state.currentUser?.role === 'admin' ? supabase.from('users').select('*') : Promise.resolve({ data: [], error: null }),
            supabase.from('alwaseet_regions').select('city_id, city_name, region_id, region_name')
        ]);
        
        if (productsRes.error) throw productsRes.error;
        if (salesItemsRes.error) throw salesItemsRes.error;
        if (regionsRes.error) throw regionsRes.error;

        state.products = productsRes.data;
        state.sales = salesItemsRes.data; 
        if (usersRes.data) state.users = usersRes.data;
        
        // تجهيز بيانات المناطق (مهم لربط الوسيط)
        state.regions = regionsRes.data;
        state.cityMap = state.regions.reduce((acc, region) => {
            if (!acc[region.city_name]) {
                acc[region.city_name] = { id: region.city_id, regions: [] };
            }
            acc[region.city_name].regions.push(region);
            return acc;
        }, {});

    } catch (error) {
        showToast(`فشل تحميل البيانات: ${error.message}`, true);
    } finally {
        hideLoader();
    }
};

// --- AlWaseet Helper Functions (مساعدات الوسيط) ---

// دالة للبحث عن City ID و Region ID من قاعدة البيانات المحلية
const getAlWaseetIDs = (cityName, regionName) => {
    const cityEntry = state.cityMap[cityName];
    if (!cityEntry) return { cityId: null, regionId: null };

    // البحث عن Region ID الأكثر تطابقاً (نبسط البحث هنا بالاسم)
    const regionEntry = cityEntry.regions.find(r => r.region_name === regionName) || cityEntry.regions[0];

    return {
        cityId: cityEntry.id,
        regionId: regionEntry ? regionEntry.region_id : null
    };
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
        // التعديل: يجب أن نعتمد على حالة التوصيل المؤكدة مالياً (من جدول orders)
        const isDelivered = sale.order_header.is_finance_confirmed === true;
        const isAfterStartDate = !startDate || saleDate >= startDate;
        const isBeforeEndDate = !endDate || saleDate <= endDate;
        const matchesRep = repIdFilter === 'all' || sale.order_header.rep_id === repIdFilter;
        return isDelivered && isAfterStartDate && isBeforeEndDate && matchesRep;
    });

    // 2. تجميع البيانات حسب المندوب
    const reportData = {};
    const processedInvoices = new Set(); // لتجنب حساب الخصم والتوصيل عدة مرات

    filteredSales.forEach(sale => {
        const repId = sale.order_header.rep_id;
        const invoiceId = sale.invoice_id; // استخدام invoice_id من sales_items
        
        if (!reportData[repId]) {
            reportData[repId] = {
                repName: sale.order_header.rep_name,
                orderIds: new Set(),
                totalRevenue: 0,
                totalRepProfit: 0, // ربح المندوب
                totalAdminProfit: 0, // ربح الشركة (الجديد)
            };
        }
        
        const repEntry = reportData[repId];
        repEntry.orderIds.add(invoiceId);
        
        // حساب إجمالي الإيرادات (سعر البيع للزبون)
        repEntry.totalRevenue += sale.final_price * sale.quantity;

        // حساب ربح المندوب من المنتج
        // ربح المندوب = (سعر البيع للزبون - سعر البيع للمندوب) * الكمية
        repEntry.totalRepProfit += (sale.final_price - sale.rep_price) * sale.quantity;
        
        // حساب ربح الشركة من المنتج
        // ربح الشركة = (سعر البيع للمندوب - سعر التكلفة) * الكمية
        repEntry.totalAdminProfit += (sale.rep_price - sale.cost_price) * sale.quantity;
        
        // خصم الخصم وكلفة التوصيل من ربح المندوب (مرة واحدة لكل فاتورة)
        if (!processedInvoices.has(invoiceId)) {
            // نستخدم البيانات من جدول orders هنا
            repEntry.totalRepProfit -= (sale.order_header.discount_amount || 0);
            repEntry.totalRepProfit -= (sale.order_header.delivery_cost || 0);
            processedInvoices.add(invoiceId);
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


// ... (باقي الدوال) ...


// =================================================================
// ===== REP-SPECIFIC FUNCTIONS (واجهة المندوب) ===================
// =================================================================

const renderRepOrderCreationView = e => {
    // جلب أسماء المحافظات والمناطق من الـ state
    const cityNames = Object.keys(state.cityMap);
    
    // الحصول على المناطق التابعة للمحافظة المختارة حالياً
    const selectedCityName = document.getElementById('customer-province')?.value;
    const regions = selectedCityName && state.cityMap[selectedCityName] 
        ? state.cityMap[selectedCityName].regions 
        : [];

    e.innerHTML = `<div class="rep-grid"><div><h2>الفاتورة الحالية</h2><div id="invoice-items-container"></div><div id="invoice-summary-container"></div><hr style="margin: 1.5rem 0;"><h2>معلومات الزبون</h2><form id="customer-info-form">
    
    <div class="input-group"><label>اسم الزبون</label><input type="text" id="customer-name" required></div>
    <div class="input-group"><label>رقم الهاتف</label><input type="tel" id="customer-phone" required></div>
    
    <div class="input-group"><label for="customer-province">المحافظة</label>
        <select id="customer-province" required>
            <option value="" disabled selected>-- اختر المحافظة --</option>
            ${cityNames.map(p => `<option value="${p}">${p}</option>`).join('')}
        </select>
    </div>
    
    <div class="input-group"><label for="customer-region">المنطقة</label>
        <select id="customer-region" required ${regions.length === 0 ? 'disabled' : ''}>
            <option value="" disabled selected>-- اختر المنطقة --</option>
            ${regions.map(r => `<option value="${r.region_name}">${r.region_name}</option>`).join('')}
        </select>
    </div>

    <div class="input-group"><label>العنوان التفصيلي</label><textarea id="customer-address" rows="2" required></textarea></div>
    <div class="input-group"><label>ملاحظات الشحن</label><textarea id="invoice-notes" rows="2"></textarea></div>
    <button type="button" id="submit-invoice-btn" class="button-success" disabled>تثبيت الطلب</button>
    
    </form></div><div><h2>اختر المنتجات</h2>
    <div class="input-group" style="margin-bottom: 0.5rem;"><input type="text" id="product-search-input" placeholder="اكتب اسم المنتج للبحث..."></div>
    <div id="product-grid" class="product-grid">${state.products.filter((p => p.quantity > 0)).map((p => `<div class="product-card"><img src="${p.imageUrl || "https://placehold.co/150x120/e2e8f0/e2e8f0?text=."}" alt="${p.name}"><div class="product-card-body"><h3>${p.name}</h3><button class="add-to-cart-btn" data-product-id="${p.id}">أضف للسلة</button></div></div>`)).join("")}</div></div></div>`;
    
    // ربط الأحداث
    document.querySelectorAll(".add-to-cart-btn").forEach((btn => { btn.addEventListener("click", (() => handleAddToCartClick(btn.dataset.productId))) }));
    
    // ربط التغيير في المحافظة لتحديث قائمة المناطق
    document.getElementById("customer-province").addEventListener("change", renderRepOrderCreationView);
    document.getElementById("customer-region").addEventListener("change", renderInvoiceItems);
    
    document.getElementById("submit-invoice-btn").addEventListener("click", handleInvoiceSubmit);
    document.getElementById("product-search-input").addEventListener("input", handleProductSearch);
    
    renderInvoiceItems();
};

const handleInvoiceSubmit = async () => {
    // 1. جمع البيانات من الواجهة
    if (currentInvoiceItems.length === 0) return showToast("الفاتورة فارغة!", true);
    
    // معلومات العميل
    const customerName = document.getElementById("customer-name").value;
    const customerPhone = document.getElementById("customer-phone").value;
    const customerAddress = document.getElementById("customer-address").value;
    const province = document.getElementById("customer-province").value;
    const regionName = document.getElementById("customer-region").value;
    const notes = document.getElementById("invoice-notes").value;
    
    // معلومات التسعير والتوصيل
    const discountInput = document.getElementById("invoice-discount");
    const discount = discountInput ? parseFloat(discountInput.value) || 0 : 0;
    
    // 2. حساب كلفة التوصيل والحصول على IDs الوسيط
    const { cityId, regionId } = getAlWaseetIDs(province, regionName);
    
    if (!cityId || !regionId) {
        return showToast("الرجاء اختيار المحافظة والمنطقة بشكل صحيح لربط شركة التوصيل.", true);
    }
    
    // NOTE: يجب أن تأتي تكلفة التوصيل من API الوسيط، ولكننا سنستخدم قيمة ثابتة هنا لتبسيط الاختبار
    const deliveryCost = 5000; 
    
    const subtotal = currentInvoiceItems.reduce(((acc, item) => acc + item.quantity * item.finalPrice), 0);
    const totalAmount = subtotal - discount + deliveryCost; // الإجمالي النهائي مع التوصيل
    
    if (!customerName || !customerPhone || !customerAddress || !province) {
        return showToast("الرجاء إدخال معلومات الزبون كاملة.", true);
    }
    
    showLoader();
    
    // 3. تجهيز بيانات الأطراف لـ RPC
    const itemsForRPC = currentInvoiceItems.map((item => ({ 
        product_id: item.product.id, 
        quantity: item.quantity, 
        final_price: item.finalPrice, 
        product_name: item.product.name, 
        cost_price: item.product.costPrice, 
        rep_price: item.product.repPrice 
    })));

    // 4. استدعاء دالة Supabase RPC لتسجيل البيانات
    try {
        const newInvoiceId = `INV-${Date.now()}-${Math.floor(1e3 * Math.random())}`;

        const { data: orderHeaderId, error: rpcError } = await supabase.rpc("submit_invoice", { 
            p_invoice_id: newInvoiceId, 
            p_items: itemsForRPC, 
            p_rep_id: state.currentUser.id, 
            p_rep_name: state.currentUser.name, 
            p_customer_name: customerName, 
            p_customer_phone: customerPhone, 
            p_customer_address: customerAddress, 
            p_total_amount: totalAmount, 
            p_discount: discount, 
            p_notes: notes, 
            p_province: province, 
            p_delivery_cost: deliveryCost,
            // --- تمرير IDs الوسيط إلى SQL ---
            p_alwaseet_city_id: cityId,
            p_alwaseet_region_id: regionId
        });

        if (rpcError) throw rpcError;
        
        // 5. إرسال الطلب لشركة التوصيل (الوسيط)
        const repData = {
            internal_order_id: orderHeaderId, // الـ ID الذي أعادته دالة الـ RPC
            client_name: customerName,
            client_mobile: customerPhone,
            alwaseet_city_id: cityId,
            alwaseet_region_id: regionId,
            location_desc: customerAddress,
            total_price: totalAmount, // المبلغ الكلي الذي يجب تحصيله
            // ... (باقي حقول API الوسيط)
        };
        // NOTE: يجب استدعاء دالة createAlwaseetOrder (من Node.js module) هنا

        showToast("تم تثبيت الطلب بنجاح.");
        currentInvoiceItems = []; 
        await fetchAllData();
        renderRepApp(); 
    } catch (e) {
        showToast(`فشل تثبيت الطلب: ${e.message}`, true);
    } finally {
        hideLoader();
    }
};

// ... (باقي الدوال) ...

// **السطر الذي يجب إضافته:** اجعل الدالة متاحة للنطاق العام للنافذة
window.handleInvoiceSubmit = handleInvoiceSubmit;
```
```javascript
window.handleDeleteOrder = handleDeleteOrder;

////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////
// دالة حذف طلب المندوب بالكامل (إضافة جديدة)
///////////////////////////////////////////////////////
// في ملف app.js، بعد تعريف الدالة مباشرةً
const handleDeleteOrder = async (invoiceId) => {
    // ... محتوى الدالة الذي قمت بتعديله سابقاً ...
    const confirmed = await showConfirmationModal(`هل أنت متأكد من حذف الطلب رقم #${invoiceId}؟ سيتم حذف جميع تفاصيل الفاتورة من النظام، وإرجاع المنتجات إلى المخزون.`);
    if (!confirmed) return;
    
    showLoader();

    try {
        // 2. الحصول على تفاصيل الطلب قبل حذفه
        const salesItems = state.sales.filter(s => s.invoiceId === invoiceId && s.repId === state.currentUser.id);
        
        if (salesItems.length === 0) {
            throw new Error("لم يتم العثور على الطلب أو أنه ليس من صلاحية هذا المندوب.");
        }

        //if (orderStatus === 'تم الاستلام') {
       //     throw new Error("لا يمكن حذف طلب تم استلامه (delivered).");
       // }
        // 3. حذف جميع صفوف الطلب
        const { error: deleteSalesError } = await supabase
            .from('sales')
            .delete()
            .eq('invoiceId', invoiceId)
            .eq('repId', state.currentUser.id);

        if (deleteSalesError) throw deleteSalesError;

        // 4. إرجاع الكميات إلى المخزون
        const updatePromises = salesItems.map(item => {
            const product = state.products.find(p => p.id === item.productId);
            if (!product) {
                console.warn(`Product ID ${item.productId} not found for inventory update.`);
                return null;
            }
            const newQuantity = product.quantity + item.quantity;
            
            return supabase.from('products')
                .update({ quantity: newQuantity })
                .eq('id', item.productId);
        }).filter(p => p !== null);

        const updateResults = await Promise.all(updatePromises);
        
        const updateError = updateResults.find(result => result && result.error);
        if (updateError) throw updateError.error;

        showToast(`تم حذف الطلب رقم #${invoiceId} بنجاح وإرجاع المنتجات إلى المخزون.`);
        await fetchAllData();
        renderRepApp();

    } catch (error) {
        showToast(`فشل حذف الطلب: ${error.message}`, true);
    } finally {
        hideLoader();
    }
};

// **السطر الذي يجب إضافته:** اجعل الدالة متاحة للنطاق العام للنافذة
window.handleDeleteOrder = handleDeleteOrder;
