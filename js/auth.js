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

    // Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('login-error');

            try {
                const user = await Parse.User.logIn(username, password);
                window.location.href = '/dashboard';
            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.classList.remove('hidden');
            }
        });
    }

    // Register Form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('register-error');
            const successDiv = document.getElementById('register-success');

            const user = new Parse.User();
            user.set("username", username);
            user.set("password", password);
            user.set("email", email);

            try {
                await user.signUp();
                successDiv.textContent = 'Registration successful! Redirecting...';
                successDiv.classList.remove('hidden');
                errorDiv.classList.add('hidden');
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);
            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.classList.remove('hidden');
                successDiv.classList.add('hidden');
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
