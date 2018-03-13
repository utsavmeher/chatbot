/**
 * @author Utsav Meher <utsavm@xpanxion.co.in>
 */
var CONFIG = require('./mappedkey.js');

module.exports = {
// Sends Date Quick Reples via the Send API
getDateQuickReplies: function(userObj) {
  console.log('getDateQuickReplies location and state is:');
  console.log(userObj.reservationObject.locationState + userObj.reservationObject.location);
  if(!userObj.reservationObject.locationState && !userObj.reservationObject.location){
    userObj.reservationObject.location = userObj.reservationObject.city;
  }
  userObj.reservationObject.locationState = userObj.reservationObject.locationState ? userObj.reservationObject.locationState : "";
  userObj.reservationObject.location = userObj.reservationObject.location ? userObj.reservationObject.location: "";
  let response = {
    "text": CONFIG.keyMapped['location1'] + userObj.reservationObject.location + " "+ userObj.reservationObject.locationState + "\n" + CONFIG.keyMapped['date'],
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
  userObj.tempQuestion = 'getDate';
  return response;
},
  
getCheckInCheckOut: function(userObj) {
  var checkInDate = new Date(userObj.reservationObject.datetime);
  var checkOutDate = new Date(userObj.reservationObject.datetime);
  checkInDate.setDate(checkInDate.getDate()+1);
  checkOutDate.setDate(checkInDate.getDate() + userObj.reservationObject.nights);
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
  userObj.reservationObject['startdate'] = checkInDate;
  userObj.reservationObject['enddate'] = checkOutDate;
  console.log("Check In Date : " + checkInDate);
  console.log("Check Out Date : " + checkOutDate);
 }
}