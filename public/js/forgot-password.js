// public/js/forgot-password.js

console.log("Forgot Password JS Loaded");

document.addEventListener("DOMContentLoaded", () => {

    const form = document.querySelector("form");
    const emailInput = document.querySelector("input[type='email']");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();

        if (!email) {
            alert("Please enter your email address.");
            return;
        }

        try {
            const response = await fetch("/api/forgot-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                alert("Password reset instructions sent to your email.");
                form.reset();
            } else {
                alert(data.message || "Something went wrong.");
            }

        } catch (error) {
            console.error("Error:", error);
            alert("Server error. Please try again.");
        }
    });

});