// Check if user is logged in
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token) {
    window.location.href = '/';
}

// Display username
document.getElementById('username').textContent = user.username || 'User';

// Fetch checklists
async function fetchChecklists() {
    try {
        const response = await fetch('http://127.0.0.1:3009/api/checklists', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayChecklists(data.checklists);
        } else {
            console.error('Failed to fetch checklists');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Display checklists
function displayChecklists(checklists) {
    const container = document.getElementById('checklists-container');
    container.innerHTML = '';

    if (checklists.length === 0) {
        container.innerHTML = '<p>No checklists available.</p>';
        return;
    }

    checklists.forEach(checklist => {
        const div = document.createElement('div');
        div.className = 'checklist-item';
        div.innerHTML = `
            <h3>${checklist.title}</h3>
            <p>${checklist.description || ''}</p>
            <button onclick="viewChecklist(${checklist.id})">View Checklist</button>
        `;
        container.appendChild(div);
    });
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// Initial load
fetchChecklists();
