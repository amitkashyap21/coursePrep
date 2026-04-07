/**
 * profile.js
 * Handles Chart.js visualization, account deletion, and quiz details toggling.
 */

document.addEventListener('DOMContentLoaded', () => {
    const dataContainer = document.getElementById('profile-data');
    const role = dataContainer.getAttribute('data-user-role');
    const email = dataContainer.getAttribute('data-user-email');
    const hasMarks = dataContainer.getAttribute('data-has-marks') === 'true';

    // 1. Toggle Quiz Details (Accordion)
    const quizSummaries = document.querySelectorAll('.quiz-summary');
    quizSummaries.forEach(summary => {
        summary.addEventListener('click', () => {
            const card = summary.closest('.quiz-card');
            const details = card.querySelector('.quiz-details');

            const isOpen = details.style.display === "block";
            details.style.display = isOpen ? "none" : "block";
            card.classList.toggle('active', !isOpen);
        });
    });

    // 2. Account Deletion Logic
    const deleteBtn = document.getElementById('deleteAccountBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (!confirm("Warning: This will permanently delete your account and all progress.")) return;

            try {
                const res = await fetch('/api/delete-account', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email })
                });

                if (res.ok) {
                    window.location.href = '/login';
                } else {
                    alert("Failed to delete account. Please try again.");
                }
            } catch (err) {
                console.error("Deletion error:", err);
                alert("Server error occurred.");
            }
        });
    }

    // 3. Performance Chart Loader
    if (role !== 'admin' && hasMarks) {
        loadPerformanceChart();
    }
});

async function loadPerformanceChart() {
    const canvas = document.getElementById('performanceChart');
    if (!canvas) return;

    try {
        const res = await fetch('/api/user-stats');
        const data = await res.json();
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, '#1b5e4b');
        gradient.addColorStop(1, '#0f3d2e');

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.averages,
                    backgroundColor: gradient,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `Score: ${ctx.raw}%`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { callback: (val) => val + "%" }
                    }
                }
            }
        });
    } catch (e) {
        console.error("❌ Chart initialization failed:", e);
    }
}