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

const CATEGORIES_API = 'http://localhost:3000/api/categories';
const PARTS_API = 'http://localhost:3000/api/parts';

async function loadCategoryDropdown() {
    const dropdown = document.getElementById('partCategory');

    try {
        const response = await fetch(CATEGORIES_API, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.clear();
                window.location.href = 'login.html';
                return;
            }
            throw new Error('Failed to load categories');
        }

        const categories = await response.json();
        
        if (categories.length === 0) {
            dropdown.innerHTML = '<option value="" disabled selected>No categories found. Click link below to add one first.</option>';
            return;
        }

        dropdown.innerHTML = '<option value="" disabled selected>Choose a category...</option>';
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.innerText = cat.name;
            dropdown.appendChild(opt);
        });

    } catch (error) {
        console.error('Error fetching categories:', error);
        dropdown.innerHTML = '<option value="" disabled>Error loading categories. Make sure server is running.</option>';
    }
}

async function handleAddPart(event) {
    event.preventDefault();

    const messageBox = document.getElementById('messageBox');
    const submitBtn = event.target.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    messageBox.classList.add('d-none');
    messageBox.classList.remove('alert-success', 'alert-danger');

    const requestBody = {
        sku: document.getElementById('partSku').value,
        name: document.getElementById('partName').value,
        category_id: document.getElementById('partCategory').value,
        brand: document.getElementById('partBrand').value,
        stock_quantity: document.getElementById('partStock').value,
        price: document.getElementById('partPrice').value,
        compatible_models: document.getElementById('compatibleModels').value
    };

    try {
        const response = await fetch(PARTS_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (response.ok) {
            messageBox.innerText = data.message;
            messageBox.classList.add('alert-success');
            messageBox.classList.remove('d-none');
            
            // Clear the form
            document.getElementById('addPartForm').reset();
            document.getElementById('partCategory').value = ""; // Reset dropdown styling selection explicitly
        } else {
            messageBox.innerText = data.message || "Failed to add motorcycle part.";
            messageBox.classList.add('alert-danger');
            messageBox.classList.remove('d-none');
        }

    } catch (error) {
        console.error('Submission error:', error);
        messageBox.innerText = "Network error. Make sure your server is running.";
        messageBox.classList.add('alert-danger');
        messageBox.classList.remove('d-none');
    } finally {
        submitBtn.disabled = false;
    }
}

// Fetch drop-down items immediately upon mounting
loadCategoryDropdown();