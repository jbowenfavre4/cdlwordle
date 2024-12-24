const mongoose = require('../db')
const fs = require('fs')
require('dotenv').config()
const players = require('../players.json')

const dbString = process.env.DB_STRING
console.log(dbString)

const playerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    fullName: { type: String, required: true },
    nationality: { type: String, required: true },
    dob: { type: Date, default: null },
    rings: { type: Number, required: true },
    wins: { type: Number, required: true }
})

const Player = mongoose.model('Player', playerSchema)

async function seedPlayers() {
    console.log("inserting players:")
    try {
        await mongoose.connect(dbString, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        })

        console.log("connected to DB")

        for (let player of players) {
            console.log(player.name)
            const doc = new Player(player)
            await doc.save()
        }
        console.log("data added successfully")
    } catch(e) {
        console.log("error: ", e)
    } finally {
        mongoose.connection.close()
    }
}

seedPlayers()