document.addEventListener("DOMContentLoaded", () => {
    const currentUser = Parse.User.current();
    const currentPath = window.location.pathname;

    // Redirect logic
    if (currentUser) {
        if (currentPath.endsWith('login.php') || currentPath.endsWith('register.php') || currentPath === '/' || currentPath === '/index.php' || currentPath.endsWith('login') || currentPath.endsWith('register')) {
            window.location.href = '/dashboard';
        }
    } else {
        if (!currentPath.endsWith('login.php') && !currentPath.endsWith('register.php') && !currentPath.endsWith('login') && !currentPath.endsWith('register')) {
            window.location.href = '/login';
        }
    }

    // Notification Helper
    function showToast(msg, type = 'error') {
        Toastify({
            text: msg,
            duration: 3000,
            close: true,
            gravity: "top",
            position: "right",
            style: {
                background: type === 'error' ? "#ef4444" : "#10b981", // red-500 or green-500
            }
        }).showToast();
    }

    // Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const submitBtn = document.getElementById('login-submit-btn');
            const spinner = document.getElementById('login-spinner');
            const errorDiv = document.getElementById('login-error');

            if(!username || !password) {
                showToast("Please fill in all fields.");
                return;
            }

            submitBtn.disabled = true;
            spinner.classList.remove('hidden');
            errorDiv.classList.add('hidden');

            try {
                const user = await Parse.User.logIn(username, password);
                window.location.href = '/dashboard';
            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.classList.remove('hidden');
                showToast(error.message);
                submitBtn.disabled = false;
                spinner.classList.add('hidden');
            }
        });
    }

    // Register Form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const submitBtn = document.getElementById('register-submit-btn');
            const spinner = document.getElementById('register-spinner');
            const errorDiv = document.getElementById('register-error');
            const successDiv = document.getElementById('register-success');

            // Client-side validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showToast("Please enter a valid email address.");
                return;
            }
            if (password.length < 6) {
                showToast("Password must be at least 6 characters long.");
                return;
            }

            submitBtn.disabled = true;
            spinner.classList.remove('hidden');
            errorDiv.classList.add('hidden');
            successDiv.classList.add('hidden');

            const user = new Parse.User();
            user.set("username", username);
            user.set("password", password);
            user.set("email", email);

            try {
                await user.signUp();
                successDiv.textContent = 'Registration successful! Redirecting...';
                successDiv.classList.remove('hidden');
                showToast("Registration successful!", "success");
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);
            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.classList.remove('hidden');
                showToast(error.message);
                submitBtn.disabled = false;
                spinner.classList.add('hidden');
            }
        });
    }

    // Logout Button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await Parse.User.logOut();
                window.location.href = '/login';
            } catch (error) {
                console.error('Error logging out:', error);
            }
        });
    }
});
