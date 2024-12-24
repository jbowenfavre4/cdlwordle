const mongoose = require('../db')
require('dotenv').config()

const dbString = process.env.DB_STRING
console.log(dbString)
const startDate = new Date()

const playerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    fullName: { type: String, required: true },
    nationality: { type: String, required: true },
    dob: { type: Date, default: null },
    rings: { type: Number, required: true },
    wins: { type: Number, required: true }
})

const mysteryPlayerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    date: { type: Date, required: true },
    id: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true
    }
})

const Player = mongoose.model('Player', playerSchema)
const MysteryPlayer = mongoose.model('MysteryPlayer', mysteryPlayerSchema)

async function seedMysteryPlayers() {
    console.log("Generating mystery players:");
    try {
        await mongoose.connect(dbString, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        const players = await Player.find({});
        console.log("Fetched players");

        for (let i = 0; i < 100; i++) {
            // Calculate the target date at 08:00 UTC
            const currentDate = new Date(startDate);
            currentDate.setDate(currentDate.getDate() + i);
            const utcDateAtEight = new Date(Date.UTC(
                currentDate.getUTCFullYear(),
                currentDate.getUTCMonth(),
                currentDate.getUTCDate(),
                8, // 08:00 UTC
                0, // Minutes
                0, // Seconds
                0  // Milliseconds
            ));

            // Pick a random player
            const randomIndex = Math.floor(Math.random() * players.length);
            const randomPlayer = players[randomIndex];

            // Create and save the MysteryPlayer document
            const doc = new MysteryPlayer({
                name: randomPlayer.name,
                date: utcDateAtEight, // Use the 08:00 UTC date
                id: randomPlayer._id
            });
            await doc.save();

            if (i % 10 === 0) {
                console.log('Generated ', i, ' players');
            }
        }
        console.log("Generated 100 mystery players");

    } catch (e) {
        console.log("Error: ", e);
    } finally {
        mongoose.connection.close();
    }
}


seedMysteryPlayers()