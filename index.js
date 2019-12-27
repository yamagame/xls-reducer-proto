const csv = require('csv-parser');
const XLSX = require('xlsx');
const Readable = require('stream').Readable;
const fs = require('fs');
const path = require('path');

function getDate(filename) {
  const t = /^.+([0-9]{4})([0-9]{2})([0-9]{2}).+/;
  const m = filename.match(t);
  if (m) return new Date(`${m[1]}/${m[2]}/${m[3]}`);
  return null;
}

async function readCSV(dirname) {
  function _readCSV(filename) {
    return new Promise(resolve => {
      const results = [];
      const date = ((d) => d ? d.toLocaleString() : 'null')(getDate(filename));
      fs.createReadStream(filename)
        .pipe(csv({ headers: false }))
        .on('data', (data) => results.push(data))
        .on('end', () => {
          resolve({ filename, data: [ results ], date });
        });
    });
  }
  async function _readXLSX(filename) {
    function sheetToJson(sheet) {
      return new Promise(resolve => {
        const results = [];
        const csvData = XLSX.utils.sheet_to_csv(sheet);
        const stream = new Readable()
        stream.pipe(csv({ headers: false }))
        .on('data', (data) => results.push(data))
        .on('end', () => {
          resolve(results);
        });
        stream.push(csvData)
        stream.push(null)
      })
    }
    const results = [];
    const date = ((d) => d ? d.toLocaleString() : 'null')(getDate(filename));
    const wb = XLSX.readFile(filename);
    for(const sn of wb.SheetNames) {
      const sheetjson = await sheetToJson(wb.Sheets[sn]);
      results.push(sheetjson);
    }
    return { filename, data: results, date };
  }
  const files = fs.readdirSync(dirname);
  const results = [];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.csv') {
      results.push(await _readCSV(path.join(dirname, file)));
    } else
    if (ext === '.xlsx' || ext === '.xls') {
      results.push(await _readXLSX(path.join(dirname, file)));
    } else {
      console.log('unknown file format');
    }
  }
  return results;
}

const conf = {
  sheet: 0,
  key: { col:2, row:0, },
  sum: [
    { col: 3, row: 1, },
    { col: 4, row: 1, },
  ],
}

function connvertData(data, conf) {
  return data.map( file => {
    const colKey = [];
    const rowKey = [];
    const cells = [];
    if (file.data.length >= conf.sheet) {
      const sheet = file.data[conf.sheet];
      if (sheet.length >= conf.key.col) {
        Object.keys(sheet[conf.key.col]).forEach( (k, i) => {
          const v = sheet[conf.key.col][k];
          return i >= conf.key.row+1 ? colKey.push(v) : null;
         });
      }
      if (sheet.length >= conf.key.row) {
        sheet.forEach( (v, i) => i >= conf.key.col+1 ? rowKey.push(v[Object.keys(v)[conf.key.row]]) : null );
      }
      for (c=conf.key.col+1;c<conf.key.col+rowKey.length;c++) {
        const line = sheet[c];
        const lineKeys = Object.keys(line);
        const data = [];
        for (r=conf.key.row+1;r<conf.key.row+rowKey.length;r++) {
          data.push(line[lineKeys[r]]);
        }
        cells.push(data);
      }
    }
    return { key: { col:colKey, row:rowKey, }, cells, date: file.date }
  })
}

function reduceData(files, col, row) {
  return files.map( file => {
    if (file.cells.length >= col && file.cells[col].length >= row) {
      return { value: file.cells[col][row].replace(/[^0-9\.]/g, ''), date: file.date, col: file.key.col[col], row: file.key.row[row], };
    }
    return { value: 0, date: file.date };
  });
}

const dataFolder = process.argv.length > 2 ? process.argv[2] : 'data';

async function main() {
  const results = [];
  for(const sum of conf.sum) {
    const row = sum.row-conf.key.row-1;
    const col = sum.col-conf.key.col-1;
    const data = reduceData(connvertData(await readCSV(dataFolder), conf), col, row );
    let keys = {};
    const result = data.map( d => {
      const { row, col } = d;
      keys.row = row;
      keys.col = col;
      delete d.row;
      delete d.col;
      return { ...d }
    })
    results.push({ values: result, ...keys });
  }
  console.log(JSON.stringify(results, null, '  '));
}

main();
