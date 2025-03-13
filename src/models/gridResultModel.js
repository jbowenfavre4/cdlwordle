const mongoose = require('mongoose')

const gridResultSchema = new mongoose.Schema({
    squares: { type: [String], required: true },
    gridId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "GridPuzzle" }
})

module.exports = mongoose.model("GridResult", gridResultSchema)