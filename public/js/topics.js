/**
 * topics.js
 * Enhances the topic selection page with dynamic icons and search filtering.
 */

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('topicSearch');
    const topicCards = document.querySelectorAll('.topic-card');

    // 1. Dynamic Icon Mapping
    const iconMap = {
        'java': 'fa-brands fa-java',
        'javascript': 'fa-brands fa-js',
        'node': 'fa-brands fa-node-js',
        'cpp': 'fa-solid fa-c',
        'python': 'fa-brands fa-python',
        'sql': 'fa-solid fa-database',
        'html': 'fa-brands fa-html5',
        'css': 'fa-brands fa-css3-alt',
        'dsa': 'fa-solid fa-tree' // For Data Structures/Algorithms
    };

    topicCards.forEach(card => {
        const name = card.getAttribute('data-topic-name');
        const iconElement = card.querySelector('.topic-icon i');

        // Check if we have a specific icon for this topic
        for (const [key, value] of Object.entries(iconMap)) {
            if (name.includes(key)) {
                iconElement.className = value;
                break;
            }
        }
    });

    // 2. Live Search Filtering
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();

            topicCards.forEach(card => {
                const topicName = card.getAttribute('data-topic-name');
                if (topicName.includes(term)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }
});