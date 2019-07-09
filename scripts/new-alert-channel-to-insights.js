const alerts = require('../lib/alerts.js');
const helper = require('../lib/helper.js');
const config = require('config');
var program = require('commander');

var channelName = 'Insights Alerts Webhook'
var channelId;
var channelData = {
	  "channel": {
		  	"name": channelName,
	    		"type": "webhook",
	    		"configuration": {			        
		    		"base_url": 'https://insights-collector.newrelic.com/v1/accounts/1/events',
		    		"payload_type": "application/json",
		    		"payload": {"eventType": "Alerts",
		    	          "account_id": "$ACCOUNT_ID",
		    	          "account_name": "$ACCOUNT_NAME",
		    	          "condition_id": "$CONDITION_ID",
		    	          "condition_name": "$CONDITION_NAME",
		    	          "current_state": "$EVENT_STATE",
		    	          "details": "$EVENT_DETAILS",
		    	          "event_type": "$EVENT_TYPE",
		    	          "incident_acknowledge_url": "$INCIDENT_ACKNOWLEDGE_URL",
		    	          "incident_id": "$INCIDENT_ID",
		    	          "incident_url": "$INCIDENT_URL",
		    	          "owner": "$EVENT_OWNER",
		    	          "policy_name": "$POLICY_NAME",
		    	          "policy_url": "$POLICY_URL",
		    	          "runbook_url": "$RUNBOOK_URL",
		    	          "severity": "$SEVERITY",
		    	          "targets": "$TARGETS",
		    	          "timestamp": "$TIMESTAMP",
		    	          "violation_chart_url": "$VIOLATION_CHART_URL"},
		    		"headers": {"X-Insert-Key": 'xxxxx'}
			}
		}
	};

var dashboardName = 'Alerts Sample'



// List of policies
var policyArr = [];
var currentPolicyNum = 0;

// Handle callback from adding channel to policy
var updateCB = function(error, response, body) {
  var updateBody = helper.handleCB(error, response, body);
  currentPolicyNum++;
  if (updateBody != null) {
    console.log('SUCCESS');
  }
  updateNextPolicy();
}

// This function will update the next policy in the array
// We do it so the updates are done sequentially
function updateNextPolicy() {
  if (currentPolicyNum < policyArr.length) {
    var policy = policyArr[currentPolicyNum];
    var policyId = policy.id;
    console.log('Adding channel (' + program.channelId + ') to policy: ' + policy.name + '(' + policy.id + ')');
    alerts.policyChannels.update(policyId, channelId, program.accountName, updateCB);
  } else {
    console.log('Done updating policies');
  }
}

// Loop through the list of policies
function readPolicies(error, response, body) {
  var policyBody = helper.handleCB(error, response, body);
  if (policyBody != null) {
    policyArr = policyBody.policies;
    updateNextPolicy();
  }
}


function  checkChannels(error, response, body) {
  var channelBody = helper.handleCB(error, response, body);
  var found = false;
  if (channelBody != null) {
    for (var i=0; i < channelBody.channels.length; i++) {
      var channel = channelBody.channels[i];
      if (channelName == channel.name) {
        console.log('Found channel: ' + channel.name + '(' + channel.id + ')');
        found = true;
      	channelId = channel.id;
				break;
      } 
    }
	}

	if (found) {
      console.error('Your channel: ' + channelId + ' exist.');
    	alerts.policies.list(null, program.accountName, readPolicies);
    } else {
			alerts.channels.create(channelData, program.accountName, function(error,response,body) {
        var channelBody = helper.handleCB(error,response,body);
      	var channel = channelBody.channels[0];
      	channelId = channel.id;
      	console.log('Your channel: ' + channelId + ' created.');
    		alerts.policies.list(null, program.accountName, readPolicies);
			});
		}

}

// Setup the commander program
program
  .version('0.1')
  .option('--accountName [accountName]', 'Account name from config file')
  .parse(process.argv);

if (!process.argv.slice(3).length) {
  program.outputHelp();
} else {
  // Make sure [from] is in the config
  if (!config.has(program.accountName)) {
    console.error('Your config does not have *account* account: ' + program.accountName);
  } else {
    // We have good data so try to read the dashboard
		channelData.channel.configuration['base_url'] = 'https://insights-collector.newrelic.com/v1/accounts/'+ config.get(program.accountName + '.accountId') +'/events',
		channelData.channel.configuration.headers["X-Insert-Key"] = config.get( program.accountName + '.adminKey' ); 

    console.log('Trying to confirm you have channel: ' + channelName);
    alerts.channels.list(program.accountName, checkChannels);
  }
}
