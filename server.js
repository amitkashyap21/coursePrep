require('dotenv').config(); // MUST BE AT THE TOP
const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const multer = require('multer');

const app = express();
const PORT = 3000;

// Setup Multer for temporary file uploads
const upload = multer({ dest: 'uploads/' });

// =====================
// VIEW ENGINE (EJS)
// =====================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// =====================
// DATA FILES SETUP
// =====================
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const MARKS_FILE = path.join(DATA_DIR, 'marks.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));
if (!fs.existsSync(MARKS_FILE)) fs.writeFileSync(MARKS_FILE, JSON.stringify([]));

// =====================
// MIDDLEWARE
// =====================
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'prepflow_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 } // 1 hour
}));

// Guard against "Back Button" viewing private data
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// =====================
// HELPERS
// =====================
const getUsers = () => JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || "[]");
const getMarks = () => JSON.parse(fs.readFileSync(MARKS_FILE, 'utf8') || "[]");

const generateBackupCodes = () => {
    let codes = [];
    for (let i = 0; i < 6; i++) {
        codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
};

// Middleware to protect Admin Routes
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(403).send("<h1>Access Denied</h1><p>Admin privileges required.</p>");
    }
};

// =====================
// PAGE ROUTES
// =====================

app.get('/', (req, res) => {
    const user = req.session.user || {};
    const allUsers = getUsers();
    const allMarks = getMarks();
    
    // Count only students for the homepage stats
    const studentCount = allUsers.filter(u => u.role !== 'admin').length;

    res.render('firstpage', { 
        username: user.username || null, 
        email: user.email || null,
        role: user.role || null,
        stats: { 
            totalUsers: studentCount, 
            totalQuizzes: allMarks.length 
        }
    });
});

app.get('/login', (req, res) => res.render('login', { username: null, email: null }));
app.get('/register', (req, res) => res.render('register', { username: null, email: null }));
app.get('/forgot-password', (req, res) => res.render('forgot-password', { username: null, email: null }));

app.get('/admin-dashboard', isAdmin, (req, res) => {
    const users = getUsers();
    res.render('admin', { 
        username: req.session.user.username, 
        email: req.session.user.email,
        role: req.session.user.role,
        users: users 
    });
});

app.get('/profile', (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const { username, email, role } = req.session.user;
    const allUsers = getUsers(); 
    const allMarks = getMarks(); 
    
    const studentCount = allUsers.filter(u => u.role !== 'admin').length;
    const userHistory = (role === 'admin') ? [] : allMarks.filter(m => m.username === username);

    const stats = {
        totalUsers: studentCount, 
        totalQuizzes: allMarks.length
    };

    res.render('profile', { 
        username, email, role, 
        marks: userHistory,
        stats: stats 
    });
});

app.get('/questions', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const topics = fs.readdirSync(DATA_DIR)
        .filter(f => f.endsWith('.json') && f !== 'users.json' && f !== 'marks.json')
        .map(f => f.replace('.json', ''));
    res.render('topics', { 
        topics, 
        username: req.session.user.username, 
        email: req.session.user.email,
        role: req.session.user.role 
    });
});

app.get('/quiz/:topic', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const { topic } = req.params;
    const filePath = path.join(DATA_DIR, `${topic}.json`);
    if (!fs.existsSync(filePath)) return res.redirect('/questions');

    const allQuestions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const shuffled = allQuestions.sort(() => 0.5 - Math.random()).slice(0, 5);

    res.render('quiz', { 
        topic, 
        questions: shuffled, 
        username: req.session.user.username, 
        email: req.session.user.email,
        role: req.session.user.role 
    });
});

// =====================
// AUTH & ACCOUNT API
// =====================

