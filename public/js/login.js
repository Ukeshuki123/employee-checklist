// Get base URL for API calls
const getBaseUrl = () => {
    return window.location.origin;
};

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', async function() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            // Verify token is still valid
            const response = await fetch('/api/verify-token', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                window.location.href = '/index.html';
                return;
            } else {
                // Token is invalid, clear storage
                localStorage.clear();
            }
        } catch (error) {
            console.error('Token verification error:', error);
            localStorage.clear();
        }
    }

    // Add viewport meta tag for responsiveness if not present
    if (!document.querySelector('meta[name="viewport"]')) {
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        document.head.appendChild(meta);
    }
});

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const alertBox = document.getElementById('alertBox');
    
    // Handle form submission
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                // Store user info in localStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', data.username);
                localStorage.setItem('role', data.role);
                localStorage.setItem('isAuthenticated', 'true');

                // Redirect based on role
                switch(data.role.toLowerCase()) {
                    case 'admin':
                        window.location.href = 'index.html'; // Access to all pages
                        break;
                    case 'manager':
                        window.location.href = 'index.html'; // Access to index and employee pages
                        break;
                    default: // employee/user role
                        window.location.href = 'index.html'; // Access to index and checklist pages
                        break;
                }
            } else {
                alert('Invalid username or password');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Error during login. Please try again.');
        }
    });

    // Show alert message
    function showAlert(message, type = 'danger') {
        const alertBox = document.getElementById('alertBox');
        alertBox.className = `alert alert-${type}`;
        alertBox.textContent = message;
        alertBox.style.display = 'block';
        
        // Hide alert after 5 seconds
        setTimeout(() => {
            alertBox.style.display = 'none';
        }, 5000);
    }
});

// Handle Enter key in password field
document.getElementById('password').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('loginForm').dispatchEvent(new Event('submit'));
    }
});

// Function to redirect based on role
function redirectToHome() {
    const role = localStorage.getItem('role');
    
    // Always redirect to index.html first
    window.location.href = '/index.html';
}

// Handle page access
function checkPageAccess() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (!token) {
        // If not on login page, redirect to login
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = '/login.html';
        }
        return;
    }

    // If on login page and already logged in, redirect to home
    if (window.location.pathname.includes('login.html')) {
        redirectToHome();
        return;
    }

    // Check role-based access
    const currentPage = window.location.pathname;
    let hasAccess = false;

    switch (role) {
        case 'admin':
            // Admin has access to all pages
            hasAccess = true;
            break;
        case 'management':
            // Management has access to index and employee pages
            hasAccess = ['/', '/index.html', '/employee.html'].includes(currentPage);
            break;
        case 'regular':
            // Regular users have access to index and checklist pages
            hasAccess = ['/', '/index.html', '/checklist.html'].includes(currentPage);
            break;
        default:
            hasAccess = false;
    }

    if (!hasAccess) {
        redirectToHome();
    }
}

// Check page access on load
document.addEventListener('DOMContentLoaded', checkPageAccess);

// Handle token expiration
function checkTokenExpiration() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp * 1000 < Date.now()) {
                // Token expired, logout
                localStorage.clear();
                window.location.href = '/login.html';
            }
        } catch (error) {
            console.error('Error checking token:', error);
            localStorage.clear();
            window.location.href = '/login.html';
        }
    }
}

// Check token expiration every minute
setInterval(checkTokenExpiration, 60000);

// Handle responsive design
function handleResponsive() {
    const width = window.innerWidth;
    const loginContainer = document.querySelector('.login-container');
    
    if (width < 768) {
        loginContainer.style.width = '90%';
        loginContainer.style.margin = '20px auto';
    } else {
        loginContainer.style.width = '400px';
        loginContainer.style.margin = '100px auto';
    }
}

// Add responsive handlers
window.addEventListener('resize', handleResponsive);
window.addEventListener('load', handleResponsive);
