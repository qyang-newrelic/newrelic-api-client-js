const config = require('config');
const insights = require('../lib/insights.js');
const helper = require('../lib/helper.js');
const fs = require('fs');
const program = require('commander');

var nrql = 'SELECT  * from PageView LIMIT 100';
var since = ' SINCE 1 week ago';

var configArr = config.get('configArr');
var accountUsageCount = 0;
var accountLen = configArr.length;
var usedResult = [];

console.log('Going to query: ' + accountLen + ' accounts.');
console.log('With duration: ' + since);


function runNrqlQuery(fullNrql, jsonFile, configId) {
  insights.query(fullNrql, configId, function(error, response, body) {
    // console.log('Data received from: ' + configId);
    if (!error & response.statusCode == 200) {
      var resultBody = helper.handleCB(error, response, body);
			data = JSON.stringify(resultBody,null, 2);  
			fs.writeFileSync(jsonFile, data);  
      
    } else {
      console.error(error);
    }

  });
}

program
  .version('0.0.1')
  .option('--dest [account]', 'Destination account where monitors are created')
  .option('--json [file]', 'Location of source CSV file')
  .option('--nrql [file]', 'Location of source CSV file')
  .parse(process.argv);

if (!process.argv.slice(4).length) {
  program.outputHelp();
} else {
  if (program.json && program.dest) {

    // Go fetch the full list of locations
    fullNrql = nrql + since;
    console.log('NRQL:', fullNrql);
    console.log('Writing file:', program.json);
    runNrqlQuery(fullNrql, program.json, program.dest);
  }
}
