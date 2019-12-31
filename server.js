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

  app.post('/keys', (req, res) => {
    const { filenames } = req.body;
    const results = files.filter( file => filenames.some( filename => file.filename == filename ));
    res.json(results.map( file => { return { ...file.key, filename: file.filename }} ));
  })

  app.post('/cells', (req, res) => {
    const { filenames } = req.body;
    const results = files.filter( file => filenames.some( filename => file.filename == filename ));
    res.json(results.map( file => { return { ...file.cells, filename: file.filename }} ));
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
        filename: d.filename,
      }
    }).sort((a,b) => {
      return (new Date(a.x) > new Date(b.x) ? 1 : -1);
    }))
  })

  app.listen(PORT, () => console.log(`listening on port ${PORT}!`));
}

main();
