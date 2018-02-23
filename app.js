/**
 * @author Utsav Meher <utsavm@xpanxion.co.in>
 */
'use strict';

// Imports dependencies and set up http server
const
  request = require('request'),
  express = require('express'),
  body_parser = require('body-parser'),
  app = express().use(body_parser.json()); // creates express http server
var ENV = require('./config.js');
var CONFIG = require('./mappedkey.js');
var sleep = require('thread-sleep');
const PAGE_ACCESS_TOKEN = ENV.config['PAGE_ACCESS_TOKEN'];
const WIT_TOKEN = ENV.config['WIT_TOKEN'];
const { firstEntity } = require('./shared.js');
const Wit = require('node-wit/lib/wit');
const wit = new Wit({ accessToken: WIT_TOKEN });
var User = require('./user-class.js');
var questionsList = [];
var activeUsers = [];
var _ = require('underscore');

// Sets server port and logs message on success
app.listen(process.env.PORT || 5000, () => console.log('Webhook is listening'));

// // Accepts GET requests at the /webhook endpoint
// app.get('/webhook', (req, res) => {
//   /** UPDATE YOUR VERIFY TOKEN * */
//   const VERIFY_TOKEN = "randomrandom";
//   // Parse params from the webhook verification request
//   let mode = req.query['hub.mode'];
//   let token = req.query['hub.verify_token'];
//   let challenge = req.query['hub.challenge'];
//   console.log(PAGE_ACCESS_TOKEN);
//   // Check if a token and mode were sent
//   if (mode && token) {
//     // Check the mode and token sent are correct
//     if (mode === 'subscribe' && token === VERIFY_TOKEN) {
//       // Respond with 200 OK and challenge token from the request
//       console.log('WEBHOOK_VERIFIED');
//       res.status(200).send(challenge);
//       getStarted();
//       greeting();
//     } else {
//       // Responds with '403 Forbidden' if verify tokens do not match
//       res.sendStatus(403);
//     }
//   }
// });

