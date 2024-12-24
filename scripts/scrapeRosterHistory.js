const puppeteer = require('puppeteer');
const fs = require('fs');
const teams = require("../teams.json");

async function getData(teams) {
    let all_data = []; // Move outside the loop
    for (let team of teams) {
        console.log('Scraping page for ', team.name);
        const url = team.url;
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        // page.on('console', (msg) => {
        //     console.log('Browser log:', msg.text()); // Logs from browser context
        // });

        await page.goto(`https://cod-esports.fandom.com/wiki/${url}`, { timeout: 300000 });
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

        const tableData = await page.evaluate((team) => {
            const former_table = $('table')
                .has('thead th:contains("Left")')
                .has('thead th:contains("Next Team")');

            const active_table = $('table.team-members-current');

            const rows = [];

            former_table.find('tbody tr').each((index, row) => {
                const columns = $(row).find('td');
                rows.push({
                    nationality: $(columns[1]).find('span').attr('title') || 'Unknown',
                    name: $(columns[2]).text().trim(),
                    fullName: $(columns[3]).text().trim(),
                    team: team.abb,
                    joined: $(columns[5]).find('span').eq(1).text().trim(),
                    left: $(columns[6]).find('span').eq(1).text().trim(),
                });
            });

            active_table.find('tbody tr').each((index, row) => {
                const columns = $(row).find('td');
                rows.push({
                    nationality: $(columns[1]).find('span').attr('title') || 'Unknown',
                    name: $(columns[2]).text().trim(),
                    fullName: $(columns[3]).text().trim(),
                    team: team.abb,
                    joined: $(columns[5]).find('span').eq(1).text().trim(),
                    left: null,
                });
            });

            return rows;
        }, team); // Pass 'team'

        all_data = all_data.concat(tableData); // Append data for each team
        await browser.close();
    }
    return all_data;
}

(async () => {
    const data = await getData(teams);
    fs.writeFileSync('tableData.json', JSON.stringify(data, null, 2));
})();
