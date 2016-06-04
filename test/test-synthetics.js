var synthetics = require('../lib/synthetics.js');
var assert = require('assert');

var quickAssert = function(error, response) {
  assert.equal(error, null);
  assert.equal(response.statusCode, 200);
}

describe('New Relic Synthetics API Test', function() {
  this.timeout(5000);
  
  it('calls the synthetics api', function(done) {
    synthetics.getAllMonitors(function(error, response, body) {
      quickAssert(error, response);
      done();
    })
  });
});