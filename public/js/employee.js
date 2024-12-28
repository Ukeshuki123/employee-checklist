// Load login history
async function loadLoginHistory() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/login-history', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            const tbody = document.getElementById('loginHistoryBody');
            tbody.innerHTML = '';

            data.history.forEach(entry => {
                const row = document.createElement('tr');
                
                // Format date
                const loginDate = new Date(entry.login_time);
                const formattedDate = loginDate.toLocaleString();
                
                // Format device info
                const userAgent = entry.user_agent;
                let deviceInfo = 'Unknown';
                
                if (userAgent.includes('Mobile')) {
                    deviceInfo = 'Mobile';
                } else if (userAgent.includes('Tablet')) {
                    deviceInfo = 'Tablet';
                } else if (userAgent.includes('Windows')) {
                    deviceInfo = 'Windows PC';
                } else if (userAgent.includes('Mac')) {
                    deviceInfo = 'Mac';
                } else if (userAgent.includes('Linux')) {
                    deviceInfo = 'Linux';
                }

                row.innerHTML = `
                    <td>${entry.username}</td>
                    <td><span class="badge bg-${getRoleBadgeClass(entry.role)}">${entry.role}</span></td>
                    <td>${formattedDate}</td>
                    <td>${deviceInfo}</td>
                    <td>${entry.ip_address}</td>
                `;

                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading login history:', error);
        showAlert('Error loading login history', 'danger');
    }
}

// Get badge class based on role
function getRoleBadgeClass(role) {
    switch (role?.toLowerCase()) {
        case 'admin':
            return 'danger';
        case 'management':
            return 'warning';
        case 'regular':
            return 'info';
        default:
            return 'secondary';
    }
}

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
    
    document.getElementById('username').textContent = username;
    document.getElementById('role').textContent = role;
}

// Create employee card
function createEmployeeCard(employee) {
    return `
        <div class="col-md-4 col-sm-6 mb-4">
            <div class="card employee-card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-user-circle text-primary"></i> ${employee.username}
                        </h5>
                        <div class="dropdown">
                            <button class="btn btn-link" data-bs-toggle="dropdown">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li>
                                    <a class="dropdown-item" href="#" onclick="editEmployee(${employee.id})">
                                        <i class="fas fa-edit text-primary"></i> Edit
                                    </a>
                                </li>
                                <li>
                                    <a class="dropdown-item" href="#" onclick="deleteEmployee(${employee.id})">
                                        <i class="fas fa-trash text-danger"></i> Delete
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <p class="card-text">
                        <span class="badge bg-primary">${employee.role}</span>
                        <span class="badge bg-secondary">${employee.branchname}</span>
                    </p>
                </div>
            </div>
        </div>
    `;
}

// Load employees
async function loadEmployees() {
    try {
        document.getElementById('loadingSpinner').classList.remove('d-none');
        
        const response = await fetch('/api/employees');
        const data = await response.json();
        
        if (data.success) {
            const employeeList = document.getElementById('employeeList');
            employeeList.innerHTML = data.employees.map(emp => createEmployeeCard(emp)).join('');

            // Update branch filter with unique branches
            const branchFilter = document.getElementById('filterBranch');
            const branches = [...new Set(data.employees.map(emp => emp.branchname))];
            branchFilter.innerHTML = `
                <option value="">All Branches</option>
                ${branches.map(branch => `<option value="${branch}">${branch}</option>`).join('')}
            `;
        } else {
            showAlert('Error loading employees: ' + data.message, 'danger');
        }
        
    } catch (error) {
        console.error('Error loading employees:', error);
        showAlert('Error loading employees', 'danger');
    } finally {
        document.getElementById('loadingSpinner').classList.add('d-none');
    }
}

// Handle form submissions
document.getElementById('addEmployeeForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(this);
    const employeeData = {
        username: formData.get('username'),
        password: formData.get('password'),
        role: formData.get('role'),
        branch: formData.get('branch')
    };

    try {
        const response = await fetch('/api/employees', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(employeeData)
        });

        const data = await response.json();

        if (data.success) {
            // Show success message
            showAlert('Employee added successfully!', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addEmployeeModal'));
            if (modal) {
                modal.hide();
            }
            
            // Reset form
            this.reset();
            
            // Refresh employee list
            await loadEmployees();
        } else {
            showAlert(data.message || 'Error adding employee', 'danger');
        }
    } catch (error) {
        console.error('Error adding employee:', error);
        showAlert('Error adding employee. Please try again.', 'danger');
    }
});