/*
* webhook listens to the messages that are sent to the FB Page/App
*/
app.post('/webhook', function (req, res) {
  var data = req.body;
  if (data.object == 'page') {
    data.entry.forEach(function (pageEntry) {
      console.log('pageEntry:');
      pageEntry.messaging.forEach(function (messagingEvent) {
        console.log('messagingEvent inside post:');
        console.log(messagingEvent.sender.id);
        var userId =  messagingEvent.sender.id;
           request({
                url: 'https://graph.facebook.com/v2.11/' + userId,
                qs: {
                    access_token: PAGE_ACCESS_TOKEN
                },
                method: 'GET',
                json: {
                    fields: "first_name,last_name,profile_pic,locale,timezone,gender"
                }
            }, function(error, userData, body) {
                if (error) {
                    console.log('Error sending messages: ', error)
                } else if (userData.body.error) {
                    console.log('Error: ', userData.body.error)
                } else {
                    var userObj = new User(userId, userData.body); //Set user object
                    activeUsers.push(_.clone(userObj)); //add user
                    console.log("activeUsers");
                    console.log(activeUsers);
                    //send response
                    //responseHandler.handleRequest(event, userObj, questionsList);
                }
				});
        if (messagingEvent.message) {
          handleMessage(messagingEvent);
        } else if (messagingEvent.postback) {
          handlePostback(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent:", messagingEvent);
        }
      });
    });
    res.sendStatus(200);
  }
});

let reservationObject = {};
let tempStore = '';
let tempQuestion = '';
let first_name = '';
let changeSearchFlag = false;
// Handles messages events
function handleMessage(event) {
  console.log('handleMessage event');
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;
  let response;
  var messageText = message.text;
  console.log('messageText');
  console.log(messageText);
  var messageAttachments = message.attachments;
  console.log('messageAttachments');
  console.log(messageAttachments);
  if (messageAttachments) {
    if (messageAttachments[0].payload.coordinates) {
      getUserCity(senderID, messageAttachments[0].payload.coordinates.lat, messageAttachments[0].payload.coordinates.long);
    }
  } else if(messageText == "Future date"){
    response = { "text": "Please enter a future date." };
    tempQuestion = 'getDate';
    callSendAPI(senderID, response);
  } else if (messageText == "Start Over") {
    changeSearchFlag = false;
    reservationObject = {};
    callSendAPIFirstName(senderID, response);
  } else {
    callTypingOn(senderID);
    console.log("messege text before wit" + messageText);
    wit.message(messageText).then(({ entities }) => {
      console.log('Wit Response');
      console.log(entities);
      if (entities.location && entities.number && entities.number[0] && entities.number[1] && entities.datetime) {
        reservationObject["location"] = entities.location[0].value;
        reservationObject["adults"] = entities.number[0].value;
        reservationObject["nights"] = entities.number[1].value;
        reservationObject["datetime"] = entities.datetime[0].value;
        formatCheckInCheckOut(reservationObject.datetime, reservationObject.nights);
        response = getShowResults();
        callSendAPI(senderID, response);
        response = getHotelListFromText(senderID);
        console.log(reservationObject);
      } else {
        const intent = firstEntity(entities, 'intent');
        const greetings = firstEntity(entities, 'greetings');
        const location = firstEntity(entities, 'location');
        const number = firstEntity(entities, 'number');
        const datetime = firstEntity(entities, 'datetime');
        console.log('changeSearchFlag: ' + changeSearchFlag);
        if (greetings && greetings.confidence > 0.9) {
          response = { "text": "Hello " + first_name + "," + CONFIG.keyMapped['welcome'] + ' ' + CONFIG.keyMapped['location'] };
          tempQuestion = 'getLocation';
          console.log('tempQuestion = getLocation');
        } else if (tempQuestion == 'getLocation' && location && location.confidence > 0.87) {
          getUserCityFromUserInput(senderID, location.value);
        } else if (tempQuestion == 'getDate' && datetime && datetime.confidence > 0.9) {
          response = { "text": CONFIG.keyMapped['guests'] };
          console.log("Inside getdate condition " + datetime.value)
          reservationObject["datetime"] = datetime.value;
          tempStore = 'adults';
          tempQuestion = 'getGuests';
          console.log('tempQuestion = getGuests');
        } else if ((number && number.confidence > 0.9) && (tempQuestion == 'getGuests' || tempQuestion == 'getNights')) {
          if (tempStore == 'adults' && tempQuestion == 'getGuests') {
            response = { "text": CONFIG.keyMapped['nights'] };
            reservationObject["adults"] = number.value;
            tempStore = 'nights';
            tempQuestion = 'getNights';
            console.log('tempQuestion = getNights');
          } else if (tempStore == 'nights' && tempQuestion == 'getNights') {
            reservationObject["nights"] = number.value;
            formatCheckInCheckOut(reservationObject.datetime, reservationObject.nights);
            response = getShowResults();
            callSendAPI(senderID, response);
            console.log(reservationObject);
            response = getHotelListFromText(senderID);
            tempStore = '';
            tempQuestion = '';
            console.log('tempQuestion = EMPTY');
          }
        } else {
          response = { "text": CONFIG.keyMapped['sorry'] };
        }
      }
      callSendAPI(senderID, response);
    });
  }
}
// Handles messaging_postbacks events
function handlePostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;
  console.log('handlePostback event');
  let response;
  // callTypingOn(senderID);

  console.log('event.postback.payload');
  console.log(event.postback.payload);
  if (event.postback.payload === 'Start') {
    changeSearchFlag = false;
    reservationObject = {};
    callSendAPIFirstName(senderID, response);
  } else if (event.postback.payload === 'find_hotels' || event.postback.payload === 'change_search') {
    if (event.postback.payload === 'change_search') {
      changeSearchFlag = true;
    }
    // reservationObject = {};
    callSendAPILocation(senderID, response);
  } else if (event.postback.payload == 'did_you_know') {
    let response = {
      "text": CONFIG.keyMapped['didYouKnow'],
      "quick_replies": [
        {
          "content_type": "text",
          "title": "Start Over",
          "payload": "Start"
        }
      ]
    };
    callSendAPI(senderID, response);
  }
}

// Sends response messages to facebook via the Send API
function callSendAPI(sender_psid, response, endpoint, method) {
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
}

function convertDateFormat(inputDate) {
  return inputDate.substr(0, inputDate.indexOf('T'));
}

// Sends Location response to facebook via the Send API
function callSendAPILocation(sender_psid, response, endpoint, method) {
  endpoint = endpoint || 'messages';
  method = method || 'POST';
  if (changeSearchFlag) {
    console.log('change_search - in callSendAPILocation');
    response = {
      "text": "Previous search summary - for location : " + (reservationObject.location) + "," + reservationObject.adults + " Adults with Check In on " + convertDateFormat(reservationObject.datetime) + " (For " + reservationObject.nights + " Nights). For New Search - Please name a city " + first_name + ".",
      "quick_replies": [
        {
          "content_type": "location"
        }
      ]
    }
  } else {
    response = {
      "text": CONFIG.keyMapped['location'] + first_name + ".",
      "quick_replies": [
        {
          "content_type": "location"
        }
      ]
    }
  }
  tempQuestion = 'getLocation';
  console.log('tempQuestion = getLocation');
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
      console.log('callSendAPILocation Response');
    } else {
      console.error("callSendAPILocation Unable to send message:" + err);
    }
  });
}

