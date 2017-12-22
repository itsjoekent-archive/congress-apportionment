const fs = require('fs');
const csvtojson = require('csvtojson');
const json2csv = require('json2csv');

// edit this & re-run for different sizes of congress
const HOUSE_SIZE = 435;

function parseCsv(file) {
  const data = [];
  return new Promise((resolve) =>
    csvtojson().fromFile(file).on('json', json => data.push(json)).on('done', () => resolve(data))
  );
}

function formatData(source) {
  const sortedByDecade = source.reduce((acc, row) => {
    if (! acc[row.decade]) {
      acc[row.decade] = [];
    }

    if (parseInt(row.population) > 0) {
      // Comment this out to simulate without 1 per state by default.
      acc[row.decade].push({
        state: row.name,
        priorityValue: Number.MAX_SAFE_INTEGER,
      });
    }

    for (const key of Object.keys(row)) {
      if (isNaN(key)) {
        continue;
      }

      acc[row.decade].push({
        state: row.name,
        priorityValue: parseInt(row[key]),
      });
    }

    acc[row.decade] = acc[row.decade].sort((a, b) => {
      return b.priorityValue - a.priorityValue;
    });

    return acc;
  }, {});

  const selectedMembersByDecade = {};
  for (const decade of Object.keys(sortedByDecade)) {
    selectedMembersByDecade[decade] = sortedByDecade[decade].slice(0, HOUSE_SIZE);
  }

  const membersPerStateByDecade = {};
  for (const decade of Object.keys(selectedMembersByDecade)) {
    for (const { state } of selectedMembersByDecade[decade]) {
      if (! membersPerStateByDecade[state]) {
        membersPerStateByDecade[state] = { state };
      }

      if (! membersPerStateByDecade[state][decade]) {
        membersPerStateByDecade[state][decade] = 0;
      }

      membersPerStateByDecade[state][decade] += 1;
    }
  }

  const membersPerStateByDecadeList = [];
  for (const state of Object.keys(membersPerStateByDecade)) {
    membersPerStateByDecadeList.push(membersPerStateByDecade[state]);
  }

  return membersPerStateByDecadeList;
}

function writeData(data) {
  const csv = json2csv({
    data,
    fields: ['state', '1940', '1950', '1960', '1970', '1980', '1990', '2000', '2010', '2020', '2030', '2040'],
  });

  return new Promise((resolve) => {
    fs.writeFile('./data.csv', csv, resolve);
  });
}

parseCsv('./house.csv')
  .then(formatData)
  .then(writeData)
  .then(() => console.log('done'));
