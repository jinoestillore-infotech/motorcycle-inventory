const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');

if (!token || !userStr) {
    window.location.href = 'login.html';
} else {
    const user = JSON.parse(userStr);
    document.getElementById('userNameDisplay').innerText = user.name;
    document.getElementById('userAvatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0d6efd&color=fff`;
}

// Handle Session Logging out
document.getElementById('logoutBtn').addEventListener('click', function(e) {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
});

// Toggle Sidebar Mobile
document.getElementById('sidebarToggle')?.addEventListener('click', function() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('d-none');
    sidebar.classList.toggle('position-absolute');
    sidebar.classList.toggle('z-3');
    sidebar.classList.toggle('w-75');
});

// Auto dismiss alerting function
function showAlert(message, isSuccess) {
    const messageBox = document.getElementById('messageBox');
    messageBox.innerText = message;
    messageBox.className = `alert ${isSuccess ? 'alert-success' : 'alert-danger'}`;
    messageBox.classList.remove('d-none');

    setTimeout(() => {
        messageBox.classList.add('d-none');
    }, 4000);
}

let productsStore = [];
let filteredProductsStore = [];
let catalogCurrentPage = 1;
let catalogItemsPerPage = 5;
let cart = []; // [{ id, sku, name, price, stock, qty }]
let receiptModal = null;

document.addEventListener('DOMContentLoaded', () => {
    receiptModal = new bootstrap.Modal(document.getElementById('receiptModal'));
    loadCategories();
    loadProducts();
});

const CATEGORIES_API = 'http://localhost:3000/api/categories';
const PARTS_API = 'http://localhost:3000/api/parts';
const TRANSACTION_API = 'http://localhost:3000/api/transactions';

// Retrieve system category lists to fill the selector
async function loadCategories() {
    const dropdown = document.getElementById('categoryFilter');
    try {
        const response = await fetch(CATEGORIES_API, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const categories = await response.json();
            categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.id;
                opt.innerText = cat.name;
                dropdown.appendChild(opt);
            });
        }
    } catch (error) {
        console.error('Failed to load filter categories:', error);
    }
}

// Fetch parts list from backend
async function loadProducts() {
    const tbody = document.getElementById('productsTableBody');
    try {
        const response = await fetch(PARTS_API, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.clear();
                window.location.href = 'login.html';
                return;
            }
            throw new Error('Could not pull motorcycle items.');
        }

        productsStore = await response.json();
        filteredProductsStore = [...productsStore];
        catalogCurrentPage = 1;
        renderProducts();
    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle-fill me-1"></i> Server offline. Make sure node is running.</td></tr>`;
    }
}

