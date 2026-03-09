document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.querySelector('button');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            // 1. Basic Client-Side Validation
            const emailValue = emailInput.value.trim();
            const passwordValue = passwordInput.value;

            if (!emailValue || !passwordValue) {
                e.preventDefault();
                alert("Please fill in all fields.");
                return;
            }

            // 2. Simple Email Format Check
            const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,3}$/;
            if (!emailValue.match(emailPattern)) {
                e.preventDefault();
                alert("Please enter a valid email address.");
                return;
            }

            // 3. Visual Feedback (Loading State)
            loginBtn.innerText = "Authenticating...";
            loginBtn.style.opacity = "0.7";
            loginBtn.style.cursor = "not-allowed";
            
            console.log(`Attempting login for: ${emailValue}`);
            // The form will now proceed to POST to your app.js /login route
        });
    }
});