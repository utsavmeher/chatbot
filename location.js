/**
 * @author Utsav Meher <utsavm@xpanxion.co.in>
 */
var ENV = require('./config.js');
var date = require('./date.js');
var service = require('./service.js');
const request = require('request');

module.exports = {
//Get User City from Latitude and Longitude
getUserCity: function(userObj, lat, long) {
  request({
    "uri": "https://maps.googleapis.com/maps/api/geocode/json",
    "qs": { "key": ENV.config['GOOGLE_API_KEY'], "sensor": false, "latlng": '' + lat + ',' + long },
    "method": "GET"
  }, (err, res, body) => {
    if (!err) {
      console.log('getUserCity response');
      var body = JSON.parse(body);
      for (let i = 0; i < body.results[0].address_components.length; i++) {
        if(body.results[0].address_components[i].types[0] == "locality"){
          userObj.reservationObject["location"]=body.results[0].address_components[i].long_name;
        }
        if(body.results[0].address_components[i].types[0] == "administrative_area_level_1"){
          userObj.reservationObject["locationState"] = body.results[0].address_components[i].long_name;
        }
      }
      let response = date.getDateQuickReplies(userObj);
      userObj.tempQuestion = 'getDate';
      console.log('tempQuestion = getDate');
      service.callSendAPI(userObj.userId, response);
    } else {
      console.error("getUserCity failed:" + err);
    }
  });
},
//Get User City from Input Text
getUserCityFromUserInput: function(userObj, location) {
  request({
    "uri": "https://maps.googleapis.com/maps/api/geocode/json",
    "qs": { "key": ENV.config['GOOGLE_API_KEY'], "address": location },
    "method": "GET"
  }, (err, res, body) => {
    if (!err) {
      console.log('getUserCityFromUserInput response');
      var body = JSON.parse(body);
      for (let i = 0; i < body.results[0].address_components.length; i++) {
        if(body.results[0].address_components[i].types[0] == "locality"){
          userObj.reservationObject["location"]=body.results[0].address_components[i].long_name;
        }
        if(body.results[0].address_components[i].types[0] == "administrative_area_level_1"){
          userObj.reservationObject["locationState"] = body.results[0].address_components[i].long_name;
        }
      }
      userObj.tempQuestion = 'getDate';
      let response = date.getDateQuickReplies(userObj);
      service.callSendAPI(userObj.userId, response);
    } else {
      console.error("getUserCityFromUserInput failed:" + err);
    }
  });
}
}