const mongoose = require("mongoose")

const stintSchema = new mongoose.Schema({
    name: { type: String, required: true},
    team: { type: String, required: true},
    joined: { type: Date, required: true},
    left: { type: Date, default: null}
})

module.exports = mongoose.model('Stint', stintSchema)