// Sends Quick Reples response to facebook via the Send API
function getDateQuickReplies() {
  let state = reservationObject.locationState ? ', ' + reservationObject.locationState : "";
  let response = {
    "text": CONFIG.keyMapped['location1'] + reservationObject.location + state + "\n" + CONFIG.keyMapped['date'],
    "quick_replies": [
      {
        "content_type": "text",
        "title": "Today",
        "payload": "Today"
      },
      {
        "content_type": "text",
        "title": "Tomorrow",
        "payload": "Tomorrow"
      },
      {
        "content_type": "text",
        "title": "Future date",
        "payload": "future"
      }
    ]
  };
  tempQuestion = 'getDate';
  console.log('tempQuestion = getLocation');
  return response;
}

// Get the first name and Shows the First Greeting Msg to the User
function callSendAPIFirstName(sender_psid, response) {
  let request_body = {
    "messaging_type": "RESPONSE",
    "recipient": {
      "id": sender_psid
    },
    "message": response
  };
  // Send the HTTP request to the Messenger Platform
  request({
    "uri": 'https://graph.facebook.com/v2.11/' + sender_psid,
    "qs": { "access_token": PAGE_ACCESS_TOKEN, fields: 'first_name' },
    "method": "GET",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('callSendAPIFirstName Response');
      first_name = body.first_name;
      response = {
        "attachment": {
          "type": "template",
          "payload": {
            "template_type": "generic",
            "elements": [{
              "title": "Hello " + first_name + "! " + CONFIG.keyMapped['welcome'],
              "subtitle": "Tap on Find Hotels to book a reservation.",
              "image_url": "https://cdn.glitch.com/c6c2dc22-89f9-4d15-a9bb-9d07a31dec01%2Fihg.png?1516965115124",
              "buttons": [
                {
                  "type": "postback",
                  "title": CONFIG.keyMapped['findHotels'],
                  "payload": "find_hotels"
                },
                {
                  "type": "web_url",
                  "url": "http://customerservice.ihg.com/ihg/bot.html?isJSEnabled=1&brandcode=6c&businessArea=Root.IHG&reservation=%5Bobject%20Object%5D&akamaiCountryCode=AU&akamaiRegion=AMEA&akamaiSubRegion=Oceania&ihgSession=&subSection=null&pageidbrand=6c_reservationhome&hotelCode=null&categoryID=6c_new%2F925%2Fen&siteCountry=gb&timeOfDayAttribute=2&pcrNumber=null&membershipStatus=null&type=home&glat=&beFreeCookieCreationDate=&urlType=https&loginType=anonymous&country=925&iata=&controllerName=reservationhome&propertyCode=null&envName=prod&siteLanguage=en&brand=6c_new&language=en&city=null&eID=null&pcrTravelType=null&contentPage=null&hotelCityStateCountryCode=&hotelBrand4Digit=null&hotelBrand=null&initiatedActualUnitPrice=null&rateType=null&initiatedCurrencyCode=null&initiatedUnitPrice=null&initialBookingTotal=null&viewport=large&orientation=landscape&edwSellSource=WEBWB",
                  "title": CONFIG.keyMapped['liveChat']
                }
              ],
            }
            ]
          }
        }
      };
      tempQuestion = 'getStarted';
      console.log('tempQuestion = getStarted');
    } else {
      console.error("callSendAPIFirstName Unable to send message:" + err);
    }
    callSendAPI(sender_psid, response);
  });
}

