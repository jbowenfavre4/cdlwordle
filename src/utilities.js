const MysteryPlayer = require("./models/mysteryPlayerModel")
const Player = require("./models/playerModel")
const Stint = require("./models/stintModel")

function wereTeammates(stint1, stint2) {
    const stint1Left = stint1.left ? new Date(stint1.left) : new Date(); // Default to current date if null
    const stint2Left = stint2.left ? new Date(stint2.left) : new Date(); // Default to current date if null
  
    return (
      stint1.team === stint2.team && // Check if they were on the same team
      new Date(stint1.joined) < stint2Left && // Check overlap condition
      stint1Left > new Date(stint2.joined)
    );
}

async function getTeammates(playerName) {
    try {
        const playerStints = await Stint.find({ name: playerName })
        let teammates = []

        for (let stint of playerStints) {
            const stints = await Stint.find({ name: { $ne: playerName }, team: stint.team });
            for (let compareStint of stints) {
                if (wereTeammates(stint, compareStint) && !teammates.includes(compareStint.name)) {
                    teammates.push(compareStint.name)
                }
            }
        }
        return teammates
    } catch(e) {
        console.error("error getting teammates: ", e)
        return []
    }
    
}

async function getTeams(playerName) {
    try {
        const playerStints = await Stint.find({ name: playerName })
        let teams = []
        for (let stint of playerStints) {
            if (!teams.includes(stint.team)) {
                teams.push(stint.team)
            }
        }
        return teams
    } catch(e) {
        console.error("error getting teams: ", e)
        return []
    }
}

async function findTodaysPlayer() {
    try {
        const now = new Date();

        // Calculate the current time in PST
        const pstOffset = -8; // PST is UTC-8 during standard time
        const nowInPST = new Date(now.getTime() + pstOffset * 60 * 60 * 1000);

        // Construct today's date at `08:00:00` UTC, based on PST
        const targetDate = new Date(Date.UTC(
            nowInPST.getUTCFullYear(),
            nowInPST.getUTCMonth(),
            nowInPST.getUTCDate(),
            8, 0, 0 // 08:00:00 UTC
        ));

        // Query the database
        const player = await MysteryPlayer.findOne({ date: targetDate });

        if (!player) {
            console.log('No player found with the specified time on today’s date.');
            return null;
        }

        // Fetch player details
        const playerInfo = await Player.findOne({ name: player.name });
        if (!playerInfo) {
            throw new Error('Mystery player not found.');
        }

        return playerInfo;
    } catch (err) {
        console.error('Error finding player:', err);
        return null;
    }
}
  
  

function calculateAge(dob) {
    if (dob == null) {
        return "Unknown"
    }
    const dobDate = new Date(dob); // Convert the DOB string to a Date object
    const today = new Date(); // Get today's date
  
    let age = today.getFullYear() - dobDate.getFullYear(); // Calculate the difference in years
  
    // Adjust if the birthday hasn't occurred yet this year
    const hasHadBirthday = 
      today.getMonth() > dobDate.getMonth() || 
      (today.getMonth() === dobDate.getMonth() && today.getDate() >= dobDate.getDate());
      
    if (!hasHadBirthday) {
      age--;
    }
  
    return age;
}

module.exports = {
    calculateAge,
    findTodaysPlayer,
    getTeammates,
    getTeams
}