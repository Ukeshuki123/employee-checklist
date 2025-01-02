// Initialize checklist data in localStorage if not exists
if (!localStorage.getItem('checklist_db')) {
    localStorage.setItem('checklist_db', JSON.stringify([]));
}

// Check if user is logged in
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = 'login.html';
}

// Form elements
const checklistForm = document.getElementById('checklistForm');
const addChecklistBtn = document.getElementById('addChecklistBtn');
const cancelBtn = document.getElementById('cancelBtn');
const addChecklistFormElement = document.getElementById('addChecklistForm');

// Show/Hide form handlers
addChecklistBtn.addEventListener('click', () => {
    checklistForm.style.display = 'block';
});

cancelBtn.addEventListener('click', () => {
    checklistForm.style.display = 'none';
    addChecklistFormElement.reset();
});

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
});

// Handle form submission
addChecklistFormElement.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const checklist = {
        id: Date.now(),
        title: document.getElementById('checklistTitle').value,
        questions: document.getElementById('checklistQuestions').value
            .split('\n')
            .filter(question => question.trim() !== ''),
        createdBy: currentUser.username,
        createdAt: new Date().toISOString(),
    };

    // Get existing checklists
    const checklists = JSON.parse(localStorage.getItem('checklist_db'));
    
    // Add new checklist
    checklists.push(checklist);
    localStorage.setItem('checklist_db', JSON.stringify(checklists));

    // Reset and hide form
    addChecklistFormElement.reset();
    checklistForm.style.display = 'none';

    // Refresh checklist display
    loadChecklists();
    alert('Checklist added successfully!');
});

// Function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Function to fetch and display checklists
function loadChecklists() {
    const checklists = JSON.parse(localStorage.getItem('checklist_db'));
    const checklistContainer = document.getElementById('checklistContainer');
    
    if (checklists.length === 0) {
        checklistContainer.innerHTML = '<p>No checklists found</p>';
        return;
    }

    const html = checklists.map(checklist => `
        <div class="checklist-item">
            <h3>
                ${checklist.title}
                <span class="timestamp">Created by ${checklist.createdBy} on ${formatDate(checklist.createdAt)}</span>
            </h3>
            <ul class="question-list">
                ${checklist.questions.map((question, index) => `
                    <li>${index + 1}. ${question}</li>
                `).join('')}
            </ul>
        </div>
    `).join('');

    checklistContainer.innerHTML = html;
}

// Initialize checklist display
loadChecklists();
