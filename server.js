const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

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

// Ensure directories and files exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));
if (!fs.existsSync(MARKS_FILE)) fs.writeFileSync(MARKS_FILE, JSON.stringify([]));

// =====================
// MIDDLEWARE
// =====================
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helpers
const getUsers = () => JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || "[]");
const getMarks = () => JSON.parse(fs.readFileSync(MARKS_FILE, 'utf8') || "[]");

const generateBackupCodes = () => {
    let codes = [];
    for (let i = 0; i < 6; i++) {
        codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
};

// =====================
// PAGE ROUTES
// =====================

// HOME: Now properly handles the header state
app.get('/', (req, res) => {
    const { user, email } = req.query;
    res.render('firstpage', { 
        username: user || null, 
        email: email || null 
    });
});

// LOGIN/REGISTER: Pass nulls so header doesn't crash
app.get('/login', (req, res) => res.render('login', { username: null, email: null }));
app.get('/register', (req, res) => res.render('register', { username: null, email: null }));
app.get('/forgot-password', (req, res) => res.render('forgot-password', { username: null, email: null }));

// 1. Profile Route
app.get('/profile', (req, res) => {
    const { user, email } = req.query;
    if (!user) return res.redirect('/login');

    const allMarks = getMarks();
    const userHistory = allMarks.filter(m => m.username === user);

    res.render('profile', { 
        username: user, 
        email: email, 
        marks: userHistory 
    });
});

// 2. Topics Selection Route
app.get('/questions', (req, res) => {
    const { user, email } = req.query;
    if (!user) return res.redirect('/login');

    const files = fs.readdirSync(DATA_DIR);
    const topics = files
        .filter(f => f.endsWith('.json') && f !== 'users.json' && f !== 'marks.json')
        .map(f => f.replace('.json', ''));

    res.render('topics', { 
        topics: topics, 
        username: user, 
        email: email 
    });
});

// 3. Quiz Route
app.get('/quiz/:topic', (req, res) => {
    const { topic } = req.params;
    const { user, email } = req.query;
    const filePath = path.join(DATA_DIR, `${topic}.json`);

    if (!fs.existsSync(filePath)) return res.redirect(`/questions?user=${user}&email=${email}`);

    const allQuestions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const shuffled = allQuestions.sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, 5);

    res.render('quiz', { 
        topic, 
        questions: selectedQuestions, 
        username: user, 
        email: email 
    });
});

// =====================
// API ROUTES
// =====================

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        // SUCCESS: Redirect to HOME so the header shows "Profile"
        res.redirect(`/?user=${encodeURIComponent(user.username)}&email=${encodeURIComponent(user.email)}`);
    } else {
        res.status(401).send("Invalid email or password <a href='/login'>Try Again</a>");
    }
});

app.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    const users = getUsers();

    if (users.find(u => u.email === email)) {
        return res.status(400).send("User already exists! <a href='/register'>Try again</a>");
    }

    const backupCodes = generateBackupCodes();
    users.push({ username: name, email, password, backupCodes });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

    res.send(`
        <div style="font-family: sans-serif; padding: 50px; text-align: center;">
            <h2 style="color: #0f3d2e;">Registration Successful!</h2>
            <p>Save these <b>6 Backup Codes</b> to reset your password later:</p>
            <div style="background: #f4f4f4; padding: 20px; border: 2px dashed #0f3d2e; font-size: 20px; display: inline-block; margin: 20px 0;">
                ${backupCodes.join('<br>')}
            </div>
            <p><a href="/login" style="color: #0f3d2e; font-weight: bold;">Proceed to Login</a></p>
        </div>
    `);
});

app.post('/submit-quiz', (req, res) => {
    const { username, topic, score, results } = req.body;
    const allMarks = getMarks();

    allMarks.push({
        username,
        topic,
        score,
        results,
        date: new Date().toLocaleString()
    });

    fs.writeFileSync(MARKS_FILE, JSON.stringify(allMarks, null, 2));
    res.json({ success: true });
});

app.post('/api/delete-account', (req, res) => {
    // 1. Capture the data sent from profile.ejs
    const emailToDelete = req.body.email;
    const userToDelete = req.body.username;

    if (!emailToDelete || !userToDelete) {
        return res.status(400).json({ success: false, message: "Missing required data" });
    }

    console.log(`Processing deletion for: ${userToDelete}`);

    // 2. Remove from users.json
    let users = getUsers();
    const updatedUsers = users.filter(u => u.email !== emailToDelete);
    fs.writeFileSync(USERS_FILE, JSON.stringify(updatedUsers, null, 2));

    // 3. Remove from marks.json (The Bulletproof Filter)
    let allMarks = getMarks();
    
    // We normalize both strings: remove spaces and make lowercase
    const updatedMarks = allMarks.filter(m => {
        const storedName = m.username.trim().toLowerCase();
        const targetName = userToDelete.trim().toLowerCase();
        return storedName !== targetName;
    });

    console.log(`Before: ${allMarks.length} records | After: ${updatedMarks.length} records`);

    fs.writeFileSync(MARKS_FILE, JSON.stringify(updatedMarks, null, 2));

    res.json({ success: true });
});

app.post('/forgot-password', (req, res) => {
    const { email, code, newPassword } = req.body;
    let users = getUsers();
    const userIndex = users.findIndex(u => u.email === email);

    if (userIndex === -1) return res.status(404).json({ message: "User not found." });

    const user = users[userIndex];
    const codeIndex = user.backupCodes.indexOf(code.toUpperCase());

    if (codeIndex !== -1) {
        user.password = newPassword;
        user.backupCodes.splice(codeIndex, 1); // Remove used code
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        res.json({ message: "Success" });
    } else {
        res.status(400).json({ message: "Invalid code." });
    }
});

app.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`));