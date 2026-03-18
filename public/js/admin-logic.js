/**
 * admin-logic.js
 * Handles User Management and Question Bank updates
 */

/**
 * Global function for deleting users
 * Matches the logic used in admin.ejs
 */
async function deleteUser(email, username) {
    // 1. Confirm with the admin
    if (!confirm(`Are you sure you want to delete ${username}? This will remove all their quiz records.`)) {
        return;
    }

    try {
        // 2. Fetch request to the backend
        const response = await fetch('/api/delete-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username })
        });

        const data = await response.json();

        if (data.success) {
            // 3. Match the ID generation logic from admin.ejs
            // This removes special characters to match the row's ID
            const rowId = `user-${email.replace(/[@.]/g, '')}`;
            const row = document.getElementById(rowId);
            
            if (row) {
                // Apply the "Slide & Fade" effect
                row.style.transition = 'all 0.4s ease';
                row.style.opacity = '0';
                row.style.transform = 'translateX(30px)';
                
                // Remove from DOM after animation finishes
                setTimeout(() => {
                    row.remove();
                }, 400);
            } else {
                // Fallback: if we can't find the row, just refresh to show updated list
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
    // 4. Sample Format Alert
    // Note: ID changed to 'viewSampleBtn' to match the updated EJS
    const templateBtn = document.getElementById('viewSampleBtn') || document.getElementById('downloadTemplate');
    
    if (templateBtn) {
        templateBtn.addEventListener('click', () => {
            const sampleFormat = [
                {
                    "question": "What does CSS stand for?",
                    "options": [
                        "Creative Style Sheets", 
                        "Cascading Style Sheets", 
                        "Computer Style Sheets", 
                        "Colorful Style Sheets"
                    ],
                    "answer": 1
                }
            ];
            
            // Using a template literal for better readability in the alert
            const alertMsg = "Upload a .json file using this structure:\n\n" + 
                           JSON.stringify(sampleFormat, null, 2) + 
                           "\n\nNote: 'answer' is the 0-based index of the correct option.";
            
            alert(alertMsg);
        });
    }
});