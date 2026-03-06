async function loadHistory() {
    try {
        const response = await fetch('/api/user-history');
        const history = await response.json();
        
        const container = document.getElementById('history-list');
        if (history.length === 0) {
            container.innerHTML = "<p>No sessions completed yet. Start practicing!</p>";
            return;
        }

        container.innerHTML = history.map(item => `
            <div class="history-item">
                <div class="history-info">
                    <strong>${item.topic.toUpperCase()}</strong>
                    <span>${item.date}</span>
                </div>
                <div class="history-score">${item.score}</div>
            </div>
        `).join('');
    } catch (err) {
        console.error("History failed to load");
    }
}
loadHistory();