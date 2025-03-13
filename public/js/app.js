const CLEAN_STATE = { 
  lastGuess: null,
  guesses: [],
  nationality: null,
  age: null,
  teams: [],
  teammates: [],
  wins: null,
  rings: null,
  correct: false,
  name: null
}

$(document).ready(async () => {
  const $searchBar = $('#playerSearchBar')
  const $dropDown = $('#playerDropdown')
  let seen_help_modal = localStorage.getItem("seen_help_modal")
  if (!seen_help_modal) {
    localStorage.setItem('seen_help_modal', 'true')
    new bootstrap.Modal(document.getElementById('helpModal')).show();
  } else if (!localStorage.getItem("dailyCompleted")) {
    new bootstrap.Modal(document.getElementById("whatsNew")).show()
  }

  $("#shareButton").on("click", async () => {
    navigator.clipboard.writeText(await getResultsToShare()).then(() => {
      alert("Results copied!")
    })
  })

  $("#gridlock").on("click", () => {
    window.location.href = "/gridlock"
  })

  $("#unlimitedBtn").on("click", async () => {
    await startUnlimited()
  })
  $("#newUnlimitedBtn").on("click", async () => {
    await startUnlimited()
  })

  $("#xShare").on("click", async () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(await getResultsToShare())}`, "_blank")
  })

  let initial_state = JSON.parse(localStorage.getItem("GAME_STATE"))
  if (initial_state) {
    $(".guessCount").each(function () {
      const $el = $(this); // Convert to a jQuery object
      const currentCount = initial_state.guesses.length || 0; // Safely parse the current count
      $el.text(currentCount); // Update the text
    });
    if (hasMysteryPlayerChanged(initial_state.lastGuess)) {
      let clean_state = JSON.parse(JSON.stringify(CLEAN_STATE))
      await localStorage.setItem("dailyCompleted", false)
      // set unlimited button NOT visible here
      $(".guessCount").each(function () {
        const $el = $(this); // Convert to a jQuery object
        const currentCount = 0; // Safely parse the current count
        $el.text(currentCount); // Update the text
      });
      localStorage.setItem("GAME_STATE", JSON.stringify(clean_state))
    } else if (initial_state.correct && !hasMysteryPlayerChanged(initial_state.lastGuess)) {
      populateExistingGuesses(initial_state)
      setCorrectState(initial_state)
      setupGlobalChart(initial_state.name)
      $("#unlimitedBtn").toggleClass("d-none")
    } else if (!initial_state.correct && !hasMysteryPlayerChanged(initial_state.lastGuess)) {
      populateExistingGuesses(initial_state)
    }
  }

  let history = JSON.parse(localStorage.getItem("GAME_HISTORY"))
  if (!history) {
    localStorage.setItem("GAME_HISTORY", JSON.stringify({
      history: []
    }))
  }

  $('#help').on('click', (e) => {
    new bootstrap.Modal(document.getElementById('helpModal')).show();
  })

  $('#news').on("click", (e) => {
    new bootstrap.Modal(document.getElementById('whatsNew')).show()
  })

  let debounceTimer; // Timer reference for debouncing

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
                // let guesses = JSON.parse(localStorage.getItem("GAME_STATE")).guesses
                let state = JSON.parse(localStorage.getItem("GAME_STATE"))
                if (state && state.guesses) {
                  if (!state.guesses.some(obj => obj.name === player.name) || await localStorage.getItem("dailyCompleted") === "true") {
                    $('#guessPlayer').attr("disabled", false)
                  }
                } else {
                  $('#guessPlayer').attr("disabled", false)
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
    }, 500); // Adjust the delay (in milliseconds) as needed
  });

  $('#giveUp').on('click', async (e) => {
    await handleGuesses(true)
  })


  $('#guessPlayer').on('click', async (e) => {
    await handleGuesses(false)
  })

  // hide dropdown when clicking outside
  $(document).on('click', (e) => {
    if (!$dropDown.is(e.target) && $dropDown.has(e.target).length === 0 && !$searchBar.is(e.target)) {
      $dropDown.empty().removeClass('show');
    }
  });

});

function hasMysteryPlayerChanged(lastGuess) {
  // Current time in UTC
  const now = new Date();
  
  // Calculate the offset for PST
  const pstOffset = -8; // PST is UTC-8 during standard time
  const nowInPST = new Date(now.getTime() + pstOffset * 60 * 60 * 1000);

  // Determine the change time for today and yesterday in UTC
  const changeTimeTodayUTC = new Date(Date.UTC(
    nowInPST.getUTCFullYear(),
    nowInPST.getUTCMonth(),
    nowInPST.getUTCDate(),
    8 // 08:00 UTC is midnight PST
  )).getTime();

  const changeTimeYesterdayUTC = new Date(Date.UTC(
    nowInPST.getUTCFullYear(),
    nowInPST.getUTCMonth(),
    nowInPST.getUTCDate() - 1, // Previous day
    8 // 08:00 UTC is midnight PST
  )).getTime();

  // Convert lastGuess to a timestamp
  const lastGuessTimestamp = new Date(lastGuess).getTime();

  // Determine the most recent change time relative to now
  const mostRecentChangeTimeUTC = now.getTime() >= changeTimeTodayUTC 
    ? changeTimeTodayUTC 
    : changeTimeYesterdayUTC;

  // Check if the last guess was before the most recent change time
  return lastGuessTimestamp < mostRecentChangeTimeUTC;
}

function convertToTimestamp(isoDateString) {
  const date = new Date(isoDateString);

  // Construct a new date for 08:00 UTC on the same day
  const changeTime = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      8, // Set hour to 08:00 UTC
      0, // Set minutes to 00
      0, // Set seconds to 00
      0  // Set milliseconds to 000
  ));

  return changeTime.getTime(); // Get milliseconds since the Unix epoch
}

function setCorrectState(game_state) {
  $(".guessCount").each(function () {
    const $el = $(this); // Convert to a jQuery object
    $el.text(game_state.guesses.length); // Update the text
  });
  if (game_state.gaveup) {
    $('#giveUpMessage').toggleClass('d-none')
  } else {
    $('#guessMessage').toggleClass("d-none")
    $('#correctMessage').toggleClass('d-none')
  }
  
  $("#mysteryNameGiveUp").append(`<a href="https://cod-esports.fandom.com/wiki/${game_state.name}" target="_blank">${game_state.name}</a>`)
  $("#mysteryName").append(`<a href="https://cod-esports.fandom.com/wiki/${game_state.name}" target="_blank">${game_state.name}</a>`)

  $('#playerSearchBar').attr("disabled", true)
  $('#guessPlayer').attr('disabled', true)
  
  $('#mysteryAge').text(game_state.age)
  $('#ageSquare').css("background-color", "green")

  $('#mysteryNationality').text(game_state.nationality)
  $('#nationalitySquare').css('background-color', 'green')

  $('#mysteryRings').text(game_state.rings)
  $('#ringsSquare').css('background-color', 'green')

  $('#mysteryWins').text(game_state.wins)
  $('#winsSquare').css('background-color', 'green')
  
  $('#mysteryTeammates').text('')
  for (let teammate of game_state.teammates) {
    $('#mysteryTeammates').append(`<p class="mb-0">${teammate}</p>`)
  }
  $('#teammatesSquare').css('background-color', 'green')
  
  $('#mysteryTeams').text('')
  for (let team of game_state.teams) {
    $('#mysteryTeams').append(`<p class="mb-0">${team}</p>`)
  }
  $('#teamsSquare').css('background-color', 'green')

  const myModal = new bootstrap.Modal(document.getElementById('successModal'));
  populateSuccessModal(game_state)

  // Show the modal
  myModal.show();
}

function populateExistingGuesses(state) {
  for (let guess of state.guesses) {
    if (!guess.correct) {
      let teamsString = ""
      for (let team of guess.allTeams) {
        teamsString += `
          <ul class="p-0 m-1">
            <p class="table-cell ${guess.teams.includes(team) ? 'match' : ''}">${team}</p>
          </ul>
        `
      }
      const newRow = $('<tr>');
          newRow.append(`<td class="align-content-center">${guess.name}</td>`);
          newRow.append(`<td class="align-content-center">
            ${
              guess.nationality.correct ?
              `<p class="table-cell match">${guess.nationality.value}</p>` :
              `<p class="table-cell">${guess.nationality.value}`
            }</td>`);
          newRow.append(`<td class="align-content-center">
            ${
              guess.age.correct ? 
              `<p class="table-cell match">${guess.age.value}</p>` : 
              `<p class="table-cell">
                ${guess.age.value}
                ${guess.age.over ? 
                `<i class="fa-solid fa-arrow-down"></i> `:
                `<i class="fa-solid fa-arrow-up"></i>`
                }
              </p>`
            }</td>`);
          newRow.append(`<td class="align-content-center">
            ${
              guess.wins.correct ?
              `<p class="table-cell match">${guess.wins.value}</p>` :
              `<p class="table-cell">
                ${guess.wins.value}
                ${guess.wins.over ? 
                `<i class="fa-solid fa-arrow-down"></i> `:
                `<i class="fa-solid fa-arrow-up"></i>`
                }
              </p>`
            }</td>`);
          newRow.append(`<td class="align-content-center">
            ${
              guess.rings.correct ?
              `<p class="table-cell match">${guess.rings.value}</p>` :
              `<p class="table-cell">
                ${guess.rings.value}
                ${guess.rings.over ? 
                `<i class="fa-solid fa-arrow-down"></i> `:
                `<i class="fa-solid fa-arrow-up"></i>`
                }
              </p>`
            }</td>`);
          newRow.append(`<td class="align-content-center">${teamsString}</td>`);
          newRow.append(`<td class="align-content-center">${
            guess.teammates ? 
            `<i class="fa-solid fa-check table-cell match"></i>` : 
            '<i class="fa-solid fa-xmark px-1"></i>'
          }</td>`);
          $('#guessesTableBody').append(newRow);
    }
  }

  if (state.age != null) {
    $('#mysteryAge').text(state.age)
    $('#ageSquare').css("background-color", "green")
  }
  if (state.nationality != null) {
    $('#mysteryNationality').text(state.nationality)
    $('#nationalitySquare').css('background-color', 'green')
  }
  if (state.rings != null) {
    $('#mysteryRings').text(state.rings)
    $('#ringsSquare').css('background-color', 'green')
  }
  if (state.wins != null) {
    $('#mysteryWins').text(state.wins)
    $('#winsSquare').css('background-color', 'green')
  }
  if (state.teammates.length > 0) {
    if ($('#mysteryTeammates').text() == "?") {
      $('#mysteryTeammates').text('')
    }
    for (let teammate of state.teammates) {
      $('#mysteryTeammates').append(`<p class="mb-0">${teammate}</p>`)
    }
   
    $('#teammatesSquare').css('background-color', '#FFC107')
  }
  if (state.teams.length > 0) {
    if ($('#mysteryTeams').text() == "?") {
      $('#mysteryTeams').text('')
    }
    for (let team of state.teams) {
      $('#mysteryTeams').append(`<p class="mb-0">${team}</p>`)
    }
    $('#teamsSquare').css('background-color', '#FFC107')
  }
}

function containsString($element, searchString) {
  return $element.find('*').filter(function () {
      return $(this).text().includes(searchString);
  }).length > 0;
}

function showLoading() {
  $("#loadingOverlay").removeClass("d-none");
}

function hideLoading() {
  $("#loadingOverlay").addClass("d-none");
}

function populateSuccessModal(game_state) {
  const guesses = JSON.parse(localStorage.getItem("GAME_HISTORY")).history
  if (!game_state.gaveup) {
    $('#guessCountModal').text(game_state.guesses.length)
    $('#successGuessCount').toggleClass('d-none')
  } else {
    $('#giveUpGuessCountModal').text(game_state.guesses.length)
    $('#giveUpGuessCount').toggleClass('d-none')
  }
  createGuessesChart(guesses)
  
  $('#correctModalName').append(`<a href="https://cod-esports.fandom.com/wiki/${game_state.name}" target="_blank">${game_state.name}</a>`)
}

function populateInfiniteModal(infinite_state) {
  if (!infinite_state.giveup) {
    $("#giveUpInfiniteGuessCount").hide()
    $("#infiniteGuessCount").show()
    $("#guessCountInfiniteModal").text(infinite_state.guesses.length)
  } else {
    $("#infiniteGuessCount").hide()
    $("#giveUpInfiniteGuessCountModal").text(infinite_state.guesses.length)
    $("#giveUpInfiniteGuessCount").show()
  }
  $("#infiniteModalName").empty()
  $("#infiniteModalName").append(`<a href="https://cod-esports.fandom.com/wiki/${infinite_state.name}" target="_blank">${infinite_state.name}</a>`)
}

function createGuessesChart(guessesRaw) {
  const guesses = guessesRaw.filter(obj => obj.gaveup != true)
  if (guesses.length > 0) {
    const sum = guesses.reduce((sum, obj) => {
        return (sum + obj.guesses)
      }, 0)
    $('#personalMean').text(parseFloat(sum / guesses.length).toFixed(1))
    $('#personalGiveUpCount').text(guessesRaw.length - guesses.length)
  } else {
    if (guessesRaw.length > 0) {
      $('#personalGiveUpCount').text(guessesRaw.length)
    }
  }

  const frequencies = calculateFrequencies(guesses);
  // Find the min and max guesses
  const minGuess = 1
  const maxGuess = Math.max(...Object.keys(frequencies).map(Number));

  // Create an array for all integers between min and max
  const labels = [];
  for (let i = minGuess; i <= maxGuess; i++) {
      labels.push(i);
  }

  // Map frequencies to the full range of labels, defaulting to 0 if not present
  const values = labels.map(label => frequencies[label] || 0);

  // Create the chart
  const ctx = document.getElementById('guessesChart').getContext('2d');
  new Chart(ctx, {
      type: 'bar',
      data: {
          labels: labels,
          datasets: [{
              label: 'Number of games',
              data: values,
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1
          }]
      },
      options: {
          scales: {
              y: {
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1, // Ensures integer-only labels
                  },
                  title: {
                      display: true,
                      text: 'Games'
                  }
              },
              x: {
                  title: {
                      display: true,
                      text: 'Guesses'
                  }
              }
          }
      }
  });
}

function calculateFrequencies(data) {
  const frequencies = {};

  data.forEach(item => {
      const value = item.guesses;
      frequencies[value] = (frequencies[value] || 0) + 1;
  });

  return frequencies;
}

function createGlobalChart(data) {
  // Find the min and max guesses
  const minGuess = 1
  const maxGuess = Math.max(...Object.keys(data.numbers).map(Number));

  // Create an array for all integers between min and max
  const labels = [];
  for (let i = minGuess; i <= maxGuess; i++) {
      labels.push(i);
  }

  // Map frequencies to the full range of labels, defaulting to 0 if not present
  const values = labels.map(label => data.numbers[label] || 0);

  // Create the chart
  const ctx = document.getElementById('globalChart').getContext('2d');
  new Chart(ctx, {
      type: 'bar',
      data: {
          labels: labels,
          datasets: [{
              label: 'Number of games',
              data: values,
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1
          }]
      },
      options: {
          scales: {
              y: {
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1, // Ensures integer-only labels
                  },
                  title: {
                      display: true,
                      text: 'Games'
                  }
              },
              x: {
                  title: {
                      display: true,
                      text: 'Guesses'
                  }
              }
          }
      }
  });
}

async function setupGlobalChart(name) {
  const results = await $.get(`/api/results?name=${name}&_=${new Date().getTime()}`)
  if (results) {
    $('#totalPlayers').text(results.total)
    createGlobalChart(results)
    $("#meanGuesses").text(results.average)
    $("#globalGiveUps").text(results.giveUpPercent)
  } else {
    $('#guessesChart').text('Unable to load global results')
  }
}

// async function setMeanGuesses(data) {
//   const filteredData = data.filter(result => result.guesses!== null && result.guesses!== 1)
//   const total = filteredData.reduce((sum, obj) => sum + obj.guesses, 0)
//   const mean = total / filteredData.length
//   const roundedMean = parseFloat(mean.toFixed(1))
//   $("#meanGuesses").text(roundedMean)
// }

async function handleGuesses(giveup) {
  showLoading()
  let body
  if (giveup) {
    body = {
      giveup: true
    }
  } else {
    body = {
      player: $('#playerSearchBar').val()
    }
  }
  $('#guessPlayer').attr('disabled', true)
  $("#giveUp").attr('disabled', true)
  const nowUTC = new Date().toISOString()
  let game_state = localStorage.getItem("GAME_STATE")
  if (!game_state) {
    let clean_state = JSON.parse(JSON.stringify(CLEAN_STATE))
    clean_state.lastGuess = nowUTC
    localStorage.setItem("GAME_STATE", JSON.stringify(clean_state))
  }
  game_state = JSON.parse(localStorage.getItem("GAME_STATE"))
  if (hasMysteryPlayerChanged(game_state.lastGuess)) {
    const lastGuess = game_state.lastGuess
    game_state = JSON.parse(JSON.stringify(CLEAN_STATE))
    if (lastGuess != null) {
      location.reload()
    }
  }
  
  game_state.lastGuess = nowUTC
  $(".guessCount").each(function () {
    const $el = $(this); // Convert to a jQuery object
    const currentCount = parseInt($el.text(), 10) || 0; // Safely parse the current count
    $el.text(currentCount + 1); // Update the text
  });
  await $.ajax({
    url: "/api/players/guess",
    type: "POST",
    data: JSON.stringify(body), // Serialize the data to JSON
    contentType: "application/json", // Explicitly set content type
    success: async (response) => {
      let history = JSON.parse(localStorage.getItem("GAME_HISTORY"))
      if (!response.correct) {
        if (response.age.correct) {
          game_state.age = response.age.value
          $('#mysteryAge').text(response.age.value)
          $('#ageSquare').css("background-color", "green")
        }
        if (response.nationality.correct) {
          game_state.nationality = response.nationality.value
          $('#mysteryNationality').text(response.nationality.value)
          $('#nationalitySquare').css('background-color', 'green')
        }
        if (response.rings.correct) {
          game_state.rings = response.rings.value
          $('#mysteryRings').text(response.rings.value)
          $('#ringsSquare').css('background-color', 'green')
        }
        if (response.wins.correct) {
          game_state.wins = response.wins.value
          $('#mysteryWins').text(response.wins.value)
          $('#winsSquare').css('background-color', 'green')
        }
        if (response.teammates) {
          if ($('#mysteryTeammates').text() == "?") {
            $('#mysteryTeammates').text('')
          }
          if (!containsString($('#teammatesSquare'), response.name)) {
            $('#mysteryTeammates').append(`<p class="mb-0">${response.name}</p>`)
            game_state.teammates.push(response.name)
          }
          $('#teammatesSquare').css('background-color', '#FFC107')
        }
        if (response.teams.length > 0) {
          if ($('#mysteryTeams').text() == "?") {
            $('#mysteryTeams').text('')
          }
          for (let team of response.teams) {
            if (!containsString($('#teamsSquare'), team)) {
              $('#mysteryTeams').append(`<p class="mb-0">${team}</p>`)
              game_state.teams.push(team)
            }
          }
          $('#teamsSquare').css('background-color', '#FFC107')
        }
        let teamsString = ""
        for (let team of response.allTeams) {
          teamsString += `
            <ul class="p-0 m-1">
              <p class="table-cell ${response.teams.includes(team) ? 'match' : ''}">${team}</p>
            </ul>
          `
        }
        const newRow = $('<tr>');
        newRow.append(`<td class="align-content-center">${response.name}</td>`);
        newRow.append(`<td class="align-content-center">
          ${
            response.nationality.correct ?
            `<p class="table-cell match">${response.nationality.value}</p>` :
            `<p class="table-cell">${response.nationality.value}`
          }</td>`);
        newRow.append(`<td class="align-content-center">
          ${
            response.age.correct ? 
            `<p class="table-cell match">${response.age.value}</p>` : 
            `<p class="table-cell">
              ${response.age.value}
              ${response.age.over ? 
              `<i class="fa-solid fa-arrow-down"></i> `:
              `<i class="fa-solid fa-arrow-up"></i>`
              }
            </p>`
          }</td>`);
        newRow.append(`<td class="align-content-center">
          ${
            response.wins.correct ?
            `<p class="table-cell match">${response.wins.value}</p>` :
            `<p class="table-cell">
              ${response.wins.value}
              ${response.wins.over ? 
              `<i class="fa-solid fa-arrow-down"></i> `:
              `<i class="fa-solid fa-arrow-up"></i>`
              }
            </p>`
          }</td>`);
        newRow.append(`<td class="align-content-center">
          ${
            response.rings.correct ?
            `<p class="table-cell match">${response.rings.value}</p>` :
            `<p class="table-cell">
              ${response.rings.value}
              ${response.rings.over ? 
              `<i class="fa-solid fa-arrow-down"></i> `:
              `<i class="fa-solid fa-arrow-up"></i>`
              }
            </p>`
          }</td>`);
        newRow.append(`<td class="align-content-center">${teamsString}</td>`);
        newRow.append(`<td class="align-content-center">${
          response.teammates ? 
          `<i class="fa-solid fa-check table-cell match"></i>` : 
          '<i class="fa-solid fa-xmark px-1"></i>'
        }</td>`);
        $('#guessesTableBody').prepend(newRow);

        game_state.guesses.unshift(response)
        if (game_state.guesses.length > 7) {
          $('#giveUp').attr("disabled", false)
        }
        localStorage.setItem("GAME_STATE", JSON.stringify(game_state))
      } else {

        // guess is correct
        if (giveup) {
          game_state.gaveup = true
          history.history.push({
            name: response.name,
            guesses: game_state.guesses.length,
            gaveup: true
          })
        } else {
          game_state.gaveup = false
          game_state.guesses.unshift(response)
          history.history.push({
            name: response.name,
            guesses: game_state.guesses.length
          })
        }
        game_state.correct = true
        game_state.nationality = response.nationality
        game_state.name = response.name
        game_state.age = response.age
        game_state.teams = response.teams
        game_state.teammates = response.teammates
        game_state.wins = response.wins
        game_state.rings = response.rings

        localStorage.setItem("GAME_STATE", JSON.stringify(game_state))
        localStorage.setItem("GAME_HISTORY", JSON.stringify(history))

        $('#mysteryAge').text(response.age)
        $('#ageSquare').css("background-color", "green")

        $('#mysteryNationality').text(response.nationality)
        $('#nationalitySquare').css('background-color', 'green')

        $('#mysteryRings').text(response.rings)
        $('#ringsSquare').css('background-color', 'green')

        $('#mysteryWins').text(response.wins)
        $('#winsSquare').css('background-color', 'green')
        
        $('#mysteryTeammates').text('')
        for (let teammate of response.teammates) {
          $('#mysteryTeammates').append(`<p class="mb-0">${teammate}</p>`)
        }
        $('#teammatesSquare').css('background-color', 'green')
        
        $('#mysteryTeams').text('')
        for (let team of response.teams) {
          $('#mysteryTeams').append(`<p class="mb-0">${team}</p>`)
        }
        $('#teamsSquare').css('background-color', 'green')
        setCorrectState(game_state)

        $("#guessMessage").addClass('d-none')
        if (giveup) {
          $("#giveUpMessage").removeClass('d-none')
        } else {
          $("#correctMessage").removeClass('d-none')
        }
      
        // save results
        await $.ajax({
            url: "/api/results",
            type: "POST",
            data: JSON.stringify({
              name: response.name,
              guesses: giveup ? null : game_state.guesses.length
            }),
            contentType: "application/json"
          }
        )
        setupGlobalChart(response.name)

        // mark daily completed in local storage
        await localStorage.setItem("dailyCompleted", true)
        $("#unlimitedBtn").toggleClass("d-none")
      }
    },
    error: (xhr, status, error) => {
      console.error("Error:", error);
      hideLoading()
    },
  });
  hideLoading()
}

async function startUnlimited() {
  showLoading()
  $("#unlimitedBtn").text("Unlimited Game In Progress")
  $("#unlimitedBtn").attr("disabled", true)
  $("#giveUp").off().on('click', async function() {
    await handleUnlimitedGuess(true)
  })
  $("#giveUp").attr("disabled", false)
  $("#guessPlayer").off().on('click', async function() {
    await handleUnlimitedGuess(false)
  })

  await $.ajax({
    url: "/api/infinite/start",
    type: "POST",
    contentType: "application/json",
    success: async (response) => {
      await localStorage.setItem("INFINITE_STATE", JSON.stringify({
        name: response.name,
        nationality: response.nationality,
        dob: response.dob,
        rings: response.rings,
        wins: response.wins,
        teams: response.teams,
        teammates: response.teammates,
        age: response.age,
        guesses: [],
        giveup: false
      }))
    },
    error: (xhr, status, error) => {
      console.error("Error: ", error)
      hideLoading()
    }
  })
  await resetUI()
  hideLoading()
}

async function handleUnlimitedGuess(giveup) {
  showLoading()
  const name = $("#playerSearchBar").val()
  $(".guessCount").each(function () {
    const $el = $(this); // Convert to a jQuery object
    const currentCount = parseInt($el.text(), 10) || 0; // Safely parse the current count
    $el.text(currentCount + 1); // Update the text
  });
  if (!giveup) {
    if (name == JSON.parse(await localStorage.getItem("INFINITE_STATE")).name) {
      const infinite_state = JSON.parse(localStorage.getItem("INFINITE_STATE"))
      infinite_state.guesses.push({correct: true})
      // handle correct guess
      $("#unlimitedBtn").attr("disabled", false)
      $("#unlimitedBtn").text("Start New Game")
      $("#guessPlayer").attr("disabled", true)
      $("#giveUp").attr("disabled", true)
      const myModal = new bootstrap.Modal(document.getElementById('infiniteModal'));
  
      $('#mysteryAge').text(infinite_state.age)
      $('#ageSquare').css("background-color", "green")
  
      $('#mysteryNationality').text(infinite_state.nationality)
      $('#nationalitySquare').css('background-color', 'green')
  
      $('#mysteryRings').text(infinite_state.rings)
      $('#ringsSquare').css('background-color', 'green')
  
      $('#mysteryWins').text(infinite_state.wins)
      $('#winsSquare').css('background-color', 'green')
      
      $('#mysteryTeammates').text('')
      for (let teammate of infinite_state.teammates) {
        $('#mysteryTeammates').append(`<p class="mb-0">${teammate}</p>`)
      }
      $('#teammatesSquare').css('background-color', 'green')
      
      $('#mysteryTeams').text('')
      for (let team of infinite_state.teams) {
        $('#mysteryTeams').append(`<p class="mb-0">${team}</p>`)
      }
      $('#teamsSquare').css('background-color', 'green')
  
      populateInfiniteModal(infinite_state)
      let body = {
        player: infinite_state.name,
        guesses: infinite_state.guesses.length,
        giveup: false
      };
      
      await $.ajax({
        url: "/api/infinite/finish",
        data: JSON.stringify(body), // Only stringify once
        type: "POST",
        contentType: "application/json" // Correct spelling
      });
      const history = await $.get(`/api/infinite/results?player=${infinite_state.name}`)
      $("#meanInfiniteGuesses").text(history.average)
      $("#globalGiveUpsInfinite").text(history.giveUpPercentage)
  
    // Show the modal
      myModal.show();
      hideLoading()
  
    } else {
      // incorrect guess
      const mysteryData = await JSON.parse(localStorage.getItem("INFINITE_STATE"))
      const guess = await $.get(`/api/players?player=${name}`)
      mysteryData.guesses.push(guess)
      if (guess) {
        if (guess.nationality == mysteryData.nationality) {
          $('#mysteryNationality').text(guess.nationality)
          $('#nationalitySquare').css('background-color', 'green')
        }
        if (guess.age == mysteryData.age) {
          $('#mysteryAge').text(guess.age)
          $('#ageSquare').css("background-color", "green")
        }
        if (guess.rings == mysteryData.rings) {
          $('#mysteryRings').text(guess.rings)
          $('#ringsSquare').css('background-color', 'green')
        }
        if (guess.wins == mysteryData.wins) {
          $('#mysteryWins').text(guess.wins)
          $('#winsSquare').css('background-color', 'green')
        }
        if (guess.teammates.includes(mysteryData.name)) {
          if ($('#mysteryTeammates').text() == "?") {
            $('#mysteryTeammates').text('')
          }
          if (!containsString($('#teammatesSquare'), guess.name)) {
            $('#mysteryTeammates').append(`<p class="mb-0">${guess.name}</p>`)
            $('#teammatesSquare').css('background-color', '#FFC107')
          }
        }
        for (let team of guess.teams) {
          if (mysteryData.teams.includes(team)) {
            if ($('#mysteryTeams').text() == "?") {
              $('#mysteryTeams').text('')
            }
            if (!containsString($('#teamsSquare'), team)) {
              $('#mysteryTeams').append(`<p class="mb-0">${team}</p>`)
              $('#teamsSquare').css('background-color', '#FFC107')
            }
          }
        }
  
        let teamsString = ""
        for (let team of guess.teams) {
          teamsString += `
            <ul class="p-0 m-1">
              <p class="table-cell ${mysteryData.teams.includes(team) ? 'match' : ''}">${team}</p>
            </ul>
          `
        }
  
        const newRow = $('<tr>');
          newRow.append(`<td class="align-content-center">${guess.name}</td>`);
          newRow.append(`<td class="align-content-center">
            ${
              guess.nationality == mysteryData.nationality ?
              `<p class="table-cell match">${guess.nationality}</p>` :
              `<p class="table-cell">${guess.nationality}`
            }</td>`);
          newRow.append(`<td class="align-content-center">
            ${
              guess.age == mysteryData.age ? 
              `<p class="table-cell match">${guess.age}</p>` : 
              `<p class="table-cell">
                ${guess.age}
                ${guess.age > mysteryData.age ? 
                `<i class="fa-solid fa-arrow-down"></i> `:
                `<i class="fa-solid fa-arrow-up"></i>`
                }
              </p>`
            }</td>`);
          newRow.append(`<td class="align-content-center">
            ${
              guess.wins == mysteryData.wins ?
              `<p class="table-cell match">${guess.wins}</p>` :
              `<p class="table-cell">
                ${guess.wins}
                ${guess.wins > mysteryData.wins ? 
                `<i class="fa-solid fa-arrow-down"></i> `:
                `<i class="fa-solid fa-arrow-up"></i>`
                }
              </p>`
            }</td>`);
          newRow.append(`<td class="align-content-center">
            ${
              guess.rings == mysteryData.rings ?
              `<p class="table-cell match">${guess.rings}</p>` :
              `<p class="table-cell">
                ${guess.rings}
                ${guess.rings > mysteryData.rings ? 
                `<i class="fa-solid fa-arrow-down"></i> `:
                `<i class="fa-solid fa-arrow-up"></i>`
                }
              </p>`
            }</td>`);
          newRow.append(`<td class="align-content-center">${teamsString}</td>`);
          newRow.append(`<td class="align-content-center">${
            guess.teammates.includes(mysteryData.name) ? 
            `<i class="fa-solid fa-check table-cell match"></i>` : 
            '<i class="fa-solid fa-xmark px-1"></i>'
          }</td>`);
          $('#guessesTableBody').prepend(newRow);
  
          await localStorage.setItem("INFINITE_STATE", JSON.stringify(mysteryData))
          hideLoading()
          
      }
    }
  } else {
    // giveup logic
    
    const infinite_state = JSON.parse(localStorage.getItem("INFINITE_STATE"))
    infinite_state.guesses.push({correct: true})
    infinite_state.giveup = true
    populateInfiniteModal(infinite_state)
    const myModal = new bootstrap.Modal(document.getElementById('infiniteModal'));
    let body = {
      player: infinite_state.name,
      guesses: infinite_state.guesses.length,
      giveup: true
    };
    await $.ajax({
      url: "/api/infinite/finish",
      data: JSON.stringify(body), // Only stringify once
      type: "POST",
      contentType: "application/json" // Correct spelling
    });
    const history = await $.get(`/api/infinite/results?player=${infinite_state.name}`)
    $("#meanInfiniteGuesses").text(history.average)
    $("#globalGiveUpsInfinite").text(history.giveUpPercentage)
    myModal.show()
    hideLoading()
  }
  
}

async function resetUI() {
  $("#guessesTableBody").empty()
  $("#playerSearchBar").attr("disabled", false)
  $("#correctMessage").hide()
  $("#giveUpMessage").hide()

  $('#mysteryAge').text("?")
  $('#ageSquare').css("background-color", "rgba(255, 255, 255, 0.2)")

  $('#mysteryNationality').text("?")
  $('#nationalitySquare').css('background-color', 'rgba(255, 255, 255, 0.2)')

  $('#mysteryRings').text("?")
  $('#ringsSquare').css('background-color', 'rgba(255, 255, 255, 0.2)')

  $('#mysteryWins').text("?")
  $('#winsSquare').css('background-color', 'rgba(255, 255, 255, 0.2)')
  
  $('#mysteryTeammates').text('?')
  $('#teammatesSquare').css('background-color', 'rgba(255, 255, 255, 0.2)')
  
  $('#mysteryTeams').text('?')
  $('#teamsSquare').css('background-color', 'rgba(255, 255, 255, 0.2)')

  $("#guessMessage").removeClass("d-none")
  $(".guessCount").text("0")

}

function getFormattedDate() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const day = String(today.getDate()).padStart(2, '0');
  const year = today.getFullYear();
  
  return `${month}/${day}/${year}`;
}

async function getResultsToShare() {
  const green =  "\u{1F7E9}"
  const yellow = "\u{1F7E8}"
  const black = "\u{2B1B}"
  const up = "\u{1F53C}"
  const down = "\u{1F53D}"
  const check = "\u{2705}"
  const ex = "\u{274C}"
  let state = await JSON.parse(localStorage.getItem("GAME_STATE"))
  let guesses = state.guesses
  let text = `CDL Wordle ${getFormattedDate()}\ncdlwordle.me\n\u{1F30D}\u{1F382}\u{1F3C6}\u{1F48D}\u{1F530}\u{1F465}\n`
  guesses = guesses.reverse()
  for (let guess of guesses) {
    let line = ""
    if (!guess.correct) {
      if (guess.nationality.correct) {
        line += green
      } else {
        line += black
      }
  
      if (guess.age.correct) {
        line += green
      } else if (guess.age.over) {
        line += down
      } else {
        line += up
      }
  
      if (guess.wins.correct) {
        line += green
      } else if (guess.wins.over) {
        line += down
      } else {
        line += up
      }
  
      if (guess.rings.correct) {
        line += green
      } else if (guess.rings.over) {
        line += down
      } else {
        line += up
      }
  
      if (guess.teams.length > 0) {
        line += yellow
      } else {
        line += black
      }
  
      if (guess.teammates) {
        line += check
      } else {
        line += ex
      }
      line += '\n'
    } else {
      line = `${green}${green}${green}${green}${green}${green}\n`
    }
    

    text += line
  }

  if (state.gaveup) {
    text += `Gave up after ${guesses.length} tries`
  } else {
    text += `Guessed in ${guesses.length} tries`
  }

  return text

}