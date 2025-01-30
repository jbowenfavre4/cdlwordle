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

router.get('/', async (req, res) => {
    if (!req.query.name) {
        return res.status(400).json({
            message: "Name is required."
        })
    }

    try {
        const now = new Date()
        const pacificOffset = now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
        const pacificNow = new Date(pacificOffset)
        const startOfDay = new Date(pacificNow)
        startOfDay.setHours(0,0,0,0)
        const endOfDay = new Date(pacificNow)
        endOfDay.setHours(23, 59, 59, 999)
        const startOfDayUTC = new Date(startOfDay.toISOString())
        const endOfDayUTC = new Date(endOfDay.toISOString())

        const results = await Result.find({
            name: req.query.name,
            dateTime: { $gte: startOfDayUTC, $lte: endOfDayUTC }
        })
        res.json(results)
    } catch(e) {
        console.error('error getting results: ', e)
        res.status(500).json({
            error: "Error getting results. Please try again."
        })
    }
})

module.exports = router
