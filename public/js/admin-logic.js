async function deleteUser(email, username) {
    if (!confirm(`Are you sure you want to delete ${username}? This will remove all their quiz records.`)) return;

    try {
        const response = await fetch('/api/delete-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username })
        });

        const data = await response.json();

        if (data.success) {
            const rowId = `user-${email.replace(/[@.]/g, '')}`;
            const row = document.getElementById(rowId);
            
            if (row) {
                row.style.transition = 'all 0.4s ease';
                row.style.opacity = '0';
                row.style.transform = 'translateX(30px)';
                
                setTimeout(() => {
                    row.remove();
                }, 400);
            } else {
                // Fallback if ID matching fails
                window.location.reload();
            }
        } else {
            alert('Error: ' + (data.message || 'Could not delete user.'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Connection error. Please try again.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const templateBtn = document.getElementById('downloadTemplate');
    if (templateBtn) {
        templateBtn.addEventListener('click', (e) => {
            const sampleFormat = [
                {
                    "question": "What does CSS stand for?",
                    "options": ["Creative Style Sheets", "Cascading Style Sheets", "Computer Style Sheets", "Colorful Style Sheets"],
                    "answer": 1
                }
            ];
            alert("Upload a .json file using this structure:\n\n" + JSON.stringify(sampleFormat, null, 2));
        });
    }
});