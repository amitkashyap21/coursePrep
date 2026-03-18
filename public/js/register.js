document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.querySelector('form');
    const usernameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const registerBtn = document.querySelector('button');

    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            // 1. Validation Logic
            if (username.length < 3) {
                e.preventDefault();
                alert("Username must be at least 3 characters long.");
                return;
            }

            const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,3}$/;
            if (!email.match(emailPattern)) {
                e.preventDefault();
                alert("Please enter a valid email address.");
                return;
            }

            if (password.length < 6) {
                e.preventDefault();
                alert("Password should be at least 6 characters for better security.");
                return;
            }

            // 2. Visual Loading State
            registerBtn.innerText = "Creating Account...";
            registerBtn.style.opacity = "0.7";
            registerBtn.style.cursor = "not-allowed";
        });
    }
});