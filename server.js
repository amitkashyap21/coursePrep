const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

const PORT = 3000;

// Define File Paths
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const RESPONSES_FILE = path.join(__dirname, 'data', 'user_responses.json');

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTML PAGE ROUTES
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'views', 'dashboard.html')));
app.get('/questions', (req, res) => res.sendFile(path.join(__dirname, 'views', 'questions.html')));

// AUTHENTICATION ROUTES
app.post('/api/signup', (req, res) => {
    const { username, password } = req.body;

    fs.readFile(USERS_FILE, 'utf8', (err, data) => {
        let users = [];
        if (!err && data) users = JSON.parse(data);

        if (users.find(u => u.username === username)) {
            return res.status(400).send("User already exists!");
        }

        users.push({ username, password });
        
        fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), (err) => {
            if (err) return res.status(500).send("Error saving user");
            res.send("Account created! <a href='/'>Login here</a>");
        });
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    fs.readFile(USERS_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).send("Server error");
        const users = JSON.parse(data);
        const user = users.find(u => u.username === username && u.password === password);

        if (user) {
            res.redirect('/dashboard');
        } else {
            res.status(401).send("Invalid credentials. <a href='/'>Try again</a>");
        }
    });
});

//QUESTIONS LOGIC
// GET questions 
app.get('/api/questions', (req, res) => {
    const topic = req.query.topic;
    const filePath = path.join(__dirname, 'data', `${topic}.json`);

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) return res.status(404).json({ error: "Topic not found" });
        const allQuestions = JSON.parse(data);
        res.json(allQuestions.slice(0, 5)); 
    });
});

// SUBMIT answers and calculate score
app.post('/api/submit-answers', (req, res) => {
    // Extract topic and the answers from the form
    const { topic, ...answers } = req.body; 
    const questionsPath = path.join(__dirname, 'data', `${topic}.json`);

    fs.readFile(questionsPath, 'utf8', (err, qData) => {
        if (err) return res.status(404).send("Topic data not found");
        
        const questions = JSON.parse(qData);
        let score = 0;

        // Calculate Score
        questions.forEach((q) => {
            if (answers[`q${q.id}`] == q.answer) {
                score++;
            }
        });

        const report = {
            username: "Guest", 
            topic: topic,
            score: `${score}/${questions.length}`,
            date: new Date().toLocaleDateString(),
            timestamp: new Date()
        };

        // Save to History File
        fs.readFile(RESPONSES_FILE, 'utf8', (err, rData) => {
            let history = [];
            if (!err && rData) history = JSON.parse(rData);
            
            history.push(report);
            
            fs.writeFile(RESPONSES_FILE, JSON.stringify(history, null, 2), (err) => {
                if (err) return res.status(500).send("Failed to save result");
                res.send(`
                    <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                        <h1>Assessment Complete!</h1>
                        <p style="font-size: 1.5rem;">Your Score: <strong>${report.score}</strong></p>
                        <a href="/dashboard" style="color: #0d3b3f; font-weight: bold;">Return to Dashboard</a>
                    </div>
                `);
            });
        });
    });
});

// GET user history for dashboard
app.get('/api/user-history', (req, res) => {
    fs.readFile(RESPONSES_FILE, 'utf8', (err, data) => {
        if (err) return res.json([]);
        res.json(JSON.parse(data));
    });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));