// Build the visual POS catalog table list with pagination
function renderProducts() {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = '';

    const totalItems = filteredProductsStore.length;

    if (totalItems === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No matching parts found in stock.</td></tr>`;
        updateCatalogPaginationControls(0);
        return;
    }

    // Safety check bounds
    const totalPages = Math.ceil(totalItems / catalogItemsPerPage);
    if (catalogCurrentPage > totalPages) catalogCurrentPage = totalPages;
    if (catalogCurrentPage < 1) catalogCurrentPage = 1;

    // Slice array elements
    const startIndex = (catalogCurrentPage - 1) * catalogItemsPerPage;
    const endIndex = Math.min(startIndex + catalogItemsPerPage, totalItems);
    const paginatedItems = filteredProductsStore.slice(startIndex, endIndex);

    paginatedItems.forEach(part => {
        const isOutOfStock = part.stock_quantity === 0;
        const stockBadge = isOutOfStock 
            ? `<span class="badge bg-danger">Out of Stock</span>`
            : `<span class="badge bg-success-subtle text-success">${part.stock_quantity}</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="fw-bold text-dark text-truncate" style="max-width: 150px;" title="${part.name}">${part.name}</div>
                <small class="text-muted">${part.category_name}</small>
            </td>
            <td>${part.brand || 'No Brand'}</td>
            <td class="text-end fw-semibold text-primary">$${parseFloat(part.price).toFixed(2)}</td>
            <td class="text-center">${stockBadge}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-primary py-1 px-2" 
                        onclick="addToCart(${part.id})" ${isOutOfStock ? 'disabled' : ''}>
                    <i class="bi bi-plus-lg"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    updateCatalogPaginationControls(totalItems);
}

function updateCatalogPaginationControls(totalItems) {
    const infoBox = document.getElementById('catalogPaginationInfo');
    const controlsContainer = document.getElementById('catalogPaginationControls');

    if (!infoBox || !controlsContainer) return;

    if (totalItems === 0) {
        infoBox.innerText = 'Showing 0 to 0 of 0 entries';
        controlsContainer.innerHTML = '';
        return;
    }

    const startIndex = (catalogCurrentPage - 1) * catalogItemsPerPage + 1;
    const endIndex = Math.min(startIndex + catalogItemsPerPage - 1, totalItems);
    infoBox.innerText = `Showing ${startIndex} to ${endIndex} of ${totalItems} entries`;

    const totalPages = Math.ceil(totalItems / catalogItemsPerPage);
    let html = '';

    // Back Page Control
    const prevDisabled = catalogCurrentPage === 1 ? 'disabled' : '';
    html += `
        <li class="page-item ${prevDisabled}">
            <button class="page-link" onclick="changeCatalogPage(${catalogCurrentPage - 1})" aria-label="Previous">
                <span aria-hidden="true">&laquo;</span>
            </button>
        </li>
    `;

    // visible buttons logic
    const maxVisiblePages = 5;
    let startPage = Math.max(1, catalogCurrentPage - Math.floor(maxVisiblePages / 2));
    let endPage = startPage + maxVisiblePages - 1;

    if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === catalogCurrentPage ? 'active' : '';
        html += `
            <li class="page-item ${activeClass}">
                <button class="page-link" onclick="changeCatalogPage(${i})">${i}</button>
            </li>
        `;
    }

    // Forward Page Control
    const nextDisabled = catalogCurrentPage === totalPages ? 'disabled' : '';
    html += `
        <li class="page-item ${nextDisabled}">
            <button class="page-link" onclick="changeCatalogPage(${catalogCurrentPage + 1})" aria-label="Next">
                <span aria-hidden="true">&raquo;</span>
            </button>
        </li>
    `;

    controlsContainer.innerHTML = html;
}

function changeCatalogPage(page) {
    catalogCurrentPage = page;
    renderProducts();
}

// Filter product grid
function filterProducts() {
    const searchVal = document.getElementById('searchBar').value.toLowerCase().trim();
    const categoryVal = document.getElementById('categoryFilter').value;

    filteredProductsStore = productsStore.filter(part => {
        const matchesSearch = part.sku.toLowerCase().includes(searchVal) || 
                                part.name.toLowerCase().includes(searchVal) || 
                                (part.brand && part.brand.toLowerCase().includes(searchVal));
        
        const matchesCategory = categoryVal === 'all' || part.category_id.toString() === categoryVal;
        
        return matchesSearch && matchesCategory;
    });

    catalogCurrentPage = 1;
    renderProducts();
}

// Add selected item to cashier cart
function addToCart(partId) {
    const part = productsStore.find(p => p.id === partId);
    if (!part || part.stock_quantity === 0) return;

    const existingItem = cart.find(item => item.id === partId);

    if (existingItem) {
        if (existingItem.qty >= part.stock_quantity) {
            showAlert(`Cannot add more. Max warehouse stock is ${part.stock_quantity}.`, false);
            return;
        }
        existingItem.qty += 1;
    } else {
        cart.push({
            id: part.id,
            sku: part.sku,
            name: part.name,
            price: parseFloat(part.price),
            stock: part.stock_quantity,
            qty: 1
        });
    }

    renderCart();
}

// Decrement item quantity or remove if it hits zero
function updateCartQty(partId, delta) {
    const item = cart.find(i => i.id === partId);
    if (!item) return;

    item.qty += delta;

    if (item.qty > item.stock) {
        showAlert(`Cannot exceed maximum available stock (${item.stock}).`, false);
        item.qty = item.stock;
    }

    if (item.qty <= 0) {
        cart = cart.filter(i => i.id !== partId);
    }

    renderCart();
}

// Completely remove an item from the cart
function removeFromCart(partId) {
    cart = cart.filter(i => i.id !== partId);
    renderCart();
}

// Reset checkout forms and cart
function clearCart() {
    cart = [];
    renderCart();
}

