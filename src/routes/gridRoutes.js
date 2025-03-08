const express = require("express")
const router = express.Router()
require("dotenv").config()
const GridPuzzle = require('../models/gridModel')

// results routes

router.get('/today', async (req, res) => {
    try {
        const now = new Date()
        const pstOffset = -8
        const nowInPST = new Date(now.getTime() + pstOffset * 60 * 60 * 1000)
        const targetDate = new Date(Date.UTC(
            nowInPST.getUTCFullYear(),
            nowInPST.getUTCMonth(),
            nowInPST.getUTCDate(),
            8, 0, 0
        ))
        const puzzle = await GridPuzzle.findOne({ date: targetDate })
        if (!puzzle) {
            console.log('no puzzle found for todays date')
            return res.status(500).json({
                message: "no grid found."
            })
        }
        return res.json(puzzle)
    } catch(e) {
        console.log("error getting today's grid: ", e)
    }
})

module.exports = router