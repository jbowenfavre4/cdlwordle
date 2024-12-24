const mongoose = require('../db')
require('dotenv').config()
const stints = require('../tableData.json')

const dbString = process.env.DB_STRING
console.log(dbString)

const stintSchema = new mongoose.Schema({
    name: { type: String, required: true},
    team: { type: String, required: true},
    joined: { type: Date, required: true},
    left: { type: Date, default: null}
})

const Stint = mongoose.model('Stint', stintSchema)

async function seedStints() {
    console.log("inserting stints:")
    try {
        await mongoose.connect(dbString, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        })

        console.log("connected to DB")

        for (let stint of stints) {
            console.log(stint.name, stint.team)
            const doc = new Stint({
                name: stint.name,
                team: stint.team,
                joined: new Date(stint.joined),
                left: formatLeft(stint.left)

            })
            await doc.save()
        }
        console.log("data added successfully")
    } catch(e) {
        console.log("error: ", e)
    } finally {
        mongoose.connection.close()
    }
}

seedStints()

function formatLeft(date) {
    if (date === '') {
        return null
    } else {
        return new Date(date)
    }
}