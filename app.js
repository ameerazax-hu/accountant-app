import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// 1. Supabase Setup
const SUPABASE_URL = 'https://iqfxbunxrnvmcsazmwvo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZnhidW54cm52bWNzYXptd3ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTI1NDEsImV4cCI6MjA3NTc2ODU0MX0.uVj2ioxJ5oaPsxLVbCaN3h1C3T0Wt8AUyobc5nkIE5c';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Global State ---
let state = {
    products: [],
    users: [],
    currentUser: null,
};

// --- DOM Elements ---
const loginSection = document.getElementById('login-section');
const appContainer = document.getElementById('app-container');
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
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
};

// --- Main App Rendering ---
const renderApp = async () => {
    loginSection.classList.add('hidden');
    appContainer.classList.remove('hidden');

    appContainer.innerHTML = `
        <div class="container">
            <header class="app-header">
                <h1>لوحة تحكم المدير</h1>
                <button id="logout-btn" class="button-danger">تسجيل الخروج</button>
            </header>
            <main>
                <div class="tabs">
                    <button id="tab-products" class="tab-button active" data-tab="products">المنتجات</button>
                    <button id="tab-users" class="tab-button" data-tab="users">المستخدمين</button>
                </div>
                <div id="content-area"></div>
            </main>
        </div>
    `;
    
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Load initial data and render the default tab
    await fetchAllData();
    switchTab('products');
};

const switchTab = (tabName) => {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    const contentArea = document.getElementById('content-area');
    if (tabName === 'products') {
        renderProductsView(contentArea);
    } else if (tabName === 'users') {
        renderUsersView(contentArea);
    }
};

const renderProductsView = (container) => {
    container.innerHTML = `
        <div class="content-header">
            <h2>قائمة المنتجات (${state.products.length})</h2>
            <button id="add-product-btn">إضافة منتج جديد</button>
        </div>
        <table>
            <thead>
                <tr><th>الاسم</th><th>الكمية</th><th>سعر البيع للمندوب</th></tr>
            </thead>
            <tbody>
                ${state.products.map(p => `
                    <tr>
                        <td>${p.name}</td>
                        <td>${p.quantity}</td>
                        <td>${p.repPrice} د.ع</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    document.getElementById('add-product-btn').addEventListener('click', renderAddProductModal);
};

const renderUsersView = (container) => {
    const reps = state.users.filter(u => u.role === 'rep');
    container.innerHTML = `
        <div class="content-header">
            <h2>قائمة المندوبين (${reps.length})</h2>
            <button id="add-user-btn">إضافة مندوب جديد</button>
        </div>
        <table>
            <thead>
                <tr><th>الاسم</th><th>البريد الإلكتروني</th></tr>
            </thead>
            <tbody>
                ${reps.map(u => `
                    <tr>
                        <td>${u.name}</td>
                        <td>${u.email}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    document.getElementById('add-user-btn').addEventListener('click', renderAddUserModal);
};

// --- Modal Rendering ---
const renderAddProductModal = () => {
    modalContainer.innerHTML = `
        <div id="product-modal" class="modal-backdrop">
            <div class="modal">
                <div class="modal-header"><h3>إضافة منتج جديد</h3></div>
                <form id="product-form">
                    <div class="input-group"><label>اسم المنتج</label><input type="text" id="product-name" required></div>
                    <div class="input-group"><label>الكمية</label><input type="number" id="product-quantity" required></div>
                    <div class="input-group"><label>سعر الشراء</label><input type="number" id="product-cost" required></div>
                    <div class="input-group"><label>سعر البيع للمندوب</label><input type="number" id="product-rep-price" required></div>
                    <div class="modal-footer">
                        <button type="button" class="button-secondary" id="cancel-product-btn">إلغاء</button>
                        <button type="submit">حفظ المنتج</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.getElementById('product-form').addEventListener('submit', handleAddNewProduct);
    document.getElementById('cancel-product-btn').addEventListener('click', () => modalContainer.innerHTML = '');
};

const renderAddUserModal = () => {
    modalContainer.innerHTML = `
        <div id="user-modal" class="modal-backdrop">
            <div class="modal">
                <div class="modal-header"><h3>إضافة مندوب جديد</h3></div>
                <form id="user-form">
                    <div class="input-group"><label>اسم المندوب</label><input type="text" id="user-name" required></div>
                    <div class="input-group"><label>البريد الإلكتروني</label><input type="email" id="user-email" required></div>
                    <div class="input-group"><label>كلمة السر</label><input type="password" id="user-password" required></div>
                    <div class="modal-footer">
                        <button type="button" class="button-secondary" id="cancel-user-btn">إلغاء</button>
                        <button type="submit">حفظ المندوب</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.getElementById('user-form').addEventListener('submit', handleAddNewUser);
    document.getElementById('cancel-user-btn').addEventListener('click', () => modalContainer.innerHTML = '');
};

// --- Data Fetching ---
const fetchAllData = async () => {
    showLoader();
    try {
        const [productsRes, usersRes] = await Promise.all([
            supabase.from('products').select('*'),
            supabase.from('users').select('*')
        ]);
        if (productsRes.error) throw productsRes.error;
        if (usersRes.error) throw usersRes.error;

        state.products = productsRes.data;
        state.users = usersRes.data;
    } catch (error) {
        showToast(`فشل تحميل البيانات: ${error.message}`, true);
    } finally {
        hideLoader();
    }
};

// --- Data Handlers (CRUD) ---
const handleAddNewProduct = async (e) => {
    e.preventDefault();
    showLoader();
    try {
        const newProduct = {
            name: document.getElementById('product-name').value,
            quantity: parseInt(document.getElementById('product-quantity').value),
            costPrice: parseFloat(document.getElementById('product-cost').value),
            repPrice: parseFloat(document.getElementById('product-rep-price').value),
            // You can add customerPrice later or set a default
            customerPrice: parseFloat(document.getElementById('product-rep-price').value) * 1.25 // Example: 25% markup
        };
        const { error } = await supabase.from('products').insert(newProduct);
        if (error) throw error;
        
        showToast('تمت إضافة المنتج بنجاح.');
        modalContainer.innerHTML = '';
        await fetchAllData();
        switchTab('products');
    } catch (error) {
        showToast(`خطأ: ${error.message}`, true);
    } finally {
        hideLoader();
    }
};

const handleAddNewUser = async (e) => {
    e.preventDefault();
    showLoader();
    const name = document.getElementById('user-name').value;
    const email = document.getElementById('user-email').value;
    const password = document.getElementById('user-password').value;

    try {
        // Step 1: Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;

        // Step 2: If auth user is created, add profile to 'users' table
        const { error: profileError } = await supabase.from('users').insert({
            id: authData.user.id,
            name: name,
            email: email,
            role: 'rep' // Set role to 'rep' for sales representative
        });
        if (profileError) throw profileError;

        showToast('تمت إضافة المندوب بنجاح.');
        modalContainer.innerHTML = '';
        await fetchAllData();
        switchTab('users');
    } catch (error) {
        showToast(`خطأ: ${error.message}`, true);
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

        // Check user role. For now, we assume login is for admin.
        await renderApp();

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
    appContainer.classList.add('hidden');
    loginSection.classList.remove('hidden');
    messageDiv.textContent = 'تم تسجيل الخروج.';
    messageDiv.className = 'success';
    hideLoader();
};
