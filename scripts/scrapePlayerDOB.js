const puppeteer = require('puppeteer');
const fs = require('fs');
const players = require("../players.json");

const regions = [
    "North_American_Players",
    "European_Players",
    "Asia_Pacific_Players",
    "Latin_American_Players"
]

async function getDOBs(players) {
    let player_names_ages = []
    let i = 1;

    for (let region of regions) {
        console.log('Scraping page for ', region);
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        // page.on('console', (msg) => {
        //     console.log('Browser log:', msg.text()); // Logs from browser context
        // });

        await page.goto(`https://cod-esports.fandom.com/wiki/${region}`, { timeout: 120000 });
        // await page.waitForNavigation({ waitUntil: "load" });

        await page.evaluate(() => {
            if (typeof window.jQuery === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
                document.head.appendChild(script);
                return new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                });
            }
        });

        console.log("Page loaded, parsing table")

        const stuff = await page.evaluate(() => {
            const rows = [];
            const tables = [$(".content1"), $(".content2"), $(".content3")]
            for (let table of tables) {
                table.find('tbody tr').each((index, playerRow) => {
                    const playerName = $(playerRow).find("td:first").text().trim();
                    const playerDOB = $(playerRow).find("td.field_Birthdate").text().trim()
                    rows.push({
                        name: playerName,
                        dob: playerDOB
                    });
                });
            }
            
        
            return rows; // Return the rows array
        }); // Pass 'team'
        // console.log(tableData)
        // all_data = all_data.concat(tableData); // Append data for each team
        player_names_ages.push(...stuff)
        // console.log("player_names_ages after push: ", player_names_ages)
        // console.log(`Players in ${region} region done`)
        await browser.close();
    }
    const filteredItems = player_names_ages.filter(item => {
        console.log("checking item: ", item)  
        return item.name?.trim() && item.dob?.trim()
    })
    console.log("filter: ", JSON.stringify(filteredItems, null, 2))
    const dobMap = Object.fromEntries(
        player_names_ages
            .filter(item => item.name && item.dob) // Ensure both name and dob are present
            .map(item => [item.name, item.dob])
    );
    console.log("dobMap: ", dobMap);
    const updatedList = players.map(item => ({
        ...item,
        dob: dobMap[item.name] || null
    }))

    console.log(updatedList)

    fs.writeFileSync('players.json', JSON.stringify(updatedList, null, 2))
    console.log("done")

}

const playerages = getDOBs(players)

