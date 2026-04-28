const socket = io();

document.addEventListener('DOMContentLoaded', () => {
    const quizForm = document.getElementById('quizForm');
    const submitBtn = document.getElementById('submitBtn');
    const meta = document.getElementById('quiz-meta');

    const urlParams = new URLSearchParams(window.location.search);
    const roomId = meta.getAttribute('data-room') || urlParams.get('room');
    const currentUser = urlParams.get('user');
    const currentEmail = urlParams.get('email');

    // Helper function for clean exit
    function handleExit(e) {
        if (e) e.preventDefault();
        if (roomId) {
            socket.emit('player-exited', roomId);
        }
        setTimeout(() => {
            window.location.href = `/profile?user=${currentUser}&email=${currentEmail}`;
        }, 100);
    }

    // Delegate click event to the exit button 
    document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'exit-btn') {
            handleExit(e);
        }
    });

    if (roomId && currentUser) {
        socket.emit('init-session', { roomId, username: currentUser });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const totalQuestions = parseInt(meta.getAttribute('data-total-questions'));
            const topic = meta.getAttribute('data-topic');
            const answered = quizForm.querySelectorAll('input[type="radio"]:checked').length;

            if (answered < totalQuestions) return alert("Answer all questions!");

            submitBtn.disabled = true;
            submitBtn.innerText = "Calculating...";

            let score = 0;
            let results = [];
            document.querySelectorAll('.question-card').forEach((block) => {
                const selected = block.querySelector('input[type="radio"]:checked');
                const options = Array.from(block.querySelectorAll('input[type="radio"]')).map(i => i.value.trim());
                const correctIdx = parseInt(selected.getAttribute('data-correct-index'));
                const isCorrect = (selected.value.trim() === options[correctIdx]);
                if (isCorrect) score++;
                results.push({ question: selected.getAttribute('data-question-text'), status: isCorrect });
            });

            try {
                await fetch('/submit-quiz', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: currentUser, topic, score, results })
                });

                if (roomId) {
                    socket.emit('submit-multiplayer-score', { roomId, username: currentUser, score });

                    document.querySelector('.quiz-container').innerHTML = `
                        <div style="text-align:center; background:white; padding:50px; border-radius:15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
                            <h2>Quiz Submitted!</h2>
                            <p>Your Score: <strong>${score}/${totalQuestions}</strong></p>
                            <hr><p id="wait-msg">Waiting for others...</p>
                            <div id="l-board">
                                <h3>Live Standings</h3>
                                <ul id="final-scores" style="list-style:none; padding:0; text-align:left;"></ul>
                                <a href="#" id="exit-btn" class="btn-submit" style="display:none; text-decoration:none; margin-top:20px; background:#1b5e4b; color:white; padding:10px 25px; border-radius:8px;">Back to Profile</a>
                            </div>
                        </div>
                    `;
                } else {
                    window.location.href = `/profile?user=${currentUser}&email=${currentEmail}`;
                }
            } catch (e) { console.error(e); }
        });
    }

    socket.on('update-scores', (members) => {
        const scoreList = document.getElementById('final-scores');
        if (scoreList) {
            const sorted = [...members].sort((a, b) => b.score - a.score);
            scoreList.innerHTML = sorted.map((m, index) => `
                <li style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; opacity: ${m.exited ? '0.5' : '1'}">
                    <span>
                        ${index + 1}. <strong>${m.username}</strong> ${m.username === currentUser ? '(You)' : ''}
                        ${m.exited ? ' <small>(Left)</small>' : ''}
                    </span>
                    <span style="color: ${m.finished ? '#27ae60' : '#e67e22'}">
                        ${m.finished ? m.score + ' pts' : 'Playing...'}
                    </span>
                </li>
            `).join('');

            if (members.every(m => m.finished)) {
                document.getElementById('wait-msg').innerText = "Match Finished!";
                document.getElementById('exit-btn').style.display = "inline-block";
            }
        }
    });
});