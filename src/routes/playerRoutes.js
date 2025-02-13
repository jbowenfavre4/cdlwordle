const express = require("express")
const Player = require("../models/playerModel")
const utilities = require("../utilities")
const router = express.Router()
require("dotenv").config()

// player routes

router.get('/search', async (req, res) => {
    const searchQuery = req.query.q || ''

    try {
        const players = await Player.find({
            name: { $regex: searchQuery, $options: 'i' }
        }, 'name').limit(10)
        
        res.json(players)
    } catch(e) {
        console.error('Error fetching playeres: ', e)
        res.status(500).json({
            error: 'Server error, please try again.'
        })
    }
})

router.get('', async (req, res) => {
    if (!req.query.player) {
        return res.status(400).json({
            message: "Player is required."
        })
    }
    try {
        const player = await Player.findOne({name: req.query.player})
        if (player) {
            const teams = await utilities.getTeams(player.name)
            const teammates = await utilities.getTeammates(player.name)
            return res.json({
                name: player.name,
                teams: teams,
                nationality: player.nationality,
                age: utilities.calculateAge(player.dob),
                rings: player.rings,
                wins: player.wins,
                teammates: teammates,
                age: utilities.calculateAge(player.dob)
            })
        } else {
            return res.status(404).json({
                message: "Player not found"
            })
        }
        
    } catch(e) {
        return res.status(500).json({
            message: `Unable to get player: ${e}`
        })
    }
})

router.post('/guess', async (req, res) => {
    if (req.body.giveup && req.body.giveup === true) {
        const mysteryPlayer = await utilities.findTodaysPlayer()
        if (!mysteryPlayer) {
            return res.status(500).json({
                message: "Server error. Please try again."
            })
        }
        let mysteryTeammates = await utilities.getTeammates(mysteryPlayer.name)
        const mysteryTeams = await utilities.getTeams(mysteryPlayer.name)
        return res.status(200).json({
            correct: true,
            gaveup: true,
            name: mysteryPlayer.name,
            age: utilities.calculateAge(mysteryPlayer.dob),
            nationality: mysteryPlayer.nationality,
            rings: mysteryPlayer.rings,
            wins: mysteryPlayer.wins,
            teammates: mysteryTeammates,
            teams: mysteryTeams
        })
    }

    if (!req.body.player) {
        return res.status(400).json({
            message: "Please provide the guessed player."
        })
    }

    const guessedPlayer = await Player.findOne({ name: { $regex: new RegExp(`^${req.body.player}$`, 'i') } })
    if (!guessedPlayer) {
        return res.status(404).json({
            message: "Player not found."
        })
    }

    const mysteryPlayer = await utilities.findTodaysPlayer()
    if (!mysteryPlayer) {
        return res.status(500).json({
            message: "Server error. Please try again."
        })
    }

    let mysteryTeammates = await utilities.getTeammates(mysteryPlayer.name)
    const mysteryTeams = await utilities.getTeams(mysteryPlayer.name)
    const guessedTeams = await utilities.getTeams(guessedPlayer.name)

    if (mysteryPlayer._id.equals(guessedPlayer._id)) {
        return res.status(200).json({
            correct: true,
            gaveup: false,
            name: mysteryPlayer.name,
            age: utilities.calculateAge(mysteryPlayer.dob),
            nationality: mysteryPlayer.nationality,
            rings: mysteryPlayer.rings,
            wins: mysteryPlayer.wins,
            teammates: mysteryTeammates,
            teams: mysteryTeams
        })
    }
    
    let sharedTeams = []
    for (let team of mysteryTeams) {
        if (guessedTeams.includes(team) && !sharedTeams.includes(team))
            sharedTeams.push(team)
    }

    return res.status(200).json({
        correct: false,
        name: guessedPlayer.name,
        nationality: {
            value: guessedPlayer.nationality,
            correct: guessedPlayer.nationality == mysteryPlayer.nationality
        },
        age: {
            value: utilities.calculateAge(guessedPlayer.dob),
            correct: utilities.calculateAge(guessedPlayer.dob) == utilities.calculateAge(mysteryPlayer.dob),
            over: utilities.calculateAge(guessedPlayer.dob) > utilities.calculateAge(mysteryPlayer.dob)
        },
        rings: {
            value: guessedPlayer.rings,
            correct: guessedPlayer.rings === mysteryPlayer.rings,
            over: guessedPlayer.rings > mysteryPlayer.rings
        },
        wins: {
            value: guessedPlayer.wins,
            correct: guessedPlayer.wins === mysteryPlayer.wins,
            over: guessedPlayer.wins > mysteryPlayer.wins
        },
        teammates: mysteryTeammates.includes(guessedPlayer.name),
        teams: sharedTeams,
        allTeams: guessedTeams
    })
})

module.exports = router