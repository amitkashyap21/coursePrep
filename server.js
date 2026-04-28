require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const multer = require('multer');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Import Models
const User = require('./models/User');
const Mark = require('./models/Mark');
const Question = require('./models/Question');

// Socket
const { setupSocket, activeRooms } = require('./socket');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
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

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.username = req.session.user ? req.session.user.username : null;
    res.locals.role = req.session.user ? req.session.user.role : null;
    next();
});

// =====================
// UTILITY FUNCTIONS
// =====================

// Helper to generate 6 recovery codes
async function generateRecoveryCodes() {
    const plainCodes = [];
    const hashedCodes = [];
    for (let i = 0; i < 6; i++) {
        const plain = crypto.randomBytes(4).toString('hex'); // 8 characters
        plainCodes.push(plain);
        const hashed = await bcrypt.hash(plain, 10);
        hashedCodes.push({ code: hashed, used: false });
    }
    return { plainCodes, hashedCodes };
}

// =====================
// AUTH GUARDS
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

app.get('/multiplayer', isAuthenticated, async (req, res) => {
    try {
        // Fetch unique topics from your existing Questions/Marks collection
        // Replace 'Mark' with your actual Model name for questions
        const availableTopics = await Mark.distinct('topic'); 

        res.render('multiplayer-lobby', {
            user: req.session.user,
            topics: availableTopics // Pass these to the frontend
        });
    } catch (e) {
        console.error(e);
        res.status(500).send("Error loading multiplayer lobby");
    }
});

app.get('/', async (req, res) => {
    try {
        const studentCount = await User.countDocuments({ role: 'student' });
        const quizCount = await Mark.countDocuments();
        
        // Calculate the number of live rooms
        const liveRoomCount = Object.keys(activeRooms).length;

        res.render('firstpage', {
            stats: { 
                totalUsers: studentCount, 
                totalQuizzes: quizCount,
                liveRooms: liveRoomCount // Pass this new value
            }
        });
    } catch (e) { 
        console.error(e);
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

// New Route: Forgot Password Page
app.get('/forgot-password', (req, res) => {
    res.render('forgot-password', { error: null });
});

app.get('/admin-dashboard', isAdmin, async (req, res) => {
    try {
        const users = await User.find();
        res.render('admin', { users });
    } catch (e) { res.status(500).send("Admin Panel Error"); }
});

app.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const { email, role, username } = req.session.user;
        
        // Fetch full user to get backup code status
        const userDoc = await User.findOne({ email });
        const studentCount = await User.countDocuments({ role: 'student' });
        const quizCount = await Mark.countDocuments();
        const userHistory = (role === 'admin') ? [] : await Mark.find({ email }).sort({ _id: -1 });

        res.render('profile', {
            username: username,
            email: email,
            role: role,
            marks: userHistory,
            backupCodes: userDoc ? userDoc.backupCodes : [],
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
        const { username, email } = req.session.user;
        const { topic, room } = req.query; // Get topic and room from URL

        // CASE 1: Topic is selected (Multiplayer Start or Solo selection)
        if (topic) {
            // Fetch questions specifically for the selected topic
            const questions = await Question.find({ topic: topic });

            if (!questions || questions.length === 0) {
                return res.status(404).send("No questions found for this topic.");
            }

            // Render the QUIZ page directly
            return res.render('quiz', { 
                questions, 
                topic, 
                room: room || null, // Pass room ID if it exists
                username, 
                email 
            });
        }

        // CASE 2: No topic selected (Show selection page)
        const topics = await Question.distinct('topic');
        res.render('topics', { topics, username, email });

    } catch (e) {
        console.error("Route Error:", e);
        res.status(500).send("Error loading assessment.");
    }
});

app.get('/quiz/:topic', isAuthenticated, async (req, res) => {
    try {
        const { topic } = req.params;
        const { username, email } = req.session.user;
        const shuffled = await Question.aggregate([
            { $match: { topic: topic.toLowerCase() } },
            { $sample: { size: 5 } }
        ]);
        if (shuffled.length === 0) return res.redirect('/questions');
        res.render('quiz', { topic, questions: shuffled, username, email });
    } catch (e) { res.status(500).send("Error starting quiz."); }
});

// =====================
// AUTH & ACCOUNT API
// =====================

app.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        const username = name.trim();
        const normalizedEmail = email.toLowerCase().trim();
        const userRole = role || 'student';

        const existingUser = await User.findOne({
            $or: [{ email: normalizedEmail }, { username: username }]
        });

        if (existingUser) {
            return res.status(400).send("User already exists. <a href='/register'>Back</a>");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate codes ONLY if NOT admin
        let plainCodes = [];
        let hashedCodes = [];
        if (userRole !== 'admin') {
            const recovery = await generateRecoveryCodes();
            plainCodes = recovery.plainCodes;
            hashedCodes = recovery.hashedCodes;
        }

        const newUser = new User({
            username,
            email: normalizedEmail,
            password: hashedPassword,
            role: userRole,
            backupCodes: hashedCodes
        });

        await newUser.save();

        if (userRole !== 'admin') {
            res.render('registration-success', { 
                username, 
                codes: plainCodes, 
                isRegenerating: false 
            });
        } else {
            res.redirect('/login');
        }
    } catch (error) { 
        console.error(error);
        res.status(500).send("Registration Error"); 
    }
});

