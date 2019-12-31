const fs = require('fs');
const path = require('path');
const conf = require('./config');

const {
  readCSV,
  connvertData,
} = require('./common');

const inputFolder = process.argv.length > 2 ? process.argv[2] : 'data';
const outputFolder = process.argv.length > 3 ? process.argv[3] : 'json';

async function main() {
  const results = connvertData(await readCSV(inputFolder), conf);
  for(const afile of results) {
    const f = path.join(outputFolder, `${path.parse(afile.filename).name}.json`);
    fs.writeFileSync(f,JSON.stringify(afile, null, '  '));
  }
}

main();
