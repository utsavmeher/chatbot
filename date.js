module.exports = {
getCheckInCheckOut: function(userObj) {
  console.log("Arrival date inside formattor: " + userObj.reservationObject.datetime);
  var checkInDate = new Date(userObj.reservationObject.datetime);
  var checkOutDate = new Date(userObj.reservationObject.datetime);
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