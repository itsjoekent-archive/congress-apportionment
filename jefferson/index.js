const fs = require('fs');
const csvtojson = require('csvtojson');
const json2csv = require('json2csv');

const years = [
  '1790',	'1800',	'1810',	'1820',	'1830',
  '1840',	'1850',	'1860',	'1870',	'1880',
  '1890',	'1900',	'1910',	'1920',	'1930',
  '1940',	'1950',	'1960',	'1970',	'1980',
  '1990',	'2000',	'2010',	'2020',	'2030',
  '2040',
];

function cleanTotal(val) {
  return parseInt(val.replace(/,/g, '')) || 0;
}

function parseCsv(file) {
  const data = [];
  return new Promise((resolve) =>
    csvtojson().fromFile(file).on('json', json => data.push(json)).on('done', () => resolve(data))
  );
}

function formatData(source) {
  const states = source.filter(row => row.field1 !== 'size of congress');

  const totalSeats = {};
  const statePopulation = {};
  const divisors = {};

  function fillWithDecades(host, set) {
    years.forEach((decade) => {
      if (host[decade]) return;
      host[decade] = set;
    });
  }

  fillWithDecades(totalSeats, 0);
  fillWithDecades(divisors, []);

  source.forEach((row) => {
    if (row.field1 === 'size of congress') {
      years.forEach((decade) => {
        totalSeats[decade] = row[decade];
      });
      return;
    }

    const state = row.field1;
    years.forEach((decade) => {
      if (! statePopulation[state]) {
        statePopulation[state] = {};
        fillWithDecades(statePopulation[state], 0);
      }

      const total = cleanTotal(row[decade]);

      statePopulation[state][decade] = total;
    });
  });

  years.forEach((decade) => {
    const popTotal = states
      .reduce((acc, row) => acc += cleanTotal(row[decade]), 0);

    divisors[decade] = popTotal / totalSeats[decade];
  });

  const newCongress = {};

  years.forEach((decade) => {
    const totalDefaultMembers = source.filter(row => row[decade] > 0).length;
    const goal = totalSeats[decade] - totalDefaultMembers;

    let remaining = goal;
    let divisor = divisors[decade];

    while (remaining > 0) {
      states.forEach((row) => {
        const state = row.field1;

        if (! newCongress[state]) {
          newCongress[state] = {};
          fillWithDecades(newCongress[state], 0);
        }

        // Every state gets 1 member by default.
        const total = Math.floor(statePopulation[state][decade] / divisor) + 1;
        newCongress[state][decade] = total;

        remaining -= total;
      });

      if (remaining > 0) {
        divisor = Math.floor(divisor - 1);
        remaining = goal;
      }
    }
  });

  const transposed = [];
  states.forEach((row) => {
    const data = {
      state: row.field1,
    };

    years.forEach((decade) => {
      data[decade] = newCongress[data.state][decade];
    });

    transposed.push(data);
  });

  return transposed;
}

function writeData(data) {
  const fields = Object.keys(data[1]);

  const csv = json2csv({
    data, fields,
  });

  return new Promise((resolve) => {
    fs.writeFile('./data.csv', csv, resolve);
  });
}

parseCsv('./house.csv')
  .then(formatData)
  .then(writeData)
  .then(() => console.log('done'))
  .catch(console.error);
