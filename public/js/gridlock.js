const flags = {
    "United States": "us",
    "England": "gb-eng",
    "Scotland": "gb-sct",
    "Spain": "es",
    "France": "fr",
    "Belgium": "be",
    "Saudi Arabia": "sa",
    "Mexico": "mx",
    "Canada": "ca",
    "Denmark": "dk",
    "Northern Ireland": "gb-nir",
    "Australia": "au",
    "Russia": "ru",
    "Wales": "gb-wls",
    "Ireland": "ie"
}

let selectedCell = null

const CLEAN_STATE = {
    guesses: 0,
    squares: ["", "", "", "", "", "", "", "", ""],
    correct_guesses: [],
    done: false
}

$(document).ready(async () => {
    const existingGrid = await JSON.parse(localStorage.getItem("GRID"))
    let existingState = await JSON.parse(localStorage.getItem("GRID_STATE"))

    try {
        showLoading()

        // Fetch puzzle data
        const puzzleData = await $.ajax({
            url: "/api/gridlock/today",
            type: "GET",
            contentType: "application/json",
        });

        hideLoading();

        if (existingState && !existingState.done) {
            new bootstrap.Modal(document.getElementById("gridlockModal")).show()
        } else if (!existingState) {
            new bootstrap.Modal(document.getElementById("gridlockModal")).show()
        }

        if (!existingGrid || puzzleData._id != existingGrid._id) {
            await localStorage.setItem("GRID", JSON.stringify(puzzleData))
            await localStorage.setItem("GRID_STATE", JSON.stringify(CLEAN_STATE))
        } else {
            for (let i = 0; i < 9; i++) {
                if (existingState.squares[i] != "") {
                    $(`#cell-${i}`).text(existingState.squares[i])
                    $(`#cell-${i}`).css("background", "green")
                }
            }
            setGuessesRemaining(existingState.guesses)
            if (existingState.done) {
                setCompleteState(existingState)
            }
        }

        if (!puzzleData) {
            console.error("Invalid puzzle data format");
            return;
        }

        // set labels
        for (let i = 0; i < 3; i++) {
            // cols
            switch(puzzleData.cols[i].type) {
                case "wins":
                    if (puzzleData.cols[i].value == 0) {
                        puzzleData.cols[i].newLabel = `${puzzleData.cols[i].value} \u{1F3C6}`;
                    } else {
                        puzzleData.cols[i].newLabel = `${puzzleData.cols[i].value}+ \u{1F3C6}`;
                    }
                    break
                case "rings":
                    if (puzzleData.cols[i].value == 0) {

                        puzzleData.cols[i].newLabel = `${puzzleData.cols[i].value} \u{1F48D}`;
                    } else {
                        puzzleData.cols[i].newLabel = `${puzzleData.cols[i].value}+ \u{1F48D}`;
                    }
                    break
                case "nationality":
                    const code = checkCountry(puzzleData.cols[i].value)
                    if (code != null) {
                        puzzleData.cols[i].url = `https://flagcdn.com/w320/${code}.png`
                    }
                    break
            }
            if (puzzleData.cols[i].newLabel) {
                $(`#col-${i}`).text(puzzleData.cols[i].newLabel)
            } else if (puzzleData.cols[i].url) {
                $(`#col-${i}`).append(`
                    <div class="flag-container">
                        <img class="flag-icon" src="${puzzleData.cols[i].url}" alt="${puzzleData.cols[i].value}">
                        <p class="mt-2">${puzzleData.cols[i].value}</p>
                    </div>
                `);
            } else {
                $(`#col-${i}`).text(puzzleData.cols[i].label)
            }

            // rows
            switch(puzzleData.rows[i].type) {
                case "wins":
                    if (puzzleData.rows[i].value == 0) {
                        puzzleData.rows[i].newLabel = `${puzzleData.rows[i].value} \u{1F3C6}`;
                    } else {
                        puzzleData.rows[i].newLabel = `${puzzleData.rows[i].value}+ \u{1F3C6}`;
                    }
                    break
                case "rings":
                    if (puzzleData.rows[i].value == 0) {
                        
                        puzzleData.rows[i].newLabel = `${puzzleData.rows[i].value} \u{1F48D}`;
                    } else {
                        puzzleData.rows[i].newLabel = `${puzzleData.rows[i].value}+ \u{1F48D}`;
                    }
                    break
                case "nationality":
                    const code = checkCountry(puzzleData.rows[i].value)
                    if (code != null) {
                        puzzleData.rows[i].url = `https://flagcdn.com/w320/${code}.png`
                    }
                    break
            }
            if (puzzleData.rows[i].newLabel) {
                $(`#row-${i}`).text(puzzleData.rows[i].newLabel)
            } else if (puzzleData.rows[i].url) {
                $(`#row-${i}`).append(`
                    <div class="flag-container">
                        <img class="flag-icon" src="${puzzleData.rows[i].url}" alt="${puzzleData.rows[i].value}">
                        <p class="mt-2">${puzzleData.rows[i].value}</p>
                    </div>
                `);
            } else {
                $(`#row-${i}`).text(puzzleData.rows[i].label)
            }
        }
        
        if (!existingState) {
            await localStorage.setItem("GRID_STATE", JSON.stringify(CLEAN_STATE))
        }
    } catch (error) {
        console.error("Error fetching puzzle:", error);
        hideLoading();
    }
    
    const $dropDown = $('#playerDropdown')
    const $searchBar = $('#playerSearchBar')

    $("#statsBtn").on("click", () => {
        new bootstrap.Modal(document.getElementById("generalStatsModal")).show()
    })

    $("#shareBtn").on("click", async () => {
        new bootstrap.Modal(document.getElementById("shareModal")).show()
        const results = await copyResults()
        $("#resultsEmojis").html(await getEmojisOnly(results))
        $("#resultsString").text(results)
        $("#copyResultsBtn").on("click", () => {
            navigator.clipboard.writeText(results).then(() => {
                alert("Results copied!")
              })
        })
        $("#Xshare").on("click", () => {
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(results)}`, "_blank")
        })
    })

    $("#help").on("click", () => {
        new bootstrap.Modal(document.getElementById("gridlockModal")).show()
    })

    $("#returnToWordle").on("click", () => {
        window.location.href = "/"
    })

    $(".grid-cell").on("click", function() {
        selectedCell = $(this)
        handleCellClick()
    })

    let debounceTimer; 

    $('#playerSearchBar').on('input', (e) => {
        $('#guessPlayer').attr("disabled", true)
        clearTimeout(debounceTimer); // Clear the timer if the user is still typing
    
        debounceTimer = setTimeout(async () => {
          const query = e.target.value.trim();
    
          if (query.length > 0) {
            try {
              const filteredPlayers = await $.get(`/api/players/search?q=${query}`);
              $dropDown.empty();
    
              if (filteredPlayers.length > 0) {
                filteredPlayers.forEach(player => {
                  const playerItem = $(`
                    <button class="dropdown-item text-light w-100" type="button">${player.name}</button>
                  `);
    
                  playerItem.on('click', async () => {
                    $searchBar.val(player.name);
                    $dropDown.empty().removeClass('show');
                    let state = JSON.parse(localStorage.getItem("GRID_STATE"))
                    if (state && state.correct_guesses) {
                      if (state.correct_guesses.includes(player.name)) {
                        $('#guessPlayer').attr("disabled", true)
                      } else {
                        $('#guessPlayer').attr("disabled", false)
                      }
                    }
                  });
    
                  playerItem.on('mouseover', () => {
                    playerItem.removeClass('text-light').addClass('text-dark');
                  });
    
                  playerItem.on('mouseout', () => {
                    playerItem.removeClass('text-dark').addClass('text-light');
                  });
    
                  $dropDown.append(playerItem);
                });
                $dropDown.addClass('show');
              } else {
                $dropDown.removeClass('show');
              }
            } catch (e) {
              console.error("Error fetching players: ", e);
            }
          } else {
            $dropDown.empty().removeClass('show');
          }
        }, 500) 
    })

    $('#guessPlayer').on("click", async () => {
        const state = JSON.parse(await localStorage.getItem("GRID_STATE"))
        $("#guessPlayer").attr("disabled", true)
        
        // close modal
        let modal = document.getElementById("playerSearchModal")
        const guessedPlayer = $("#playerSearchBar").val().trim()
        let bootstrapModal = bootstrap.Modal.getInstance(modal)
        if (bootstrapModal) {
            bootstrapModal.hide()
        }
        if (selectedCell && guessedPlayer) {
            const square = selectedCell.attr("id").slice(-1)
            const grid = JSON.parse(await localStorage.getItem("GRID"))
            state.guesses = state.guesses + 1
            if (state.guesses == 10) {
                state.done = true
            }
            setGuessesRemaining(state.guesses)
            // check guess correct
            if (grid.answers[parseInt(square)].includes(guessedPlayer)){
                // update grid state
                state.correct_guesses.push(guessedPlayer)
                state.squares[parseInt(square)] = guessedPlayer
                await localStorage.setItem("GRID_STATE", JSON.stringify(state))
                $(`#cell-${square}`).text(guessedPlayer)
                $(`#cell-${square}`).css("background", "green")
                if (!state.squares.includes("")) {
                    state.done = true
                }
            } 
            await localStorage.setItem("GRID_STATE", JSON.stringify(state))

            // finish game
            if (state.done) {
                await $.ajax({
                    url: "/api/gridlock/result",
                    type: "POST",
                    data: JSON.stringify({
                        squares: state.squares,
                        gridId: grid._id 
                    }),
                    contentType: "application/json"
                })
                await setCompleteState(state)
            }
        }   
    })


})

