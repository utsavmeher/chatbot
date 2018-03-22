/**
 * @author Utsav Meher <utsavm@xpanxion.co.in>
 */
'use strict';

// Imports dependencies and set up http server
var ENV = require('./config.js');
var CONFIG = require('./mappedkey.js');
var sleep = require('thread-sleep');
var User = require('./user-class.js');
var date = require('./date.js');
var service = require('./service.js');
var locationService = require('./location.js');
var initialize = require('./initialize.js');
var _ = require('underscore');
const request = require('request'),
      express = require('express'),
      body_parser = require('body-parser'),
      app = express().use(body_parser.json()); // creates express http server
const PAGE_ACCESS_TOKEN = ENV.config['PAGE_ACCESS_TOKEN'];
const WIT_TOKEN = ENV.config['WIT_TOKEN'];
const { firstEntity } = require('./shared.js');
const Wit = require('node-wit/lib/wit');
const wit = new Wit({ accessToken: WIT_TOKEN });

// var questionsList = [];
var activeUsers = [];

// Sets server port and logs message on success
app.listen(process.env.PORT || 5000, () => console.log('Webhook is listening'));

// Accepts GET requests at the /webhook endpoint
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = "randomrandom";
  if (req.query['hub.mode'] && req.query['hub.verify_token']) {
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(req.query['hub.challenge']);
      initialize.getStarted();
      initialize.greeting();
    } else {
      res.sendStatus(403);
    }
  }
});

/*
* webhook listens to the messages that are sent to the FB Page/App
*/
app.post('/webhook', function (req, res) {
  var data = req.body;
  if (data.object == 'page') {
    data.entry.forEach(function (pageEntry) {
      pageEntry.messaging.forEach(function (messagingEvent) {
        console.log("Inside Page Entry, User ID: " + messagingEvent.sender.id);
        var userId =  messagingEvent.sender.id;
        var userObj = _.findWhere(activeUsers, {
                userId: userId.toString()
            });
        console.log("Active User: " + userObj);
        if (typeof(userObj) !== "object") {
           console.log("No User Found. Fetching User Profile...");
           request({ url: 'https://graph.facebook.com/v2.11/' + userId,
                qs: { access_token: PAGE_ACCESS_TOKEN },
                method: 'GET',
                json: { fields: "first_name,last_name,gender" }
            }, function(error, userData, body) {
                if (error) {
                    console.log('Error getting User Profile: ', error)
                } else if (userData.body.error) {
                    console.log('Error getting User Data: ', userData.body.error);
                    console.log('Need to remove');
                    var userObj = new User(userId, userData.body);
                    activeUsers.push(_.clone(userObj));
                    console.log("Active Users:");
                    console.log(activeUsers);
                      if (messagingEvent.message) {
                        handleMessage(messagingEvent, userObj);
                      } else if (messagingEvent.postback) {
                        handlePostback(messagingEvent, userObj);
                      } else {
                        console.log("Webhook received unknown messagingEvent:", messagingEvent);
                      }
                  console.log('Need to remove');
                } else {
                    var userObj = new User(userId, userData.body);
                    activeUsers.push(_.clone(userObj));
                    console.log("Active Users:");
                    console.log(activeUsers);
                      if (messagingEvent.message) {
                        handleMessage(messagingEvent, userObj);
                      } else if (messagingEvent.postback) {
                        handlePostback(messagingEvent, userObj);
                      } else {
                        console.log("Webhook received unknown messagingEvent:", messagingEvent);
                      }
                }
				});
        } else {
          if (messagingEvent.message) {
            handleMessage(messagingEvent, userObj);
          } else if (messagingEvent.postback) {
            handlePostback(messagingEvent, userObj);
          } else {
            console.log("Webhook received unknown messagingEvent:", messagingEvent);
          }
        }
      });
    });
    res.sendStatus(200);
  }
});

