// public/js/firstpage.js

console.log("Firstpage JS is working");

async function loadHistory() {
    const container = document.getElementById('history-list');

    // stop if container not found
    if (!container) return;

    try {
        const response = await fetch('/api/user-history');

        // if API fails, do nothing
        if (!response.ok) return;

        const history = await response.json();

        // if no history, keep it empty
        if (!history || history.length === 0) {
            container.innerHTML = "";
            return;
        }

        // render history
        container.innerHTML = history.map(item => `
            <div class="history-item">
                <div class="history-info">
                    <strong>${item.topic ? item.topic.toUpperCase() : "UNKNOWN"}</strong>
                    <span>${item.date || ""}</span>
                </div>
                <div class="history-score">
                    ${item.score || ""}
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error("History failed to load:", error);
    }
}

// run after page loads
document.addEventListener("DOMContentLoaded", loadHistory);