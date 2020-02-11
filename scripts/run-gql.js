const graphql = require('../lib/graphql.js');
const helper = require('../lib/helper.js');
const config = require('config');
var program = require('commander');
var fs = require('fs');



var appName = "WebPortal";
var accountID = "1606862";
var eBlock = { 
	"query": `
{
  actor {
    entitySearch(queryBuilder: {type: APPLICATION, name: "${appName}", tags: {key: "accountId", value: "${accountID}"}}) {
      results {
        entities {
          account {
            id
            name
          }
          guid
          name
          tags {
            key
            values
          }
        }
      }
    }
  }
}
`,
"variables":""};



function getEntity(error, response, body) {
  var resultBody = helper.handleCB(error, response, body);
  if (resultBody != null) {
    //console.log('Found source dashboard named: ' + dashboardBody.dashboard.title);
    //
    //
    var en = resultBody.data.actor.entitySearch.results.entities[0]
		var guid = en.guid;
    var accountID = en.account.id;

    //console.log(JSON.stringify(en,null,2));

	var qBlock = { "query": `
{
  actor {
    entity(guid: "${guid}") {
      relationships {
        target {
          entity {
            guid
            name
            type
            accountId
          }
        }
        source {
          entity {
            guid
            name
            type
            accountId
          }
        }
        type
      }
    }
  }
}
`, "variables":""};

    //console.log('Trying to run: ' + JSON.stringify(qBlock));
    graphql.query(qBlock, program.src, getResult);
  }
}

// Read the source dashboard
function getResult(error, response, body) {
  var resultBody = helper.handleCB(error, response, body);
  if (resultBody != null) {
    //var result = resultBody.data.actor.entity.relationships;
    for(var i=0; i<result.length; i++) {
			if (result[i].type == 'HOSTS' ) { 
				console.log("Service runs on host " + result[i].source.entity.name);
			} else {
    		console.log(JSON.stringify(result[i].source,null,2));
    		console.log("Type: " , result[i].type);
    		console.log(JSON.stringify(result[i].target ,null,2));
			}
		}
  }
}

function showResult(error, response, body) {
  var resultBody = helper.handleCB(error, response, body);
  if (resultBody != null) {
    //var result = resultBody.data.actor.entity.relationships;
    console.log(JSON.stringify(resultBody,null,2));
  }
}

// Setup the commander program
program
  .version('0.0.1')
  .option('--src [account]', 'Source account that has the dashboard to be copied')
  .option('--file [query.gql]', 'Id of the dashboard to be copied')
  .parse(process.argv);

if (!process.argv.slice(3).length) {
  program.outputHelp();
} else {
  // Make sure [from] is in the config
  if (!config.has(program.src)) {
    console.error('Your config does not have *src* account: ' + program.src, 'check your NODE_ENV=', process.env.NODE_ENV);
  } else {
    // We have good data so try to read the dashboard
    console.log('Trying to find: ' + program.file);
		 
		fs.readFile(program.file, 'utf8', function(err, contents) {
		  console.log("file content: " + contents);
			var gql = { "query" : contents};
    	graphql.query(gql, program.src, showResult);
		});
				  
    //graphql.query(JSON.stringify(qBlock), program.src, getResult);

  }
}
