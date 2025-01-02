// Check if user is logged in
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = '/login';
}

// Form elements
const employeeForm = document.getElementById('employeeForm');
const addEmployeeBtn = document.getElementById('addEmployeeBtn');
const cancelBtn = document.getElementById('cancelBtn');
const addEmployeeFormElement = document.getElementById('addEmployeeForm');

// Show/Hide form handlers
addEmployeeBtn.addEventListener('click', () => {
    employeeForm.style.display = 'block';
});

cancelBtn.addEventListener('click', () => {
    employeeForm.style.display = 'none';
    addEmployeeFormElement.reset();
});

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    window.location.href = '/login';
});

// Handle form submission
addEmployeeFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const employee = {
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
        branchName: document.getElementById('branchName').value,
        roleName: document.getElementById('roleName').value
    };

    try {
        const response = await fetch('/api/employees', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(employee)
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Error adding employee');
        }

        const data = await response.json();

        // Reset and hide form
        addEmployeeFormElement.reset();
        employeeForm.style.display = 'none';

        // Refresh employee list
        loadEmployees();
        alert('Employee added successfully!');
    } catch (error) {
        console.error('Error adding employee:', error);
        alert(error.message || 'Error adding employee. Please try again.');
    }
});

// Function to fetch and display employees
async function loadEmployees() {
    try {
        const response = await fetch('/api/employees');
        if (!response.ok) {
            throw new Error('Failed to fetch employees');
        }
        
        const employees = await response.json();
        const employeeList = document.getElementById('employeeList');
        
        if (employees.length === 0) {
            employeeList.innerHTML = '<p>No employees found</p>';
            return;
        }

        const html = employees.map(emp => `
            <div class="employee-card">
                <h3>${emp.username}</h3>
                <p>Branch: ${emp.branchName}</p>
                <p>Role: ${emp.roleName}</p>
            </div>
        `).join('');

        employeeList.innerHTML = html;
    } catch (error) {
        console.error('Error loading employees:', error);
        document.getElementById('employeeList').innerHTML = 
            '<p>Error loading employees. Please try again later.</p>';
    }
}

// Initialize employee list
loadEmployees();
