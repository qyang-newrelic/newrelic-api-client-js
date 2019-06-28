const config = require('config');
const insights = require('../lib/insights.js');
const dashboards = require('../lib/dashboards.js');
const helper = require('../lib/helper.js');

var json2csv = require('json2csv');
const fs = require('fs');

var program = require('commander');

// Why do we divide by 1? Because it makes the JSON output have the attribute name "result"
//const NRQL_APM = "SELECT sum(apmComputeUnits)/1  FROM NrDailyUsage WHERE `productLine` = 'APM' AND `usageType` = 'Host' ";
const NRQL_APM = "SELECT * FROM NrDailyUsage WHERE `productLine` = 'APM' AND `usageType` = 'Host' ";
//const NRQL_INFRA = "SELECT SUM(infrastructureComputeUnits) / 1 FROM NrDailyUsage WHERE `productLine` = 'Infrastructure' AND `usageType` = 'Host' ";
const NRQL_INFRA = "SELECT * FROM NrDailyUsage WHERE `productLine` = 'Infrastructure' AND `usageType` = 'Host' ";

// NRQL queries for script
const NRQL_LIMIT =  " limit 2000 "

const NRQL_EC2 = "SELECT count(timestamp)  FROM ComputeSample WHERE provider = 'Ec2Instance' facet ec2InstanceId, ec2PrivateDnsName, AppName, AppID, AppId"


// Global variables
var configId;
var publishId;
var sinceEpoch;
var awsSinceEpoch;
var untilEpoch;
var runEpoch;
var runDate = new Date();
var apmResult= [];
var infraResult= [];
var doneCount = 0;
var doneExpected = 3;
var dateStart = new Date();
var publishData = false;
var loadTag;
var env;
var debug=false;

function toInsights(obj) {
	var jsonArr = Object.values(obj);
  console.log("data size: ", jsonArr.length);
	insights.publish(jsonArr, publishId, function(error, response, body) {
		console.log(response.body);	
	});

}


