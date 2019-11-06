const request = require('request');
const helper = require('./helper.js');
const urls = require('./api-urls.json');

// Define the initial API
var dashboards = {};

dashboards.list = function(configId, cb) {
  var url = urls.api.dashboards.all;
  helper.sendGetKeyRequest(url, configId, 'adminKey', cb);
}

// Get a particular page from the dashboard list
dashboards.getPage = function(pageId, configId, cb) {
  var url = urls.api.dashboards.all;
  var qs = { 'page': pageId }
  helper.sendGetQSKeyRequest(url, qs, configId, 'adminKey', false, cb);
}

// Get a single dashboard
dashboards.getOne = function(dashboardId, configId, cb) {
  var url = urls.api.dashboards.one.replace('{dashboard_id}', dashboardId);
  helper.sendGetKeyRequest(url, configId, 'adminKey', cb);
}

dashboards.create = function(dashboardBody, configId, cb) {
  var url = urls.api.dashboards.all;
  helper.sendPutOrPostBody(url, 'POST', dashboardBody, configId, 'adminKey', cb);
}

dashboards.update = function(dashboardId, dashboardBody, configId, cb) {
  var url = urls.api.dashboards.one.replace('{dashboard_id}', dashboardId);
  helper.sendPutOrPostBody(url, 'PUT', dashboardBody, configId, 'adminKey', cb);
}

dashboards.delete = function(dashboardId, configId, cb) {
  var url = urls.api.dashboards.one.replace('{dashboard_id}', dashboardId);
  helper.sendDelete(url, configId, 'adminKey', cb);
}

// Find the oldAccountId and replace with newAccountId on each widget
dashboards.updateAccountId = function(dashboardBody, oldAccountId, newAccountId) {
  
  // Clone the dashboard
  var newBody = JSON.parse(JSON.stringify(dashboardBody));
  var widgets = newBody.dashboard.widgets;
  
  // Loop over the widgets
  for (var i=0; i < widgets.length; i++) {
    var widget = widgets[i];
    if (widget.account_id == oldAccountId) {
      widget.account_id = parseInt(newAccountId);
      console.log('Updating accountId for widget', widget.presentation.title);
    }
  }
  return newBody;
}

dashboards.setAccountId = function(dashboardBody, newAccountId) {
  
  // Clone the dashboard
  var newBody = JSON.parse(JSON.stringify(dashboardBody));
  var widgets = newBody.dashboard.widgets;
  
  // Loop over the widgets
  for (var i=0; i < widgets.length; i++) {
    var widget = widgets[i];
    widget.account_id = parseInt(newAccountId);
    console.log('Updating accountId for widget', widget.presentation.title);
  }
  return newBody;
}

dashboards.removeAccountId = function(dashboardBody) {
  
  // Clone the dashboard
  var newBody = JSON.parse(JSON.stringify(dashboardBody));
  delete newBody['account_id'];
  var widgets = newBody.dashboard.widgets;
  
  // Loop over the widgets
  for (var i=0; i < widgets.length; i++) {
    var widget = widgets[i];
    delete widget['account_id'];
    delete widget['widget_id'];
    console.log('Updating accountId for widget', widget.presentation.title);
  }
  return newBody;
}

module.exports = dashboards;
