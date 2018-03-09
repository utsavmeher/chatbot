/**
 * @author Utsav Meher <utsavm@xpanxion.co.in>
 */
var CONFIG = require('./mappedkey.js');
var ENV = require('./config.js');
const request = require('request');
const PAGE_ACCESS_TOKEN = ENV.config['PAGE_ACCESS_TOKEN'];

module.exports = {
//Shows the Get Started button for the first time user.
getStarted: function() {
  let request_body = {
    "get_started": {
      "payload": "Start"
    }
  };
  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.11/me/messenger_profile",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('getStarted response');
    } else {
      console.error("getStarted failed" + err);
    }
  });
},
//Shows the Greeting Message for the first time user.
greeting: function() {
  let request_body = {
    "greeting": [
      {
        "locale": "default",
        "text": CONFIG.keyMapped['greeting']
      }, {
        "locale": "en_US",
        "text": CONFIG.keyMapped['greeting']
      }
    ]
  };
  request({
    "uri": "https://graph.facebook.com/v2.11/me/messenger_profile",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('greeting response');
    } else {
      console.error("greeting failed:" + err);
    }
  });
}
}