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
/////////////








//////////////////////

// =================================================================
// ===== ADMIN-SPECIFIC FUNCTIONS (UNCHANGED) ======================
// =================================================================
const renderAdminApp=async()=>{loginSection.classList.add("hidden"),adminContainer.classList.remove("hidden"),adminContainer.innerHTML=`<div class="container"><header class="app-header"><h1>لوحة تحكم المدير</h1><button id="logout-btn" class="button-danger">تسجيل الخروج</button></header><main><div class="tabs"><button class="tab-button active" data-tab="products">المنتجات</button><button class="tab-button" data-tab="users">المستخدمين</button></div><div id="content-area"></div></main></div>`,document.getElementById("logout-btn").addEventListener("click",handleLogout),document.querySelectorAll("#admin-container .tab-button").forEach((e=>{e.addEventListener("click",(()=>switchAdminTab(e.dataset.tab)))})),await fetchAllData(),switchAdminTab("products")},switchAdminTab=e=>{document.querySelectorAll("#admin-container .tab-button").forEach((t=>t.classList.toggle("active",t.dataset.tab===e)));const t=document.querySelector("#admin-container #content-area");"products"===e?renderProductsView(t):"users"===e&&renderUsersView(t)},renderProductsView=e=>{e.innerHTML=`<div class="content-header"><h2>قائمة المنتجات (${state.products.length})</h2><button id="add-product-btn">إضافة منتج جديد</button></div><table><thead><tr><th>صورة</th><th>الاسم</th><th>الكمية</th><th>سعر البيع للمندوب</th></tr></thead><tbody>${state.products.map((e=>`<tr><td><img class="table-img" src="${e.imageUrl||"https://placehold.co/100x100/e2e8f0/e2e8f0?text=."}" alt="${e.name}"></td><td>${e.name}</td><td>${e.quantity}</td><td>${e.repPrice} د.ع</td></tr>`)).join("")}</tbody></table>`,document.getElementById("add-product-btn").addEventListener("click",renderAddProductModal)},renderUsersView=e=>{const t=state.users.filter((e=>"admin"!==e.role));e.innerHTML=`<div class="content-header"><h2>قائمة المستخدمين (${t.length})</h2><button id="add-user-btn">إضافة مستخدم جديد</button></div><table><thead><tr><th>الاسم</th><th>البريد الإلكتروني</th><th>الصلاحية</th></tr></thead><tbody>${t.map((e=>`<tr><td>${e.name}</td><td>${e.email}</td><td>${"rep"===e.role?"مندوب":"مجهز"}</td></tr>`)).join("")}</tbody></table>`,document.getElementById("add-user-btn").addEventListener("click",renderAddUserModal)},renderAddProductModal=()=>{modalContainer.innerHTML=`<div id="product-modal" class="modal-backdrop"><div class="modal"><div class="modal-header"><h3>إضافة منتج جديد</h3></div><form id="product-form"><div class="input-group"><label>اسم المنتج</label><input type="text" id="product-name" required></div><div class="input-group"><label>صورة المنتج</label><input type="file" id="product-image-file" accept="image/*"></div><div class="input-group"><label>الكمية</label><input type="number" id="product-quantity" required></div><div class="input-group"><label>سعر الشراء</label><input type="number" id="product-cost" required></div><div class="input-group"><label>سعر البيع للمندوب</label><input type="number" id="product-rep-price" required></div><div class="input-group"><label>سعر البيع للزبون</label><input type="number" id="product-customer-price" required></div><div class="modal-footer"><button type="button" class="button-secondary" id="cancel-product-btn">إلغاء</button><button type="submit">حفظ المنتج</button></div></form></div></div>`,document.getElementById("product-form").addEventListener("submit",handleAddNewProduct),document.getElementById("cancel-product-btn").addEventListener("click",(()=>modalContainer.innerHTML=""))},renderAddUserModal=()=>{modalContainer.innerHTML=`<div id="user-modal" class="modal-backdrop"><div class="modal"><div class="modal-header"><h3>إضافة مستخدم جديد</h3></div><form id="user-form"><div class="input-group"><label>الاسم</label><input type="text" id="user-name" required></div><div class="input-group"><label>البريد الإلكتروني</label><input type="email" id="user-email" required></div><div class="input-group"><label>كلمة السر</label><input type="password" id="user-password" required></div><div class="input-group"><label>الصلاحية</label><select id="user-role"><option value="rep">مندوب</option><option value="packer">مجهز</option></select></div><div class="modal-footer"><button type="button" class="button-secondary" id="cancel-user-btn">إلغاء</button><button type="submit">حفظ المستخدم</button></div></form></div></div>`,document.getElementById("user-form").addEventListener("submit",handleAddNewUser),document.getElementById("cancel-user-btn").addEventListener("click",(()=>modalContainer.innerHTML=""))},handleAddNewProduct=async e=>{e.preventDefault(),showLoader();try{const e=document.getElementById("product-image-file").files[0];let t=null;if(e){const n=`public/${Date.now()}-${e.name}`,{error:a}=await supabase.storage.from("product_images").upload(n,e);if(a)throw a;const{data:r}=supabase.storage.from("product_images").getPublicUrl(n);t=r.publicUrl}const n={name:document.getElementById("product-name").value,quantity:parseInt(document.getElementById("product-quantity").value),costPrice:parseFloat(document.getElementById("product-cost").value),repPrice:parseFloat(document.getElementById("product-rep-price").value),customerPrice:parseFloat(document.getElementById("product-customer-price").value),imageUrl:t},{error:a}=await supabase.from("products").insert(n);if(a)throw a;showToast("تمت إضافة المنتج بنجاح."),modalContainer.innerHTML="",await fetchAllData(),switchAdminTab("products")}catch(e){showToast(`خطأ: ${e.details||e.message}`,!0)}finally{hideLoader()}},handleAddNewUser=async e=>{e.preventDefault(),showLoader();try{const e=document.getElementById("user-name").value,t=document.getElementById("user-email").value,n=document.getElementById("user-password").value,a=document.getElementById("user-role").value,{data:r,error:i}=await supabase.auth.signUp({email:t,password:n});if(i)throw i;const{error:o}=await supabase.from("users").insert({id:r.user.id,name:e,email:t,role:a});if(o)throw o;showToast("تمت إضافة المستخدم بنجاح."),modalContainer.innerHTML="",await fetchAllData(),switchAdminTab("users")}catch(e){showToast(`خطأ: ${e.details||e.message}`,!0)}finally{hideLoader()}};

// =================================================================
// ===== REP-SPECIFIC FUNCTIONS (MODIFIED) =========================
// =================================================================
const renderRepApp=async()=>{loginSection.classList.add("hidden"),repContainer.classList.remove("hidden"),repContainer.innerHTML=`<div class="container"><header class="app-header"><h1>واجهة المندوب</h1><button id="logout-btn" class="button-danger">تسجيل الخروج</button></header><main><div class="tabs"><button class="tab-button active" data-tab="add-order">إضافة طلب</button><button class="tab-button" data-tab="previous-orders">الطلبات السابقة</button><button class="tab-button" data-tab="reports">تقارير الأرباح</button></div><div id="rep-content-area"></div></main></div>`,document.getElementById("logout-btn").addEventListener("click",handleLogout),document.querySelectorAll("#rep-container .tab-button").forEach((e=>{e.addEventListener("click",(()=>switchRepTab(e.dataset.tab)))})),await fetchAllData(),switchRepTab("add-order")},switchRepTab=e=>{document.querySelectorAll("#rep-container .tab-button").forEach((t=>t.classList.toggle("active",t.dataset.tab===e)));const t=document.getElementById("rep-content-area");"add-order"===e?renderRepOrderCreationView(t):"previous-orders"===e?renderRepPreviousOrdersView(t):"reports"===e&&renderRepReportsView(t)},renderRepOrderCreationView=e=>{e.innerHTML=`<div class="rep-grid"><div><h2>الفاتورة الحالية</h2><div id="invoice-items-container"></div><div id="invoice-summary-container"></div><hr style="margin: 1.5rem 0;"><h2>معلومات الزبون</h2><form id="customer-info-form"><div class="input-group"><label>اسم الزبون</label><input type="text" id="customer-name" required></div><div class="input-group"><label>رقم الهاتف</label><input type="tel" id="customer-phone" required></div><div class="input-group"><label>العنوان</label><textarea id="customer-address" rows="3" required></textarea></div><div class="input-group"><label>الملاحظات</label><textarea id="invoice-notes" rows="2"></textarea></div><button type="button" id="submit-invoice-btn" class="button-success" disabled>تثبيت الطلب</button></form></div><div><h2>اختر المنتجات</h2><div id="product-grid" class="product-grid">${state.products.filter((e=>e.quantity>0)).map((e=>`<div class="product-card"><img src="${e.imageUrl||"https://placehold.co/150x120/e2e8f0/e2e8f0?text=."}" alt="${e.name}"><div class="product-card-body"><h3>${e.name}</h3><button class="add-to-cart-btn" data-product-id="${e.id}">أضف للسلة</button></div></div>`)).join("")}</div></div></div>`,document.querySelectorAll(".add-to-cart-btn").forEach((e=>{e.addEventListener("click",(()=>handleAddToCartClick(e.dataset.productId)))})),document.getElementById("submit-invoice-btn").addEventListener("click",handleInvoiceSubmit),renderInvoiceItems()},handleAddToCartClick=e=>{if(currentInvoiceItems.find((t=>t.product.id==e)))return showToast("هذا المنتج موجود بالفعل في السلة.",!0);const t=state.products.find((t=>t.id==e));t&&(currentInvoiceItems.push({product:t,quantity:1,finalPrice:t.customerPrice}),renderInvoiceItems())},renderInvoiceItems=()=>{const e=document.getElementById("invoice-items-container"),t=document.getElementById("invoice-summary-container"),n=document.getElementById("submit-invoice-btn");if(!e||!t||!n)return;if(0===currentInvoiceItems.length)return e.innerHTML="<p>السلة فارغة.</p>",t.innerHTML="",void(n.disabled=!0);e.innerHTML=`<table id="invoice-items-table" style="width:100%"><thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th></th></tr></thead><tbody>${currentInvoiceItems.map(((e,t)=>`<tr><td>${e.product.name}</td><td><input type="number" value="${e.quantity}" min="1" max="${e.product.quantity}" class="invoice-item-quantity" data-index="${t}" style="width: 60px; padding: 0.25rem;"></td><td><input type="number" value="${e.finalPrice}" min="0" class="invoice-item-price" data-index="${t}" style="width: 80px; padding: 0.25rem;"></td><td><button data-index="${t}" class="remove-item-btn button-danger" style="width:auto;padding:2px 8px;">X</button></td></tr>`)).join("")}</tbody></table>`,n.disabled=!1;const a=currentInvoiceItems.reduce(((e,t)=>e+t.quantity*t.finalPrice),0);let r=0;const i=document.getElementById("invoice-discount");i&&(r=parseFloat(i.value)||0),t.innerHTML=`<div class="invoice-summary"><p><span>الإجمالي الفرعي:</span> <span id="subtotal-amount">${a.toFixed(2)} د.ع</span></p><div class="input-group"><label for="invoice-discount">الخصم:</label><input type="number" id="invoice-discount" value="${r}" min="0" style="padding: 0.5rem;"></div><p class="final-total"><span>الإجمالي النهائي:</span> <span id="final-total-amount"></span></p></div>`;const d=document.getElementById("invoice-discount"),o=()=>{const e=parseFloat(d.value)||0;document.getElementById("final-total-amount").textContent=`${(a-e).toFixed(2)} د.ع`};o(),document.querySelectorAll(".remove-item-btn").forEach((e=>{e.onclick=t=>{currentInvoiceItems.splice(t.currentTarget.dataset.index,1),renderInvoiceItems()}})),document.querySelectorAll("input.invoice-item-quantity, input.invoice-item-price").forEach((e=>{e.onchange=t=>{const n=t.target.dataset.index;if(t.target.classList.contains("invoice-item-quantity")){const e=parseInt(t.target.value),a=parseInt(t.target.max);currentInvoiceItems[n].quantity=Math.min(e,a)}else currentInvoiceItems[n].finalPrice=parseFloat(t.target.value);renderInvoiceItems()}})),d&&(d.oninput=o)},handleInvoiceSubmit=async()=>{if(0===currentInvoiceItems.length)return showToast("الفاتورة فارغة!",!0);const e=document.getElementById("customer-name").value,t=document.getElementById("customer-phone").value,n=document.getElementById("customer-address").value,a=document.getElementById("invoice-notes").value,r=document.getElementById("invoice-discount"),i=r?parseFloat(r.value)||0:0;if(!e||!t||!n)return showToast("الرجاء إدخال معلومات الزبون كاملة.",!0);showLoader();const d=currentInvoiceItems.reduce(((e,t)=>e+t.quantity*t.finalPrice),0)-i,o=currentInvoiceItems.map((e=>({product_id:parseInt(e.product.id),quantity:e.quantity,final_price:e.finalPrice,product_name:e.product.name,cost_price:e.product.costPrice,rep_price:e.product.repPrice})));try{const{error:r}=await supabase.rpc("submit_invoice",{p_invoice_id:`INV-${Date.now()}-${Math.floor(1e3*Math.random())}`,p_items:o,p_rep_id:state.currentUser.id,p_rep_name:state.currentUser.name,p_customer_name:e,p_customer_phone:t,p_customer_address:n,p_total_amount:d,p_discount:i,p_notes:a});if(r)throw r;showToast("تم تثبيت الطلب بنجاح."),currentInvoiceItems=[],await fetchAllData(),switchRepTab("add-order")}catch(e){showToast(`فشل تثبيت الطلب: ${e.message}`,!0)}finally{hideLoader()}},renderRepPreviousOrdersView=e=>{e.innerHTML=`
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
    `,document.getElementById("status-filter").addEventListener("change",filterRepOrders),filterRepOrders()},filterRepOrders=()=>{const e=document.getElementById("status-filter").value,t=document.getElementById("rep-orders-list"),n=state.sales.reduce(((e,t)=>(e[t.invoiceId]||(e[t.invoiceId]=[]),e[t.invoiceId].push(t),e)),{});let a=Object.values(n);"all"!==e&&(a=a.filter((t=>t[0].status===e))),0===a.length?t.innerHTML="<p>لا توجد طلبات مطابقة للمعايير المحددة.</p>":t.innerHTML=`
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
                ${a.map((e=>{const t=e[0],n=(e.reduce(((e,t)=>e+t.quantity*t.finalPrice),0)-(t.discount||0)).toFixed(2),a=t.status;return`
                    <tr>
                        <td>
                            <div>${t.customerName}</div>
                            <small>${t.invoiceId}</small>
                            <small>${(new Date(t.created_at)).toLocaleDateString("ar-EG")}</small>
                        </td>
                        <td>
                            <ul class="item-list-in-table">
                                ${e.map((e=>`<li>${e.productName} (الكمية: ${e.quantity})</li>`)).join("")}
                            </ul>
                        </td>
                        <td>${n} د.ع</td>
                        <td><span class="status-badge ${getStatusClass(a)}">${getStatusText(a)}</span></td>
                        <td>
                            <button class="button-secondary print-btn" 
                                data-invoice-id="${t.invoiceId}" 
                                data-print-type="order"
                                style="width: auto; padding: 0.5rem 1rem;">طباعة الفاتورة</button>
                        </td>
                    </tr>`})).join("")}
            </tbody>
        </table>
    `,document.querySelectorAll(".print-btn").forEach((e=>{e.addEventListener("click",(e=>{const t=e.currentTarget.dataset.invoiceId,a=Object.values(n).find((e=>e[0].invoiceId===t));a&&printInvoice([a],"order")}))}))},renderRepReportsView=e=>{const t=state.sales.filter((e=>"delivered"===e.status&&!e.profit_received)),n=t.reduce(((e,t)=>(e[t.invoiceId]||(e[t.invoiceId]=[]),e[t.invoiceId].push(t),e)),{}),a=Object.values(n),r=calculateRepProfit(t);if(e.innerHTML=`
        <div class="content-header">
            <h2>تقارير الأرباح (القابلة للاستلام)</h2>
            <div>
                <button id="print-selected-report-btn" class="button-secondary" style="width: auto;" disabled>طباعة المحدد</button>
                <button id="receive-selected-profits-btn" class="button-success" style="width: auto; margin-right: 10px;" disabled>استلام أرباح المحدد</button>
            </div>
        </div>
        <div class="report-summary">
            <p>إجمالي الأرباح الصافية القابلة للاستلام: <strong>${r} د.ع</strong></p>
        </div>
        <h3 style="margin-top: 2rem;">قائمة الطلبات المستلمة (غير مستلمة الأرباح) (${a.length})</h3>
        <div id="profit-report-table-container"></div>
    `,0===a.length)return void(document.getElementById("profit-report-table-container").innerHTML="<p>لا توجد أرباح قابلة للاستلام حالياً.</p>");document.getElementById("profit-report-table-container").innerHTML=`
        <table>
            <thead>
                <tr>
                    <th><input type="checkbox" id="select-all-orders"></th>
                    <th>الزبون / الفاتورة</th>
                    <th>رقم الزبون</th>
                    <th>تكلفة المندوب</th>
                    <th>سعر البيع</th>
                    <th>الربح الصافي</th>
                </tr>
            </thead>
            <tbody>
                ${a.map((e=>{const t=e[0],n=e.reduce(((e,t)=>e+t.quantity*(t.repPrice||0)),0),a=e.reduce(((e,t)=>e+t.quantity*t.finalPrice),0),r=t.discount||0,i=a-n-r;return`
                    <tr data-invoice-id="${t.invoiceId}">
                        <td><input type="checkbox" class="order-checkbox" data-invoice-id="${t.invoiceId}"></td>
                        <td>
                            <div>${t.customerName}</div>
                            <small>فاتورة: ${t.invoiceId}</small>
                        </td>
                        <td>${t.customerPhone}</td>
                        <td>${n.toFixed(2)} د.ع</td>
                        <td>${a.toFixed(2)} د.ع</td>
                        <td><strong style="color: ${i>=0?"#16a34a":"#dc2626"}">${i.toFixed(2)} د.ع</strong></td>
                    </tr>`})).join("")}
            </tbody>
        </table>
    `;const i=document.getElementById("print-selected-report-btn"),d=document.getElementById("receive-selected-profits-btn"),o=document.getElementById("select-all-orders"),s=document.querySelectorAll(".order-checkbox"),c=()=>{const e=document.querySelectorAll(".order-checkbox:checked").length;i.disabled=0===e,d.disabled=0===e,i.textContent=`طباعة المحدد (${e})`,d.textContent=`استلام أرباح المحدد (${e})`};o.addEventListener("change",(e=>{s.forEach((t=>{t.checked=e.target.checked})),c()})),s.forEach((e=>{e.addEventListener("change",c)})),i.addEventListener("click",(()=>{const e=Array.from(document.querySelectorAll(".order-checkbox:checked")).map((e=>e.dataset.invoiceId));if(0===e.length)return void showToast("الرجاء تحديد طلب واحد على الأقل للطباعة.",!0);const t=a.filter((t=>e.includes(t[0].invoiceId)));printInvoice(t,"full_report")})),d.addEventListener("click",handleReceiveSelectedProfits),c()},handleReceiveSelectedProfits=async()=>{const e=Array.from(document.querySelectorAll(".order-checkbox:checked")).map((e=>e.dataset.invoiceId));if(0===e.length)return showToast("الرجاء تحديد الطلبات التي تود استلام أرباحها.",!0);const t="3491445",n=prompt("الرجاء إدخال الرمز السري للمحاسب للمتابعة:");if(null===n)return;if(n!==t)return showToast("الرمز السري غير صحيح. تم إلغاء العملية.",!0);const a=await showConfirmationModal(`هل أنت متأكد من استلام أرباح (${e.length}) طلبات؟ لا يمكن التراجع عن هذه العملية.`);if(!a)return;showLoader();try{const{error:t}=await supabase.from("sales").update({profit_received:!0}).in("invoiceId",e);if(t)throw t;showToast("تم تسجيل استلام الأرباح بنجاح."),await fetchAllData(),switchRepTab("reports")}catch(e){showToast(`حدث خطأ: ${e.message}`,!0)}finally{hideLoader()}},calculateRepProfit=e=>{let t=0,n=0;e.forEach((e=>{const a=e.repPrice||0;t+=a*e.quantity,n+=e.finalPrice*e.quantity}));const a=e.reduce(((e,t)=>(e[t.invoiceId]||(e[t.invoiceId]=t.discount||0),e)),{}),r=Object.values(a).reduce(((e,t)=>e+t),0);return(n-t-r).toFixed(2)};

// =================================================================
// ===== PACKER-SPECIFIC FUNCTIONS (MODIFIED) ======================
// =================================================================

const renderPackerApp = async () => {
    loginSection.classList.add('hidden');
    packerContainer.classList.remove('hidden');

    packerContainer.innerHTML = `
        <div class="container">
            <header class="app-header"><h1>واجهة المجهز</h1><button id="logout-btn" class="button-danger">تسجيل الخروج</button></header>
            <main>
                <div class="tabs">
                    <button class="tab-button active" data-tab="pending">طلبات قيد التجهيز</button>
                    <button class="tab-button" data-tab="followup">متابعة الطلبات</button>
                </div>
                <div id="packer-content-area" style="margin-top: 1.5rem;"></div>
            </main>
        </div>
    `;

    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.querySelectorAll("#packer-container .tab-button").forEach(btn => {
        btn.addEventListener('click', () => switchPackerTab(btn.dataset.tab));
    });

    await fetchAllData();
    switchPackerTab('pending'); // Show pending orders by default
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

/////////////////////////////
const printInvoice = (ordersData, type = 'order') => {
    if (!ordersData || ordersData.length === 0) {
        showToast("لا يمكن طباعة محتوى فارغ.", true);
        return;
    }
    
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>تقرير الطباعة</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
        @media print { 
            .no-print { display: none; } 
            .page-break { page-break-after: always; }
        }
        body { font-family: Tahoma, sans-serif; font-size: 14px; direction: rtl; text-align: right; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: right; }
        thead th { background-color: #f2f2f2; }
        h2, h3 { text-align: center; }
        .summary-box { padding: 10px; background-color: #e6ffed; border: 1px solid #b2e2c5; margin: 15px 0; text-align: center; }
        .details-list { margin: 0; padding: 0 1.5rem; }
        .print-container { padding: 20px; border: 1px solid #333; margin-bottom: 20px; }
    `);
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');


    if (type === 'order') {
        const orderItems = ordersData[0];
        const firstItem = orderItems[0];
        let customerRevenue = 0;
        
        const detailsTable = `
            <table>
                <thead><tr><th>المنتج</th><th>الكمية</th><th>السعر (فردي)</th><th>الإجمالي</th></tr></thead>
                <tbody>
                    ${orderItems.map(item => {
                        customerRevenue += item.quantity * item.finalPrice;
                        return `<tr><td>${item.productName}</td><td>${item.quantity}</td><td>${item.finalPrice.toFixed(2)} د.ع</td><td>${(item.quantity * item.finalPrice).toFixed(2)} د.ع</td></tr>`;
                    }).join('')}
                </tbody>
            </table>`;
        
        const discount = firstItem.discount || 0;
        const finalTotal = customerRevenue - discount;
        const date = new Date(firstItem.created_at).toLocaleDateString('ar-EG');

        let printContent = `
            <div class="print-container">
                <h2 style="text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 10px;">فاتورة مبيعات</h2>
                <p><strong>رقم الفاتورة:</strong> ${firstItem.invoiceId}</p><p><strong>التاريخ:</strong> ${date}</p><hr>
                <h3>معلومات الزبون</h3>
                <p><strong>الاسم:</strong> ${firstItem.customerName}</p><p><strong>الهاتف:</strong> ${firstItem.customerPhone}</p><p><strong>العنوان:</strong> ${firstItem.customerAddress}</p><hr>
                ${detailsTable}<hr>
                <p style="text-align: left;"><strong>الإجمالي الفرعي:</strong> ${customerRevenue.toFixed(2)} د.ع</p>
                <p style="text-align: left;"><strong>الخصم:</strong> ${discount.toFixed(2)} د.ع</p>
                <h3 style="text-align: left; color: #16a34a;">الإجمالي النهائي: ${finalTotal.toFixed(2)} د.ع</h3>
                <p style="text-align: center; margin-top: 20px;">شكراً لتعاملكم معنا.</p>
            </div>`;
        printWindow.document.write(printContent);

    } else if (type === 'profit') {
        const orderItems = ordersData[0];
        const firstItem = orderItems[0];
        let repCost = 0;
        let customerRevenue = 0;

        const detailsTable = `
            <table>
                <thead><tr><th>المنتج</th><th>الكمية</th><th>سعر المندوب</th><th>سعر البيع</th><th>ربح الوحدة</th><th>الربح الكلي</th></tr></thead>
                <tbody>
                    ${orderItems.map(item => {
                        const unitProfit = item.finalPrice - (item.repPrice || 0);
                        const totalItemProfit = unitProfit * item.quantity;
                        repCost += item.quantity * (item.repPrice || 0);
                        customerRevenue += item.quantity * item.finalPrice;
                        return `<tr><td>${item.productName}</td><td>${item.quantity}</td><td>${(item.repPrice || 0).toFixed(2)} د.ع</td><td>${item.finalPrice.toFixed(2)} د.ع</td><td>${unitProfit.toFixed(2)} د.ع</td><td>${totalItemProfit.toFixed(2)} د.ع</td></tr>`;
                    }).join('')}
                </tbody>
            </table>`;
        
        const discount = firstItem.discount || 0;
        const finalTotal = customerRevenue - discount;
        const profit = finalTotal - repCost;
        const date = new Date(firstItem.created_at).toLocaleDateString('ar-EG');

        let printContent = `
            <div class="print-container">
                <h2 style="text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 10px;">تقرير ربح الفاتورة</h2>
                <p><strong>رقم الفاتورة:</strong> ${firstItem.invoiceId}</p><p><strong>التاريخ:</strong> ${date}</p><p><strong>اسم المندوب:</strong> ${firstItem.repName || state.currentUser?.name || 'غير معروف'}</p><hr>
                <h3>معلومات الزبون</h3><p><strong>الاسم:</strong> ${firstItem.customerName}</p><p><strong>الهاتف:</strong> ${firstItem.customerPhone}</p><hr>
                ${detailsTable}<hr>
                <p style="text-align: left;"><strong>الإجمالي النهائي (للزبون):</strong> ${finalTotal.toFixed(2)} د.ع</p>
                <p style="text-align: left;"><strong>تكلفة البضاعة على المندوب:</strong> ${repCost.toFixed(2)} د.ع</p>
                <h3 style="text-align: left; color: #007bff;">الربح الصافي للمندوب: ${profit.toFixed(2)} د.ع</h3>
            </div>`;
        printWindow.document.write(printContent);

    } else if (type === 'full_report') {
        let totalProfit = 0, allItems = [], totalRepCost = 0, totalCustomerRevenue = 0, totalDiscount = 0;
        
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

            allItems.push({ invoiceId: firstItem.invoiceId, customerName: firstItem.customerName, customerPhone: firstItem.customerPhone, repCost: orderRepCost, customerRevenue: orderCustomerRevenue, orderProfit: orderProfit });
        });

        let reportContent = `
            <div class="print-container">
                <h2 style="border-bottom: 2px solid #ccc; padding-bottom: 10px;">تقرير الأرباح الشامل للطلبات المحددة</h2>
                <p><strong>تاريخ التقرير:</strong> ${new Date().toLocaleDateString('ar-EG')}</p><p><strong>اسم المندوب:</strong> ${state.currentUser?.name || 'غير معروف'}</p>
                <div class="summary-box"><p style="font-size: 1.2rem; margin: 0;"><strong>إجمالي الأرباح الصافية:</strong> <span style="color: #007bff;">${totalProfit.toFixed(2)} د.ع</span></p></div>
                <h3>تفاصيل الطلبات (${allItems.length})</h3>
                <table>
                    <thead><tr><th>الفاتورة</th><th>الزبون</th><th>الهاتف</th><th>تكلفة المندوب</th><th>سعر البيع</th><th>الربح الصافي</th></tr></thead>
                    <tbody>
                        ${allItems.map(item => `<tr><td>${item.invoiceId}</td><td>${item.customerName}</td><td>${item.customerPhone}</td><td>${item.repCost.toFixed(2)} د.ع</td><td>${item.customerRevenue.toFixed(2)} د.ع</td><td style="color: ${item.orderProfit >= 0 ? '#16a34a' : '#dc2626'}; font-weight: bold;">${item.orderProfit.toFixed(2)} د.ع</td></tr>`).join('')}
                    </tbody>
                </table><hr>
                <div style="text-align: left;">
                    <p><strong>الإجمالي الكلي للتكلفة:</strong> ${totalRepCost.toFixed(2)} د.ع</p>
                    <p><strong>الإجمالي الكلي للبيع:</strong> ${totalCustomerRevenue.toFixed(2)} د.ع</p>
                    <p><strong>الإجمالي الكلي للخصم:</strong> ${totalDiscount.toFixed(2)} د.ع</p>
                    <h3 style="color: #007bff;">الإجمالي الصافي للأرباح: ${totalProfit.toFixed(2)} د.ع</h3>
                </div>
            </div>`;
        printWindow.document.write(reportContent);

    } else if (type === 'packing_slip') {
        let allSlipsContent = '';
        ordersData.forEach((orderItems, index) => {
            const firstItem = orderItems[0];
            const isLastItem = index === ordersData.length - 1;
            allSlipsContent += `
                <div class="print-container ${isLastItem ? '' : 'page-break'}">
                    <h2 style="border-bottom: 2px solid #ccc; padding-bottom: 10px;">قسيمة تجهيز طلب</h2>
                    <p><strong>رقم الفاتورة:</strong> ${firstItem.invoiceId}</p>
                    <p><strong>تاريخ الطلب:</strong> ${new Date(firstItem.created_at).toLocaleString('ar-EG')}</p><hr>
                    <h3>معلومات الزبون</h3>
                    <p><strong>الاسم:</strong> ${firstItem.customerName}</p>
                    <p><strong>الهاتف:</strong> ${firstItem.customerPhone}</p>
                    <p><strong>العنوان:</strong> ${firstItem.customerAddress}</p>
                    
                    ${firstItem.notes ? `
                        <hr>
                        <h3>الملاحظات</h3>
                        <p style="background-color: #fffbdd; padding: 10px; border-radius: 4px; border: 1px solid #ffeb3b;">${firstItem.notes}</p>
                    ` : ''}
                    
                    <hr>
                    <h3>المنتجات المطلوبة</h3>
                    <table>
                        <thead><tr><th>المنتج</th><th>الكمية</th></tr></thead>
                        <tbody>
                            ${orderItems.map(item => `<tr><td>${item.productName}</td><td><strong>${item.quantity}</strong></td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        });
        printWindow.document.write(allSlipsContent);
    }
    
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
};


