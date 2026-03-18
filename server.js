require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const multer = require('multer');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import Models
const User = require('./models/User');
const Mark = require('./models/Mark');
const Question = require('./models/Question');

const app = express();
const PORT = 3000;

// =====================
// DATABASE CONNECTION
// =====================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

const upload = multer({ dest: 'uploads/' });

// =====================
// VIEW ENGINE & MIDDLEWARE
// =====================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'prepflow_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 } // 1 hour
}));

// Security: Prevent browser caching of sensitive pages
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// Global EJS Variables: Makes 'user', 'username', and 'role' available in all .ejs files
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.username = req.session.user ? req.session.user.username : null;
    res.locals.role = req.session.user ? req.session.user.role : null;
    next();
});

// =====================
// AUTH GUARDS (Middleware)
// =====================
const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/login');
};

const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') return next();
    res.status(403).send("<h1>Access Denied</h1><p>Admin privileges required.</p>");
};

// =====================
// PAGE ROUTES
// =====================

app.get('/', async (req, res) => {
    try {
        const studentCount = await User.countDocuments({ role: 'student' });
        const quizCount = await Mark.countDocuments();
        res.render('firstpage', {
            stats: { totalUsers: studentCount, totalQuizzes: quizCount }
        });
    } catch (e) {
        res.status(500).send("Error loading home");
    }
});

app.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('login');
});

app.get('/register', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('register');
});

app.get('/admin-dashboard', isAdmin, async (req, res) => {
    try {
        const users = await User.find();
        res.render('admin', { users });
    } catch (e) { res.status(500).send("Admin Panel Error"); }
});

app.get('/profile', isAuthenticated, async (req, res) => {
    try {
        // 1. Extract all needed data from session
        const { email, role, username } = req.session.user;

        // 2. Fetch stats and history
        const studentCount = await User.countDocuments({ role: 'student' });
        const quizCount = await Mark.countDocuments();

        // Only fetch history if the user isn't an admin
        const userHistory = (role === 'admin') ? [] : await Mark.find({ email }).sort({ _id: -1 });

        // 3. PASS THE VARIABLES to the template
        res.render('profile', {
            username: username,
            email: email,
            role: role,
            marks: userHistory,
            stats: {
                totalUsers: studentCount,
                totalQuizzes: quizCount
            }
        });
    } catch (e) {
        console.error("Profile Load Error:", e);
        res.status(500).send("Profile Error");
    }
});

app.get('/questions', isAuthenticated, async (req, res) => {
    try {
        // Extract user data from the session
        const { username, email } = req.session.user;

        // Fetch unique topics from the database
        const topics = await Question.distinct('topic');

        // Pass everything to the template
        res.render('topics', {
            topics,
            username,
            email
        });
    } catch (e) {
        console.error("Topics Route Error:", e);
        res.status(500).send("Error loading topics.");
    }
});

app.get('/quiz/:topic', isAuthenticated, async (req, res) => {
    try {
        const { topic } = req.params;
        const { username, email } = req.session.user; // Get session data

        const shuffled = await Question.aggregate([
            { $match: { topic: topic.toLowerCase() } },
            { $sample: { size: 5 } }
        ]);

        if (shuffled.length === 0) return res.redirect('/questions');

        // Send user data along with the questions
        res.render('quiz', {
            topic,
            questions: shuffled,
            username,
            email
        });
    } catch (e) {
        console.error("Quiz Route Error:", e);
        res.status(500).send("Error starting quiz.");
    }
});

// =====================
// AUTH & ACCOUNT API
// =====================

app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const username = name.trim();
        const normalizedEmail = email.toLowerCase().trim();

        const existingUser = await User.findOne({
            $or: [{ email: normalizedEmail }, { username: username }]
        });

        if (existingUser) {
            return res.status(400).send("User already exists. <a href='/register'>Back</a>");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await new User({
            username,
            email: normalizedEmail,
            password: hashedPassword,
            role: 'student'
        }).save();

        res.send(`<script>alert("Success!"); window.location.href="/login";</script>`);
    } catch (error) { res.status(500).send("Registration Error"); }
});

