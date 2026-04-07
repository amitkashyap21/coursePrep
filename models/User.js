const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    
    // Recovery System Fields
    backupCodes: [{
        code: { type: String, required: true }, 
        used: { type: Boolean, default: false }
    }],
    
    // Track when the last reset happened
    lastPasswordReset: { type: Date }
});

module.exports = mongoose.model('User', userSchema);