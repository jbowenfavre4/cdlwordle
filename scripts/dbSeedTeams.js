const mongoose = require('../db')
require('dotenv').config()
const teams = require('../teams.json')

const dbString = process.env.DB_STRING
console.log(dbString)

const teamSchema = new mongoose.Schema({
    name: { type: String, required: true},
    abb: { type: String, required: true},
    url: { type: String, required: true}
})

const Team = mongoose.model('Team', teamSchema)

async function seedTeams() {
    console.log("inserting teams:")
    try {
        await mongoose.connect(dbString, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        })

        console.log("connected to DB")

        for (let team of teams) {
            console.log(team.name)
            const doc = new Team(team)
            await doc.save()
        }
        console.log("data added successfully")
    } catch(e) {
        console.log("error: ", e)
    } finally {
        mongoose.connection.close()
    }
}

seedTeams()