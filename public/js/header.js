/**
 * navbar.js
 * Handles navigation logic and logout confirmations
 */

function confirmLogout() {
    if (confirm("Are you sure you want to logout?")) {
        window.location.href = '/logout';
    }
}

// Any future navbar-specific logic (like mobile menu toggles) 
// should be added here.