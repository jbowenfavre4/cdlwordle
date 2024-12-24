const fs = require('fs')
const players = require('../players.json')

let new_players = []
for (let player of players) {
    player["rings"] = 0
    new_players.push(player)
}

fs.writeFileSync('players.json', JSON.stringify(new_players, null, 2))
console.log('done')