// Send the Typing Message request to the Messenger Platform
function callTypingOn(sender_psid) {
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

//Shows the Get Started button for the first time user.
function getStarted() {
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
}


//Shows the Greeting Message for the first time user.
function greeting() {
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
  // Send the HTTP request to the Messenger Platform
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


//Get User City from Lat and Long
function getUserCity(senderID, lat, long) {
  request({
    "uri": "https://maps.googleapis.com/maps/api/geocode/json",
    "qs": { "key": ENV.config['GOOGLE_API_KEY'], "sensor": false, "latlng": '' + lat + ',' + long },
    "method": "GET"
  }, (err, res, body) => {
    if (!err) {
      console.log('getUserCity response');
      var body = JSON.parse(body);
      var size = body.results[0].address_components.length;
      let city = body.results[0].address_components[size - 4].short_name;
      let state = body.results[0].address_components[size - 3].short_name;
      console.log(body.results[0]);
      console.log(city + ', ' + state);
      reservationObject["location"] = city;
      reservationObject["locationState"] = state;
      let response = getDateQuickReplies();
      city = "";
      tempQuestion = 'getDate';
      console.log('tempQuestion = getDate');
      callSendAPI(senderID, response);
    } else {
      console.error("getUserCity failed:" + err);
    }
  });
}


//Get User City from Input Text
function getUserCityFromUserInput(senderID, location) {
  request({
    "uri": "https://maps.googleapis.com/maps/api/geocode/json",
    "qs": { "key": ENV.config['GOOGLE_API_KEY'], "address": location },
    "method": "GET"
  }, (err, res, body) => {
    if (!err) {
      console.log('getUserCityFromUserInput response');
      var body = JSON.parse(body);
      let city = body.results[0].formatted_address;
      city = city.substr(0, city.indexOf(','));
      tempQuestion = 'getDate';
      console.log('tempQuestion = getDate');
      reservationObject["location"] = city;
      let response = getDateQuickReplies();
      console.log('Fetch City from Input - ' + city);
      callSendAPI(senderID, response);
    } else {
      console.error("getUserCityFromUserInput failed:" + err);
    }
  });
}

//Get User City from Input Text
function getHotelListFromText(senderID) {
  console.log("getHotelListFromText method");
  console.log(reservationObject.location);
  console.log(reservationObject.startdate);
  console.log(reservationObject.enddate);
  console.log(reservationObject.adults);
  request({
    "uri": "https://691f1bf7.ngrok.io/property/hotels",
    "qs": { "city": reservationObject.location, "startdate": reservationObject.startdate, "enddate": reservationObject.enddate, "numberOfAdults": reservationObject.adults, "localeCode": "en" },
    "method": "GET"
  }, (err, res, body) => {
    if (!err && res) {
      console.log('getHotelListFromText response');
      let response = {};
      let hotelList = [];
      hotelList = JSON.parse(body);
      console.log('Hotel List response');
      console.log(hotelList);
      if(hotelList.length){
      let hotelListToShow = [];
      let hotelSize = hotelList.length;
      if (hotelList.length > 10) {
        hotelSize = 10;
      }
      for (var i = 0; i < hotelSize; i++) {
        hotelListToShow[i] = {};
        hotelListToShow[i]["title"] = hotelList[i].hotelName;
        hotelListToShow[i]["subtitle"] = hotelList[i].hotelName;
        hotelListToShow[i]["image_url"] = hotelList[i].hotelImageURL;
        let button = {};
        button["type"] = "web_url";
        button["url"] = hotelList[i].hotelRedirectedURL;
        button["title"] = "Select Room";
        hotelListToShow[i]['buttons'] = [];
        hotelListToShow[i]['buttons'].push(button);
      }
      console.log(JSON.stringify(hotelListToShow));
      console.log(hotelListToShow[0].buttons);
      response = {
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'generic',
            'elements': hotelListToShow
          }
        }
      };
      response = JSON.stringify(response);
      console.log('senderID', senderID);
      } else {
        response ={"text": "No Hotels found for above search criteria." }
      }
      callSendAPI(senderID, response);
    } else {
      console.error("getHotelListFromText failed:" + err);
    }
  });
}

// get the show results message
function getShowResults() {
  let response = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "button",
        "text": "Showing results for " + (reservationObject.location) + ", " + reservationObject.adults + " Adults with Check In on " + convertDateFormat(reservationObject.datetime) + " (For " + reservationObject.nights + " Nights).",
        "buttons": [
          {
            "type": "postback",
            "title": "Change Search",
            "payload": "change_search",
          },
          {
            "type": "postback",
            "title": "Did you know?",
            "payload": "did_you_know",
          }
        ]
      }
    }
  };
  return response;
}

function formatCheckInCheckOut(arrivalDate, nightsCount) {
  console.log("arrival date inside formattor" + arrivalDate);
  var checkInDate = new Date(arrivalDate);
  var checkOutDate = new Date(arrivalDate);
  checkOutDate.setDate(checkInDate.getDate() + nightsCount);
  var checkInDD = checkInDate.getDate();
  var checkInMM = checkInDate.getMonth() + 1;
  if (checkInDD < 10) {
    checkInDD = "0" + checkInDD;
  }
  if (checkInMM < 10) {
    checkInMM = "0" + checkInMM;
  }
  var checkInYY = checkInDate.getFullYear();
  var checkOutDD = checkOutDate.getDate();
  var checkOutMM = checkOutDate.getMonth() + 1;
  if (checkOutDD < 10) {
    checkOutDD = "0" + checkOutDD;
  }
  if (checkOutMM < 10) {
    checkOutMM = "0" + checkOutMM;
  }
  var checkOutYY = checkOutDate.getFullYear();
  checkInDate = checkInDD + '' + checkInMM + '' + checkInYY;
  checkOutDate = checkOutDD + '' + checkOutMM + '' + checkOutYY;
  reservationObject['startdate'] = checkInDate;
  reservationObject['enddate'] = checkOutDate;
  console.log("Check In Date : " + checkInDate);
  console.log("Check Out Date : " + checkOutDate);
}