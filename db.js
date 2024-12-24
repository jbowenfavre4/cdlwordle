// db.js
const mongoose = require('mongoose');
require('dotenv').config();  // Loads variables from .env file

const dbString = process.env.DB_STRING;
console.log(dbString)

if (!dbString) {
    console.error('DB_STRING is not defined in .env file');
    process.exit(1);
}

// Connect to the MongoDB database
mongoose.connect(dbString, {
    useUnifiedTopology: true,
})
.then(() => {
    console.log('MongoDB connected successfully');
})
.catch((err) => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
});

// Export mongoose to use it in other files
module.exports = mongoose;
