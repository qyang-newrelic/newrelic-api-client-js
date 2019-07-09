const request = require('request');
const config = require('config');
const _ = require('lodash');
const assert = require('assert');

var helper = {};

// Generic helper to process request() callback
helper.handleCB = function (error, response, body) {
  if (!error && (response.statusCode === 200 || response.statusCode === 201) ) {
    return body;
  } else {
    // console.error('API Error!');
    if (error) {
      throw(error);
    } else {
      console.error('Bad status code: ', response.statusCode);
      if (response.statusCode != 500) {
        console.error('Error msg: ', body);
      }
    }
  }
  return null;
}

// Helper to check if multiple pages of data should be returned
// - One type of format is URI?page=#
// - For metric data the format is URI?cursor=#
helper.linkCheck = function (link) {
  if (link == null) {
    return null;
  }

  // There can be parameters for first, prev, next, and last
  // Note: if last ends with 0, then we need to return null
  var lastUri = null;
  var nextUri = null;

  // Split the link value
  var paramList = link.split(',');
  for (var i=0; i < paramList.length; i++) {
    
    // Split the parameter
    var param = paramList[i].split(';');

    // Look for next and last
    if (param[1].indexOf('last') > 0) {
      lastUri = param[0].replace('<', '').replace('>', '').trim();
    } else if (param[1].indexOf('next') > 0) {
      nextUri = param[0].replace('<', '').replace('>', '').trim();
    }
  }
  
  // If last points to "cursor=" (blank cursor) we should return null
  if (nextUri != null) {
    if (nextUri.indexOf('cursor=', nextUri.length - 'cursor='.length) !== -1) {
      return null;
    }
  }

  // If last points to page=0 then we should return null
  if (lastUri != null) {
    if (lastUri.indexOf('page=0', lastUri.length - 6) !== -1) {
      return null;
    }
  }
  return nextUri;
}

function customizer(objValue, srcValue) {
  if (_.isArray(objValue)) {
    return objValue.concat(srcValue);
  }
}

// If the link does not have a cursor, merge the page number into the query string
helper.addPageToQS = function(qs, linkUri) {
  if (qs == null) {
    qs = {};
  }
  
  // Grab the part that says 'page=#' from the end of the URI
  var linkPage = linkUri.substring(linkUri.indexOf('page='));
  
  // This will just grab the part after the = sign
  qs.page = linkPage.substring(linkPage.indexOf('=')+1);
  return qs;
}

// uri - https uri
// qs - query string
// configId - which account to use from config json
// keyType - either restKey or adminKey
// getAllPages - whether or not to get all pages of data
// cb - callback
// pagesData - storage for multiple pages (optional)
helper.sendGetQSKeyRequest = function (uri, qs, configId, keyType, getAllPages, cb, pagesData) {
  
  // This gets either the restKey or adminKey
  var localKey = config.get(configId + '.' + keyType);

  // Setup all the options
  var options = {
    'method': 'GET',
    'uri': uri,
    'headers': {'X-Api-Key': localKey},
    'qs': qs,
    'json': true
  };

  // Call the API, check for pagination
  // request(options, cb);
  request(options, function(error, response, body) {
    if (getAllPages) {
      if (pagesData == null) {
        pagesData = body;
      } else {
        _.mergeWith(pagesData, body, customizer);
      }
      
      // Check if there are more pages of data
      var nextUri = helper.linkCheck(response.headers.link);
      if (nextUri != null) {
        helper.sendGetQSKeyRequest(nextUri, qs, configId, keyType, getAllPages, cb, pagesData);
      } else {
        // Send back the combined data from all pages
        cb(error, response, pagesData);
      }
    } else {
      // Send back the data just for this page
      cb(error, response, body);
    }
  });
}

// Call endpoint with query string (assumes restKey and getAllPages=true)
helper.sendGetQSRequest = function (uri, qs, configId, cb) {
  helper.sendGetQSKeyRequest(uri, qs, configId, 'restKey', true, cb);
}

// Simple version to use with null query string (assumes restKey and getAllPages=true)
helper.sendGetRequest = function (uri, configId, cb) {
  helper.sendGetQSKeyRequest(uri, null, configId, 'restKey', true, cb);
}

// Simple version to use with null query string (assumes getAllPages=true)
helper.sendGetKeyRequest = function (uri, configId, keyType, cb) {
  helper.sendGetQSKeyRequest(uri, null, configId, keyType, true, cb);
}

// Send the PUT or POST with a query string
helper.sendPutOrPostQS = function(uri, method, qs, configId, keyType, cb) {
  // This gets either the restKey or adminKey
  var localKey = config.get(configId + '.' + keyType);

  // Setup all the options
  var options = {
    'method': method,
    'uri': uri,
    'headers': {'X-Api-Key': localKey},
    'json': true,
    'qs': qs
  };

  request(options, cb);
}

// Send the PUT or POST with a JSON body
helper.sendPutOrPostBody = function(uri, method, body, configId, keyType, cb) {
  // This gets either the restKey or adminKey
  var localKey = config.get(configId + '.' + keyType);

  // Setup all the options
  var options = {
    'method': method,
    'uri': uri,
    'headers': {'X-Api-Key': localKey},
    'json': true,
    'body': body
  };

  request(options, cb);
}

// Send a DELETE (no query string, no body)
helper.sendDelete = function(uri, configId, keyType, cb) {
  // This gets either the restKey or adminKey
  var localKey = config.get(configId + '.' + keyType);

  // Setup all the options
  var options = {
    'method': 'DELETE',
    'uri': uri,
    'headers': {'X-Api-Key': localKey},
    'json': true
  };

  request(options, cb);
}

// Find the configId for this accountId
helper.getConfigId = function(accountId) {
  var configArr = config.get('configArr');
  for (var i = 0; i < configArr.length; i++) {
    var configId = configArr[i];
    var cfgAccountId = config.get(configId + '.accountId');
    if (cfgAccountId == accountId) {
      return configId;
    }
  }

  // If we get this far it wasn't found
  return null;
}

module.exports = helper;
