const mongoose = require('mongoose')

const mysteryPlayerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    date: { type: Date, required: true },
    id: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true
    }
})

module.exports = mongoose.model("MysteryPlayer", mysteryPlayerSchema)