async function setCompleteState(state) {
    const grid = JSON.parse(await localStorage.getItem("GRID"))
    // populate stats modal


    $gameOverText = $("#gameOverText")
    $("#btnRow").removeClass("d-none")
    $("#guessesRemainingDiv").addClass("d-none")
    if (!state.squares.includes("")) {
        $gameOverText.text("You completed the grid!")
    } else {
        $gameOverText.text("No more guesses remaining.")
    }
    $("#correctSquares").text(state.correct_guesses.length)
    new bootstrap.Modal(document.getElementById("generalStatsModal")).show()

    // get global results
    const results = await $.get(`/api/gridlock/results?gridId=${grid._id}`)
    for (let i = 0; i < 9; i++) {
        let percentage = results[i].filledPercentage
        $(`#mock-${i}`).html(
            `${percentage}%<br>Top Answer:<br><p style="font-weight: bolder;">${
                results[i].nameStats.length > 0 ? results[i].nameStats[0].name : "n/a"
            }</p>`
        )
        if (percentage > 79.99) {
            $(`#mock-${i}`).css("background", "green")
        } else if (percentage > 59.99) {
            $(`#mock-${i}`).css("background", "#4dcc33")
        } else if (percentage > 39.99) {
            $(`#mock-${i}`).css("background", '#FFC107')
        } else if (percentage > 19.99) {
            $(`#mock-${i}`).css("background", "#ff8c1a")
        } else {
            $(`#mock-${i}`).css("background", "red")
        }
        $(`#mock-${i}`).css("cursor", "pointer")

        $(`#mock-${i}`).on("click", (event) => {
            $("#moreStats").empty()
            for (let player of results[i].nameStats) {
                $(`#moreStats`).append(`
                    <tr>
                        <td>${player.name}</td>
                        <td>${player.percentage.toFixed(2)}%</td>
                    </tr>    
                `)
            }
            sortTableByColumn("moreStats", 0)
            for (let player of grid.answers[i]) {
                const alreadyInArray = results[i].nameStats.some(obj => obj.name === player)
                if (!alreadyInArray) {
                    $(`#moreStats`).append(`
                        <tr>
                            <td>${player}</td>
                            <td>Not guessed</td>
                        </tr>    
                    `)
                }
            }
        })
    } 
}