// Edit employee
async function editEmployee(id) {
    try {
        const response = await fetch('/api/employees');
        const data = await response.json();
        
        if (data.success) {
            const employee = data.employees.find(emp => emp.id === id);
            if (employee) {
                // Fill form with employee data
                const form = document.getElementById('editEmployeeForm');
                form.querySelector('[name="id"]').value = employee.id;
                form.querySelector('[name="username"]').value = employee.username;
                form.querySelector('[name="role"]').value = employee.role;
                form.querySelector('[name="branch"]').value = employee.branchname;
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('editEmployeeModal'));
                modal.show();
            }
        }
        
    } catch (error) {
        console.error('Error editing employee:', error);
        showAlert('Error editing employee', 'danger');
    }
}

// Update employee
async function updateEmployee(formData) {
    try {
        const id = formData.get('id');
        const response = await fetch(`/api/employees/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: formData.get('username'),
                role: formData.get('role'),
                branch: formData.get('branch')
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Employee updated successfully!', 'success');
            loadEmployees();
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editEmployeeModal'));
            modal.hide();
        } else {
            showAlert(data.message || 'Error updating employee', 'danger');
        }
        
    } catch (error) {
        console.error('Error updating employee:', error);
        showAlert('Error updating employee', 'danger');
    }
}

// Delete employee
async function deleteEmployee(id) {
    if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) return;
    
    try {
        const response = await fetch(`/api/employees/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Employee deleted successfully!', 'success');
            loadEmployees();
        } else {
            showAlert(data.message || 'Error deleting employee', 'danger');
        }
        
    } catch (error) {
        console.error('Error deleting employee:', error);
        showAlert('Error deleting employee', 'danger');
    }
}

// Show alert message
function showAlert(message, type = 'info') {
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    const alertPlaceholder = document.createElement('div');
    alertPlaceholder.innerHTML = alertHtml;
    document.querySelector('.content').insertBefore(alertPlaceholder.firstChild, document.querySelector('.content').firstChild);
    
    // Auto dismiss after 3 seconds
    setTimeout(() => {
        const alert = document.querySelector('.alert');
        if (alert) {
            alert.remove();
        }
    }, 3000);
}

document.getElementById('editEmployeeForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    updateEmployee(formData);
});

// Handle logout
document.getElementById('logoutBtn')?.addEventListener('click', function(e) {
    e.preventDefault();
    sessionStorage.clear();
    window.location.href = 'login.html';
});

// Search functionality
document.getElementById('searchEmployee')?.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.employee-card');
    
    cards.forEach(card => {
        const username = card.querySelector('.card-title').textContent.toLowerCase();
        const role = card.querySelector('.badge.bg-primary').textContent.toLowerCase();
        const branch = card.querySelector('.badge.bg-secondary').textContent.toLowerCase();
        
        if (username.includes(searchTerm) || role.includes(searchTerm) || branch.includes(searchTerm)) {
            card.closest('.col-md-4').style.display = '';
        } else {
            card.closest('.col-md-4').style.display = 'none';
        }
    });
});

// Filter functionality
['filterBranch', 'filterRole'].forEach(filterId => {
    document.getElementById(filterId)?.addEventListener('change', function() {
        const branchFilter = document.getElementById('filterBranch').value.toLowerCase();
        const roleFilter = document.getElementById('filterRole').value.toLowerCase();
        
        const cards = document.querySelectorAll('.employee-card');
        
        cards.forEach(card => {
            const role = card.querySelector('.badge.bg-primary').textContent.toLowerCase();
            const branch = card.querySelector('.badge.bg-secondary').textContent.toLowerCase();
            
            const matchesBranch = !branchFilter || branch === branchFilter;
            const matchesRole = !roleFilter || role === roleFilter;
            
            card.closest('.col-md-4').style.display = (matchesBranch && matchesRole) ? '' : 'none';
        });
    });
});

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth()) return;
    updateUserInfo();
    loadEmployees();
    
    // Refresh login history every 5 minutes
    setInterval(loadLoginHistory, 300000);
});
