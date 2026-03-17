console.log("Firstpage JS is working");

// =====================
// NAVIGATION GUARD
// =====================
function setupNavigationGuard() {
    const isHomePage = window.location.pathname === '/';

    // 1. If we are NOT on home, don't set any traps
    if (!isHomePage) {
        // Just in case a trap was left over, clear the listener logic
        window.onpopstate = null; 
        return;
    }

    // 2. If we ARE on home, anchor the history
    // We use a unique object { isHome: true } to identify our trap
    if (!history.state || !history.state.isHome) {
        history.replaceState({ isHome: true }, null, window.location.href);
        history.pushState({ isHome: true, active: true }, null, window.location.href);
    }

    // 3. The logic that handles the "Back" click
    window.onpopstate = function (event) {
        // ONLY trigger if the state we just 'popped' was our home trap
        if (window.location.pathname === '/') {
            const confirmLogout = confirm("Do you want to logout and close your session?");
            
            if (confirmLogout) {
                window.location.href = "/logout";
            } else {
                // If they cancel, push the active state back to re-lock the door
                history.pushState({ isHome: true, active: true }, null, window.location.href);
            }
        }
    };
}

// =====================
// HISTORY LOADING
// =====================
async function loadHistory() {
    const container = document.getElementById('history-list');

    if (!container) return;

    try {
        const response = await fetch('/api/user-history');
        if (!response.ok) return;

        const historyData = await response.json();

        if (!historyData || historyData.length === 0) {
            container.innerHTML = "";
            return;
        }

        container.innerHTML = historyData.map(item => `
            <div class="history-item">
                <div class="history-info">
                    <strong>${item.topic ? item.topic.toUpperCase() : "UNKNOWN"}</strong>
                    <span>${new Date(item.date).toLocaleDateString() || ""}</span>
                </div>
                <div class="history-score">
                    ${item.score || 0}/5
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error("History failed to load:", error);
    }
}

// Run everything after DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    loadHistory();
    setupNavigationGuard(); // Start the back-button trap
});