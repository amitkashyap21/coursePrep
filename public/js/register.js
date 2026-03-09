const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Path to your users database
const USERS_FILE = path.join(__dirname, "users.json");

// Middleware
app.set('view engine', 'ejs'); // Set EJS as the template engine
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Helper Function: Initialize/Read Users
// This ensures users.json is created automatically if it doesn't exist
const getUsers = () => {
    if (!fs.existsSync(USERS_FILE)) {
        // Create the file with an empty array if it's missing
        fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
        return [];
    }
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data || "[]");
    } catch (error) {
        return [];
    }
};

// --- ROUTES ---

// Show register page
app.get("/register", (req, res) => {
    res.render("register"); 
});

// Handle register form
app.post("/register", (req, res) => {
    const { name, email, password } = req.body;
    let users = getUsers();

    // Check if user already exists (by email or username)
    const alreadyExists = users.some(u => u.email === email || u.name === name);

    if (alreadyExists) {
        return res.send("<h1>Error</h1><p>User already exists with this email or username!</p><a href='/register'>Try Again</a>");
    }

    // Add new user
    users.push({ name, email, password });

    // Save back to JSON file
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

    console.log(`New user registered: ${name}`);
    res.redirect("/login"); // Redirect to login after successful signup
});

// Show login page
app.get("/login", (req, res) => {
    res.render("login");
});

// Handle login form
app.post("/login", (req, res) => {
    const { email, password } = req.body;
    const users = getUsers();

    // Check if any accounts exist at all
    if (users.length === 0) {
        return res.send("<h1>Error</h1><p>No accounts exist yet. Please register first!</p><a href='/register'>Register here</a>");
    }

    // Find user with matching email and password
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        res.send(`<h1>Welcome Back, ${user.name}!</h1><p>Login successful.</p>`);
    } else {
        res.send("<h1>Invalid Credentials</h1><p>The email or password you entered is incorrect.</p><a href='/login'>Try Again</a>");
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});