// Render shopping cart registry tables
function renderCart() {
    const tbody = document.getElementById('cartTableBody');
    tbody.innerHTML = '';

    if (cart.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">Cart is empty. Add items from the product panel.</td></tr>`;
        document.getElementById('totalDisplay').innerText = '$0.00';
        document.getElementById('completeSaleBtn').disabled = true;
        document.getElementById('amountPaid').value = '';
        document.getElementById('changeToReturn').value = '$0.00';
        return;
    }

    let subtotal = 0;
    cart.forEach(item => {
        const totalItemCost = item.price * item.qty;
        subtotal += totalItemCost;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="fw-bold text-truncate" style="max-width: 140px;" title="${item.name}">${item.name}</div>
                <small class="text-muted font-monospace">${item.sku}</small>
            </td>
            <td class="text-center">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-secondary p-1 py-0" onclick="updateCartQty(${item.id}, -1)">-</button>
                    <span class="px-2 fw-semibold align-self-center">${item.qty}</span>
                    <button class="btn btn-outline-secondary p-1 py-0" onclick="updateCartQty(${item.id}, 1)">+</button>
                </div>
            </td>
            <td class="text-end fw-semibold">$${totalItemCost.toFixed(2)}</td>
            <td class="text-center">
                <button class="btn btn-link btn-sm text-danger p-0" onclick="removeFromCart(${item.id})">
                    <i class="bi bi-x-circle-fill"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Compute invoice aggregates (Removed Estimated Tax)
    const grandTotal = subtotal;

    document.getElementById('totalDisplay').innerText = `$${grandTotal.toFixed(2)}`;
    
    // Track grand total in element attributes to parse for computational comparison
    document.getElementById('totalDisplay').dataset.value = grandTotal.toFixed(2);
    
    calculateChange();
}

// Compute change based on money entered
function calculateChange() {
    const inputVal = parseFloat(document.getElementById('amountPaid').value) || 0;
    const grandTotal = parseFloat(document.getElementById('totalDisplay').dataset.value) || 0;
    const completeBtn = document.getElementById('completeSaleBtn');
    const changeEl = document.getElementById('changeToReturn');

    if (grandTotal === 0) {
        completeBtn.disabled = true;
        changeEl.value = '$0.00';
        return;
    }

    const change = inputVal - grandTotal;
    
    if (change >= 0) {
        changeEl.value = `$${change.toFixed(2)}`;
        changeEl.classList.add('text-success');
        changeEl.classList.remove('text-danger');
        completeBtn.disabled = false;
    } else {
        changeEl.value = `Short: -$${Math.abs(change).toFixed(2)}`;
        changeEl.classList.remove('text-success');
        changeEl.classList.add('text-danger');
        completeBtn.disabled = true;
    }
}

// Handle checkout submittal and update stocks in Database
async function handleCheckout(event) {
    event.preventDefault();
    const submitBtn = document.getElementById('completeSaleBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Processing checkout...`;

    const amountPaid = parseFloat(document.getElementById('amountPaid').value);
    const cartItems = cart.map(item => ({
        part_id: item.id,
        quantity: item.qty
    }));

    try {
        const response = await fetch(TRANSACTION_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                items: cartItems,
                amountPaid: amountPaid
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Populate sales invoice receipt modal parameters
            document.getElementById('receiptId').innerText = `#TX-${data.transactionId}`;
            document.getElementById('receiptTotal').innerText = `$${parseFloat(data.totalAmount).toFixed(2)}`;
            document.getElementById('receiptPaid').innerText = `$${amountPaid.toFixed(2)}`;
            document.getElementById('receiptChange').innerText = `$${parseFloat(data.changeAmount).toFixed(2)}`;

            // Reset the button immediately upon success so it doesn't get stuck spinning
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="bi bi-check-circle me-1"></i> Complete Sale & Deduct Stock`;

            receiptModal.show();
        } else {
            showAlert(data.message || 'Transaction failed.', false);
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="bi bi-check-circle me-1"></i> Complete Sale & Deduct Stock`;
        }

    } catch (error) {
        console.error('Checkout failed:', error);
        showAlert('Server is offline or unreachable.', false);
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="bi bi-check-circle me-1"></i> Complete Sale & Deduct Stock`;
    }
}

// Completely clear cashier registers after purchase
function resetPOS() {
    cart = [];
    
    // Explicitly restore the checkout button template representation
    const submitBtn = document.getElementById('completeSaleBtn');
    if (submitBtn) {
        submitBtn.innerHTML = `<i class="bi bi-check-circle me-1"></i> Complete Sale & Deduct Stock`;
    }

    renderCart();
    loadProducts(); // Load fresh database catalog reflecting stock deductions
}