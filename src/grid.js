const { getJSON } = require('jquery')
const mongoose = require('../db')
require('dotenv').config()
const Player = require("./models/playerModel")
const Stint = require("./models/stintModel")
const utilities = require("./utilities")
const Grid = require("./models/gridModel")

async function getRandomPlayer() {
    try {
        const randomPlayer = await Player.aggregate([{ $sample: { size: 1 } }]);
        return randomPlayer.length > 0 ? randomPlayer[0] : null;
    } catch (error) {
        console.error("Error fetching random player:", error);
        return null;
    }
}

async function getAnswers(rowFilter, colFilter) {
    let answers = []
    let players = []
    let rowPlayers = []
    let colPlayers = []
    switch (rowFilter.type) {
        case "nationality":
            players = await Player.find({nationality: rowFilter.value})
            for (let player of players) {
                rowPlayers.push(player.name)
            }
            break
        case "rings":
            if (rowFilter.value == 0) {
                players = await Player.find({rings: rowFilter.value})
            } else {
                players = await Player.find({rings: { $gte: rowFilter.value }})
            }
            for (let player of players) {
                rowPlayers.push(player.name)
            }
            break
        case "wins":
            if (rowFilter.value == 0) {
                players = await Player.find({wins: rowFilter.value})
            } else {
                players = await Player.find({wins: { $gte: rowFilter.value }})
            }
            for (let player of players) {
                rowPlayers.push(player.name)
            }
            break
        case "age":
            const cutoffDate = new Date();
            cutoffDate.setFullYear(cutoffDate.getFullYear() - rowFilter.value);
            players = await Player.find({ dob: { $lte: cutoffDate } });
            for (let player of players) {
                rowPlayers.push(player.name)
            }
            break
        case "teammates":
            players = await utilities.getTeammates(rowFilter.value)
            for (let player of players) {
                rowPlayers.push(player)
            }
            break
        case "teams":
            let stints = await Stint.find({team: rowFilter.value})
            for (let stint of stints) {
                if (!rowPlayers.includes(stint.name)) {
                    rowPlayers.push(stint.name)
                }
            }
            break
    }
    switch (colFilter.type) {
        case "nationality":
            players = await Player.find({nationality: colFilter.value})
            for (let player of players) {
                colPlayers.push(player.name)
            }
            break
        case "rings":
            if (colFilter.value == 0) {
                players = await Player.find({rings: colFilter.value})
            } else {
                players = await Player.find({rings: { $gte: colFilter.value }})
            }
            
            for (let player of players) {
                colPlayers.push(player.name)
            }
            break
        case "wins":
            if (colFilter.value == 0) {
                players = await Player.find({wins: colFilter.value})
            } else {
                players = await Player.find({wins: { $gte: colFilter.value }})
            }
            for (let player of players) {
                colPlayers.push(player.name)
            }
            break
        case "age":
            const cutoffDate = new Date();
            cutoffDate.setFullYear(cutoffDate.getFullYear() - colFilter.value);
            players = await Player.find({ dob: { $lte: cutoffDate } });
            for (let player of players) {
                colPlayers.push(player.name)
            }
            break
        case "teammates":
            players = await utilities.getTeammates(colFilter.value)
            for (let player of players) {
                colPlayers.push(player)
            }
            break
        case "teams":
            let stints = await Stint.find({team: colFilter.value})
            for (let stint of stints) {
                if (!colPlayers.includes(stint.name)) {
                    colPlayers.push(stint.name)
                }
            }
    }
    for (let player of rowPlayers) {
        if (colPlayers.includes(player)) {
            answers.push(player)
        }
    }
    return answers
}

