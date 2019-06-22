const config = require('config');
const insights = require('../lib/insights.js');
const dashboards = require('../lib/dashboards.js');
const helper = require('../lib/helper.js');

var json2csv = require('json2csv');
const fs = require('fs');

var program = require('commander');

// Why do we divide by 1? Because it makes the JSON output have the attribute name "result"
const NRQL_APM = "SELECT sum(apmComputeUnits)/1  FROM NrDailyUsage WHERE `productLine` = 'APM' AND `usageType` = 'Host' ";
const NRQL_INFRA = "SELECT SUM(infrastructureComputeUnits) / 1 FROM NrDailyUsage WHERE `productLine` = 'Infrastructure' AND `usageType` = 'Host' ";
const NRQL_INSIGHTS = "SELECT SUM(insightsTotalEventCount - insightsIncludedEventCount) / uniqueCount(timestamp) FROM NrDailyUsage WHERE `productLine` = 'Insights' AND `usageType` = 'Event' ";
const NRQL_MOBILE = "SELECT sum(mobileUniqueUsersPerMonth) / 1 FROM NrDailyUsage WHERE `productLine` = 'Mobile' AND `usageType` = 'Application' "
const NRQL_SYN = "SELECT SUM(syntheticsSuccessCheckCount + syntheticsFailedCheckCount) / 1  FROM NrDailyUsage WHERE `productLine` = 'Synthetics' AND `usageType` = 'Check' AND `syntheticsTypeLabel` != 'Ping' "

// NRQL queries for script
//const NRQL_FACET = " FACET consumingAccountId, consumingAccountName LIMIT 1000 "
const NRQL_FACET = " FACET cloudInstanceId LIMIT 2000 "

const NRQL_EC2 = "SELECT latest(label.AppName) FROM ComputeSample WHERE provider = 'Ec2Instance' facet ec2InstanceId limit 2000"


// Global variables
var configId;
var publishId;
var sinceEpoch;
var untilEpoch;
var accountResult = [];
var doneCount = 0;
var doneExpected = 3;
var dateStart = new Date();
var publishData = false;

function toInsights() {
	var jsonArr = Object.values(accountResult);
	insights.publish(jsonArr, publishId, function(error, response, body) {
		console.log(response.body);	
	});
}


function toCSV() {
	if ( publishData ) {
		console.log('Sending to Insight');
		toInsights();
	} 
  console.log('Create CSV');
	
  
  // Setup the input
  var input = {
    data: Object.values(accountResult),
    fields: ['eventType', 'date', 'hostId', 'apm','infra' , 'appName']
  }

  // Store the CSV
  json2csv(input, function(err, csvData) {
    if (err) {
      console.log('ERROR!');
      console.log(err);
    } else {
      var fname = 'usage-' + program.year + '-' + program.month + '-' + new Date().getTime() + '.csv';
      console.log('Writing usage to: ' + fname);
      //console.log('Writing usage to: ' + csvData);
      fs.writeFile(fname, csvData, function(fileErr) {
        if(fileErr) {
          return console.log(fileErr);
        }
      });
    }
  });
}

function checkDone(usageType) {
  doneCount++;
  console.log(usageType, 'done');
  if (doneCount == doneExpected) {
    console.log('All done running queries');
    //console.log(accountResult);
    toCSV();
  }
}

function runQuery(nrql, usageType) {
  //console.log(nrql);
  insights.query(nrql, configId, function(error, response, body) {
    var parsedBody = helper.handleCB(error, response, body);
    //console.log(parsedBody);
    parseUsage(parsedBody.facets, usageType);
    
    checkDone(usageType);
  });
}

