const mongoose = require('mongoose')

const infiniteResultsSchema = new mongoose.Schema({
    name: { type: String, required: true },
    guesses: { type: Number, required: true, default: null },
    giveup: { type: Boolean, required: true }
})

module.exports = mongoose.model("InfiniteResult", infiniteResultsSchema)