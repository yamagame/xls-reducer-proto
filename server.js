const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const fs = require('fs');
const path = require('path');
const conf = require('./config');
const PORT = process.env.PORT || 3030;
const inputFolder = process.argv.length > 2 ? process.argv[2] : 'json';

app.use(bodyParser.json({ type: 'application/json' }))

const {
  getKeys,
  readJSON,
  reduceData,
} = require('./common');

async function main() {
  const files = await readJSON(inputFolder);

  app.post('/keys', (req, res) => {
    res.json(files[0].key);
  })

  app.post('/reduce', (req, res) => {
    const { cols, rows } = req.body;
    const data = reduceData(files, cols, rows );
    res.json(data.map( d => {
      return {
        x: d.date,
        y: d.value,
      }
    }))
  })

  app.listen(PORT, () => console.log(`listening on port ${PORT}!`));
}

main();
