document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('form');
    const emailInput = document.getElementById('email'); // This is your 'identifier' field
    const passwordInput = document.getElementById('password');
    const loginBtn = document.querySelector('button');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            const identifierValue = emailInput.value.trim();
            const passwordValue = passwordInput.value;

            // 1. Basic Client-Side Validation
            if (!identifierValue || !passwordValue) {
                e.preventDefault();
                alert("Please fill in all fields.");
                return;
            }

            // 2. Updated Validation: Check if it's a valid email OR a valid username
            const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,3}$/;
            const isEmail = identifierValue.match(emailPattern);
            const isUsername = identifierValue.length >= 3; // Allowing usernames 3 chars or longer

            if (!isEmail && !isUsername) {
                e.preventDefault();
                alert("Please enter a valid email or username (min 3 characters).");
                return;
            }

            // 3. Visual Feedback
            loginBtn.innerText = "Authenticating...";
            loginBtn.style.opacity = "0.7";
            loginBtn.style.cursor = "not-allowed";
            
            console.log(`Attempting login for: ${identifierValue}`);
        });
    }
});