app.post('/login', (req, res) => {
    const { email: inputID, password: inputPass } = req.body; 
    const users = getUsers();

    // 1. FIRST CHECK: Does it match the secret .env admin?
    const isSecretAdmin = (
        (inputID === process.env.ADMIN_EMAIL || inputID === process.env.ADMIN_USERNAME) &&
        inputPass === process.env.ADMIN_PASSWORD
    );

    if (isSecretAdmin) {
        req.session.user = { 
            username: process.env.ADMIN_USERNAME, 
            email: process.env.ADMIN_EMAIL, 
            role: 'admin' 
        };
        return res.redirect('/');
    }

    // 2. SECOND CHECK: Does it match a user in the JSON file?
    const user = users.find(u => (u.email === inputID || u.username === inputID) && u.password === inputPass);

    if (user) {
        req.session.user = { 
            username: user.username, 
            email: user.email, 
            role: user.role || 'student' 
        };
        res.redirect('/');
    } else {
        res.status(401).send("Invalid credentials <a href='/login'>Try Again</a>");
    }
});

app.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    const users = getUsers();

    if (users.find(u => u.email === email)) return res.status(400).send("User exists!");

    const backupCodes = generateBackupCodes();
    users.push({ username: name, email, password, role: 'student', backupCodes });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

    res.send(`<h2>Registration Success!</h2><p>Backup Codes: ${backupCodes.join(', ')}</p><a href="/login">Login</a>`);
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.redirect('/');
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

app.post('/api/delete-account', (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false });

    const { email, username } = req.body;
    const currentUser = req.session.user;
    const users = getUsers();
    const targetUser = users.find(u => u.email === email);

    // Prevent deletion of admin from JSON or .env
    if ((targetUser && targetUser.role === 'admin') || email === process.env.ADMIN_EMAIL) {
        return res.status(403).json({ 
            success: false, 
            message: "System Administrators cannot be deleted for security reasons." 
        });
    }

    const isDeletingSelf = (currentUser.email === email);
    const isAdmin = (currentUser.role === 'admin');

    if (isAdmin || isDeletingSelf) {
        const updatedUsers = users.filter(u => u.email !== email);
        const updatedMarks = getMarks().filter(m => m.username !== username);

        fs.writeFileSync(USERS_FILE, JSON.stringify(updatedUsers, null, 2));
        fs.writeFileSync(MARKS_FILE, JSON.stringify(updatedMarks, null, 2));

        if (isDeletingSelf) {
            req.session.destroy();
        }

        return res.json({ success: true });
    } else {
        return res.status(403).json({ success: false, message: "Unauthorized action." });
    }
});

// =====================
// ADMIN & QUIZ API
// =====================

app.post('/api/admin/upload-questions', isAdmin, upload.single('jsonFile'), (req, res) => {
    const { topic } = req.body;
    const filePath = path.join(DATA_DIR, `${topic.toLowerCase()}.json`);

    try {
        const newData = JSON.parse(fs.readFileSync(req.file.path, 'utf8'));
        let existing = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : [];
        
        newData.forEach(q => {
            const { id: oldId, ...restOfQuestion } = q;
            const formattedQuestion = {
                id: existing.length + 1,
                ...restOfQuestion
            };
            existing.push(formattedQuestion);
        });

        fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
        fs.unlinkSync(req.file.path); 
        res.send(`<h2>Uploaded ${newData.length} questions!</h2><a href="/admin-dashboard">Back</a>`);
    } catch (e) {
        console.error(e);
        res.status(400).send("Invalid JSON file.");
    }
});

app.post('/api/admin/add-question', isAdmin, (req, res) => {
    const { topic, question, options, answer } = req.body;
    const filePath = path.join(DATA_DIR, `${topic.toLowerCase()}.json`);
    let questions = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : [];
    
    questions.push({
        id: questions.length + 1,
        question,
        options: options.split(',').map(s => s.trim()),
        answer: parseInt(answer)
    });

    fs.writeFileSync(filePath, JSON.stringify(questions, null, 2));
    res.redirect('/admin-dashboard');
});

app.post('/submit-quiz', (req, res) => {
    const { username, topic, score, results } = req.body;
    const allMarks = getMarks();
    allMarks.push({ username, topic, score, results, date: new Date().toLocaleString() });
    fs.writeFileSync(MARKS_FILE, JSON.stringify(allMarks, null, 2));
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`));