const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');

if (!token || !userStr) {
    window.location.href = 'login.html';
} else {
    const user = JSON.parse(userStr);
    document.getElementById('userNameDisplay').innerText = user.name;
    document.getElementById('userAvatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0d6efd&color=fff`;
}

// Handle Logout
document.getElementById('logoutBtn').addEventListener('click', function(e) {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
});

// Toggle Sidebar Layout
document.getElementById('sidebarToggle')?.addEventListener('click', function() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('d-none');
    sidebar.classList.toggle('position-absolute');
    sidebar.classList.toggle('z-3');
    sidebar.classList.toggle('w-75');
});

// Reusable Auto-Dismiss Alert Helper
function showAlert(message, isSuccess, elementId = 'messageBox') {
    const messageBox = document.getElementById(elementId);
    messageBox.innerText = message;
    messageBox.className = `alert ${isSuccess ? 'alert-success' : 'alert-danger'}`;
    messageBox.classList.remove('d-none');

    setTimeout(() => {
        messageBox.classList.add('d-none');
    }, 4000);
}

let restockModal = null;

document.addEventListener('DOMContentLoaded', () => {
    restockModal = new bootstrap.Modal(document.getElementById('restockModal'));
    loadDashboardData();
});

const DASHBOARD_API = 'http://localhost:3000/api/dashboard';
const PARTS_API = 'http://localhost:3000/api/parts';

// Fetch and populate metrics in card elements and table rows
async function loadDashboardData() {
    try {
        const response = await fetch(DASHBOARD_API, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.clear();
                window.location.href = 'login.html';
                return;
            }
            throw new Error('Failed to load system metrics.');
        }

        const data = await response.json();

        // Populate dashboard cards
        document.getElementById('totalPartsCard').innerText = data.totalParts;
        document.getElementById('totalCategoriesCard').innerText = data.totalCategories;
        document.getElementById('lowStockAlertsCard').innerText = data.lowStockAlerts;
        document.getElementById('inventoryValueCard').innerText = `$${parseFloat(data.inventoryValue).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        // Populate table rows
        const tbody = document.getElementById('lowStockTableBody');
        tbody.innerHTML = '';

        if (data.lowStockItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted"><i class="bi bi-check-circle-fill text-success me-1"></i> All parts are in healthy stock levels!</td></tr>';
            return;
        }

        data.lowStockItems.forEach(part => {
            let stockBadge = '';
            if (part.stock_quantity === 0) {
                stockBadge = '<span class="stock-badge bg-danger bg-opacity-10 text-danger fw-bold">Out of Stock</span>';
            } else {
                stockBadge = `<span class="stock-badge bg-warning bg-opacity-10 text-warning fw-bold">${part.stock_quantity} Units left</span>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="badge bg-secondary">${part.sku}</span></td>
                <td class="fw-bold">${part.name}</td>
                <td>${part.category_name}</td>
                <td>${part.brand || '-'}</td>
                <td class="text-center">${stockBadge}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-primary" onclick="openRestockModal(${part.id}, '${escapeHtml(part.name)}')">
                        <i class="bi bi-plus-lg me-1"></i> Restock
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error('Metrics loading failed:', error);
        document.getElementById('lowStockTableBody').innerHTML = `
            <tr><td colspan="6" class="text-center py-4 text-danger"><i class="bi bi-exclamation-octagon-fill me-1"></i> Could not connect to the database. Make sure your server is running.</td></tr>
        `;
    }
}

// Prepare inputs and display modal
function openRestockModal(partId, partName) {
    document.getElementById('restockPartId').value = partId;
    document.getElementById('restockPartName').innerText = partName;
    document.getElementById('restockAmount').value = '10'; // Default quantity
    restockModal.show();
}

// Call adjusting controller to add values dynamically
async function handleQuickRestock(event) {
    event.preventDefault();
    const submitBtn = document.getElementById('confirmRestockBtn');
    submitBtn.disabled = true;

    const partId = document.getElementById('restockPartId').value;
    const incrementValue = document.getElementById('restockAmount').value;

    try {
        const response = await fetch(`${PARTS_API}/${partId}/stock`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ increment: incrementValue })
        });

        const data = await response.json();

        if (response.ok) {
            restockModal.hide();
            showAlert(data.message, true);
            loadDashboardData(); // Re-trigger live calculations
        } else {
            showAlert(data.message || 'Could not update stock level.', false, 'modalMessageBox');
        }
    } catch (error) {
        console.error('Restock request failed:', error);
        showAlert('Network request error.', false, 'modalMessageBox');
    } finally {
        submitBtn.disabled = false;
    }
}

// Helper to sanitize strings
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}