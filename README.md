# newrelic-api-test-js [![Build Status](https://travis-ci.org/kenahrens/newrelic-api-client-js.svg?branch=master)](https://travis-ci.org/kenahrens/newrelic-api-client-js)
JavaScript library to test connectivity to New Relic API

# How to use
This is just a simple library to test connectivity between NodeJS and New Relic API.

## Initial Setup
Clone the repository and run npm install which should install dependencies into node_modules
```
kahrens@kenbook8u:~/dev/node$ git clone https://github.com/kenahrens/newrelic-api-test-js.git
...
kahrens@kenbook8u:~/dev/node$ cd newrelic-api-test
kahrens@kenbook8u:~/dev/node/newrelic-api-test$ npm install
```

## Setup Your API Keys
This library uses the npm [config](https://www.npmjs.com/package/config) package to setup your [API Keys](https://rpm.newrelic.com/apikeys). There is a basic default.json that shows the 5 keys you can populate, with an account nicknamed *newrelic*:
* accountId - you will also see this in the URL bar
* restKey - overall REST API Key (legacy)
* adminKey - specific Admin user API Key, used for certain API calls
* insightsQueryKey - there are keys just for Insights in the Manage Data section



If you configure Environment Variables those will over-ride the values in default.json.

However you can also make your own JSON config file with multiple accounts in there.

### Environment Variables
Set 4 environment variables to the correct values for your account, this works if you're using a single account. 
* NEWRELIC_ACCOUNT_ID maps to accountId
* NEWRELIC_REST_API_KEY maps to restKey
* NEWRELIC_ADMIN_API_KEY maps to adminKey
* NEWRELIC_INSIGHTS_QUERY_KEY maps to insightsQueryKey

### Multiple Accounts
Here is an example of how to setup a custom JSON file with multiple sets of keys. At runtime you would set NODE_ENV to the name of this config.
```
{
  "MasterAccount": {
    "accountId": "",
    "restKey": "",
    "adminKey": "",
    "insightsQueryKey": ""
  },
  "SubAccount1": {
    "accountId": "",
    "restKey": "",
    "adminKey": "",
    "insightsQueryKey": ""
  },
  "SubAccount2": {
    "accountId": "",
    "restKey": "",
    "adminKey": "",
    "insightsQueryKey": ""
  }
}
```

Then in your code you could make the same API call against multiple accounts (of course you could use a variable or whatever):
```
insights.query(nrql, 'MasterAccount', cb);
insights.query(nrql, 'SubAccount1', cb);
insights.query(nrql, 'SubAccount2', cb);
```

### Partner Account

Gather the PartnerId from your partnership admin console, and the Partner Rest key from the Partnership account.

```
{
  "configArr": [
    "PartnerName1", "PartnerName2"
  ],
  "PartnerName1": {
    "partnerId": "<PARTNER1_ID>",
    "restKey": "<PARNER1_RESTKEY>"
  },
  "PartnerName2": {
    "partnerId": "<PARTNER2_ID>",
    "restKey": "<PARNER2_RESTKEY>"
  }
}
```

## Using the scripts

Sample 1 - 
List all dashboards in an account

```
[qyang@han newrelic-api-client-js]$ node scripts/list_all_dashboards.js --src stage
```

