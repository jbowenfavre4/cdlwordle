const mongoose = require('mongoose')

const gridSchema = new mongoose.Schema({
    date: { type: Date, required: true, unique: true },
    rows: { type: [{ type: Object}], required: true },
    cols: { type: [{ type: Object}], required: false},
    answers: {type: [[String]], required: false},
    createdAt: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model("GridPuzzle", gridSchema)