///////////////////////////

const renderPackerPendingView = (container) => {
    const groupedOrders = state.sales.reduce((acc, sale) => {
        (acc[sale.invoiceId] = acc[sale.invoiceId] || []).push(sale);
        return acc;
    }, {});
    const allPendingOrders = Object.values(groupedOrders).filter(o => o[0].status === 'pending');

    // استخلاص قائمة فريدة بأسماء المندوبين
    const repsWithPendingOrders = [...new Map(allPendingOrders.flat()
        .filter(sale => sale.repId && sale.repName)
        .map(sale => [sale.repId, { id: sale.repId, name: sale.repName }]))
        .values()];

    container.innerHTML = `
        <div class="content-header">
            <h2>الطلبات قيد التجهيز (<span id="pending-order-count">${allPendingOrders.length}</span>)</h2>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div>
                    <label for="rep-filter-pending" style="font-size: 0.9rem; margin-left: 0.5rem;">تصفية حسب المندوب:</label>
                    <select id="rep-filter-pending" style="width: auto; padding: 0.5rem;">
                        <option value="all">كل المندوبين</option>
                        ${repsWithPendingOrders.map(rep => `<option value="${rep.id}">${rep.name}</option>`).join('')}
                    </select>
                </div>
                <button id="bulk-process-btn" class="button-success" style="width: auto;" disabled>تجهيز وطباعة المحدد (0)</button>
            </div>
        </div>
        <table>
            <thead>
                <tr>
                    <th><input type="checkbox" id="select-all-pending-orders"></th>
                    <th>الزبون / الفاتورة</th>
                    <th>المنتجات</th>
                    <th>تغيير فردي</th>
                </tr>
            </thead>
            <tbody id="pending-orders-tbody">
                </tbody>
        </table>
    `;

    const renderTableBody = (ordersToRender) => {
        const tbody = document.getElementById('pending-orders-tbody');
        const countSpan = document.getElementById('pending-order-count');
        if (!tbody || !countSpan) return;

        countSpan.textContent = ordersToRender.length;
        tbody.innerHTML = ordersToRender.length > 0 ? ordersToRender.map(orderItems => {
            const firstItem = orderItems[0];
            return `
            <tr>
                <td><input type="checkbox" class="packer-order-checkbox" data-invoice-id="${firstItem.invoiceId}"></td>
                <td>
                    <div>${firstItem.customerName}</div>
                    <small>${firstItem.invoiceId}</small>
                </td>
                <td><ul class="item-list-in-table">${orderItems.map(item => `<li>${item.productName} (الكمية: ${item.quantity})</li>`).join('')}</ul></td>
                <td>
                    <select class="status-changer" data-invoice-id="${firstItem.invoiceId}" data-old-status="${firstItem.status}">
                        <option value="pending" selected>قيد التجهيز</option>
                        <option value="prepared">تم التجهيز</option>
                        <option value="cancelled">إلغاء</option>
                    </select>
                </td>
            </tr>`;
        }).join('') : `<tr><td colspan="4" style="text-align: center;">لا توجد طلبات تطابق هذا الفلتر.</td></tr>`;

        attachPendingViewListeners(ordersToRender);
    };

    const attachPendingViewListeners = (currentOrders) => {
        const bulkProcessBtn = document.getElementById('bulk-process-btn');
        const selectAllCheckbox = document.getElementById('select-all-pending-orders');
        const orderCheckboxes = document.querySelectorAll('.packer-order-checkbox');

        const updateButtonState = () => {
            const checkedCount = document.querySelectorAll('.packer-order-checkbox:checked').length;
            if (bulkProcessBtn) {
                bulkProcessBtn.disabled = checkedCount === 0;
                bulkProcessBtn.textContent = `تجهيز وطباعة المحدد (${checkedCount})`;
            }
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = checkedCount > 0 && checkedCount === orderCheckboxes.length;
            }
        };

        if (selectAllCheckbox) selectAllCheckbox.addEventListener('change', (e) => {
            orderCheckboxes.forEach(checkbox => checkbox.checked = e.target.checked);
            updateButtonState();
        });

        orderCheckboxes.forEach(checkbox => checkbox.addEventListener('change', updateButtonState));
        if (bulkProcessBtn) bulkProcessBtn.addEventListener('click', () => handleBulkProcessOrders(currentOrders));
        document.querySelectorAll('.status-changer').forEach(select => select.addEventListener('change', (e) => handleUpdateOrderStatus(e, 'pending')));
        
        updateButtonState();
    };

    document.getElementById('rep-filter-pending').addEventListener('change', (e) => {
        const selectedRepId = e.target.value;
        const filteredOrders = selectedRepId === 'all'
            ? allPendingOrders
            : allPendingOrders.filter(order => order[0].repId == selectedRepId);
        renderTableBody(filteredOrders);
    });

    renderTableBody(allPendingOrders);
};

