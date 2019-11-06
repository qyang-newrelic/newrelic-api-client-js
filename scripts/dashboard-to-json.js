const dashboards = require('../lib/dashboards.js');
const helper = require('../lib/helper.js');
const config = require('config');
var program = require('commander');
var fs = require('fs');



// Read the source dashboard
var readDash = function(error, response, body) {
  var dashboardBody = helper.handleCB(error, response, body);
  if (dashboardBody != null) {
    console.log('Found source dashboard named: ' + dashboardBody.dashboard.title);
    
    var srcId = config.get(program.src).accountId;
    var newBody = dashboards.removeAccountId(dashboardBody);
    console.log(newBody);
    
	  data = JSON.stringify(newBody,null, 2);
    console.log('writing the dashboard to file:'  + jsonFile);
    fs.writeFileSync(jsonFile, data);
    

  }
}

// Setup the commander program
program
  .version('0.0.1')
  .option('--src [account]', 'Source account that has the dashboard to be copied')
  .option('--dash [dashboardId]', 'Id of the dashboard to be copied')
  .option('--file [json file]', 'File to keep the dashboard ')
  .parse(process.argv);

if (!process.argv.slice(7).length) {
  program.outputHelp();
} else {
  // Make sure [from] is in the config
  if (!config.has(program.src)) {
    console.error('Your config does not have *src* account: ' + program.src, 'check your NODE_ENV=', process.env.NODE_ENV);
  } else {
    // We have good data so try to read the dashboard
    console.log('Trying to find dashboard: ' + program.dash);
    dashboards.getOne(program.dash, program.src, readDash);
    jsonFile  = program.file
  }
}
