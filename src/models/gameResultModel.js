const mongoose = require('mongoose')

const gameResultSchema = new mongoose.Schema({
    name: { type: String, required: true },
    guesses: { type: Number, required: false, default: null },
    dateTime: {type: Date, required: false}
})

module.exports = mongoose.model("GameResult", gameResultSchema)