const renderPackerFollowupView = (container) => {
    const groupedOrders = state.sales.reduce((acc, sale) => {
        (acc[sale.invoiceId] = acc[sale.invoiceId] || []).push(sale);
        return acc;
    }, {});
    const allFollowupOrders = Object.values(groupedOrders).filter(o => ['prepared', 'shipped'].includes(o[0].status));

    const repsWithFollowupOrders = [...new Map(allFollowupOrders.flat()
        .filter(sale => sale.repId && sale.repName)
        .map(sale => [sale.repId, { id: sale.repId, name: sale.repName }]))
        .values()];

    container.innerHTML = `
        <div class="content-header">
            <h2>متابعة الطلبات (<span id="followup-order-count">${allFollowupOrders.length}</span>)</h2>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div>
                    <label for="rep-filter-followup" style="font-size: 0.9rem; margin-left: 0.5rem;">تصفية حسب المندوب:</label>
                    <select id="rep-filter-followup" style="width: auto; padding: 0.5rem;">
                        <option value="all">كل المندوبين</option>
                        ${repsWithFollowupOrders.map(rep => `<option value="${rep.id}">${rep.name}</option>`).join('')}
                    </select>
                </div>
                <select id="bulk-status-changer" style="width: auto; padding: 0.5rem;">
                    <option value="">-- اختر الحالة الجديدة --</option>
                    <option value="shipped">تم الشحن</option>
                    <option value="delivered">تم الاستلام</option>
                    <option value="cancelled">ملغي</option>
                </select>
                <button id="bulk-update-btn" class="button-secondary" style="width: auto;" disabled>تحديث المحدد (0)</button>
            </div>
        </div>
        <table>
            <thead>
                <tr>
                    <th><input type="checkbox" id="select-all-followup-orders"></th>
                    <th>الزبون / الفاتورة</th>
                    <th>المنتجات</th>
                    <th>الحالة الحالية</th>
                </tr>
            </thead>
            <tbody id="followup-orders-tbody">
                </tbody>
        </table>
    `;

    const renderTableBody = (ordersToRender) => {
        const tbody = document.getElementById('followup-orders-tbody');
        const countSpan = document.getElementById('followup-order-count');
        if (!tbody || !countSpan) return;

        countSpan.textContent = ordersToRender.length;
        tbody.innerHTML = ordersToRender.length > 0 ? ordersToRender.map(orderItems => {
            const firstItem = orderItems[0];
            return `
            <tr>
                <td><input type="checkbox" class="packer-followup-checkbox" data-invoice-id="${firstItem.invoiceId}"></td>
                <td><div>${firstItem.customerName}</div><small>${firstItem.invoiceId}</small></td>
                <td><ul class="item-list-in-table">${orderItems.map(item => `<li>${item.productName} (الكمية: ${item.quantity})</li>`).join('')}</ul></td>
                <td><span class="status-badge ${getStatusClass(firstItem.status)}">${getStatusText(firstItem.status)}</span></td>
            </tr>`;
        }).join('') : `<tr><td colspan="4" style="text-align: center;">لا توجد طلبات للمتابعة تطابق هذا الفلتر.</td></tr>`;
        
        attachFollowupViewListeners();
    };

    const attachFollowupViewListeners = () => {
        const bulkUpdateBtn = document.getElementById('bulk-update-btn');
        const selectAllCheckbox = document.getElementById('select-all-followup-orders');
        const orderCheckboxes = document.querySelectorAll('.packer-followup-checkbox');

        const updateButtonState = () => {
            const checkedCount = document.querySelectorAll('.packer-followup-checkbox:checked').length;
            if (bulkUpdateBtn) {
                bulkUpdateBtn.disabled = checkedCount === 0;
                bulkUpdateBtn.textContent = `تحديث المحدد (${checkedCount})`;
            }
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = checkedCount > 0 && checkedCount === orderCheckboxes.length;
            }
        };
        
        if (selectAllCheckbox) selectAllCheckbox.addEventListener('change', (e) => {
            orderCheckboxes.forEach(checkbox => checkbox.checked = e.target.checked);
            updateButtonState();
        });

        orderCheckboxes.forEach(checkbox => checkbox.addEventListener('change', updateButtonState));
        if (bulkUpdateBtn) bulkUpdateBtn.addEventListener('click', handleBulkStatusUpdate);

        updateButtonState();
    };
    
    document.getElementById('rep-filter-followup').addEventListener('change', (e) => {
        const selectedRepId = e.target.value;
        const filteredOrders = selectedRepId === 'all'
            ? allFollowupOrders
            : allFollowupOrders.filter(order => order[0].repId == selectedRepId);
        renderTableBody(filteredOrders);
    });

    renderTableBody(allFollowupOrders);
};

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
//
//اضف على هذا الكود ميزة , اضافة قائمة منسدلة خاصة بالزبائن بحيث يتم تحديد اسم الزبون و بعدها يتم طباعة فاتورة بالطلبات المحددة
