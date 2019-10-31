const dashboards = require('../lib/dashboards.js');
const helper = require('../lib/helper.js');
const config = require('config');
var program = require('commander');
const  fs = require('fs');
const Mustache = require("mustache");


// Print out the URL of the newly created dashboard
var handleCreate = function(error, response, body) {
  var rspBody = helper.handleCB(error, response, body);
  if (rspBody != null) {
    var destId = config.get(program.dest).accountId;
    var url = 'http://insights.newrelic.com/accounts/' + destId + '/dashboards/' + rspBody.dashboard.id;
    console.log('Dashboard created: ' + url);
  }
}

// Setup the commander program
program
  .version('0.0.1')
  .option('--dir [account]', 'Source account that has the dashboard to be copied')
  .option('--dash [dashboard]', 'Id of the dashboard to be copied')
  .option('--dest [account]', 'Destination account to copy the dashboard to')
  .parse(process.argv);

if (!process.argv.slice(7).length) {
  program.outputHelp();
} else {
  // Make sure [from] is in the config
  if (!config.has(program.dest)) {
    console.error('Your config does not have *dest* account: ' + program.dest, 'check your NODE_ENV=', process.env.NODE_ENV);
  } else {
    // We have good data so try to read the dashboard
    console.log('Trying to find dashboard: ' + program.dash);
	  var rawData = fs.readFileSync(program.dir + '/' + program.dash + '_dashboard.json');
 	  var dashTemplate  = rawData.toString();
 	  rawData = fs.readFileSync(program.dir + '/' + program.dash + '_config.json');
 	  var dashConfig  = JSON.parse(rawData);
 	  var newDash = JSON.parse(Mustache.render(dashTemplate, dashConfig));
    console.log(newDash);    
 	  dashboards.create(newDash, program.dest, handleCreate);
 }
}
