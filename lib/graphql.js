const request = require('request');
const config = require('config');
const _ = require('lodash');
const assert = require('assert');


// Define the initial API
var graphql = {};
//
graphql.query = function query(qBlock, configId, cb) {
   var uri = 'https://api.newrelic.com/graphql';
   //helper.sendGetKeyRequest(url, configId, 'graphQLKey', cb);

  // This gets either the restKey or adminKey
  var localKey = config.get(configId + '.graphQLKey' );

  // Setup all the options
  var options = {
    'method': 'POST',
    'uri': uri,
    'headers': {'API-Key': localKey},
    'json': true,
	  'body': qBlock
  };

  // Call the API, check for pagination
  // request(options, cb);
  request(options, function(error, response, body) {
      // Send back the data just for this page
      cb(error, response, body);
  });
}

module.exports = graphql;
