const mongoose = require('mongoose')

const playerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    fullName: { type: String, required: true },
    nationality: { type: String, required: true },
    dob: { type: Date, default: null },
    rings: { type: Number, required: true },
    wins: { type: Number, required: true }
})

module.exports = mongoose.model("Player", playerSchema)