function parseUsage(facetArr, usageType) {
  // Loop over the facets
  for (var i=0; i < facetArr.length; i++) {
    var facet = facetArr[i];
    
    // In the facet name section, 0 is accountId, 1 is accountName
    //var hostId= facet.name[0];
    var hostId= facet.name;

    //var accountName = facet.name[1];

    // In the facet result section there should be a single value called result
    //var usageVal = facet.results[0].result;
    var usageVal = Object.values(facet.results[0])[0];

    // Get the account (or create it if it doesn't exist)
    var acct = lookupHost(hostId);

    // Add that usage data to the account
    acct[usageType] = usageVal;
    if (usageType == 'a1ppName') { 
			console.log("acct =" , acct);
		}
    // console.log(acct);
  }
}

function lookupHost(hostId) {
  var acct = accountResult[hostId];

	//console.log(dateStart.toISOString().substring(0, 10));

  if (acct == null) {
    acct = { 'eventType': 'trpNrUsage',
			'date': dateStart.toISOString().substring(0, 10),
			'hostId': hostId 
		} ;
    accountResult[hostId] = acct;
  }
  return acct;
}

function lookupAccount(accountId, accountName) {
  var acct = accountResult[accountId];
  if (acct == null) {
    acct = {
      'accountId': accountId,
      'accountName': accountName
    }
    accountResult[accountId] = acct;
  }
  return acct;
}

function runQueries() {
  var nrqlApm = NRQL_APM + NRQL_FACET + ' SINCE ' + sinceEpoch + ' UNTIL ' + untilEpoch;
  runQuery(nrqlApm, 'apm');
  

  var nrqlInfra = NRQL_INFRA + NRQL_FACET + ' SINCE ' + sinceEpoch + ' UNTIL ' + untilEpoch;

  runQuery(nrqlInfra, 'infra');

  var nrqlEc2 = NRQL_EC2 + ' SINCE ' + sinceEpoch + ' UNTIL ' + untilEpoch;

  // console.log(nrqlEc2);
  runQuery(nrqlEc2, 'appName');

}

// function makeDashboard(nrqlApm, nrqlBrowser, nrqlInfra, nrqlInsights, nrqlMobile, nrqlSyn) {
//   var dashboardBody = require('./dashboards/license-usage.json');
//   // console.log(dashboardBody);
// }

////////////////////////////////////////////////////////////////////////////////
console.log('License usage to CSV tool');

program
  .version('0.0.1')
  .description('get license usage for your accounts')
  .option('--year [year]', 'Which year to report in format yyyy (ex: 2018)')
  .option('--month [month]', 'Which month to report in mm (ex: 01)')
  .option('--day [day]', 'Which month to report in mm (ex: 01)')
  .option('--account [account]', 'Account name to run against from your config')
  .option('--publish [account]', 'Account name to send the data')
  .parse(process.argv);

if (!process.argv.slice(8).length) {
  program.outputHelp();
} else {
  if (program.year && program.month && program.account) {
    // Check that the month is valid
    var iYear = parseInt(program.year);
    var iMonth = parseInt(program.month) - 1; // JS months start at 0?
    var iDay = parseInt(program.day) ; // JS months start at 0?
    dateStart.setFullYear(iYear, iMonth, iDay);
    dateStart.setHours(0, 0, 0, 0);
    if (dateStart.getMonth() != iMonth ) {
			console.log('wrong input - do nothing' ) ;
			return;
		}

    var dateEnd = new Date(dateStart.getTime()+ 86400000);


    if (program.publish && config.has(program.publish)) {
      console.log('Publish data  ', program.publish, 'for the dates', dateStart, 'to', dateEnd);
      publishId = program.publish;
			publishData = true;
		} else {
			if ( program.publish ) {
				console.log('Could not find account in config - ' , program.publish);
			}
			console.log('Not publish data, only local csv file');
		}
	

		if (config.has(program.account)) {
      console.log('Run against', program.account, 'for the dates', dateStart, 'to', dateEnd);
      configId = program.account;
      sinceEpoch = dateStart.getTime() / 1000;
      untilEpoch = dateEnd.getTime() / 1000;
      runQueries();
    } else {
      console.error('Could not find account in config, double check your NODE_ENV=', process.env.NODE_ENV);
    }
  } else {
    program.outputHelp();
  }
}
