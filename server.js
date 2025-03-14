const express = require('express');
const path = require('path');
const app = express();
const port = 3000;
require('dotenv').config(); 
const mongoose = require('mongoose');
const playersRouter = require('./src/routes/playerRoutes')
const resultsRouter = require("./src/routes/resultsRouter")
const infiniteRouter = require("./src/routes/infiniteRoutes")
const gridRouter = require("./src/routes/gridRoutes")
const cron = require('node-cron')
const grid = require("./src/grid")
const GridPuzzle = require("./src/models/gridModel")

// generate puzzle for next day
cron.schedule('0 3 * * *', async () => {
  console.log("Generating puzzle")
  try {
    const newGrid = await grid(); // Get the generated puzzle data

    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(8, 0, 0, 0); // Set date to next day's 08:00 UTC

    const updatedPuzzle = await GridPuzzle.findOneAndUpdate(
      { date: tomorrow }, // Search for existing puzzle with this date
      { 
        rows: newGrid.rows, 
        cols: newGrid.cols, 
        answers: newGrid.answers,
        createdAt: new Date() // Update creation timestamp
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log("Puzzle set for:", updatedPuzzle.date);
  } catch (e) {
    console.error("Error generating puzzle:", e);
  }
})


app.use(express.json())

app.use((req, res, next) => {
  const host = req.headers.host;
  const isOldUrl = host === 'cdlwordle-production.up.railway.app';

  if (isOldUrl) {
    const newUrl = `https://www.cdlwordle.me${req.originalUrl}`;
    return res.redirect(301, newUrl); // 301 indicates a permanent redirect
  }
  
  next();
});

app.use((req, res, next) => {
  const host = req.headers.host;

  // Check if the request is to the non-www domain
  if (host === 'cdlwordle.me') {
    const newUrl = `https://www.cdlwordle.me${req.originalUrl}`;
    return res.redirect(301, newUrl); // Permanent redirect
  }

  // Proceed if no redirect is needed
  next();
});


// Serve static files (JS, CSS, images) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/privacy-policy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy-policy.html'));
});

app.get('/gridlock', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'gridlock.html'))
})

app.use('/api/players', playersRouter)
app.use('/api/results', resultsRouter)
app.use('/api/infinite', infiniteRouter)
app.use('/api/gridlock', gridRouter)

mongoose.connect(process.env.DB_STRING).then(() => {
  console.log("connected to DB")
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
})