// Handles messages events
function handleMessage(event, userObj) {
  console.log('handleMessage event');
  let response;
  var messageText = event.message.text;
  var messageAttachments = event.message.attachments;
  if (messageAttachments) {
    if (messageAttachments[0].payload.coordinates) {
      locationService.getUserCity(userObj, messageAttachments[0].payload.coordinates.lat, messageAttachments[0].payload.coordinates.long);
    }
  } else if(messageText == "Future date"){
    response = { "text": "Please enter a future date." };
    userObj.tempQuestion = 'getDate';
    service.callSendAPI(userObj.userId, response);
  } else if (messageText == "Start Over") {
    userObj.changeSearchFlag = false;
    userObj.reservationObject = {};
    getStartingIntro(userObj);
  } else {
    service.callTypingOn(userObj.userId);
    console.log("Messege text before wit: " + messageText);
    wit.message(messageText).then(({ entities }) => {
      console.log('Wit Response');
      console.log(entities);
      if (entities.location && entities.number && entities.number[0] && entities.number[1] && entities.datetime) {
        userObj.reservationObject = {};
        userObj.reservationObject["city"] = entities.location[0].value;
        userObj.reservationObject["location"] = entities.location[0].value;
        userObj.reservationObject["adults"] = entities.number[0].value;
        userObj.reservationObject["nights"] = entities.number[1].value;
        userObj.reservationObject["datetime"] = entities.datetime[0].value;
        date.getCheckInCheckOut(userObj);
        response = getShowResults(userObj);
        service.callSendAPI(userObj.userId, response);
        response = getHotelListFromText(userObj);
        console.log(userObj.reservationObject);
      } else {
        const intent = firstEntity(entities, 'intent');
        const greetings = firstEntity(entities, 'greetings');
        const location = firstEntity(entities, 'location');
        const number = firstEntity(entities, 'number');
        const datetime = firstEntity(entities, 'datetime');
        console.log('User Temp Ques');
        console.log(userObj);
        console.log('changeSearchFlag: ' + userObj.changeSearchFlag);
        if (greetings && greetings.confidence > 0.9) {
          userObj.profile.first_name=userObj.profile.first_name?userObj.profile.first_name:"";
          response = { "text": "Hello " + userObj.profile.first_name + ", " + CONFIG.keyMapped['welcome'] + ' ' + CONFIG.keyMapped['location'] };
          userObj.tempQuestion = 'getLocation';
          console.log('tempQuestion = getLocation');
        } else if (userObj.tempQuestion == 'getLocation' && location && location.confidence > 0.9) {
          userObj.reservationObject = {};
          console.log('Inside location');
          locationService.getUserCityFromUserInput(userObj, location.value);
        } else if (userObj.tempQuestion == 'getDate' && datetime && datetime.confidence > 0.9) {
          response = { "text": CONFIG.keyMapped['guests'] };
          console.log("Inside getdate condition " + datetime.value)
          userObj.reservationObject["datetime"] = datetime.value;
          userObj.tempStore = 'adults';
          userObj.tempQuestion = 'getGuests';
          console.log('tempQuestion = getGuests');
        } else if ((number && number.confidence > 0.9) && (userObj.tempQuestion == 'getGuests' || userObj.tempQuestion == 'getNights')) {
          if (userObj.tempStore == 'adults' && userObj.tempQuestion == 'getGuests') {
            response = { "text": CONFIG.keyMapped['nights'] };
            userObj.reservationObject["adults"] = number.value;
            userObj.tempStore = 'nights';
            userObj.tempQuestion = 'getNights';
            console.log('tempQuestion = getNights');
          } else if (userObj.tempStore == 'nights' && userObj.tempQuestion == 'getNights') {
            userObj.reservationObject["nights"] = number.value;
            date.getCheckInCheckOut(userObj);
            response = getShowResults(userObj);
            service.callSendAPI(userObj.userId, response);
            response = getHotelListFromText(userObj);
            console.log(userObj.reservationObject);
            userObj.tempStore = '';
            userObj.tempQuestion = '';
            console.log('tempQuestion = EMPTY');
          }
        } else {
          response = { "text": CONFIG.keyMapped['sorry'] };
        }
      }
      service.callSendAPI(userObj.userId, response);
    });
  }
}
// Handles messaging_postbacks events
function handlePostback(event, userObj) {
  var message = event.message;
  console.log('handlePostback event');
  let response;
  if (event.postback.payload === 'Start') {
    userObj.changeSearchFlag = false;
    userObj.reservationObject = {};
    getStartingIntro(userObj);
  } else if (event.postback.payload === 'find_hotels' || event.postback.payload === 'change_search') {
    if (event.postback.payload === 'change_search') {
      userObj.changeSearchFlag = true;
    }
    callSendAPILocation(userObj, response);
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
    service.callSendAPI(userObj.userId, response);
  }
}
function convertDateFormat(inputDate) {
  return inputDate.substr(0, inputDate.indexOf('T'));
}

