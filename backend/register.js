async function handleRegister(event) {
    event.preventDefault(); // Prevent actual form submission
    
    const name = document.getElementById('nameInput').value;
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const confirmPassword = document.getElementById('confirmPasswordInput').value;
    const messageBox = document.getElementById('messageBox');

    // Reset message box
    messageBox.classList.remove('d-none', 'alert-success', 'alert-danger');

    // Front-end validation: Check if passwords match
    if (password !== confirmPassword) {
        messageBox.classList.add('alert-danger');
        messageBox.innerText = "Passwords do not match. Please try again.";
        messageBox.classList.remove('d-none');
        return;
    }

    try {
        // Send the data to your Node.js backend
        const response = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            messageBox.classList.add('alert-success');
            messageBox.innerText = "Account created successfully! Redirecting to login...";
            messageBox.classList.remove('d-none');

            // Redirect to login page after 1.5 seconds
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            // If backend returns an error (e.g., Email already registered)
            messageBox.classList.add('alert-danger');
            messageBox.innerText = data.message || "Registration failed.";
            messageBox.classList.remove('d-none');
        }
    } catch (error) {
        console.error('Registration error:', error);
        messageBox.classList.add('alert-danger');
        messageBox.innerText = "Cannot connect to server. Ensure Node is running on port 3000.";
        messageBox.classList.remove('d-none');
    }
}