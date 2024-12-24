const mongoose = require('mongoose')

const teamSchema = new mongoose.Schema({
    name: { type: String, required: true},
    abb: { type: String, required: true},
    url: { type: String, required: true}
})

module.exports = mongoose.model("Team", teamSchema)