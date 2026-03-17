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

// Prevents users from going "Back" to secure pages after logout
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// =====================
// GLOBAL AUTH GUARD (The Gatekeeper)
// =====================
app.use((req, res, next) => {
    const publicPaths = ['/', '/login', '/register'];
    const isPublic = publicPaths.includes(req.path);
    const isStatic = req.path.startsWith('/public') || req.path.startsWith('/uploads');

    if (isPublic || isStatic || req.session.user) {
        return next();
    }
    res.redirect('/login');
});

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

app.get('/', async (req, res) => {
    try {
        const user = req.session.user || {};
        const studentCount = await User.countDocuments({ role: 'student' });
        const quizCount = await Mark.countDocuments();
        res.render('firstpage', { 
            username: user.username || null, 
            email: user.email || null,
            role: user.role || null,
            stats: { totalUsers: studentCount, totalQuizzes: quizCount }
        });
    } catch (e) { res.status(500).send("Error loading home"); }
});

app.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/'); // Sends them home if logged in
    res.render('login', { username: null, email: null });
});

app.get('/register', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('register', { username: null, email: null });
});

app.get('/admin-dashboard', isAdmin, async (req, res) => {
    const users = await User.find();
    res.render('admin', { 
        ...req.session.user,
        users: users 
    });
});

app.get('/profile', async (req, res) => {
    const { username, email, role } = req.session.user;
    
    // Re-verify user exists in DB
    const userExists = await User.findOne({ email });
    if (!userExists && role !== 'admin') {
        return req.session.destroy(() => res.redirect('/login'));
    }

    const studentCount = await User.countDocuments({ role: 'student' });
    const quizCount = await Mark.countDocuments();
    // Fetch marks by EMAIL to ensure data integrity
    const userHistory = (role === 'admin') ? [] : await Mark.find({ email }).sort({ _id: -1 });

    res.render('profile', { 
        username, email, role, 
        marks: userHistory,
        stats: { totalUsers: studentCount, totalQuizzes: quizCount } 
    });
});

app.get('/questions', async (req, res) => {
    const topics = await Question.distinct('topic');
    res.render('topics', { topics, ...req.session.user });
});

app.get('/quiz/:topic', async (req, res) => {
    const { topic } = req.params;
    const shuffled = await Question.aggregate([
        { $match: { topic: topic.toLowerCase() } },
        { $sample: { size: 5 } }
    ]);
    if (shuffled.length === 0) return res.redirect('/questions');
    res.render('quiz', { topic, questions: shuffled, ...req.session.user });
});

// =====================
// AUTH & ACCOUNT API
// =====================

app.post('/login', async (req, res) => {
    const { email: inputID, password: inputPass } = req.body; 

    let loggedInUser = null;

    // 1. Check Secret Admin (.env)
    if ((inputID === process.env.ADMIN_EMAIL || inputID === process.env.ADMIN_USERNAME) && 
        inputPass === process.env.ADMIN_PASSWORD) {
        loggedInUser = { 
            username: process.env.ADMIN_USERNAME, 
            email: process.env.ADMIN_EMAIL, 
            role: 'admin' 
        };
    } else {
        // 2. Check Database
        const user = await User.findOne({ $or: [{ email: inputID }, { username: inputID }] });
        if (user && await bcrypt.compare(inputPass, user.password)) {
            loggedInUser = { username: user.username, email: user.email, role: user.role };
        }
    }

    if (loggedInUser) {
        req.session.user = loggedInUser;
        
        // INSTEAD OF res.redirect('/'), we send a small script.
        // This removes the Login page from the history stack.
        return res.send(`
            <script>
                window.location.replace('/');
            </script>
        `);
    } else {
        res.status(401).send("Invalid credentials <a href='/login'>Try Again</a>");
    }
});

app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const cleanEmail = email.toLowerCase().trim();
        const existing = await User.findOne({ email: cleanEmail });
        if (existing) return res.status(400).send("User exists!");

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username: name.trim(), email: cleanEmail, password: hashedPassword });
        await newUser.save();
        res.send(`<h2>Registration Success!</h2><a href="/login">Login</a>`);
    } catch (e) { res.status(500).send("Registration failed"); }
});

app.post('/api/delete-account', async (req, res) => {
    const { email } = req.body;
    if (email === process.env.ADMIN_EMAIL) return res.status(403).json({ success: false });

    await User.deleteOne({ email });
    // Wipe marks associated with this email
    await Mark.deleteMany({ email });

    if (req.session.user.email === email) {
        req.session.destroy();
    }
    res.json({ success: true });
});

// =====================
// QUIZ & ADMIN MGMT API
// =====================

app.post('/submit-quiz', async (req, res) => {
    try {
        const { topic, score, results } = req.body;
        const email = req.session.user.email; 
        const newMark = new Mark({ email, topic, score, results });
        await newMark.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/user-stats', async (req, res) => {
    try {
        const stats = await Mark.aggregate([
            { $match: { email: req.session.user.email } },
            { $group: { _id: "$topic", avgScore: { $avg: "$score" } } }
        ]);
        res.json({
            labels: stats.map(s => s._id),
            averages: stats.map(s => (s.avgScore * 20).toFixed(2))
        });
    } catch (e) { res.status(500).json({ error: "Stat error" }); }
});

app.post('/api/admin/add-question', isAdmin, async (req, res) => {
    const { topic, question, options, answer } = req.body;
    const newQ = new Question({
        topic: topic.toLowerCase(),
        question,
        options: options.split(',').map(s => s.trim()),
        answer: parseInt(answer)
    });
    await newQ.save();
    res.redirect('/admin-dashboard');
});

app.post('/api/admin/upload-questions', isAdmin, upload.single('jsonFile'), async (req, res) => {
    const { topic } = req.body;
    try {
        const rawData = fs.readFileSync(req.file.path, 'utf8');
        const newData = JSON.parse(rawData);
        const formattedQuestions = newData.map(q => ({
            topic: topic.toLowerCase(),
            question: q.question,
            options: q.options,
            answer: q.answer
        }));
        await Question.insertMany(formattedQuestions);
        fs.unlinkSync(req.file.path); 
        res.send(`<h2>✅ Success!</h2><a href="/admin-dashboard">Return</a>`);
    } catch (e) { res.status(400).send("Error in upload."); }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

app.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`));