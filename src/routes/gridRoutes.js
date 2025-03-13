const express = require("express")
const router = express.Router()
require("dotenv").config()
const GridPuzzle = require('../models/gridModel')
const GridResult = require("../models/gridResultModel")
const mongoose = require("mongoose")

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

router.get('/results', async (req, res) => {
    if (!req.query.gridId) {
        return res.status(400).json({
            message: "Grid ID is required."
        })
    }
    try {
        const results = await GridResult.find({ gridId: new mongoose.Types.ObjectId(req.query.gridId) })
        


        return res.status(200).json(compileStats(results))
    } catch(e) {
        console.error("Error getting grid result: ", e)
        return res.status(500).json({
            error: "Server error, please try again."
        })
    }
}) 

router.post('/result', async (req, res) => {
    if (!req.body.squares || !req.body.gridId) {
        return res.status(400).json({
            message: "Grid ID and squares are required."
        })
    }
    try {
        const doc = new GridResult({
            squares: req.body.squares,
            gridId: req.body.gridId
        })
        await doc.save()
        return res.status(200).json({
            message: "Grid result saved successfully."
        })
    } catch(e) {
        console.error("Error saving grid result: ", e)
        return res.status(500).json({
            error: "Server error, please try again."
        })
    }
})

module.exports = router

function compileStats(results) {
    const numEntries = results.length
    const stats = Array(9).fill(null).map(() => ({
        totalFilled: 0,
        counts: {} 
    }))

    results.forEach(({ squares }) => {
        squares.forEach((name, index) => {
            if (name !== "") {
                stats[index].totalFilled++
                stats[index].counts[name] = (stats[index].counts[name] || 0) + 1
            }
        })
    })
    const finalStats = stats.map((squareStat, index) => {
        const filledPercentage = (squareStat.totalFilled / numEntries) * 100
        const namePercentages = Object.entries(squareStat.counts).map(([name, count]) => ({
            name,
            percentage: (count / squareStat.totalFilled) * 100
        }))

        return {
            position: index,
            filledPercentage: filledPercentage.toFixed(2),
            nameStats: namePercentages.sort((a, b) => b.percentage - a.percentage)
        }
    })

    return finalStats
}