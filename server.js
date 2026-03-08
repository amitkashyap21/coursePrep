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
// USERS FILE PATH
// =====================
const USERS_FILE = path.join(__dirname, 'data', 'users.json');


// =====================
// MIDDLEWARE
// =====================
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// =====================
// PAGE ROUTES
// =====================

// Home Page
app.get('/', (req, res) => {
    res.render('firstpage');
});


// Login Page
app.get('/login', (req, res) => {
    res.render('login');
});


// Register Page
app.get('/register', (req, res) => {
    res.render('register');
});


// Forgot Password Page
app.get('/forgot-password', (req, res) => {
    res.render('forgot-password');
});


// =====================
// SIGNUP API
// =====================

app.post('/api/signup', (req, res) => {

    const { username, password } = req.body;

    fs.readFile(USERS_FILE, 'utf8', (err, data) => {

        let users = [];

        if (!err && data) {
            try {
                users = JSON.parse(data);
            } catch {
                users = [];
            }
        }

        const userExists = users.find(u => u.username === username);

        if (userExists) {
            return res.send("User already exists! <a href='/register'>Try again</a>");
        }

        users.push({ username, password });

        fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), (err) => {

            if (err) {
                return res.send("Error saving user");
            }

            res.send("Account created successfully! <a href='/login'>Login here</a>");

        });

    });

});


// =====================
// LOGIN API
// =====================

app.post('/api/login', (req, res) => {

    const { username, password } = req.body;

    fs.readFile(USERS_FILE, 'utf8', (err, data) => {

        if (err) {
            return res.send("Server error");
        }

        let users = [];

        try {
            users = JSON.parse(data);
        } catch {
            users = [];
        }

        const user = users.find(
            u => u.username === username && u.password === password
        );

        if (user) {

            // redirect after login
            res.redirect('/');

        } else {

            res.send("Invalid username or password <a href='/login'>Try Again</a>");

        }

    });

});


// =====================
// START SERVER
// =====================

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});