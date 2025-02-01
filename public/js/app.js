$(document).ready(async () => {
  const $searchBar = $('#playerSearchBar')
  const $dropDown = $('#playerDropdown')

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
  let seen_help_modal = localStorage.getItem("seen_help_modal")
  if (!seen_help_modal) {
    localStorage.setItem('seen_help_modal', 'true')
    new bootstrap.Modal(document.getElementById('helpModal')).show();
  }

  console.log("testing 3")

  let initial_state = JSON.parse(localStorage.getItem("GAME_STATE"))
  if (initial_state) {
    $(".guessCount").each(function () {
      const $el = $(this); // Convert to a jQuery object
      const currentCount = initial_state.guesses.length || 0; // Safely parse the current count
      $el.text(currentCount); // Update the text
    });
    if (hasMysteryPlayerChanged(initial_state.lastGuess)) {
      let clean_state = JSON.parse(JSON.stringify(CLEAN_STATE))
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
                  if (!state.guesses.some(obj => obj.name === player.name)) {
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


  $('#guessPlayer').on('click', async (e) => {
    console.log("hello")
    showLoading()
    $('#guessPlayer').attr('disabled', true)
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

    const body = {
      player: $('#playerSearchBar').val()
    }
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
          localStorage.setItem("GAME_STATE", JSON.stringify(game_state))
        } else {
          // guess is correct
          game_state.guesses.unshift(response)
          game_state.correct = true
          game_state.nationality = response.nationality
          game_state.name = response.name
          game_state.age = response.age
          game_state.teams = response.teams
          game_state.teammates = response.teammates
          game_state.wins = response.wins
          game_state.rings = response.rings

          localStorage.setItem("GAME_STATE", JSON.stringify(game_state))
          let history = JSON.parse(localStorage.getItem("GAME_HISTORY"))
          history.history.push({
            name: response.name,
            guesses: game_state.guesses.length
          })
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
          $("#correctMessage").removeClass('d-none')
          $('#mysteryName').text(response.name)
        
          // save reults
          await $.ajax({
              url: "/api/results",
              type: "POST",
              data: JSON.stringify({
                name: response.name,
                guesses: game_state.guesses.length
              }),
              contentType: "application/json"
            }
          )
          setupGlobalChart(response.name)
        }
      },
      error: (xhr, status, error) => {
        console.error("Error:", error);
        hideLoading()
      },
    });
    hideLoading()
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
  $('#guessMessage').toggleClass("d-none")
  $('#correctMessage').toggleClass('d-none')
  $(".guessCount").each(function () {
    const $el = $(this); // Convert to a jQuery object
    $el.text(game_state.guesses.length); // Update the text
  });
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
  createGuessesChart(guesses)
  $('#guessCountModal').text(game_state.guesses.length)
  $('#correctModalName').append(`<a href="https://cod-esports.fandom.com/wiki/${game_state.name}" target="_blank">${game_state.name}</a>`)
}

function createGuessesChart(guesses) {
  // Calculate frequencies
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
  // Calculate frequencies
  const frequencies = calculateFrequencies(data);

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
  const results = await $.get(`/api/results?name=${name}`)
  if (results) {
    setMeanGuesses(results)
    const filteredResults = results.filter(result => result.guesses !== null)
    $('#totalPlayers').text(results.length)
    createGlobalChart(filteredResults)
  } else {
    $('#guessesChart').text('Unable to load global results')
  }
}

async function setMeanGuesses(data) {
  const filteredData = data.filter(result => result.guesses!== null && result.guesses!== 1)
  console.log(filteredData)
  const total = filteredData.reduce((sum, obj) => sum + obj.guesses, 0)
  const mean = total / filteredData.length
  const roundedMean = parseFloat(mean.toFixed(1))
  $("#meanGuesses").text(roundedMean)
}