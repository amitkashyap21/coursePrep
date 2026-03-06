document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const topic = urlParams.get('topic');

    try {
        const response = await fetch(`/api/questions?topic=${topic}`);
        const questions = await response.json();

        const list = document.getElementById('question-list');
        list.innerHTML = questions.map((q, qIndex) => `
            <div class="q-card">
                <span class="q-num">Question 0${qIndex + 1}</span>
                <h3>${q.question}</h3>
                <div class="options-container">
                    ${q.options.map((opt, optIndex) => `
                        <label class="option-label">
                            <input type="radio" name="q${q.id}" value="${optIndex}" required>
                            <span class="custom-radio"></span>
                            ${opt}
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error("Error:", err);
    }
});