/**
 * login.js
 * Enhanced validation and UI feedback for the login process.
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const loginBtn = document.getElementById('loginBtn');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            const identifierValue = emailInput.value.trim();
            const passwordValue = document.getElementById('password').value;

            // 1. Validation Logic
            const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,3}$/;
            const isEmail = identifierValue.match(emailPattern);
            const isUsername = identifierValue.length >= 3;

            if (!identifierValue || !passwordValue) {
                e.preventDefault();
                alert("Please fill in all fields.");
                return;
            }

            if (!isEmail && !isUsername) {
                e.preventDefault();
                alert("Please enter a valid email or username.");
                emailInput.focus();
                return;
            }

            // 2. Visual Feedback (Prevents Double Submission)
            loginBtn.innerText = "Verifying...";
            loginBtn.disabled = true;
            
            // Log for debugging (remove in production)
            console.log(`🔐 Logging in as: ${identifierValue}`);
        });
    }
});