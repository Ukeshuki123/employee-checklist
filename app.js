const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'", "*"],
            fontSrc: ["'self'", "https:", "http:", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    maxAge: 86400
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Root route - redirect to login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dashboard route
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Database connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Uki@12345',
    database: process.env.DB_NAME || 'employee_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Middleware to check authentication
const checkAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, 'your-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// Middleware to check role permissions
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        if (allowedRoles.includes(req.user.role.toLowerCase())) {
            next();
        } else {
            res.status(403).json({ success: false, message: 'Access denied' });
        }
    };
};

// Authenticate token middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });

    jwt.verify(token, 'your-secret-key', (err, user) => {
        if (err) return res.status(403).json({ success: false, message: 'Access denied. Invalid token.' });
        req.user = user;
        next();
    });
}

// Initialize database
async function initDatabase() {
    try {
        // Check if tables exist
        const [tables] = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'employee_db'
        `);
        const existingTables = tables.map(t => t.TABLE_NAME);

        // Create tables only if they don't exist
        if (!existingTables.includes('employees')) {
            await pool.query(`
                CREATE TABLE employees (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(50) NOT NULL UNIQUE,
                    password VARCHAR(255) NOT NULL,
                    role VARCHAR(20) NOT NULL DEFAULT 'employee',
                    branchname VARCHAR(100) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('Created employees table');

            // Insert default admin user only if table was just created
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await pool.query(
                'INSERT INTO employees (username, password, role, branchname) VALUES (?, ?, ?, ?)',
                ['admin', hashedPassword, 'admin', 'Head Office']
            );
            console.log('Created admin user');
        }

        if (!existingTables.includes('login_history')) {
            await pool.query(`
                CREATE TABLE login_history (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    employee_id INT NOT NULL,
                    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
                )
            `);
            console.log('Created login_history table');
        }

        if (!existingTables.includes('checklist_questions')) {
            await pool.query(`
                CREATE TABLE checklist_questions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    section VARCHAR(50) NOT NULL,
                    question_text TEXT NOT NULL,
                    question_type VARCHAR(20) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('Created checklist_questions table');
        }

        if (!existingTables.includes('checklist_responses')) {
            await pool.query(`
                CREATE TABLE checklist_responses (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    employee_id INT NOT NULL,
                    question_id INT NOT NULL,
                    answer_text TEXT,
                    answer_status VARCHAR(20) NOT NULL DEFAULT 'pending',
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
                    FOREIGN KEY (question_id) REFERENCES checklist_questions(id) ON DELETE CASCADE
                )
            `);
            console.log('Created checklist_responses table');
        }

        console.log('Database initialization completed');
        return true;
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

// Initialize checklist questions
async function initializeQuestions() {
    try {
        // Check if questions already exist
        const [existingQuestions] = await pool.query('SELECT COUNT(*) as count FROM checklist_questions');
        
        // Only add sample questions if none exist
        if (existingQuestions[0].count === 0) {
            console.log('Adding sample checklist questions...');
            await pool.query(`
                INSERT INTO checklist_questions (section, question_text, question_type) VALUES
                ('Kitchen', 'Is the kitchen clean?', 'mcq'),
                ('Kitchen', 'Are all appliances working?', 'mcq'),
                ('Kitchen', 'List any maintenance needs:', 'written'),
                ('Cafe', 'Is the seating area clean?', 'mcq'),
                ('Cafe', 'Are all tables properly set?', 'mcq'),
                ('Cafe', 'Note any customer feedback:', 'written')
            `);
            console.log('Sample questions created');
        } else {
            console.log('Checklist questions already exist, skipping initialization');
        }
        return true;
    } catch (error) {
        console.error('Error initializing questions:', error);
        throw error;
    }
}

// Initialize database and questions
async function initializeAll() {
    try {
        console.log('Starting database initialization...');
        await initDatabase();
        console.log('Database initialized, checking questions...');
        await initializeQuestions();
        console.log('All initialization completed successfully');
    } catch (error) {
        console.error('Initialization failed:', error);
        process.exit(1);
    }
}

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const [users] = await pool.query(
            'SELECT * FROM employees WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            username: user.username,
            role: user.role
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Protected routes with role-based access
app.get('/api/employees', checkAuth, checkRole(['admin', 'manager']), async (req, res) => {
    try {
        const [employees] = await pool.query(`
            SELECT id, username, branchname, role, created_at 
            FROM employees 
            ORDER BY created_at DESC
        `);

        res.json({ 
            success: true, 
            employees: employees.map(emp => ({
                ...emp,
                created_at: new Date(emp.created_at).toISOString()
            }))
        });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching employees: ' + error.message 
        });
    }
});

// Only admin can delete employees
app.delete('/api/employees/:id', checkAuth, checkRole(['admin']), async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM employees WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }
        res.json({ success: true, message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ success: false, message: 'Error deleting employee' });
    }
});

// Only admin and manager can add employees
app.post('/api/employees', checkAuth, checkRole(['admin', 'manager']), async (req, res) => {
    try {
        const { username, password, branchname, role } = req.body;

        // Only admin can create admin users
        if (role.toLowerCase() === 'admin' && req.user.role.toLowerCase() !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Only admin can create admin users' 
            });
        }

        // Validate input
        if (!username || !password || !branchname || !role) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const [result] = await pool.query(
            'INSERT INTO employees (username, password, branchname, role) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, branchname, role]
        );

        res.status(201).json({ 
            success: true, 
            message: 'Employee added successfully',
            employeeId: result.insertId
        });
    } catch (error) {
        console.error('Error adding employee:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error adding employee: ' + error.message 
        });
    }
});

// Checklist responses - admin can view all, others can only view their own
app.get('/api/checklist/responses', checkAuth, async (req, res) => {
    try {
        // Get all responses with user and question details
        const [responses] = await pool.query(`
            SELECT 
                cr.id,
                cr.question_id,
                cr.answer_text,
                cr.answer_status,
                cr.timestamp,
                e.username,
                e.branchname,
                cq.question_text,
                cq.section
            FROM checklist_responses cr
            JOIN employees e ON cr.employee_id = e.id
            JOIN checklist_questions cq ON cr.question_id = cq.id
            ORDER BY cr.id DESC
        `);

        // Get unique users and branches for filters
        const [users] = await pool.query(`
            SELECT DISTINCT e.username, e.branchname 
            FROM checklist_responses cr
            JOIN employees e ON cr.employee_id = e.id
            ORDER BY e.username
        `);

        // Get unique sections for filter
        const [sections] = await pool.query(`
            SELECT DISTINCT section 
            FROM checklist_questions
            ORDER BY section
        `);
        
        res.json({ 
            success: true, 
            responses: responses.map(resp => ({
                id: resp.id,
                username: resp.username,
                branchname: resp.branchname,
                question_id: resp.question_id,
                question_text: resp.question_text,
                section: resp.section,
                answer_text: resp.answer_text,
                answer_status: resp.answer_status,
                timestamp: resp.timestamp || new Date().toISOString()
            })),
            filters: {
                users: users,
                sections: sections.map(s => s.section)
            }
        });
    } catch (error) {
        console.error('Error fetching responses:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching responses: ' + error.message 
        });
    }
});

// Delete checklist response (admin only)
app.delete('/api/checklist/responses/:id', checkAuth, checkRole(['admin']), async (req, res) => {
    try {
        // Get response details first for logging
        const [response] = await pool.query(
            'SELECT * FROM checklist_responses WHERE id = ?',
            [req.params.id]
        );

        if (response.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Response not found' 
            });
        }

        // Delete the response
        const [result] = await pool.query(
            'DELETE FROM checklist_responses WHERE id = ?',
            [req.params.id]
        );

        // Log the deletion
        console.log(`Response deleted by admin (${req.user.username}):`, {
            responseId: req.params.id,
            responseDetails: response[0]
        });

        res.json({ 
            success: true, 
            message: 'Response deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting response:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error deleting response: ' + error.message 
        });
    }
});

// Submit checklist response
app.post('/api/checklist/submit', authenticateToken, async (req, res) => {
    try {
        const { responses } = req.body;
        const employeeId = req.user.id;

        // Insert each response
        for (const response of responses) {
            await pool.query(`
                INSERT INTO checklist_responses 
                (employee_id, question_id, answer_text, answer_status)
                VALUES (?, ?, ?, ?)
            `, [
                employeeId,
                response.question_id,
                response.answer_text,
                response.answer_status || 'pending'
            ]);
        }

        res.json({
            success: true,
            message: 'Checklist submitted successfully'
        });
    } catch (error) {
        console.error('Error submitting checklist:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit checklist',
            error: error.message
        });
    }
});

// Get all employees
app.get('/api/employees', async (req, res) => {
    try {
        console.log('Fetching employees...');
        const [employees] = await pool.query(`
            SELECT id, username, branchname, role, created_at 
            FROM employees 
            ORDER BY created_at DESC
        `);

        console.log('Found employees:', employees);

        res.json({ 
            success: true, 
            employees: employees.map(emp => ({
                ...emp,
                created_at: new Date(emp.created_at).toISOString()
            }))
        });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching employees: ' + error.message 
        });
    }
});

// Update employee
app.put('/api/employees/:id', async (req, res) => {
    try {
        console.log('Updating employee:', req.params.id, req.body);
        const { id } = req.params;
        const { username, branchname, role } = req.body;

        // Check if username exists for other employees
        const [existing] = await pool.query(
            'SELECT id FROM employees WHERE username = ? AND id != ?',
            [username, id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Username already exists' });
        }

        // Update employee
        await pool.query(
            'UPDATE employees SET username = ?, branchname = ?, role = ? WHERE id = ?',
            [username, branchname, role, id]
        );

        console.log('Employee updated successfully');

        res.json({ success: true, message: 'Employee updated successfully' });
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ success: false, message: 'Error updating employee' });
    }
});

// Delete employee
app.delete('/api/employees/:id', async (req, res) => {
    try {
        console.log('Deleting employee:', req.params.id);
        const { id } = req.params;
        await pool.query('DELETE FROM employees WHERE id = ?', [id]);
        console.log('Employee deleted successfully');
        res.json({ success: true, message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ success: false, message: 'Error deleting employee' });
    }
});

// Checklist Routes
// Get checklist questions
app.get('/api/checklist/questions', authenticateToken, async (req, res) => {
    try {
        const [questions] = await pool.query(`
            SELECT id, section, question_text, question_type
            FROM checklist_questions
            ORDER BY section, id
        `);

        res.json({
            success: true,
            questions: questions
        });
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch questions'
        });
    }
});

// Get all checklist responses
app.get('/api/checklist/responses', async (req, res) => {
    try {
        const [responses] = await pool.query(`
            SELECT 
                cr.id,
                cr.question_id,
                cr.answer_text,
                cr.answer_status,
                cr.created_at as timestamp,
                cq.section,
                cq.question_text,
                e.username,
                e.branchname as branch
            FROM checklist_responses cr
            JOIN checklist_questions cq ON cr.question_id = cq.id
            JOIN employees e ON cr.employee_id = e.id
            ORDER BY cr.created_at DESC
        `);
        
        res.json({ success: true, responses });
    } catch (error) {
        console.error('Error getting responses:', error);
        res.status(500).json({ success: false, message: 'Error getting responses' });
    }
});

// Get all responses with user details
app.get('/api/checklist/all-responses', async (req, res) => {
    try {
        const [responses] = await pool.query(`
            SELECT 
                cr.id as response_id,
                cr.question_id,
                cq.question_text,
                cq.section,
                cq.question_type,
                cr.answer_text,
                cr.answer_status,
                DATE_FORMAT(cr.created_at, '%Y-%m-%d %H:%i:%s') as timestamp,
                e.username,
                e.branchname
            FROM checklist_responses cr
            JOIN checklist_questions cq ON cr.question_id = cq.id
            JOIN employees e ON cr.employee_id = e.id
            ORDER BY cr.created_at DESC, cq.section, cq.id
        `);
        
        // Group responses by submission time for better organization
        const groupedResponses = responses.reduce((acc, response) => {
            const key = response.timestamp;
            if (!acc[key]) {
                acc[key] = {
                    timestamp: response.timestamp,
                    username: response.username,
                    branchname: response.branchname,
                    responses: []
                };
            }
            acc[key].responses.push({
                section: response.section,
                question_type: response.question_type,
                question_text: response.question_text,
                answer_text: response.answer_text,
                answer_status: response.answer_status
            });
            return acc;
        }, {});

        res.json({ 
            success: true, 
            responses: responses,
            groupedResponses: Object.values(groupedResponses)
        });
    } catch (error) {
        console.error('Error getting responses:', error);
        res.status(500).json({ success: false, message: 'Error getting responses' });
    }
});

// Submit checklist responses
app.post('/api/checklist/submit', async (req, res) => {
    try {
        const { responses } = req.body;
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }

        // Get employee ID from token
        const decoded = jwt.verify(token, 'your-secret-key');
        const employeeId = decoded.userId;

        // Insert each response
        for (const response of responses) {
            await pool.query(`
                INSERT INTO checklist_responses 
                (employee_id, question_id, answer_text, answer_status)
                VALUES (?, ?, ?, ?)
            `, [
                employeeId,
                response.question_id,
                response.answer_text,
                response.answer_status || 'pending'
            ]);
        }

        res.json({ success: true, message: 'Responses submitted successfully' });
    } catch (error) {
        console.error('Error submitting responses:', error);
        res.status(500).json({ success: false, message: 'Error submitting responses' });
    }
});

// Get latest responses for each question
app.get('/api/checklist/latest-responses', async (req, res) => {
    try {
        const [responses] = await pool.query(`
            SELECT 
                cr.question_id,
                cr.answer_text,
                cr.answer_status,
                cr.created_at as timestamp,
                cq.question_text,
                cq.section,
                cq.question_type
            FROM checklist_responses cr
            INNER JOIN (
                SELECT question_id, MAX(created_at) as max_timestamp
                FROM checklist_responses
                GROUP BY question_id
            ) latest ON cr.question_id = latest.question_id AND cr.created_at = latest.max_timestamp
            JOIN checklist_questions cq ON cr.question_id = cq.id
            ORDER BY cq.section, cq.id
        `);
        
        res.json({ success: true, responses });
    } catch (error) {
        console.error('Error getting latest responses:', error);
        res.status(500).json({ success: false, message: 'Error getting latest responses' });
    }
});

// Delete checklist response (admin only)
app.delete('/api/checklist/responses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM checklist_responses WHERE id = ?', [id]);
        res.json({ success: true, message: 'Response deleted successfully' });
    } catch (error) {
        console.error('Error deleting response:', error);
        res.status(500).json({ success: false, message: 'Error deleting response' });
    }
});

// Get checklist statistics
app.get('/api/checklist/stats', async (req, res) => {
    try {
        const [stats] = await pool.query(`
            SELECT 
                SUM(CASE WHEN answer_status = 'yes' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN answer_status IN ('no', 'pending') THEN 1 ELSE 0 END) as pending
            FROM checklist_responses
        `);
        
        res.json({ 
            success: true, 
            completed: stats[0].completed || 0,
            pending: stats[0].pending || 0
        });
    } catch (error) {
        console.error('Error getting statistics:', error);
        res.status(500).json({ success: false, message: 'Error getting statistics' });
    }
});

// Get checklist questions with latest responses
app.get('/api/checklist/questions-with-responses', async (req, res) => {
    try {
        const [questions] = await pool.query(`
            SELECT 
                q.*,
                COALESCE(r.answer_text, '') as latest_answer_text,
                COALESCE(r.answer_status, '') as latest_answer_status,
                r.created_at as last_updated
            FROM checklist_questions q
            LEFT JOIN (
                SELECT cr.*
                FROM checklist_responses cr
                INNER JOIN (
                    SELECT question_id, MAX(created_at) as max_time
                    FROM checklist_responses
                    GROUP BY question_id
                ) latest ON cr.question_id = latest.question_id 
                AND cr.created_at = latest.max_time
            ) r ON q.id = r.question_id
            ORDER BY q.section, q.question_type DESC, q.id
        `);
        
        res.json({ success: true, questions });
    } catch (error) {
        console.error('Error getting questions with responses:', error);
        res.status(500).json({ success: false, message: 'Error getting questions' });
    }
});

// Get statistics
app.get('/api/statistics', async (req, res) => {
    try {
        const [stats] = await pool.query(`
            SELECT 
                SUM(CASE WHEN answer_status = 'yes' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN answer_status IN ('no', 'pending') THEN 1 ELSE 0 END) as pending
            FROM checklist_responses
        `);
        
        res.json({ success: true, stats: stats[0] });
    } catch (error) {
        console.error('Error getting statistics:', error);
        res.status(500).json({ success: false, message: 'Error getting statistics' });
    }
});

// Protected route check
app.get('/api/check-auth', checkAuth, (req, res) => {
    res.json({ 
        success: true, 
        user: {
            username: req.user.username,
            role: req.user.role
        }
    });
});

// Get dashboard statistics
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        // Get total employees count
        const [employeeCount] = await pool.query('SELECT COUNT(*) as count FROM employees');

        // Get total responses count
        const [responsesCount] = await pool.query('SELECT COUNT(*) as count FROM checklist_responses');

        // Get pending responses count
        const [pendingCount] = await pool.query(`
            SELECT COUNT(*) as count 
            FROM checklist_responses 
            WHERE answer_status = 'pending'
        `);

        // Get responses by status
        const [statusCounts] = await pool.query(`
            SELECT answer_status, COUNT(*) as count
            FROM checklist_responses
            GROUP BY answer_status
        `);

        // Get recent activity
        const [recentActivity] = await pool.query(`
            SELECT 
                e.username,
                e.branchname,
                cr.answer_status,
                cr.timestamp,
                cq.section,
                cq.question_text
            FROM checklist_responses cr
            JOIN employees e ON cr.employee_id = e.id
            JOIN checklist_questions cq ON cr.question_id = cq.id
            ORDER BY cr.timestamp DESC
            LIMIT 5
        `);

        res.json({
            success: true,
            stats: {
                employeeCount: employeeCount[0].count,
                totalResponses: responsesCount[0].count,
                pendingResponses: pendingCount[0].count,
                statusBreakdown: statusCounts,
                recentActivity: recentActivity
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard statistics',
            error: error.message
        });
    }
});

// Update dashboard stats endpoint
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        // Get total employees count
        const [employeeCount] = await pool.query('SELECT COUNT(*) as count FROM employees');

        // Get total responses count
        const [responsesCount] = await pool.query('SELECT COUNT(*) as count FROM checklist_responses');

        // Get pending responses count
        const [pendingCount] = await pool.query(`
            SELECT COUNT(*) as count 
            FROM checklist_responses 
            WHERE answer_status = 'pending'
        `);

        // Get responses by status
        const [statusCounts] = await pool.query(`
            SELECT answer_status, COUNT(*) as count
            FROM checklist_responses
            GROUP BY answer_status
        `);

        // Get recent activity
        const [recentActivity] = await pool.query(`
            SELECT 
                e.username,
                e.branchname,
                cr.answer_status,
                cr.timestamp,
                cq.section,
                cq.question_text
            FROM checklist_responses cr
            JOIN employees e ON cr.employee_id = e.id
            JOIN checklist_questions cq ON cr.question_id = cq.id
            ORDER BY cr.timestamp DESC
            LIMIT 5
        `);

        // Send response
        res.json({
            success: true,
            stats: {
                employeeCount: employeeCount[0].count,
                totalResponses: responsesCount[0].count,
                pendingResponses: pendingCount[0].count,
                statusBreakdown: statusCounts,
                recentActivity: recentActivity
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard statistics',
            error: error.message
        });
    }
});

// Submit checklist response
app.post('/api/checklist/submit', authenticateToken, async (req, res) => {
    try {
        const { responses } = req.body;
        const userId = req.user.id;

        // Insert each response
        for (const response of responses) {
            await pool.query(`
                INSERT INTO checklist_responses 
                (employee_id, question_id, answer_text, answer_status)
                VALUES (?, ?, ?, ?)
            `, [
                userId,
                response.question_id,
                response.answer_text,
                response.answer_status || 'pending'
            ]);
        }

        res.json({
            success: true,
            message: 'Checklist submitted successfully'
        });
    } catch (error) {
        console.error('Error submitting checklist:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit checklist',
            error: error.message
        });
    }
});

// API Routes for statistics
app.get('/api/statistics', authenticateToken, async (req, res) => {
    try {
        const [totalEmployees] = await pool.query('SELECT COUNT(*) as count FROM employees');
        const [totalChecklists] = await pool.query('SELECT COUNT(*) as count FROM checklists');
        const [completedTasks] = await pool.query('SELECT COUNT(*) as count FROM checklist_items WHERE status = "completed"');

        res.json({
            totalEmployees: totalEmployees[0].count,
            totalChecklists: totalChecklists[0].count,
            completedTasks: completedTasks[0].count
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API Routes for recent checklists
app.get('/api/checklists/recent', authenticateToken, async (req, res) => {
    try {
        const [checklists] = await pool.query(`
            SELECT c.id, e.name as employeeName, e.department, c.status, 
                   (SELECT COUNT(*) * 100.0 / COUNT(*) FROM checklist_items 
                    WHERE checklist_id = c.id AND status = 'completed') as progress
            FROM checklists c
            JOIN employees e ON c.employee_id = e.id
            ORDER BY c.created_at DESC
            LIMIT 10
        `);
        
        res.json(checklists.map(checklist => ({
            ...checklist,
            progress: Math.round(checklist.progress || 0)
        })));
    } catch (error) {
        console.error('Error fetching recent checklists:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server with error handling
const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Trying port ${port + 1}`);
        server.listen(port + 1, '0.0.0.0');
    } else {
        console.error('Server error:', err);
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Initialize database and questions
initializeAll().then(() => {
    console.log('Initialization completed. Starting server...');
}).catch(error => {
    console.error('Initialization failed:', error);
    process.exit(1);
});
