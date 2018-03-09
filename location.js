
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
      console.log(body.results[0].formatted_address);
      // var size = body.results[0].address_components.length;
      // let city = body.results[0].address_components[size - 4].short_name;
      // let state = body.results[0].address_components[size - 3].short_name;
      var string =body.results[0].formatted_address;
	    var array = string.split(",");
      userObj.reservationObject["location"] = array[array.length-3];
      userObj.reservationObject["locationState"] = array[array.length-2];
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
      console.log(body.results[0]);
      // var size = body.results[0].address_components.length;
      // let city = body.results[0].address_components[size - 3].short_name;
      // let state = body.results[0].address_components[size - 2].short_name;
      var string =body.results[0].formatted_address;
	    var array = string.split(",");
      userObj.reservationObject["location"] = array[array.length-3];
      userObj.reservationObject["locationState"] = array[array.length-2];
      userObj.tempQuestion = 'getDate';
      let response = date.getDateQuickReplies(userObj);
      service.callSendAPI(userObj.userId, response);
    } else {
      console.error("getUserCityFromUserInput failed:" + err);
    }
  });
}
}