app.post('/login', async (req, res) => {
    const { email: inputID, password: inputPass } = req.body;
    const loginTerm = inputID.toLowerCase().trim();

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

// NEW API: Handle Password Reset via Recovery Code
app.post('/forgot-password', async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user || user.role === 'admin') {
            return res.render('forgot-password', { error: "Invalid request or Admin account." });
        }

        // Find a matching unused code
        let codeIndex = -1;
        for (let i = 0; i < user.backupCodes.length; i++) {
            if (!user.backupCodes[i].used) {
                const isMatch = await bcrypt.compare(code, user.backupCodes[i].code);
                if (isMatch) {
                    codeIndex = i;
                    break;
                }
            }
        }

        if (codeIndex === -1) {
            return res.render('forgot-password', { error: "Invalid or already used recovery code." });
        }

        // Update password, mark code as used, and set reset timestamp
        user.password = await bcrypt.hash(newPassword, 10);
        user.backupCodes[codeIndex].used = true;
        user.lastPasswordReset = Date.now();
        await user.save();

        res.send(`<script>alert("Password reset successful!"); window.location.href="/login";</script>`);
    } catch (e) {
        res.render('forgot-password', { error: "Server error during reset." });
    }
});

// NEW API: Regenerate Codes from Profile
app.post('/api/regenerate-codes', isAuthenticated, async (req, res) => {
    try {
        if (req.session.user.role === 'admin') return res.status(403).send("Admins cannot have recovery codes.");
        
        const { plainCodes, hashedCodes } = await generateRecoveryCodes();
        await User.findOneAndUpdate(
            { email: req.session.user.email },
            { backupCodes: hashedCodes }
        );

        // Show the new codes to the user
        res.render('registration-success', { 
            username: req.session.user.username, 
            codes: plainCodes 
        });
    } catch (e) {
        res.status(500).send("Error regenerating codes.");
    }
});

app.post('/forgot-password', async (req, res) => {
    const { email, code, newPassword } = req.body;

    try {
        // 1. Find the user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).send("User not found.");
        }

        // 2. Find the valid, unused code
        let codeIndex = -1;
        for (let i = 0; i < user.backupCodes.length; i++) {
            const backup = user.backupCodes[i];
            
            // Only check codes that haven't been used yet
            if (!backup.used) {
                const isMatch = await bcrypt.compare(code, backup.hash);
                if (isMatch) {
                    codeIndex = i;
                    break;
                }
            }
        }

        // 3. Handle incorrect or exhausted codes
        if (codeIndex === -1) {
            return res.status(401).send("Invalid or already used recovery code.");
        }

        // 4. Update Password and Mark Code as Used
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        
        // Mark this specific code as used
        user.backupCodes[codeIndex].used = true;
        user.backupCodes[codeIndex].usedAt = new Date();

        await user.save();

        // 5. Success - Redirect to login
        res.send(`
            <script>
                alert("Password updated successfully! This recovery code is now deactivated.");
                window.location.href = "/login";
            </script>
        `);

    } catch (err) {
        console.error("Password Reset Error:", err);
        res.status(500).send("An error occurred during password reset.");
    }
});

