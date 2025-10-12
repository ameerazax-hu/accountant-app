import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// 1. Supabase Setup
const SUPABASE_URL = 'https://iqfxbunxrnvmcsazmwvo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZnhidW54cm52bWNzYXptd3ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTI1NDEsImV4cCI6MjA3NTc2ODU0MX0.uVj2ioxJ5oaPsxLVbCaN3h1C3T0Wt8AUyobc5nkIE5c';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. DOM Elements
const loginSection = document.getElementById('login-section');
const productsSection = document.getElementById('products-section');
const loginForm = document.getElementById('loginForm');
const messageDiv = document.getElementById('message');
const productsListContainer = document.getElementById('products-list-container');
const logoutBtn = document.getElementById('logout-btn');

// --- Functions ---

// Function to fetch and display products
const showProducts = async () => {
    messageDiv.textContent = 'جاري تحميل المنتجات...';
    try {
        // Fetch products from the database
        const { data: products, error } = await supabase
            .from('products')
            .select('*');

        if (error) throw error;

        // Hide login form and show products section
        loginSection.classList.add('hidden');
        productsSection.classList.remove('hidden');

        if (products.length === 0) {
            productsListContainer.innerHTML = '<p>لا توجد منتجات لعرضها حالياً.</p>';
            return;
        }

        const productsHTML = products.map(product => `
            <div class="product-item">
                <img src="${product.imageUrl || 'https://placehold.co/100x100/e2e8f0/e2e8f0?text=.'}" alt="${product.name}">
                <div class="product-details">
                    <h3>${product.name}</h3>
                    <p>الكمية: ${product.quantity}</p>
                </div>
            </div>
        `).join('');

        productsListContainer.innerHTML = `<div class="product-list">${productsHTML}</div>`;

    } catch (error) {
        console.error('Error fetching products:', error.message);
        productsListContainer.innerHTML = `<p class="error">فشل تحميل المنتجات: ${error.message}</p>`;
        // Log out the user if fetching fails after login
        await supabase.auth.signOut();
    }
};

// --- Event Listeners ---

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    messageDiv.textContent = 'جاري التحقق...';
    messageDiv.className = '';

    try {
        const { error } = await supabase.auth.signInWithPassword({
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
        });

        if (error) throw error;
        
        await showProducts();

    } catch (error) {
        console.error('Login failed:', error.message);
        messageDiv.textContent = `فشل تسجيل الدخول: ${error.message}`;
        messageDiv.className = 'error';
    }
});

logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    loginSection.classList.remove('hidden');
    productsSection.classList.add('hidden');
    messageDiv.textContent = 'تم تسجيل الخروج بنجاح.';
    messageDiv.className = 'success';
});