const mongoose = require('mongoose');
const markSchema = new mongoose.Schema({
    email: { type: String, required: true },
    topic: String,
    score: Number, // Storing as number 0-5
    date: { type: String, default: () => new Date().toLocaleDateString() },
    results: Array // Store the detailed Q&A results here
});
module.exports = mongoose.model('Mark', markSchema);