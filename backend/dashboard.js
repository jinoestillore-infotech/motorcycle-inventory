document.addEventListener('DOMContentLoaded', function() {
    // --- Authentication Check ---
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
        // User is not logged in, redirect to login page
        window.location.href = 'login.html';
        return; // Stop execution
    }

    // Parse user data and update UI
    const user = JSON.parse(userStr);
    document.getElementById('userNameDisplay').innerText = user.name;
    
    // Generate an avatar based on the user's name
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0d6efd&color=fff`;
    document.getElementById('userAvatar').src = avatarUrl;

    // Handle Logout
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });

    // --- Sidebar Logic ---
    // Simple logic to toggle sidebar on smaller screens (Mobile functionality)
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if(sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('d-none');
            sidebar.classList.toggle('position-absolute');
            sidebar.classList.toggle('z-3');
            sidebar.classList.toggle('w-75');
        });
    }
});