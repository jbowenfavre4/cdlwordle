const mongoose = require('mongoose');
require('dotenv').config();

// Replace with your MongoDB connection string
const dbUri = process.env.DB_STRING;

// Define your MysteryPlayer schema (if not already defined)
const mysteryPlayerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    date: { type: Date, required: true }, // Use `date` for timestamp
    id: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true
    }
});

const MysteryPlayer = mongoose.model('MysteryPlayer', mysteryPlayerSchema);

async function updateTimestampsToMT() {
  try {
    await mongoose.connect(dbUri, { useNewUrlParser: true, useUnifiedTopology: true });

    const players = await MysteryPlayer.find();
    console.log(players);

    for (const player of players) {
      if (player.date) { // Use the correct field name
        // Convert existing timestamp to UTC
        const originalDate = new Date(player.date);

        // Extract the date components
        const year = originalDate.getUTCFullYear();
        const month = originalDate.getUTCMonth(); // Month is 0-indexed
        const day = originalDate.getUTCDate();

        // Create a new date for 1:00 AM MST (UTC-7)
        const updatedDate = new Date(Date.UTC(year, month, day, 8, 0, 0)); // 8 AM UTC = 1 AM MST

        // Update the date in the database
        player.date = updatedDate;
        await player.save();
      }
    }

    console.log('Timestamps updated successfully.');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error updating timestamps:', err);
  }
}

// Run the update function
updateTimestampsToMT();
