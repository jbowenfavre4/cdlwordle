const express = require("express")
const InfiniteResult = require('../models/infiniteResultModel')
const Player = require("../models/playerModel")
const router = express.Router()
require("dotenv").config()
const Utilities = require("../utilities")

// results routes

router.post('/start', async (req, res) => {
    try {
        const player = await getRandomPlayer()
        const teams = await Utilities.getTeams(player.name)
        const teammates = await Utilities.getTeammates(player.name)
        player.teams = teams
        player.teammates = teammates
        player.age = Utilities.calculateAge(player.dob)
        res.json(player)
        
    } catch(e) {
        console.error('Error saving result: ', e)
        res.status(500).json({
            error: 'Server error, please try again.'
        })
    }
})

router.post('/finish', async (req, res) => {
    if (!req.body.player || !req.body.guesses) {
        console.log(req.body.player, req.body.guesses, req.body.giveup)
        return res.status(400).json({
            message: "Player name, guess count, and giveup required."
        })
    }
    try {
        const doc = new InfiniteResult({
            name: req.body.player,
            guesses: req.body.guesses,
            giveup: req.body.giveup
        })
        await doc.save()
        return res.status(200).json({
            message: "Infinite result saved successfully."
        })
    } catch (e) {
        return res.status(500).json({
            message: "An error occurred: ", e
        })
    }
})

router.get('/results', async (req, res) => {
    if (!req.query.player) {
        return res.status(400).json({
            message: "Player name is required."
        })
    }
    try {
        const results = await InfiniteResult.find({
            name: req.query.player
        })
        filteredResults = results.filter(result => result.giveup !== true)
        const sum = filteredResults.reduce((sum, obj) => sum + obj.guesses, 0)
        return res.status(200).json({
            total: results.length,
            average: (sum / results.length).toFixed(1),
            giveUpPercentage: (((results.length - filteredResults.length)/results.length)*100).toFixed(2)
        })
    } catch (e) {
        return res.status(500).json({
            message: `An error occurred: ${e}`
        })
    }
})

async function getRandomPlayer() {
    try {
        const randomPlayer = await Player.aggregate([{ $sample: { size: 1 } }]);
        return randomPlayer.length > 0 ? randomPlayer[0] : null;
    } catch (error) {
        console.error("Error fetching random player:", error);
        return null;
    }
}

module.exports = router