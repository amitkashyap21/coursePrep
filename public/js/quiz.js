/**
 * quiz.js
 * Handles live scoring and quiz submission.
 */

document.addEventListener('DOMContentLoaded', () => {
    const quizForm = document.getElementById('quizForm');
    const submitBtn = document.getElementById('submitBtn');
    const meta = document.getElementById('quiz-meta');

    if (submitBtn) {
        submitBtn.addEventListener('click', processQuiz);
    }

    async function processQuiz() {
        const totalQuestions = parseInt(meta.getAttribute('data-total-questions'));
        const topic = meta.getAttribute('data-topic');
        const answered = quizForm.querySelectorAll('input[type="radio"]:checked').length;

        // 1. Validation
        if (answered < totalQuestions) {
            alert(`Please answer all ${totalQuestions} questions before submitting.`);
            return;
        }

        // UI Feedback
        submitBtn.disabled = true;
        submitBtn.innerText = "Calculating Results...";

        let score = 0;
        let results = [];
        const questionBlocks = document.querySelectorAll('.question-card');

        // 2. Scoring Logic
        questionBlocks.forEach((block) => {
            const selectedInput = block.querySelector('input[type="radio"]:checked');
            
            if (selectedInput) {
                const userAnswerText = selectedInput.value.trim();
                const correctIndex = parseInt(selectedInput.getAttribute('data-correct-index'));
                
                // Extract all option texts for this question to find the correct one by index
                const optionsInThisBlock = Array.from(block.querySelectorAll('input[type="radio"]'))
                                                .map(input => input.value.trim());
                
                const correctAnswerText = optionsInThisBlock[correctIndex];
                const isCorrect = (userAnswerText === correctAnswerText);

                if (isCorrect) score++;

                results.push({
                    question: selectedInput.getAttribute('data-question-text'),
                    userAnswer: userAnswerText,
                    correctAnswer: correctAnswerText,
                    status: isCorrect
                });
            }
        });

        // 3. User Identity from URL
        const urlParams = new URLSearchParams(window.location.search);
        const currentUser = urlParams.get('user');
        const currentEmail = urlParams.get('email');

        // 4. Submit to Server
        try {
            const response = await fetch('/submit-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: currentUser,
                    topic: topic,
                    score: score,
                    results: results
                })
            });

            if (response.ok) {
                alert(`Assessment Complete! Score: ${score}/${totalQuestions}`);
                window.location.href = `/profile?user=${currentUser}&email=${currentEmail}`;
            } else {
                throw new Error("Failed to save results.");
            }
        } catch (err) {
            console.error("Submission Error:", err);
            alert("Error: " + err.message);
            submitBtn.disabled = false;
            submitBtn.innerText = "Submit Assessment";
        }
    }
});