// Route to Regenerate Recovery Codes from Profile
app.post('/api/regenerate-codes', async (req, res) => {
    // 1. Ensure user is logged in
    if (!req.session.user) {
        return res.status(401).send("Unauthorized. Please log in.");
    }

    try {
        const user = await User.findOne({ email: req.session.user.email });
        if (!user) return res.status(404).send("User not found.");

        // 2. Generate 6 new random 8-character codes
        const crypto = require('crypto');
        const newPlainCodes = [];
        const newHashedCodes = [];

        for (let i = 0; i < 6; i++) {
            const code = crypto.randomBytes(4).toString('hex'); // 8 characters
            newPlainCodes.push(code);
            
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(code, salt);
            newHashedCodes.push({ hash, used: false });
        }

        // 3. Overwrite the old codes in the database
        user.backupCodes = newHashedCodes;
        await user.save();

        // 4. Redirect to the success page to SHOW the new codes
        // We reuse the registration-success view for this!
        res.render('registration-success', {
            username: user.username,
            email: user.email,
            codes: newPlainCodes,
            role: user.role,
            isRegenerating: true
        });

    } catch (err) {
        console.error("Regeneration Error:", err);
        res.status(500).send("Failed to regenerate codes.");
    }
});

app.post('/api/delete-account', isAuthenticated, async (req, res) => {
    const { email } = req.body;
    if (email === process.env.ADMIN_EMAIL) {
        return res.status(403).json({ success: false, message: 'Admin cannot be deleted.' });
    }
    try {
        await User.deleteOne({ email });
        await Mark.deleteMany({ email });
        if (req.session.user && req.session.user.email === email) {
            req.session.destroy(() => {
                res.clearCookie('connect.sid');
                return res.json({ success: true });
            });
        } else {
            return res.json({ success: true });
        }
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid', { path: '/' });
        res.redirect('/login');
    });
});

// =====================
// QUIZ & STATS API
// =====================

app.post('/submit-quiz', isAuthenticated, async (req, res) => {
    try {
        const { topic, score, results } = req.body;
        
        // Use req.session.user.email to ensure the marks are tied to the logged-in user
        const newMark = new Mark({
            email: req.session.user.email,
            topic, 
            score, 
            results,
            createdAt: new Date() // Good for sorting history later
        });

        await newMark.save();
        
        // Return success and perhaps the record ID for confirmation
        res.json({ 
            success: true, 
            message: "Assessment saved successfully",
            markId: newMark._id 
        });
        
        console.log(`📊 Score Saved: ${req.session.user.username} got ${score} in ${topic}`);
    } catch (err) { 
        console.error("Save Error:", err);
        res.status(500).json({ success: false, message: "Server error while saving score" }); 
    }
});

app.get('/api/user-stats', isAuthenticated, async (req, res) => {
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

// =====================
// ADMIN MANAGEMENT API
// =====================

app.post('/api/admin/add-question', isAdmin, async (req, res) => {
    try {
        const { topic, question, options, answer, difficulty } = req.body;
        await new Question({
            topic: topic.toLowerCase(),
            question,
            options: options.split(',').map(s => s.trim()),
            answer: parseInt(answer),
            difficulty: difficulty || 'medium'
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
        const formattedQuestions = newData.map(q => ({
            topic: topic.toLowerCase().trim(),
            question: q.question,
            options: q.options,
            answer: parseInt(q.answer),
            difficulty: q.difficulty ? q.difficulty.toLowerCase() : 'medium'
        }));
        await Question.insertMany(formattedQuestions);
        fs.unlinkSync(req.file.path);
        res.send(`<script>alert("Bulk Upload Success!"); window.location.href="/admin-dashboard";</script>`);
    } catch (e) {
        if (req.file) fs.unlinkSync(req.file.path); 
        res.status(400).send("Error: Invalid JSON format.");
    }
});

// =====================
// REAL-TIME ROOMS (SOCKET.IO)
// =====================
setupSocket(io);

http.listen(PORT, () => console.log(`🚀 Master Server running: http://localhost:${PORT}`));