// Sends Location response to facebook via the Send API
function callSendAPILocation(userObj, response, endpoint, method) {
  endpoint = endpoint || 'messages';
  method = method || 'POST';
  if (userObj.changeSearchFlag) {
    console.log('change_search - in callSendAPILocation');
    userObj.profile.first_name=userObj.profile.first_name?userObj.profile.first_name:"";
    response = {
      "text": "Previous Search summary: " + userObj.reservationObject.location + " "+ userObj.reservationObject.locationState+ " for " + userObj.reservationObject.adults + " Adults with Check In on " + convertDateFormat(userObj.reservationObject.datetime) + " (For " + userObj.reservationObject.nights + " Nights).\nFor New Search - Please name a city " + userObj.profile.first_name + ".",
      "quick_replies": [
        {
          "content_type": "location"
        }
      ]
    }
  } else {
    response = {
      "text": CONFIG.keyMapped['location'],
      "quick_replies": [
        {
          "content_type": "location"
        }
      ]
    }
  }
  userObj.tempQuestion = 'getLocation';
  console.log('tempQuestion = getLocation');
  let request_body = {
    "messaging_type": "RESPONSE",
    "recipient": {
      "id": userObj.userId
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

// Get the first name and Shows the First Greeting Msg to the User
function getStartingIntro(userObj) {
  userObj.profile.first_name=userObj.profile.first_name?userObj.profile.first_name:"";
    let response = {
        "attachment": {
          "type": "template",
          "payload": {
            "template_type": "generic",
            "elements": [{
              "title": "Hello " + userObj.profile.first_name + "! " + CONFIG.keyMapped['welcome'],
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
      userObj.tempQuestion = 'getStarted';
      service.callSendAPI(userObj.userId, response);
}

//Get the Available hotel List
function getHotelListFromText(userObj) {
  let response = {};
  console.log("getHotelListFromText method Service Call ###############################################");
  console.log(userObj.reservationObject.city + ' ' + userObj.reservationObject.startdate + ' ' + userObj.reservationObject.enddate + ' ' + userObj.reservationObject.adults);
  request({
    "uri": "https://73476875.ngrok.io/property/hotels",
    "qs": { "city": userObj.reservationObject.city, "startdate": userObj.reservationObject.startdate, "enddate": userObj.reservationObject.enddate, "numberOfAdults": userObj.reservationObject.adults, "localeCode": "en" },
    "method": "GET"
  }, (err, res, body) => {
    if (!err && res.statusCode == 200) {
      let liveChatUrl='https://www.ihg.com/hotels/us/en/reservation/searchresult/chatFrameSet?vaSubject=reservations&language=en&siteLanguage=en&isJSEnabled=1';
      console.log('getHotelListFromText response');
      let hotelList = [];
      hotelList = JSON.parse(body);
      console.log('Hotel List response');
      if(hotelList && hotelList.length){
      let hotelListToShow = [];
      let hotelSize = hotelList.length;
      if (hotelList.length > 10) {
        hotelSize = 10;
      }
      getArrivalDepartureDate(userObj);
      for (var i = 0; i < hotelSize; i++) {
        console.log(hotelList[i]);
        hotelListToShow[i] = {};
        hotelListToShow[i]["title"] = hotelList[i].hotelName;
        hotelListToShow[i]["subtitle"] = hotelList[i].hotelName;
        hotelListToShow[i]["image_url"] = hotelList[i].hotelImageURL;
        let button = {};
        let button1 = {};
        button["type"] = "web_url";
        button["url"] = hotelList[i].hotelRedirectedURL;
        button["title"] = "Select Room";
        button1["type"] = "web_url";
        button1["url"] = liveChatUrl + '&arrivalDate='+ userObj.reservationObject.arrivalDate + '&departureDate='+ userObj.reservationObject.departureDate +'&adultRoomNights=' + userObj.reservationObject.adults + '&roomNights=' + userObj.reservationObject.nights + '&destination=' + 'Atlanta, GA, United States' + '&hotelCityStateCountryCode=' + 'Atlanta, GA, United States' ;
        button1["title"] = "Live Chat";
        hotelListToShow[i]['buttons'] = [];
        hotelListToShow[i]['buttons'].push(button);
        hotelListToShow[i]['buttons'].push(button1);
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
      } else {
        response ={"text": "No Hotels found for above search criteria." }
      }
      service.callSendAPI(userObj.userId, response);
    } else {
      response ={"text": "Server Not Available. Please try again later." }
      service.callSendAPI(userObj.userId, response);
      console.error("getHotelListFromText failed: " + err);
    }
  });
}

function getArrivalDepartureDate(userObj) {
  var checkInDate = new Date(userObj.reservationObject.datetime);
  var checkOutDate = new Date(userObj.reservationObject.datetime);
  checkInDate.setDate(checkInDate.getDate()+1);
  checkOutDate.setDate(checkInDate.getDate() + userObj.reservationObject.nights);
  var checkInDD = checkInDate.getDate();
  var checkInMM = checkInDate.getMonth();
  if (checkInDD < 10) {
    checkInDD = "0" + checkInDD;
  }
  if (checkInMM < 10) {
    checkInMM = "0" + checkInMM;
  }
  var checkInYY = checkInDate.getFullYear();
  var checkOutDD = checkOutDate.getDate();
  var checkOutMM = checkOutDate.getMonth();
  if (checkOutDD < 10) {
    checkOutDD = "0" + checkOutDD;
  }
  if (checkOutMM < 10) {
    checkOutMM = "0" + checkOutMM;
  }
  var checkOutYY = checkOutDate.getFullYear();
  checkInDate = checkInDD + '/' + checkInMM + '/' + checkInYY;
  checkOutDate = checkOutDD + '/' + checkOutMM + '/' + checkOutYY;
  userObj.reservationObject['arrivalDate'] = checkInDate;
  userObj.reservationObject['departureDate'] = checkOutDate;
  console.log("arrivalDate Date : " + checkInDate);
  console.log("departureDate Date : " + checkOutDate);
 }

// get the show results message
function getShowResults(userObj) {
  userObj.reservationObject.location = userObj.reservationObject.location?userObj.reservationObject.location:'';
  userObj.reservationObject.locationState = userObj.reservationObject.locationState?userObj.reservationObject.locationState:'';
  let response = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "button",
        "text": "Showing results for " + userObj.reservationObject.location + " " + userObj.reservationObject.locationState + " for "+userObj.reservationObject.adults + " Adults with Check In on " + convertDateFormat(userObj.reservationObject.datetime) + " (For " + userObj.reservationObject.nights + " Nights).",
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