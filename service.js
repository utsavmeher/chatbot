var ENV = require('./config.js');
const request = require('request');
const PAGE_ACCESS_TOKEN = ENV.config['PAGE_ACCESS_TOKEN'];

module.exports = {
// Sends response messages to facebook via the Send API
callSendAPI: function(sender_psid, response, endpoint, method) {
  endpoint = endpoint || 'messages';
  method = method || 'POST';
  let request_body = {
    "messaging_type": "RESPONSE",
    "recipient": {
      "id": sender_psid
    },
    "message": response
  };
  // Send the HTTP request to the Messenger Platform
  request({
    "uri": `https://graph.facebook.com/v2.11/me/` + `${endpoint}`,
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": method,
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('callSendAPI Response', body);
    } else {
      console.error("callSendAPI Unable to send message:" + err);
    }
  });
},

// Send the Typing Message request to the Messenger Platform
callTypingOn: function(sender_psid) {
  let endpoint = 'messages';
  let method = 'POST';
  let request_body = {
    "messaging_type": "RESPONSE",
    "recipient": {
      "id": sender_psid
    },
    "sender_action": "typing_on"
  };
  // Send the HTTP request to the Messenger Platform
  request({
    "uri": `https://graph.facebook.com/v2.11/me/` + `${endpoint}`,
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": method,
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('callTypingOn Response');
    } else {
      console.error("callTypingOn Unable to send message:" + err);
    }
  });
}
}