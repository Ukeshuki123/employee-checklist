// Check if user is logged in
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = 'login.html';
}

// Update welcome message
document.getElementById('userName').textContent = currentUser.username;

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
});

// Function to fetch and update dashboard counts
function updateDashboardCounts() {
    try {
        const employees = JSON.parse(localStorage.getItem('employee_db') || '[]');
        document.getElementById('employeeCount').textContent = employees.length;
        
        // For now, using placeholder data for other counts
        document.getElementById('checklistCount').textContent = '0';
        document.getElementById('responseCount').textContent = '0';
    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}

// Initialize dashboard
updateDashboardCounts();