function sortTableByColumn(tableId, columnIndex, ascending = true) {
    const $table = $(`#${tableId}`);
    const $tbody = $table.find("tbody");
    const $rows = $tbody.find("tr").toArray();

    $rows.sort((rowA, rowB) => {
        const cellA = $(rowA).children("td").eq(columnIndex).text().trim();
        const cellB = $(rowB).children("td").eq(columnIndex).text().trim();

        const valueA = isNaN(cellA) ? cellA : parseFloat(cellA);
        const valueB = isNaN(cellB) ? cellB : parseFloat(cellB);

        return ascending ? valueA - valueB : valueB - valueA;
    });

    $tbody.empty().append($rows);
}

function setGuessesRemaining(guesses) {
    $("#guessesRemaining").text(10 - guesses)
}

function handleCellClick() {
    if (selectedCell.text() == "" && !JSON.parse(localStorage.getItem("GRID_STATE")).done) {
        new bootstrap.Modal(document.getElementById("playerSearchModal")).show()
    }
}

function showLoading() {
    $("#loadingOverlay").removeClass("d-none");
}
  
function hideLoading() {
    $("#loadingOverlay").addClass("d-none");
}

function checkCountry(country) {
    return country in flags ? flags[country]: null
}

async function copyResults() {
    const state = JSON.parse(await localStorage.getItem("GRID_STATE"))
    let results = "CDL Gridlock"
    results += ` \n${getFormattedDate()}\ncdlwordle.me/gridlock\n`
    const green =  "\u{1F7E9}"
    const yellow = "\u{1F7E8}"
    const black = "\u{2B1B}"
    const up = "\u{1F53C}"
    const down = "\u{1F53D}"
    const check = "\u{2705}"
    const ex = "\u{274C}"
    for (let i = 0; i < 9; i++) {
        if (state.squares[i] != "") {
            results += green
        } else {
            results += black
        }
        if ((i+1) % 3 == 0) {
            results += '\n'
        }
    }
    return results
}

function getEmojisOnly(results) {
    const emojiArray = [...results.replace(/[^\p{Extended_Pictographic}]/gu, "")];
    const formattedEmojis = emojiArray
        .map((emoji, index) => (index % 3 === 2 ? emoji + "<br>" : emoji))
        .join("");

    return formattedEmojis
}

function getFormattedDate() {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const day = String(today.getDate()).padStart(2, '0');
    const year = today.getFullYear();
    
    return `${month}/${day}/${year}`;
  }
  