app.post('/login', async (req, res) => {
    const { email: inputID, password: inputPass } = req.body;
    const loginTerm = inputID.toLowerCase().trim();

    // Admin .env bypass check
    if ((loginTerm === process.env.ADMIN_EMAIL || loginTerm === process.env.ADMIN_USERNAME) &&
        inputPass === process.env.ADMIN_PASSWORD) {
        req.session.user = { username: 'Admin', email: process.env.ADMIN_EMAIL, role: 'admin' };
        return res.send(`<script>window.location.replace('/');</script>`);
    }

    const user = await User.findOne({
        $or: [
            { email: loginTerm },
            { username: { $regex: new RegExp(`^${loginTerm}$`, 'i') } }
        ]
    });

    if (user && await bcrypt.compare(inputPass, user.password)) {
        req.session.user = { username: user.username, email: user.email, role: user.role };
        return res.send(`<script>window.location.replace('/');</script>`);
    }

    res.status(401).send("Invalid credentials. <a href='/login'>Try Again</a>");
});

app.post('/api/delete-account', isAuthenticated, async (req, res) => {
    const { email } = req.body;

    // 1. Safety Check: Prevent deleting the system admin
    if (email === process.env.ADMIN_EMAIL) {
        return res.status(403).json({
            success: false,
            message: 'System administrator account cannot be deleted.'
        });
    }

    try {
        // 2. Database Operations
        await User.deleteOne({ email });
        await Mark.deleteMany({ email });

        // 3. Session Management
        // Check if the logged-in user is deleting themselves
        if (req.session.user && req.session.user.email === email) {
            req.session.destroy((err) => {
                if (err) {
                    console.error("Session destruction error:", err);
                    return res.status(500).json({ success: false, message: 'User deleted but session clearance failed.' });
                }
                // Clear the cookie and send success
                res.clearCookie('connect.sid'); // Adjust name if you customized your session cookie
                return res.json({ success: true, message: 'Your account has been deleted and you have been logged out.' });
            });
        } else {
            // Admin deleting another user
            return res.json({ success: true, message: 'User and associated records deleted successfully.' });
        }

    } catch (e) {
        console.error("Delete Account Error:", e);
        return res.status(500).json({ success: false, message: 'Database error occurred.' });
    }
});

app.get('/logout', (req, res) => {
    // 1. Destroy the session on the server
    req.session.destroy((err) => {
        if (err) {
            console.error("Logout Error:", err);
            return res.redirect('/'); // Redirect to home if destruction fails
        }

        // 2. Clear the cookie with the explicit path
        res.clearCookie('connect.sid', { path: '/' });

        // 3. Redirect to login
        res.redirect('/login');
    });
});

// =====================
// QUIZ & STATS API
// =====================

app.post('/submit-quiz', isAuthenticated, async (req, res) => {
    try {
        const { topic, score, results } = req.body;
        await new Mark({
            email: req.session.user.email,
            topic, score, results
        }).save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/user-stats', isAuthenticated, async (req, res) => {
    try {
        const stats = await Mark.aggregate([
            { $match: { email: req.session.user.email } },
            { $group: { _id: "$topic", avgScore: { $avg: "$score" } } }
        ]);
        res.json({
            labels: stats.map(s => s._id),
            averages: stats.map(s => (s.avgScore * 20).toFixed(2)) // Scaling score to percentage
        });
    } catch (e) { res.status(500).json({ error: "Stat error" }); }
});

// =====================
// ADMIN MANAGEMENT API
// =====================

app.post('/api/admin/add-question', isAdmin, async (req, res) => {
    try {
        const { topic, question, options, answer } = req.body;
        await new Question({
            topic: topic.toLowerCase(),
            question,
            options: options.split(',').map(s => s.trim()),
            answer: parseInt(answer)
        }).save();
        res.redirect('/admin-dashboard');
    } catch (e) { res.status(500).send("Error adding question"); }
});

app.post('/api/admin/upload-questions', isAdmin, upload.single('jsonFile'), async (req, res) => {
    const { topic } = req.body;
    if (!req.file) return res.status(400).send("No file uploaded.");

    try {
        const rawData = fs.readFileSync(req.file.path, 'utf8');
        const newData = JSON.parse(rawData);

        // Map and validate structure
        const formattedQuestions = newData.map(q => ({
            topic: topic.toLowerCase().trim(),
            question: q.question,
            options: q.options,
            answer: parseInt(q.answer)
        }));

        await Question.insertMany(formattedQuestions);
        fs.unlinkSync(req.file.path);
        res.send(`<script>alert("Bulk Upload Success!"); window.location.href="/admin-dashboard";</script>`);
    } catch (e) {
        if (req.file) fs.unlinkSync(req.file.path); // Always clean up on error
        res.status(400).send("Error: Invalid JSON format or missing fields.");
    }
});

app.listen(PORT, () => console.log(`🚀 Server running: http://localhost:${PORT}`));