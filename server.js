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

  app.post('/files', (req, res) => {
    res.json(files.map( file => {
      return {
        filename: file.filename,
      }
    }));
  })

  app.post('/key', (req, res) => {
    const { filenames } = req.body;
    const results = files.filter( file => filenames.some( filename => file.filename == filename ));
    res.json(results.map( file => file.key ));
  })

  app.post('/cell', (req, res) => {
    const { filenames } = req.body;
    const results = files.filter( file => filenames.some( filename => file.filename == filename ));
    res.json(results.map( file => file.cells ));
  })

  app.post('/json', (req, res) => {
    const { filenames } = req.body;
    const results = files.filter( file => filenames.some( filename => file.filename == filename ));
    res.json(results);
  })

  app.post('/reduce', (req, res) => {
    const { cols, rows } = req.body;
    const data = reduceData(files, cols, rows );
    res.json(data.map( d => {
      return {
        x: d.date,
        y: d.value,
      }
    }).sort((a,b) => {
      return (a.date > b.date ? 1 : -1);
    }))
  })

  app.listen(PORT, () => console.log(`listening on port ${PORT}!`));
}

main();
