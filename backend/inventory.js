const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');

if (!token || !userStr) {
    window.location.href = 'login.html';
} else {
    const user = JSON.parse(userStr);
    document.getElementById('userNameDisplay').innerText = user.name;
    document.getElementById('userAvatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0d6efd&color=fff`;
}

// Handle session logging out
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

// Auto dismiss alerting function
function showAlert(message, isSuccess, elementId = 'messageBox') {
    const messageBox = document.getElementById(elementId);
    messageBox.innerText = message;
    messageBox.className = `alert ${isSuccess ? 'alert-success' : 'alert-danger'}`;
    messageBox.classList.remove('d-none');

    setTimeout(() => {
        messageBox.classList.add('d-none');
    }, 2000);
}

let editPartModal = null;
let deletePartModal = null;
let activePartId = null;

// Pagination state values
let inventoryStore = [];  // Raw API dataset
let filteredStore = [];   // Filtered/searched dataset matching filters
let currentPage = 1;      // Currently visible page
let itemsPerPage = 10;    // Number of elements displayed per page

document.addEventListener('DOMContentLoaded', () => {
    editPartModal = new bootstrap.Modal(document.getElementById('editPartModal'));
    deletePartModal = new bootstrap.Modal(document.getElementById('deletePartModal'));
    
    // Check initial dropdown value for page limit setting
    const limitSelect = document.getElementById('itemsPerPageSelect');
    if (limitSelect) {
        itemsPerPage = parseInt(limitSelect.value) || 10;
    }

    loadCategoriesFilter();
    loadInventory();
});

const CATEGORIES_API = 'http://localhost:3000/api/categories';
const PARTS_API = 'http://localhost:3000/api/parts';

async function loadCategoriesFilter() {
    const filterDropdown = document.getElementById('categoryFilter');
    const modalDropdown = document.getElementById('editPartCategory');

    try {
        const response = await fetch(CATEGORIES_API, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Could not pull categories.');

        const categories = await response.json();
        
        categories.forEach(cat => {
            // Populate Search Filter Dropdown
            const optFilter = document.createElement('option');
            optFilter.value = cat.id;
            optFilter.innerText = cat.name;
            filterDropdown.appendChild(optFilter);

            // Populate Modal Select Dropdown
            const optModal = document.createElement('option');
            optModal.value = cat.id;
            optModal.innerText = cat.name;
            modalDropdown.appendChild(optModal);
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
    }
}

async function loadInventory() {
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4"><span class="spinner-border spinner-border-sm me-2"></span>Loading stock...</td></tr>';

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
            throw new Error('Trouble contacting the database server.');
        }

        inventoryStore = await response.json();
        filteredStore = [...inventoryStore];
        currentPage = 1; // Reset to page 1 on fresh load
        renderInventory();
    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger"><i class="bi bi-exclamation-octagon-fill me-1"></i>Could not retrieve parts directory. Make sure the Node server is running.</td></tr>`;
    }
}

function renderInventory() {
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '';

    const totalItems = filteredStore.length;

    if (totalItems === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">No compatible parts found. Adjust filters or register a new part!</td></tr>';
        updatePaginationControls(0);
        return;
    }

    // Safety checks for active page index bounds
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    // Slice array to extract elements for the active page
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedItems = filteredStore.slice(startIndex, endIndex);

    paginatedItems.forEach(part => {
        let stockBadge = '';
        if (part.stock_quantity === 0) {
            stockBadge = '<span class="stock-badge bg-danger bg-opacity-10 text-danger fw-bold">Out</span>';
        } else if (part.stock_quantity <= 5) {
            stockBadge = `<span class="stock-badge bg-warning bg-opacity-10 text-warning fw-bold">${part.stock_quantity}</span>`;
        } else {
            stockBadge = `<span class="stock-badge bg-success bg-opacity-10 text-success">${part.stock_quantity}</span>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="badge bg-secondary">${part.sku}</span></td>
            <td class="fw-bold">${part.name}</td>
            <td>${part.category_name}</td>
            <td>${part.brand || '-'}</td>
            <td class="text-end fw-semibold">$${parseFloat(part.price).toFixed(2)}</td>
            <td class="text-center">${stockBadge}</td>
            <td class="text-muted text-truncate" style="max-width: 250px;">${part.compatible_models || '-'}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-primary btn-action me-1" onclick="openEditModal(${part.id})" title="Edit Details">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger btn-action" onclick="openDeleteModal(${part.id}, '${part.name}')" title="Delete Part">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    updatePaginationControls(totalItems);
}

function updatePaginationControls(totalItems) {
    const infoBox = document.getElementById('paginationInfo');
    const controlsContainer = document.getElementById('paginationControls');

    if (!infoBox || !controlsContainer) return;

    if (totalItems === 0) {
        infoBox.innerText = 'Showing 0 to 0 of 0 entries';
        controlsContainer.innerHTML = '';
        return;
    }

    // Set textual status indicators
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(startIndex + itemsPerPage - 1, totalItems);
    infoBox.innerText = `Showing ${startIndex} to ${endIndex} of ${totalItems} entries`;

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    let html = '';

    // Render Back Page Control
    const prevDisabled = currentPage === 1 ? 'disabled' : '';
    html += `
        <li class="page-item ${prevDisabled}">
            <button class="page-link" onclick="changePage(${currentPage - 1})" aria-label="Previous">
                <span aria-hidden="true">&laquo;</span>
            </button>
        </li>
    `;

    // Render logical block window calculations (up to 5 buttons max)
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = startPage + maxVisiblePages - 1;

    if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Pre-ellipse indicators
    if (startPage > 1) {
        html += `
            <li class="page-item">
                <button class="page-link" onclick="changePage(1)">1</button>
            </li>
        `;
        if (startPage > 2) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    // Main page loop
    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        html += `
            <li class="page-item ${activeClass}">
                <button class="page-link" onclick="changePage(${i})">${i}</button>
            </li>
        `;
    }

    // Post-ellipse indicators
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        html += `
            <li class="page-item">
                <button class="page-link" onclick="changePage(${totalPages})">${totalPages}</button>
            </li>
        `;
    }

    // Render Forward Page Control
    const nextDisabled = currentPage === totalPages ? 'disabled' : '';
    html += `
        <li class="page-item ${nextDisabled}">
            <button class="page-link" onclick="changePage(${currentPage + 1})" aria-label="Next">
                <span aria-hidden="true">&raquo;</span>
            </button>
        </li>
    `;

    controlsContainer.innerHTML = html;
}

function filterInventory() {
    const searchVal = document.getElementById('searchBar').value.toLowerCase().trim();
    const categoryVal = document.getElementById('categoryFilter').value;
    const stockVal = document.getElementById('stockFilter').value;

    filteredStore = inventoryStore.filter(part => {
        const matchesSearch = part.sku.toLowerCase().includes(searchVal) || 
                                part.name.toLowerCase().includes(searchVal) || 
                                (part.brand && part.brand.toLowerCase().includes(searchVal));
        
        const matchesCategory = categoryVal === 'all' || part.category_id.toString() === categoryVal;
        
        let matchesStock = true;
        if (stockVal === 'in_stock') {
            matchesStock = part.stock_quantity > 0;
        } else if (stockVal === 'low_stock') {
            matchesStock = part.stock_quantity > 0 && part.stock_quantity <= 5;
        } else if (stockVal === 'out_of_stock') {
            matchesStock = part.stock_quantity === 0;
        }

        return matchesSearch && matchesCategory && matchesStock;
    });

    currentPage = 1; // Return to the first page when filter changes
    renderInventory();
}

function changePage(page) {
    currentPage = page;
    renderInventory();
}

function changeItemsPerPage(size) {
    itemsPerPage = parseInt(size);
    currentPage = 1;
    renderInventory();
}

function openEditModal(partId) {
    const part = inventoryStore.find(item => item.id === partId);
    if (!part) return;

    document.getElementById('editPartId').value = part.id;
    document.getElementById('editPartSku').value = part.sku;
    document.getElementById('editPartName').value = part.name;
    document.getElementById('editPartCategory').value = part.category_id;
    document.getElementById('editPartBrand').value = part.brand || '';
    document.getElementById('editPartPrice').value = part.price;
    document.getElementById('editPartStock').value = part.stock_quantity;
    document.getElementById('editCompatibleModels').value = part.compatible_models || '';

    editPartModal.show();
}

async function handleUpdatePart(event) {
    event.preventDefault();
    const submitBtn = document.getElementById('savePartBtn');
    submitBtn.disabled = true;

    const partId = document.getElementById('editPartId').value;
    const requestBody = {
        sku: document.getElementById('editPartSku').value,
        name: document.getElementById('editPartName').value,
        category_id: document.getElementById('editPartCategory').value,
        brand: document.getElementById('editPartBrand').value,
        price: document.getElementById('editPartPrice').value,
        stock_quantity: document.getElementById('editPartStock').value,
        compatible_models: document.getElementById('editCompatibleModels').value
    };

    try {
        const response = await fetch(`${PARTS_API}/${partId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (response.ok) {
            editPartModal.hide();
            showAlert(data.message, true);
            loadInventory();
        } else {
            showAlert(data.message || 'Failed to modify part specs.', false, 'modalMessageBox');
        }
    } catch (error) {
        console.error('Update Request failed:', error);
        showAlert('Network communication error.', false, 'modalMessageBox');
    } finally {
        submitBtn.disabled = false;
    }
}

function openDeleteModal(partId, partName) {
    activePartId = partId;
    document.getElementById('deletePartNameText').innerText = partName;
    deletePartModal.show();
}

async function executeDeletePart() {
    if (!activePartId) return;

    const deleteBtn = document.getElementById('confirmDeletePartBtn');
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span>';

    try {
        const response = await fetch(`${PARTS_API}/${activePartId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        deletePartModal.hide();

        if (response.ok) {
            showAlert(data.message, true);
            loadInventory();
        } else {
            showAlert(data.message || 'Could not complete deletion.', false);
        }
    } catch (error) {
        console.error('Delete action failed:', error);
        showAlert('Network request blocked.', false);
    } finally {
        deleteBtn.disabled = false;
        deleteBtn.innerText = 'Confirm Delete';
        activePartId = null;
    }
}