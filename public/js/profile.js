document.addEventListener('DOMContentLoaded', () => {
    const dataContainer = document.getElementById('profile-data');
    const role = dataContainer.getAttribute('data-user-role');
    const hasMarks = dataContainer.getAttribute('data-has-marks') === 'true';

    if (role !== 'admin') {
        renderHeatmap();
        if (hasMarks) loadPerformanceChart();
    }

    const deleteBtn = document.getElementById('deleteAccountBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (!confirm("Permanently delete account?")) return;
            const email = dataContainer.getAttribute('data-user-email');
            const res = await fetch('/api/delete-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (res.ok) window.location.href = '/login';
        });
    }
});

async function renderHeatmap() {
    const heatmap = document.getElementById('heatmap');
    const monthContainer = document.getElementById('month-labels');
    if (!heatmap) return;

    try {
        const res = await fetch('/api/user-activity');
        const activityData = await res.json();

        const today = new Date();
        const startDate = new Date();
        startDate.setDate(today.getDate() - 91);
        while (startDate.getDay() !== 0) startDate.setDate(startDate.getDate() - 1);

        heatmap.innerHTML = '';
        monthContainer.innerHTML = '';
        let lastMonth = -1;

        for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dayNum = String(d.getDate()).padStart(2, '0');
            const dateKey = `${y}-${m}-${dayNum}`;

            if (d.getMonth() !== lastMonth) {
                const mLabel = document.createElement('div');
                
                mLabel.style.minWidth = "68px"; 
                mLabel.innerText = d.toLocaleString('default', { month: 'short' });
                monthContainer.appendChild(mLabel);
                lastMonth = d.getMonth();
            }

            const count = activityData[dateKey] || 0;
            const square = document.createElement('div');
            square.className = 'day-square';
            
            if (count > 0) {
                if (count >= 4) square.classList.add('active-4');
                else if (count >= 3) square.classList.add('active-3');
                else if (count >= 2) square.classList.add('active-2');
                else square.classList.add('active-1');
            }

            square.title = `${dateKey}: ${count} tests`;
            heatmap.appendChild(square);
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadPerformanceChart() {
    try {
        const res = await fetch('/api/user-stats');
        const data = await res.json();
        const ctx = document.getElementById('performanceChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.averages,
                    backgroundColor: '#1b5e4b',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, max: 100 } },
                plugins: { legend: { display: false } }
            }
        });
    } catch (err) {
        console.error("Chart error:", err);
    }
}