const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = 3000;

// middleware
app.use(bodyParser.urlencoded({ extended: true }));

// serve static files
app.use(express.static("public"));

// show register page
app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "register.html"));
});

// handle register form
app.post("/register", (req, res) => {

    const username = req.body.name;
    const email = req.body.email;
    const password = req.body.password;

    console.log("Username:", username);
    console.log("Email:", email);
    console.log("Password:", password);

    // after successful register
    res.send("Registration Successful!");
});

// login page route
app.get("/login", (req, res) => {
    res.send("Login Page Here");
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});