const express = require('express');
const path = require('path');
const app = express();
const port = 3000;
require('dotenv').config(); 
const mongoose = require('mongoose');
const playersRouter = require('./src/routes/playerRoutes')
const resultsRouter = require("./src/routes/resultsRouter")

app.use(express.json())

app.use((req, res, next) => {
  const host = req.headers.host;
  console.log("host: ", req.headers.host)
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

app.use('/api/players', playersRouter)
app.use('/api/results', resultsRouter)

mongoose.connect(process.env.DB_STRING).then(() => {
  console.log("connected to DB")
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
})


