require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Question = require('./models/Question');

const DATA_DIR = path.join(__dirname, 'data');

async function migrate() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB...");

    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && f !== 'users.json' && f !== 'marks.json');

    for (const file of files) {
        const topic = file.replace('.json', '');
        const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));

        const formatted = data.map(q => ({
            topic: topic.toLowerCase(),
            question: q.question,
            options: q.options,
            answer: q.answer
        }));

        await Question.insertMany(formatted);
        console.log(`✅ Migrated topic: ${topic}`);
    }

    console.log("Migration Complete! You can now delete the migrate.js file.");
    process.exit();
}

migrate();