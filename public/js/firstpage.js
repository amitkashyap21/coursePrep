/**
 * firstpage.js
 * Logic for landing page: UI initialization and history fetching.
 */

console.log("Firstpage JS initialized");

/**
 * 1. Load User Quiz History
 * Fetches recent scores from the database via API.
 */
async function loadHistory() {
    const container = document.getElementById('history-list');

    // If this element isn't on the page (e.g., user is logged out), stop.
    if (!container) return;

    try {
        // We use the stats API we built in server.js or a specific history one
        const response = await fetch('/api/user-stats'); 
        
        if (!response.ok) {
            container.innerHTML = "<p>Sign in to see your recent activity.</p>";
            return;
        }

        const data = await response.json();

        // If no labels exist, user hasn't taken any tests
        if (!data.labels || data.labels.length === 0) {
            container.innerHTML = "<div class='empty-state'>No tests taken yet. Start your first quiz!</div>";
            return;
        }

        // Render the list cleanly
        container.innerHTML = data.labels.map((topic, index) => `
            <div class="history-item">
                <div class="history-info">
                    <strong>${topic.toUpperCase()}</strong>
                    <span>Average Performance</span>
                </div>
                <div class="history-score">
                    ${data.averages[index]}%
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error("❌ History failed to load:", error);
        container.innerHTML = "<p>Unable to load history at this time.</p>";
    }
}

/**
 * 2. Initialize Page
 */
document.addEventListener("DOMContentLoaded", () => {
    // Load history if the user is logged in
    loadHistory();

    // Note: setupNavigationGuard was removed to improve user experience 
});