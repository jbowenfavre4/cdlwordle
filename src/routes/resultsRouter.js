const express = require("express")
const Result = require('../models/gameResultModel')
const router = express.Router()
require("dotenv").config()

// results routes

router.post('/', async (req, res) => {
    if (!req.body.name || (!req.body.guesses && req.body.guesses != null)) {
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
        return res.status(500).json({
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

        // Query MongoDB
        const results = await Result.find({
            name: req.query.name,
            dateTime: { $gte: startOfDayPST, $lte: endOfDayPST },
        });

        let total = 0
        let average = 0
        let giveupPercent = 0
        let numbers = {}

        if (results.length > 0) {
            const filteredResults = results.filter(result => result.guesses !== null)
            if (results.length > 0 && results.length - filteredResults.length > 0) {
                giveupPercent = (((results.length - filteredResults.length)/results.length)*100).toFixed(2)
            }
            const withoutOnes = results.filter(result => result.guesses!== null && result.guesses!== 1)
            const sum = withoutOnes.reduce((sum, obj) => sum + obj.guesses, 0)
            const mean = sum / withoutOnes.length
            average = parseFloat(mean.toFixed(1))

            numbers = results.reduce((acc, result) => {
                if (result.guesses !== null && result.guesses !== undefined) {
                    acc[result.guesses] = (acc[result.guesses] || 0) + 1
                }
                return acc
            }, {})
        }

        res.json({
            total: results.length,
            average: average,
            giveUpPercent: giveupPercent,
            numbers: numbers
        });
    } catch (e) {
        console.error("Error getting results:", e);
        res.status(500).json({ error: "Error getting results. Please try again." });
    }
});



module.exports = router
