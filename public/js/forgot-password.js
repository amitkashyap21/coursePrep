console.log("Forgot Password JS Loaded");

document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form");
    const emailInput = document.getElementById("email");
    const codeInput = document.getElementById("code");
    const passwordInput = document.getElementById("newPassword");
    const submitBtn = document.querySelector("button");

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = emailInput.value.trim();
            const code = codeInput.value.trim();
            const newPassword = passwordInput.value;

            // 1. Basic Validation
            if (!email || !code || !newPassword) {
                alert("Please fill in all fields.");
                return;
            }

            // 2. Backup Code Length Check
            if (code.length !== 8) {
                alert("Backup codes must be exactly 8 characters long.");
                return;
            }

            // 3. UI Feedback
            submitBtn.innerText = "Updating Password...";
            submitBtn.disabled = true;

            try {
                const response = await fetch("/forgot-password", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email, code, newPassword })
                });

                if (response.ok) {
                    alert("Password updated successfully! You can now login.");
                    window.location.href = "/login"; // Redirect to login page
                } else {
                    const data = await response.json();
                    alert(data.message || "Invalid email or backup code.");
                    submitBtn.innerText = "Update Password";
                    submitBtn.disabled = false;
                }

            } catch (error) {
                console.error("Error:", error);
                alert("Server error. Please try again later.");
                submitBtn.innerText = "Update Password";
                submitBtn.disabled = false;
            }
        });
    }
});