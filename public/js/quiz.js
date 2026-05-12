const socket = io();


document.addEventListener('DOMContentLoaded', () => {
    const quizForm = document.getElementById('quizForm');
    const submitBtn = document.getElementById('submitBtn');
    const meta = document.getElementById('quiz-meta');

    const totalQuestions = parseInt(meta.getAttribute('data-total-questions'));
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = meta.getAttribute('data-room') || urlParams.get('room');
    const currentUser = urlParams.get('user');
    const currentEmail = urlParams.get('email');

    const aiToggle = document.getElementById('ai-toggle-btn');
    const aiWindow = document.getElementById('ai-chat-window');
    const closeChat = document.getElementById('close-chat');
    const aiSend = document.getElementById('ai-send-btn');
    const aiInput = document.getElementById('ai-user-input');
    const messageList = document.getElementById('ai-message-list');

    // --- FEATURE: PROGRESS TRACKER ---
    // Inject a sleek progress bar at the top of the container
    const quizContainer = document.querySelector('.quiz-container');
    const progressWrapper = document.createElement('div');
    progressWrapper.style = "width: 100%; background: #ddd; height: 8px; border-radius: 10px; margin-bottom: 20px; overflow: hidden;";
    progressWrapper.innerHTML = `<div id="quiz-progress" style="width: 0%; height: 100%; background: #1b5e4b; transition: 0.4s ease;"></div>`;
    quizContainer.prepend(progressWrapper);

    quizForm.addEventListener('change', () => {
        const answered = quizForm.querySelectorAll('input[type="radio"]:checked').length;
        const percent = (answered / totalQuestions) * 100;
        document.getElementById('quiz-progress').style.width = percent + "%";

        if (answered === totalQuestions) {
            submitBtn.style.background = "#27ae60"; // Turn green when ready!
            submitBtn.innerText = "Ready to Submit! 🚀";
        }
    });

    // --- EXISTING LOGIC ---
    function handleExit(e) {
        if (e) e.preventDefault();
        if (roomId) socket.emit('player-exited', roomId);
        setTimeout(() => {
            window.location.href = `/profile?user=${currentUser}&email=${currentEmail}`;
        }, 100);
    }

    document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'exit-btn') handleExit(e);
    });

    if (roomId && currentUser) {
        socket.emit('init-session', { roomId, username: currentUser });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const topic = meta.getAttribute('data-topic');
            const answered = quizForm.querySelectorAll('input[type="radio"]:checked').length;

            if (answered < totalQuestions) return alert("Finish all questions first!");

            // --- FEATURE: CELEBRATION ---
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#1b5e4b', '#27ae60', '#f1c40f']
            });

            submitBtn.disabled = true;
            submitBtn.innerText = "Grade: Finalizing...";

            let score = 0;
            let results = [];

            document.querySelectorAll('.question-card').forEach((block) => {
                const selected = block.querySelector('input[type="radio"]:checked');
                const options = Array.from(block.querySelectorAll('input[type="radio"]')).map(i => i.value.trim());
                const correctIdx = parseInt(selected.getAttribute('data-correct-index'));
                const userAnswer = selected.value.trim();
                const correctAnswer = options[correctIdx];
                const isCorrect = (userAnswer === correctAnswer);

                if (isCorrect) score++;
                results.push({
                    question: selected.getAttribute('data-question-text'),
                    status: isCorrect,
                    userAnswer: userAnswer,
                    correctAnswer: correctAnswer
                });
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
                            <h2 style="color:#1b5e4b;">Well Done! 🏆</h2>
                            <p style="font-size:1.4rem;">Your Final Score: <strong>${score}/${totalQuestions}</strong></p>
                            <hr><p id="wait-msg">Waiting for other players...</p>
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
                    <span>${index + 1}. <strong>${m.username}</strong> ${m.username === currentUser ? '(You)' : ''}</span>
                    <span style="font-weight:bold; color: ${m.finished ? '#27ae60' : '#e67e22'}">${m.finished ? m.score + ' pts' : '⌛ Thinking...'}</span>
                </li>
            `).join('');

            if (members.every(m => m.finished)) {
                document.getElementById('wait-msg').innerText = "Match Finished!";
                document.getElementById('exit-btn').style.display = "inline-block";
            }
        }
    });

    let conversationHistory = [];

    // Toggle Window
    aiToggle.onclick = () => {
        aiWindow.style.display = (aiWindow.style.display === 'none' || aiWindow.style.display === '') ? 'flex' : 'none';
    };

    closeChat.onclick = () => aiWindow.style.display = 'none';

    // Send Message
    async function sendMessage() {
        const text = aiInput.value.trim();
        if (!text) return;

        appendMessage('You', text, 'user');
        aiInput.value = '';

        const loadingId = 'loading-' + Date.now();
        appendMessage('AI', '...', 'ai', loadingId);

        try {
            const res = await fetch('/ai-ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: text,
                    topic: "Computer Science", // Or your dynamic variable
                    history: conversationHistory
                })
            });

            const data = await res.json();

            // Update history only if answer exists
            if (data.answer) {
                conversationHistory.push({ role: 'user', content: text });
                conversationHistory.push({ role: 'ai', content: data.answer });

                // Use marked for the formatting
                document.getElementById(loadingId).innerHTML = marked.parse(data.answer);
            }
        } catch (err) {
            document.getElementById(loadingId).innerText = "Connection failed.";
        }
    }

    aiSend.onclick = sendMessage;
    aiInput.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };

    function appendMessage(sender, text, type, id = null) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message-row ${type}-msg`;
        if (id) msgDiv.id = id;

        // 1. Create the Label (protected from Markdown)
        const label = document.createElement('strong');
        label.className = 'msg-label';
        label.innerText = `${sender}: `;

        // 2. Create the Content Container
        const content = document.createElement('span');
        content.className = 'msg-content';

        if (text === '...') {
            content.innerHTML = `<span class="typing"><span>.</span><span>.</span><span>.</span></span>`;
        } else {
            // We use marked.parse and put it inside our span
            content.innerHTML = marked.parse(text);
        }

        // 3. Assemble: Label first, then Content
        msgDiv.appendChild(label);
        msgDiv.appendChild(content);

        messageList.appendChild(msgDiv);
        messageList.scrollTop = messageList.scrollHeight;
    }

    // Global functions (for HTML onclicks)
    function resetChat() {
        // 1. Clear the AI's memory (This is the most important part!)
        conversationHistory = [];

        // 2. Clear the visual messages
        const messageList = document.getElementById('ai-message-list');
        if (messageList) {
            messageList.innerHTML = `
            <div class="ai-msg">
                <strong class="msg-label">AI:</strong>
                <span class="msg-content"><p>Chat history cleared! How can I help you with this quiz?</p></span>
            </div>
        `;
        }

        // 3. Clear the input field just in case
        const aiInput = document.getElementById('ai-input');
        if (aiInput) aiInput.value = '';

        console.log("Chat memory has been wiped.");
    }

    window.exportChatToPDF = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let cursorY = 20;

        doc.setFontSize(18);
        doc.text("Quiz AI Tutor - Conversation Log", 15, cursorY);
        cursorY += 15;
        doc.setFontSize(12);

        conversationHistory.forEach(msg => {
            const line = `${msg.role.toUpperCase()}: ${msg.content}`;
            const splitText = doc.splitTextToSize(line, 180);

            // Page break check
            if (cursorY + (splitText.length * 7) > 280) {
                doc.addPage();
                cursorY = 20;
            }

            doc.text(splitText, 15, cursorY);
            cursorY += (splitText.length * 7) + 5;
        });

        doc.save("ai-tutor-session.pdf");
    };
});