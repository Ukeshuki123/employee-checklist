// Initialize page when loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Set user info
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');
    document.getElementById('username').textContent = username;
    document.getElementById('role').textContent = role;

    // Load initial data
    await loadQuestions();
    await loadResponses();

    // Add event listeners
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('sectionFilter').addEventListener('change', filterResponses);
    document.getElementById('statusFilter').addEventListener('change', filterResponses);
});

// Load checklist questions
async function loadQuestions() {
    try {
        const response = await fetch('/api/checklist/questions');
        const data = await response.json();

        if (data.success) {
            const container = document.getElementById('questionsContainer');
            let currentSection = '';

            data.questions.forEach(question => {
                if (question.section !== currentSection) {
                    currentSection = question.section;
                    container.appendChild(createSectionHeader(currentSection));
                }
                container.appendChild(createQuestionCard(question));
            });

            // Update section filter
            updateSectionFilter(data.questions);
        }
    } catch (error) {
        console.error('Error loading questions:', error);
        showAlert('Failed to load questions. Please try again.', 'danger');
    }
}

// Create section header
function createSectionHeader(section) {
    const header = document.createElement('div');
    header.className = 'h5 mt-4 mb-3';
    header.textContent = section;
    return header;
}

// Create question card
function createQuestionCard(question) {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.innerHTML = `
        <div class="question-text mb-3">${question.question}</div>
        <div class="response-options">
            <button type="button" class="response-btn yes" onclick="submitResponse(${question.id}, 'completed')">
                <i class="fas fa-check"></i> Complete
            </button>
            <button type="button" class="response-btn pending" onclick="submitResponse(${question.id}, 'in_progress')">
                <i class="fas fa-clock"></i> In Progress
            </button>
            <button type="button" class="response-btn no" onclick="submitResponse(${question.id}, 'pending')">
                <i class="fas fa-times"></i> Pending
            </button>
        </div>
    `;
    return card;
}

// Submit response
async function submitResponse(questionId, status) {
    try {
        const response = await fetch('/api/checklist/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                questionId,
                employeeId: localStorage.getItem('userId'),
                response: status,
                status
            })
        });

        const data = await response.json();
        if (data.success) {
            showAlert('Response submitted successfully', 'success');
            await loadResponses();
        } else {
            showAlert(data.message || 'Failed to submit response', 'danger');
        }
    } catch (error) {
        console.error('Error submitting response:', error);
        showAlert('Failed to submit response. Please try again.', 'danger');
    }
}

// Load responses
async function loadResponses() {
    try {
        const response = await fetch('/api/checklist/responses');
        const data = await response.json();

        if (data.success) {
            displayResponses(data.responses);
        }
    } catch (error) {
        console.error('Error loading responses:', error);
        showAlert('Failed to load responses. Please try again.', 'danger');
    }
}

// Display responses
function displayResponses(responses) {
    const container = document.getElementById('responsesContainer');
    container.innerHTML = '';

    if (responses.length === 0) {
        container.innerHTML = '<p class="text-muted">No responses yet.</p>';
        return;
    }

    responses.forEach(response => {
        const card = document.createElement('div');
        card.className = 'card mb-3';
        card.innerHTML = `
            <div class="card-body">
                <h6 class="card-title">${response.question}</h6>
                <p class="card-text">
                    <span class="badge bg-${getStatusBadgeClass(response.status)}">${response.status}</span>
                    <small class="text-muted ms-2">Updated: ${new Date(response.created_at).toLocaleString()}</small>
                </p>
            </div>
        `;
        container.appendChild(card);
    });
}

// Update section filter
function updateSectionFilter(questions) {
    const filter = document.getElementById('sectionFilter');
    const sections = [...new Set(questions.map(q => q.section))];
    
    sections.forEach(section => {
        const option = document.createElement('option');
        option.value = section;
        option.textContent = section;
        filter.appendChild(option);
    });
}

// Filter responses
function filterResponses() {
    const section = document.getElementById('sectionFilter').value;
    const status = document.getElementById('statusFilter').value;
    
    const cards = document.querySelectorAll('.question-card');
    cards.forEach(card => {
        const cardSection = card.closest('.section')?.querySelector('.h5')?.textContent;
        const cardStatus = card.querySelector('.badge')?.textContent;
        
        const matchesSection = !section || cardSection === section;
        const matchesStatus = !status || cardStatus === status;
        
        card.style.display = matchesSection && matchesStatus ? '' : 'none';
    });
}

// Get status badge class
function getStatusBadgeClass(status) {
    switch (status) {
        case 'completed': return 'success';
        case 'in_progress': return 'warning';
        case 'pending': return 'danger';
        default: return 'secondary';
    }
}

// Show alert message
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const content = document.querySelector('.content');
    content.insertBefore(alertDiv, content.firstChild);
    
    setTimeout(() => alertDiv.remove(), 5000);
}

// Logout function
function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}
