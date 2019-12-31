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

async function readJSON(dirname) {
  const files = fs.readdirSync(dirname);
  const results = [];
  for (const file of files) {
    results.push(JSON.parse(fs.readFileSync(path.join(dirname, file))));
  }
  return results;
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
          return i >= conf.key.row+1 ? rowKey.push(v) : null;
         });
      }
      if (sheet.length >= conf.key.col) {
        sheet.forEach( (line, i) => i >= conf.key.col+1 ? colKey.push(line[''+conf.key.row]) : null );
      }
      for (c=conf.key.col+1;c<conf.key.col+1+colKey.length;c++) {
        const line = sheet[c];
        const lineKeys = Object.keys(line);
        const data = [];
        for (r=conf.key.row+1;r<conf.key.row+1+rowKey.length;r++) {
          data.push(line[lineKeys[r]]);
        }
        cells.push(data);
      }
    }
    return { key: { col:colKey, row:rowKey, }, cells, date: file.date, filename: file.filename }
  })
}

function reduceData(files, _col, _row) {
  if (typeof(_col) !== 'object') _col = [ _col ];
  if (typeof(_row) !== 'object') _row = [ _row ];
  return files.map( file => {
    let sum = 0;
    for (const col of _col) {
      for (const row of _row) {
        if (col >= 0 && file.cells.length >= row && row >= 0 && file.cells[row].length >= col) {
          const value = file.cells[row][col].replace(/[^0-9\.]/g, '');
          sum += parseInt(value);
        }
      }
    }
    return { value: sum, date: file.date, };
  });
}

function getKeys(file, col, row) {
  return { col: file.key.col[col], row: file.key.row[row] };
}

exports.readJSON = readJSON;
exports.getDate = getDate;
exports.readCSV = readCSV;
exports.connvertData = connvertData;
exports.reduceData = reduceData;
exports.getKeys = getKeys;
