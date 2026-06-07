// --- Authentication Check ---
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

// Toggle Sidebar
document.getElementById('sidebarToggle')?.addEventListener('click', function() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('d-none');
    sidebar.classList.toggle('position-absolute');
    sidebar.classList.toggle('z-3');
    sidebar.classList.toggle('w-75');
});

// --- Global Editing & Deletion Variables ---
let editingCategoryId = null;
let deleteModal = null;
let deletingCategoryId = null;

// Initialize delete modal on load
document.addEventListener('DOMContentLoaded', () => {
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
});

// Helper to sanitize strings for HTML element attributes
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// --- API Interactions ---
const API_URL = 'http://localhost:3000/api/categories';

// Fetch and display categories
async function loadCategories() {
    const tbody = document.getElementById('categoriesTableBody');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Loading...</td></tr>';

    try {
        const response = await fetch(API_URL, {
            headers: {
                'Authorization': `Bearer ${token}` // Passing the JWT Token!
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                // Token expired or invalid
                localStorage.clear();
                window.location.href = 'login.html';
                return;
            }
            throw new Error('Failed to fetch categories');
        }

        const categories = await response.json();
        
        if (categories.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No categories found. Add one on the left!</td></tr>';
            return;
        }

        tbody.innerHTML = ''; // Clear loading text
        categories.forEach(cat => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-bold">${cat.name}</td>
                <td class="text-muted text-truncate" style="max-width: 200px;">${cat.description || '-'}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="startEdit(${cat.id}, '${escapeHtml(cat.name)}', '${escapeHtml(cat.description || '')}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="confirmDelete(${cat.id}, '${escapeHtml(cat.name)}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-danger">Error loading categories. Make sure server is running.</td></tr>`;
    }
}

// Add a new category
async function handleAddCategory(event) {
    event.preventDefault();
    
    const nameInput = document.getElementById('categoryName');
    const descInput = document.getElementById('categoryDescription');
    const messageBox = document.getElementById('messageBox');
    const submitBtn = event.target.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    messageBox.classList.add('d-none');
    messageBox.classList.remove('alert-success', 'alert-danger');

    const requestBody = {
        name: nameInput.value,
        description: descInput.value
    };

    // Determine if adding or editing
    const isEditing = editingCategoryId !== null;
    const targetUrl = isEditing ? `${API_URL}/${editingCategoryId}` : API_URL;
    const targetMethod = isEditing ? 'PUT' : 'POST';

    try {
        const response = await fetch(targetUrl, {
            method: targetMethod,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Passing the JWT Token!
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (response.ok) {
            messageBox.innerText = data.message;
            messageBox.classList.add('alert-success');
            messageBox.classList.remove('d-none');
            
            // Reset form state
            cancelEdit();
            
            // Refresh table
            loadCategories();
        } else {
            messageBox.innerText = data.message || "Failed to process category.";
            messageBox.classList.add('alert-danger');
            messageBox.classList.remove('d-none');
        }
    } catch (error) {
        console.error('Error:', error);
        messageBox.innerText = "Network error. Make sure your server is running.";
        messageBox.classList.add('alert-danger');
        messageBox.classList.remove('d-none');
    } finally {
        submitBtn.disabled = false;
    }
}

// Trigger form to enter Edit Mode
function startEdit(id, name, description) {
    editingCategoryId = id;
    document.getElementById('categoryFormTitle').innerText = "Edit Category";
    document.getElementById('categoryName').value = name;
    document.getElementById('categoryDescription').value = description;
    
    // Update submit button aesthetics
    document.getElementById('submitBtnText').innerText = "Update";
    const submitIcon = document.getElementById('submitBtnIcon');
    submitIcon.classList.remove('bi-plus-circle');
    submitIcon.classList.add('bi-check-circle');
    
    // Show cancel button
    document.getElementById('cancelEditBtn').classList.remove('d-none');
    
    // Smooth scroll to the form for better mobile UX
    document.getElementById('addCategoryForm').scrollIntoView({ behavior: 'smooth' });
}

// Reset Form to Add Mode
function cancelEdit() {
    editingCategoryId = null;
    document.getElementById('categoryFormTitle').innerText = "Add New Category";
    document.getElementById('categoryName').value = '';
    document.getElementById('categoryDescription').value = '';
    
    // Revert submit button aesthetics
    document.getElementById('submitBtnText').innerText = "Add Category";
    const submitIcon = document.getElementById('submitBtnIcon');
    submitIcon.classList.remove('bi-check-circle');
    submitIcon.classList.add('bi-plus-circle');
    
    // Hide cancel button
    document.getElementById('cancelEditBtn').classList.add('d-none');
}

// Initiate the Delete verification flow
function confirmDelete(id, name) {
    deletingCategoryId = id;
    document.getElementById('deleteCategoryName').innerText = name;
    deleteModal.show();
}

// Call API to remove category from Database
async function executeDelete() {
    if (!deletingCategoryId) return;
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';

    try {
        const response = await fetch(`${API_URL}/${deletingCategoryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        deleteModal.hide();

        const messageBox = document.getElementById('messageBox');
        messageBox.classList.remove('d-none', 'alert-success', 'alert-danger');

        if (response.ok) {
            messageBox.innerText = data.message;
            messageBox.classList.add('alert-success');
            messageBox.classList.remove('d-none');
            
            // If we happen to delete the category currently in Edit Mode, reset form
            if (editingCategoryId === deletingCategoryId) {
                cancelEdit();
            }
            
            loadCategories();
        } else {
            messageBox.innerText = data.message || "Failed to delete category.";
            messageBox.classList.add('alert-danger');
            messageBox.classList.remove('d-none');
        }
    } catch (error) {
        console.error('Error:', error);
        const messageBox = document.getElementById('messageBox');
        messageBox.innerText = "Network error. Make sure your server is running.";
        messageBox.classList.add('alert-danger');
        messageBox.classList.remove('d-none');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerText = "Delete";
        deletingCategoryId = null;
    }
}

// Load categories immediately when page opens
loadCategories();