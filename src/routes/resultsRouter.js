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

        // Convert current UTC time to Pacific Time
        const pacificNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));

        // Get start and end of the day in Pacific Time
        const startOfDay = new Date(pacificNow);
        startOfDay.setHours(0, 0, 0, 0); // Midnight Pacific Time

        const endOfDay = new Date(pacificNow);
        endOfDay.setHours(23, 59, 59, 999); // End of day Pacific Time

        // Convert Pacific Time to UTC (since MongoDB stores times in UTC)
        const startOfDayUTC = new Date(startOfDay.getTime() + startOfDay.getTimezoneOffset() * 60000);
        const endOfDayUTC = new Date(endOfDay.getTime() + endOfDay.getTimezoneOffset() * 60000);

        // Debugging Logs
        console.log("Querying results with:");
        console.log("Player Name:", req.query.name);
        console.log("Start of Day UTC:", startOfDayUTC.toISOString());
        console.log("End of Day UTC:", endOfDayUTC.toISOString());

        // MongoDB Query
        const results = await Result.find({
            name: req.query.name,
            dateTime: { $gte: startOfDayUTC, $lte: endOfDayUTC },
        });

        res.json(results);
    } catch (e) {
        console.error("Error getting results:", e);
        res.status(500).json({ error: "Error getting results. Please try again." });
    }
});



module.exports = router
