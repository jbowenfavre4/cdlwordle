const mongoose = require('../db')
require('dotenv').config()

const dbString = process.env.DB_STRING
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

// Helper function to shuffle an array (Fisher-Yates algorithm)
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
}

async function seedMysteryPlayers() {
    try {
        await mongoose.connect(dbString, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        let players = await Player.find({});
        if (players.length === 0) {
            console.log("No players found!");
            return;
        }

        console.log("Fetched players");

        // Shuffle players so they appear in random order
        players = shuffle(players);

        for (let i = 2; i < players.length + 2; i++) {
            // Calculate the target date at 08:00 UTC
            const currentDate = new Date(startDate);
            currentDate.setDate(currentDate.getDate() + i);
            const utcDateAtEight = new Date(Date.UTC(
                currentDate.getUTCFullYear(),
                currentDate.getUTCMonth(),
                currentDate.getUTCDate(),
                8, 0, 0, 0
            ));

            // Pick the next player in the shuffled order
            const randomPlayer = players[i - 2];

            // Create and save the MysteryPlayer document
            const doc = new MysteryPlayer({
                name: randomPlayer.name,
                date: utcDateAtEight,
                id: randomPlayer._id
            });
            await doc.save();

            if (i % 10 === 0) {
                console.log('Generated ', i, ' mystery players');
            }
        }

        console.log("Finished generating unique mystery players!");

    } catch (e) {
        console.log("Error: ", e);
    } finally {
        mongoose.connection.close();
    }
}

seedMysteryPlayers();
