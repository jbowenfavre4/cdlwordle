const fs = require('fs');
const history = require('../tableData');

let players = [];

function playerExists(name, players) {
    for (let player of players) {
        if (name === player.name) {
            return true
        }
    }
    return false
};

for (let playerTeam of history) {
    if (!playerExists(playerTeam.name, players)) {
        console.log(`adding ${playerTeam.name} to list`)
        players.push({
            name: playerTeam.name,
            fullName: playerTeam.fullName,
            nationality: playerTeam.nationality
        })
    }
}

console.log("Player count: ", players.length)

fs.writeFileSync('players.json', JSON.stringify(players, null, 2));