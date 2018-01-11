'use strict';

// Imports dependencies and set up http server
const 
  request = require('request'),
  express = require('express'),
  body_parser = require('body-parser'),
  app = express().use(body_parser.json()); // creates express http server

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const {firstEntity, WIT_TOKEN} = require('./shared.js');
const Wit = require('node-wit/lib/wit');

const wit = new Wit({accessToken: WIT_TOKEN});

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('Webhook is listening'));

// Accepts GET requests at the /webhook endpoint
app.get('/webhook', (req, res) => {
  /** UPDATE YOUR VERIFY TOKEN **/
  const VERIFY_TOKEN = "randomrandom";
  // Parse params from the webhook verification request
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];
    
  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      // Respond with 200 OK and challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);      
    }
  }
});
// Accepts POST requests at /webhook endpoint
app.post('/webhook', (req, res) => {
  let body = req.body;
  if (body.object === 'page') {
    // Iterate over each entry - there may be multiple if batched
    body.entry.forEach(function(pageEntry) {
      console.log('Inside pageEntry');
      pageEntry.messaging[
      console.log(webhook_event);
      if (webhook_event.message) {
        handleMessage(webhook_event);        
      } else if (webhook_event.postback) {
        handlePostback(webhook_event);
      }
    });
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// Handles messages events
function handleMessage(received_message) {
  let sender_psid = received_message.sender.id;
  console.log('Sender PSID: ' + sender_psid);
  let response;
  console.log(received_message.text);
  return wit.message(received_message.text).then(({entities}) => {
    const intent = firstEntity(entities, 'intent');
    const greetings = firstEntity(entities, 'greetings');
    const location = firstEntity(entities, 'location');
    console.log(location);
    console.log(intent);
    console.log(greetings);
    if(!intent && !greetings){
      response = { "text": "Sorry I didn't get you." };
    } else if(intent){
      switch (intent.value) {
      case 'reservation':
        console.log('Okay, reserve a Hotel Near by.');
        response = { "text": "Okay, reserve a Hotel Near by."};
        break;
      default:
        console.log(`${intent.value}`);
        break;
      }
    } else if(greetings){
      response = { "text":"Hello"};
    }
  callSendAPI(sender_psid, response);
  });
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
let response;
  
  // Get the payload for the postback
  let payload = received_postback.payload;

  // Set the response based on the postback payload
  if (payload === 'yes') {
    response = { "text": "Thanks!" }
  } else if (payload === 'no') {
    response = { "text": "Oops, try sending another image." }
  }
  // Send the message to acknowledge the postback
  callSendAPI(sender_psid, response);
}

// Sends response messages to facebook via the Send API
function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    "messaging_type": "RESPONSE",
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }
  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.11/me/messages",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('Message Sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  }); 
}


// Sends response messages to facebook via the Send API
// function getStarted() {
//   let request_body = {
//       "setting_type": "call_to_actions",
//       "thread_state": "new_thread",
//       "call_to_actions": [
//         {
//           "payload": "Start"
//         }
//       ]
//     }
//   // Send the HTTP request to the Messenger Platform
//   request({
//     "uri": "https://graph.facebook.com/v2.6/me/thread_settings",
//     "qs": { "access_token": PAGE_ACCESS_TOKEN },
//     "method": "POST",
//     "json": request_body
//   }, (err, res, body) => {
//     if (!err) {
//       console.log('Get Started');
//     } else {
//       console.error("Unable to send message:" + err);
//     }
//   }); 
// }
//getStarted();

// Sends response messages to facebook via the Send API
// function greeting() {
//   let request_body = {
//   "setting_type":"greeting",
//   "greeting":{
//     "text":"Hi {{user_first_name}}, welcome to The Travel Bot."
//   }
// }
//   // Send the HTTP request to the Messenger Platform
//   request({
//     "uri": "https://graph.facebook.com/v2.6/me/thread_settings",
//     "qs": { "access_token": PAGE_ACCESS_TOKEN },
//     "method": "POST",
//     "json": request_body
//   }, (err, res, body) => {
//     if (!err) {
//       console.log('Get Started');
//     } else {
//       console.error("Unable to send message:" + err);
//     }
//   }); 
// }
// greeting();