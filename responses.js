// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', () => {
    window.location.href = 'login.html';
});

// Function to fetch and display responses
async function loadResponses() {
    try {
        // Add API call to get responses
        // For now using placeholder
        const responsesContainer = document.getElementById('responsesContainer');
        responsesContainer.innerHTML = '<p>No responses found</p>';
    } catch (error) {
        console.error('Error loading responses:', error);
    }
}

// Initialize responses list
loadResponses();
