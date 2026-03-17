const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    topic: { type: String, required: true, lowercase: true }, // e.g., 'java', 'dsa'
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    answer: { type: Number, required: true }, // Index of the correct option (0-3)
    difficulty: { type: String, default: 'medium' } 
});

module.exports = mongoose.model('Question', questionSchema);