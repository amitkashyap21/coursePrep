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
// USERS FILE SETUP
// =====================
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory and users.json exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));

// =====================
// MIDDLEWARE
// =====================
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper function to get users
const getUsers = () => {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data || "[]");
};

// Helper to generate 6 backup codes
const generateBackupCodes = () => {
    let codes = [];
    for (let i = 0; i < 6; i++) {
        // Generates an 8-character random string
        codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
};

// =====================
// PAGE ROUTES
// =====================

app.get('/', (req, res) => res.render('firstpage'));
app.get('/login', (req, res) => res.render('login'));
app.get('/register', (req, res) => res.render('register'));
app.get('/forgot-password', (req, res) => res.render('forgot-password'));

// =====================
// SIGNUP API
// =====================

app.post('/register', (req, res) => {
    const { name, email, password } = req.body; // Using name/email as per your EJS
    const users = getUsers();

    const userExists = users.find(u => u.email === email);
    if (userExists) {
        return res.status(400).send("User already exists! <a href='/register'>Try again</a>");
    }

    const backupCodes = generateBackupCodes();
    
    users.push({ 
        username: name, 
        email: email, 
        password: password, 
        backupCodes: backupCodes 
    });

    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

    // Render a success page showing codes (or send as simple HTML for now)
    res.send(`
        <div style="font-family: sans-serif; padding: 50px; text-align: center;">
            <h2 style="color: #0f3d2e;">Registration Successful!</h2>
            <p>Please save these <b>6 Backup Codes</b>. You will need them if you forget your password.</p>
            <div style="background: #f4f4f4; padding: 20px; display: inline-block; border: 2px dashed #0f3d2e; font-size: 20px; letter-spacing: 2px;">
                ${backupCodes.join('<br>')}
            </div>
            <p><a href="/login" style="color: #0f3d2e; font-weight: bold;">Proceed to Login</a></p>
        </div>
    `);
});

// =====================
// LOGIN API
// =====================

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const users = getUsers();

    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        res.redirect('/');
    } else {
        res.status(401).send("Invalid email or password <a href='/login'>Try Again</a>");
    }
});

// =====================
// FORGOT PASSWORD API (AJAX SUPPORT)
// =====================

app.post('/forgot-password', (req, res) => {
    const { email, code, newPassword } = req.body;
    let users = getUsers();

    const userIndex = users.findIndex(u => u.email === email);

    if (userIndex === -1) {
        return res.status(404).json({ message: "User not found." });
    }

    const user = users[userIndex];
    const codeIndex = user.backupCodes.indexOf(code.toUpperCase());

    if (codeIndex !== -1) {
        // Update password and remove the used code
        user.password = newPassword;
        user.backupCodes.splice(codeIndex, 1);

        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        
        // Respond based on request type (AJAX vs Form)
        if (req.headers['content-type'] === 'application/json') {
            return res.json({ message: "Success" });
        }
        res.send("Password updated! <a href='/login'>Login now</a>");
    } else {
        if (req.headers['content-type'] === 'application/json') {
            return res.status(400).json({ message: "Invalid or used backup code." });
        }
        res.send("Invalid backup code. <a href='/forgot-password'>Try again</a>");
    }
});

// =====================
// START SERVER
// =====================

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});