function toCSV(obj) {
	if ( publishData ) {
		console.log('Sending to Insight');
		toInsights(obj);
	} 
	return;
  console.log('Create CSV');
	
  
  // Setup the input
  var input = {
    data: Object.values(obj),
    fields: ['eventType', 'loadTag', 'time', 'env', 'hostId', 'apm','infra' , 'ec2InstanceId', 'AppName', 'AppID', 'AppId', 'ec2PrivateDnsName', 'agentHostname']
  }

  // Store the CSV
  json2csv(input, function(err, csvData) {
    if (err) {
      console.log('ERROR!');
      console.log(err);
    } else {
      var fname = 'u' + program.year + '-' + program.month + '-' + program.day + '_' + loadTag + '.csv';
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
    toCSV(infraResult);
    toCSV(apmResult);
  }
}

function runEC2Query(nrql, nrqlName) {
  console.log(nrql);
  insights.query(nrql, configId, function(error, response, body) {
    var parsedBody = helper.handleCB(error, response, body);
    parseEC2(parsedBody.facets, nrqlName);
    checkDone(nrqlName);
  });
}

function runQuery(nrql, usageType, parseResult) {
  console.log(nrql);
  insights.query(nrql, configId, function(error, response, body) {
    var parsedBody = helper.handleCB(error, response, body);
    parseResult(parsedBody.results[0].events, usageType);
    
    checkDone(usageType);
  });
}

function appendJson(target, dataObj) {
	for (var key in dataObj) {
  	target[key] = dataObj[key];
 	}
}

function parseEC2(facetArr, nrqlName) {
  // Loop over the facets
  console.log(nrqlName, " Query Result count =", facetArr.length);
  for (var i=0; i < facetArr.length; i++) {
    var facet = facetArr[i];
    
    // In the facet name section, 0 is accountId, 1 is accountName
    //var hostId= facet.name[0];
    var ec2InstanceId = facet.name[0];

    var hostId = ec2InstanceId;

    // In the facet result section there should be a single value called result
    //var usageVal = facet.results[0].result;
    var  ec2PrivateDnsName = facet.name[1];
    var  AppName = facet.name[2];
    var  AppID = facet.name[3];
    var  AppId = facet.name[4];
 
	  if ( ! AppID  && AppId ) {
				AppID = AppId;
    } else if ( ! AppId  && AppID ) {
				AppId = AppID;
		}

    // Get the account (or create it if it doesn't exist)
    var apmAcct = lookupHost(hostId,apmResult);
    var infraAcct = lookupHost(hostId,infraResult);

		var awsInfo = {
    	'AppName': AppName,
    	'AppID': AppID,
    	'AppId': AppId,
    	'ec2InstanceId': ec2InstanceId,
    	'ec2PrivateDnsName': ec2PrivateDnsName};

    // Add that usage data to the account
    appendJson(infraAcct,awsInfo);
    appendJson(apmAcct,awsInfo);

		//console.log("apmAcct =" , apmAcct);
		//console.log("infraAcct =" , infraAcct);
  }
	
}

function parseAPMUsage(eventArr, usageType) {
  // Loop over the facets
  console.log(usageType, " Query Result count =", eventArr.length);
  for (var i=0; i < eventArr.length; i++) {
    var ev = eventArr[i];
    
    // In the facet name section, 0 is accountId, 1 is accountName
    //var hostId= facet.name[0];
    var hostId= ev.hostId;

    // In the facet result section there should be a single value called result
    //var usageVal = facet.results[0].result;
    var event = ev;

    // Get the account (or create it if it doesn't exist)
    //

    var acct = lookupHost(hostId,apmResult);

		
    // Add that usage data to the account
    appendJson(acct,ev);

		delete acct.timestamp;

		
    if ( debug ) { 
    //if ( usageType || usageType == 'infra' ) { 
			console.log("acct =" , acct);
		}
    // console.log(acct);
  }
}

function parseInfraUsage(eventArr, usageType) {
  // Loop over the facets
  console.log(usageType, " Query Result count =", eventArr.length);
  for (var i=0; i < eventArr.length; i++) {
    var ev = eventArr[i];
    
    // In the facet name section, 0 is accountId, 1 is accountName
    //var hostId= facet.name[0];
    var hostId= ev.hostId;

    // In the facet result section there should be a single value called result
    //var usageVal = facet.results[0].result;
    var event = ev;

    // Get the account (or create it if it doesn't exist)
    //
    if ( ! hostId ) {
			if ( ! ev.cloudInstanceId ) {
					hostId = ev.agentHostname;
			}
			else {
				hostId = ev.cloudInstanceId;
			}
		}

    var acct = lookupHost(hostId,infraResult);

    // Add that usage data to the account
    appendJson(acct,ev);
		delete acct.timestamp;

    if ( debug ) { 
    //if ( usageType || usageType == 'infra' ) { 
			console.log("acct =" , acct);
		}
    // console.log(acct);
  }
}

function lookupHost(hostId, resultArr) {
  var acct = resultArr[hostId];

	//console.log(dateStart.toISOString().substring(0, 10)); 
	//
  if (acct == null) {
    acct = { 'eventType': 'awsNrUsage',
			'loadTag': loadTag,
			'time': sinceEpoch,
			'env': env
		} ;
    resultArr[hostId] = acct;
  }
  return acct;
}

function runQueries() {
  var nrqlApm = NRQL_APM + NRQL_LIMIT + ' SINCE ' + sinceEpoch + ' UNTIL ' + untilEpoch;
  runQuery(nrqlApm, 'apm', parseAPMUsage);
  

  var nrqlInfra = NRQL_INFRA + NRQL_LIMIT + ' SINCE ' + sinceEpoch + ' UNTIL ' + untilEpoch;

  runQuery(nrqlInfra, 'infra', parseInfraUsage);

  var nrqlEc2 = NRQL_EC2 + NRQL_LIMIT + ' SINCE ' + awsSinceEpoch + ' UNTIL ' + untilEpoch;

  // console.log(nrqlEc2);
  runEC2Query(nrqlEc2, 'EC2');

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
  .option('--tag [loadTag]', 'load Tag to insights')
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
	
		if (program.tag ) {
			loadTag=program.tag
		} else {
			loadTag= runDate.toISOString().substring(0, 15);  // tag - UTC time to 10 minutes
		}

		console.log('Load Tag is: ' , loadTag);

		if (config.has(program.account)) {
      console.log('Run against', program.account, 'for the dates', dateStart, 'to', dateEnd);
      configId = program.account;
      env = program.account;
      sinceEpoch = dateStart.getTime() / 1000;
      awsSinceEpoch = dateStart.getTime() / 1000  - 86400;
      untilEpoch = dateEnd.getTime() / 1000;
      runEpoch= runDate.getTime() /1000;
      runQueries();
    } else {
      console.error('Could not find account in config, double check your NODE_ENV=', process.env.NODE_ENV);
    }
  } else {
    program.outputHelp();
  }
}