async function makeGrid() {
    let valid = false
    let options = ["nationality", "rings", "wins", "age", "teammates", "teams"]
    let rows = []
    let cols = []
    let answersGrid = [null, null, null, null, null, null, null, null, null]
    while (!valid) {
        rows = []
        cols = []
        valid = true
        answersGrid = [null, null, null, null, null, null, null, null, null]
        for (let i = 0; i<3; i++) {
            const startingPlayer = await getRandomPlayer()
            const stints = await Stint.find({name: startingPlayer.name})
            let teams = []
            for (let stint of stints) {
                if (!teams.includes(stint.team)) {
                    teams.push(stint.team)
                }
            }
            const colType = options[Math.floor(Math.random() * options.length)]
            let optionsFiltered = options.filter(item => item !== colType)
            switch (colType) {
                case "nationality":
                    cols.push({
                        type: "nationality",
                        label: startingPlayer[colType],
                        value: startingPlayer[colType]
                    })
                    break
                case "rings":
                case "wins":
                    if (startingPlayer[colType] == 0) {
                        cols.push({
                            type: colType,
                            label: `0 ${colType}`,
                            value: "0"
                        })
                    } else {
                        cols.push({
                            type: colType,
                            value: `${startingPlayer[colType]}`,
                            label: `${startingPlayer[colType]}+ ${colType}`
                        })
                    }
                    break
                case "teammates":
                    const teammates = await utilities.getTeammates(startingPlayer.name)
                    const randomTeammate = teammates[Math.floor(Math.random() * teammates.length)]
                    cols.push({
                        type: colType,
                        label: `Teamed with ${randomTeammate}`,
                        value: randomTeammate
                    })
                    break
                case "age":
                    cols.push({
                        type: colType,
                        value: utilities.calculateAge(startingPlayer.dob),
                        label: `At least ${utilities.calculateAge(startingPlayer.dob)} years old`
                    })
                    break
                case "teams":
                    const team = teams[Math.floor(Math.random() * teams.length)]
                    cols.push({
                        type: colType,
                        value: team,
                        label: team
                    })
                    break
            }
            let rowType = optionsFiltered[Math.floor(Math.random() * optionsFiltered.length)]
            switch (rowType) {
                case "nationality":
                    rows.push({
                        type: rowType,
                        label: startingPlayer[rowType],
                        value: startingPlayer[rowType]
                    })
                    break
                case "rings":
                case "wins":
                    if (startingPlayer[rowType] == 0) {
                        rows.push({
                            type: rowType,
                            label: `0 ${rowType}`,
                            value: "0"
                        })
                    } else {
                        rows.push({
                            type: rowType,
                            value: `${startingPlayer[rowType]}`,
                            label: `${startingPlayer[rowType]}+ ${rowType}`
                        })
                    }
                    
                    break
                case "teammates":
                    const teammates = await utilities.getTeammates(startingPlayer.name)
                    const randomTeammate = teammates[Math.floor(Math.random() * teammates.length)]
                    rows.push({
                        type: rowType,
                        label: `Teamed with ${randomTeammate}`,
                        value: randomTeammate
                    })
                    break
                case "age":
                    rows.push({
                        type: rowType,
                        value: utilities.calculateAge(startingPlayer.dob),
                        label: `At least ${utilities.calculateAge(startingPlayer.dob)} years old`
                    })
                    break
                case "teams":
                    const team = teams[Math.floor(Math.random() * teams.length)]
                    rows.push({
                        type: rowType,
                        value: team,
                        label: team
                    })
                    break
            }
        }

        for (let i = 0; i < 3; i++) {
            // check rows and cols for repeat categories
            for (let j = 0; j < 3; j++) {
                if (i != j && rows[i].type === rows[j].type && (
                    // no repeat age
                    rows[i].type === "age" 

                    // rings can repeat with different values
                    || (rows[i].type === "rings" && rows[i].value == rows[j].value)

                    // wins can repeat with different values
                    || (rows[i].type === "wins" && rows[i].value == rows[j].value)

                    // nationality can repeat with different values
                    || (rows[i].type === "nationality" && rows[i].value == rows[j].value)

                    // same team cannot repeat
                    || (rows[i].type === "teams" && rows[i].value === rows[j].value)

                )) {
                    valid = false
                    console.log('invalid check for rows')
                    console.log(rows[i])
                    console.log(rows[j])
                }
                if (i != j && cols[i].type === cols[j].type && (
                    // no repeat age
                    cols[i].type ===  "age" 
                    
                    // rings can repeat with different values
                    || (cols[i].type === "rings" && cols[i].value == cols[j].value)

                    // wins can repeat with different values
                    || (cols[i].type === "wins" && cols[i].value == cols[j].value)

                    // nationality can repeat with different values
                    || (cols[i].type === "nationality" && cols[i].value == cols[j].value)

                    // same team cannot repeat
                    || (cols[i].type === "teams" && cols[i].value === cols[j].value)

                )) {
                    console.log('invalid check for columns')
                    console.log(cols[i])
                    console.log(cols[j])
                    valid = false
                }
                
                // check rows against cols

                if (rows[i].type == "age" && cols[j] == "age") {
                    console.log("row: ", rows[i])
                    console.log("col: ", cols[j])
                    console.log('multiple age filters')
                    valid = false
                }
                if (rows[i].type == "rings" && cols[j].type == "rings") {
                    console.log("row: ", rows[i])
                    console.log("col: ", cols[j])
                    console.log('multiple rings filters')
                    valid = false
                }
                if (rows[i].type == "wins" && cols[j].type == "wins") {
                    console.log("row: ", rows[i])
                    console.log("col: ", cols[j])
                    console.log("multiple wins filters")
                    valid = false
                }
                if (rows[i].type == "nationality" && cols[j].type == "nationality") {
                    console.log("row: ", rows[i])
                    console.log("col: ", cols[j])
                    console.log("multiple nationality filters")
                    valid = false
                }

                if (rows[i].type == "teams" && cols[j].value === rows[i].value) {
                    console.log("repeated team in row and column. Invalid")
                    valid = false
                }

                if (rows[i].type == "teammates" && cols[j].value === rows[i].valuel) {
                    console.log("repeated teammate in row and column, invalid")
                    valid = false
                }
                
            }
        }

        if (valid) {
            answersGrid[0] = await getAnswers(rows[0], cols[0])
            answersGrid[1] = await getAnswers(rows[0], cols[1])
            answersGrid[2] = await getAnswers(rows[0], cols[2])
            answersGrid[3] = await getAnswers(rows[1], cols[0])
            answersGrid[4] = await getAnswers(rows[1], cols[1])
            answersGrid[5] = await getAnswers(rows[1], cols[2])
            answersGrid[6] = await getAnswers(rows[2], cols[0])
            answersGrid[7] = await getAnswers(rows[2], cols[1])
            answersGrid[8] = await getAnswers(rows[2], cols[2])
            for (let array of answersGrid) {
                if (array.length == 0) {
                    console.log('puzzle not solvable')
                    valid = false
                }
            }
        }
    }

    console.log(rows)
    console.log(cols)
    console.log(answersGrid)
    
    return {
        rows: rows,
        cols: cols,
        answers: answersGrid
    }
}

module.exports = makeGrid