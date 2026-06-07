async function handleLogin(event) {
    event.preventDefault(); // Prevent actual form submission
    
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const messageBox = document.getElementById('messageBox');

    // Reset message box
    messageBox.classList.remove('d-none', 'alert-success', 'alert-danger');

    try {
        // Send login credentials to your Node.js backend
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            messageBox.classList.add('alert-success');
            messageBox.innerText = "Login successful! Redirecting to Dashboard...";
            messageBox.classList.remove('d-none');

            // Store user context temporarily in localStorage (simulating basic auth flow)
            localStorage.setItem('user', JSON.stringify(data.user));
            // Store the secure JWT token
            localStorage.setItem('token', data.token);

            // Redirect to dashboard page after 1.5 seconds
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            // If backend returns an error (e.g., Invalid credentials)
            messageBox.classList.add('alert-danger');
            messageBox.innerText = data.message || "Invalid credentials. Please try again.";
            messageBox.classList.remove('d-none');
        }
    } catch (error) {
        console.error('Login error:', error);
        messageBox.classList.add('alert-danger');
        messageBox.innerText = "Cannot connect to server. Ensure Node is running on port 3000.";
        messageBox.classList.remove('d-none');
    }
}