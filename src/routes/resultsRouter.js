const express = require("express")
const Result = require('../models/gameResultModel')
const router = express.Router()
require("dotenv").config()

// results routes

router.post('/', async (req, res) => {
    if (!req.body.name || !req.body.guesses) {
        return res.status(400).json({
            message: "Name and guesses are required."
        })
    }

    const now = new Date()

    try {
        const doc = new Result({
            name: req.body.name,
            guesses: req.body.guesses,
            dateTime: now
        })
        await doc.save()
        return res.status(200).json({
            message: "Result saved successfully."
        })
    } catch(e) {
        console.error('Error saving result: ', e)
        res.status(500).json({
            error: 'Server error, please try again.'
        })
    }
})

router.get("/", async (req, res) => {
    if (!req.query.name) {
        return res.status(400).json({ message: "Name is required." });
    }

    try {
        const now = new Date();

        // Convert current time to Pacific Time
        const pacificNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));

        // Get today's Pacific date (year, month, day only)
        const pacificYear = pacificNow.getFullYear();
        const pacificMonth = pacificNow.getMonth();
        const pacificDay = pacificNow.getDate();

        // Define Midnight and End of Day in Pacific Time
        const startOfDayPST = new Date(Date.UTC(pacificYear, pacificMonth, pacificDay, 8, 0, 0, 0)); // 00:00 PST = 08:00 UTC
        const endOfDayPST = new Date(Date.UTC(pacificYear, pacificMonth, pacificDay + 1, 7, 59, 59, 999)); // 23:59 PST = 07:59 UTC next day

        // Debugging logs
        console.log("Querying results with:");
        console.log("Player Name:", req.query.name);
        console.log("Start of Day UTC:", startOfDayPST.toISOString());
        console.log("End of Day UTC:", endOfDayPST.toISOString());

        // Query MongoDB
        const results = await Result.find({
            name: req.query.name,
            dateTime: { $gte: startOfDayPST, $lte: endOfDayPST },
        });

        res.json(results);
    } catch (e) {
        console.error("Error getting results:", e);
        res.status(500).json({ error: "Error getting results. Please try again." });
    }
});



module.exports = router
