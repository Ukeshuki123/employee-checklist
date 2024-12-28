// Check if user is logged in
function checkAuth() {
    const username = sessionStorage.getItem('username');
    const role = sessionStorage.getItem('role');
    
    if (!username || !role) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Update UI with user info
function updateUserInfo() {
    const username = sessionStorage.getItem('username');
    const role = sessionStorage.getItem('role');
    const branch = sessionStorage.getItem('branch');
    
    // Update sidebar user info
    document.getElementById('username').textContent = username;
    document.getElementById('role').textContent = role;
    
    // Update welcome message
    document.getElementById('welcomeUser').textContent = username;
    document.getElementById('userBranch').textContent = branch;
}

// Fetch dashboard stats
async function fetchDashboardStats() {
    try {
        // For now, using dummy data
        document.getElementById('totalEmployees').textContent = '25';
        document.getElementById('activeTasks').textContent = '8';
        document.getElementById('completedTasks').textContent = '15';
        
        // Add some dummy recent activity
        const activityLog = document.getElementById('activityLog');
        const activities = [
            { time: '10:30 AM', activity: 'New employee added', status: 'Completed' },
            { time: '09:45 AM', activity: 'Task assigned', status: 'Pending' },
            { time: '09:00 AM', activity: 'Meeting scheduled', status: 'Upcoming' }
        ];
        
        activityLog.innerHTML = activities.map(activity => `
            <tr>
                <td>${activity.time}</td>
                <td>${activity.activity}</td>
                <td>
                    <span class="badge bg-${activity.status === 'Completed' ? 'success' : 
                                         activity.status === 'Pending' ? 'warning' : 'info'}">
                        ${activity.status}
                    </span>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
    }
}

// Handle logout
document.getElementById('logoutBtn').addEventListener('click', function(e) {
    e.preventDefault();
    
    // Clear session storage
    sessionStorage.clear();
    
    // Redirect to login page
    window.location.href = 'login.html';
});

// Initialize dashboard
function initDashboard() {
    if (!checkAuth()) return;
    
    updateUserInfo();
    fetchDashboardStats();
}

// Start the dashboard
document.addEventListener('DOMContentLoaded', initDashboard);
