const dashboards = require('../lib/dashboards.js');
const helper = require('../lib/helper.js');
const config = require('config');
var program = require('commander');
const  fs = require('fs');
const Mustache = require("mustache");
const graphql = require('../lib/graphql.js');

// Print out the URL of the newly created dashboard
function handleCreate(error, response, body) {
  var rspBody = helper.handleCB(error, response, body);
  if (rspBody != null) {
    var destId = config.get(program.dest).accountId;
    var url = 'http://insights.newrelic.com/accounts/' + destId + '/dashboards/' + rspBody.dashboard.id;
    console.log('Dashboard created: ' + url);
  }
}



function createDashboard(error, response, body) 
{
  var resultBody = helper.handleCB(error, response, body);

  if (resultBody != null) {
    //console.log('Found source dashboard named: ' + dashboardBody.dashboard.title);
    //
    //
    var en; //resultBody.data.actor.entitySearch.results.entities[0]
    
    var myMap = {};


    for ( i in resultBody.data.actor.entitySearch.results.entities ) 
		{
			en = resultBody.data.actor.entitySearch.results.entities[i];
      //console.log(JSON.stringify(en,null,2));
			var guid = en.guid;
    	//var accountID = en.account.id;
      var entityType = en.type;
      if (! myMap[entityType]) {
				if (  typeMap[entityType] != null)  {
      		myMap[entityType] = { "widget" : typeMap[entityType], "count": 1};
				} else {
					console.log('no widget for type:' + entityType );
				}
      } else {
      	myMap[entityType].count += 1;
			} 
		}

    console.log('map: ' + JSON.stringify(myMap,null,2));


    // build dashboard
    var newDash ;
    
    // start with dashboard template
    rawData = fs.readFileSync(program.dir + '/' + program.dash + '_dashboard.json');
    var dashTemplate  = rawData.toString();
    newDash = JSON.parse(Mustache.render(dashTemplate, dashConfig));

    
    //console.log("before adding widgets" + JSON.stringify(newDash,null,2));

	  for (const [type, oneValue] of Object.entries(myMap)) {
      var widgetTemplate;   
			var oneType = oneValue.widget;

      //console.log("Type =" + oneValue.widgetName);

      console.log("read file: " + program.dir + '/' + oneType + '_widget.json');
      rawData = fs.readFileSync(program.dir + '/' + oneType + '_widget.json');
      widgetTemplate = rawData.toString();
      tempWidgets = JSON.parse(Mustache.render(widgetTemplate, dashConfig));
      newDash.dashboard = addWidget(newDash.dashboard, tempWidgets.widgets);
    }
    
    console.log(JSON.stringify(newDash,null,2));    
 	  dashboards.create(newDash, program.dest, handleCreate);


  }
}

var dashConfig;
var typeMap = { "APPLICATION": "apm", "HOST": "aws", "AWSS3BUCKET": "s3"};

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
    var tag = '{"key": "appType", "value": "tomcat"}';   // We have good data so try to read the dashboard

    console.log("read config file:" + program.dir + '/' + program.dash + '_v2_config.json');

    var rawData = fs.readFileSync(program.dir + '/' + program.dash + '_v2_config.json');
    configJson  = JSON.parse(rawData);
    dashConfig = configJson.template_vars;

    typeMap = configJson.entity_widget_map;

    console.log(JSON.stringify(dashConfig,null,2));
    var enTag = configJson.entity_tag_key;
    var enTagVal = configJson.entity_tag_value;


    // get config json

		var iqlQuery = { 
  		"query": `
							{
  							actor {
    							entitySearch(queryBuilder: {tags: {key: "${enTag}", value: "${enTagVal}"}}) {
      							results {
        							entities {
          							guid
          							account {
            							id
          							}
          							name
          								tags {
            								key
            								values
          								}
          							type
        							}
      							}
    							}
  							}
							}`,
			"variables": ""
		};

    graphql.query(iqlQuery, program.dest, createDashboard);
 }
}

function addWidget(tempDash, tempWidget)
{
  var myDash = tempDash;
  if (! myDash.widgets) {
    myDash.widgets = tempWidget;
  } else {
    // concat widgets
    var curWidgets = myDash.widgets;
    myDash.widgets = [].concat(curWidgets, tempWidget);
  }
  return myDash;
}
