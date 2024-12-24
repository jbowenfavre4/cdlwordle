const mongoose = require('mongoose')

const gameResultSchema = new mongoose.Schema({
    name: { type: String, required: true },
    guesses: { type: Number, required: true },
})

module.exports = mongoose.model("GameResult", gameResultSchema)