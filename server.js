const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

// Middleware to serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// ROUTES (add files to /views)

// API 

app.listen(3000, () => console.log('Server: http://localhost:3000'));