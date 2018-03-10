/**
 * @author Utsav Meher <utsavm@xpanxion.co.in>
 */
(function() {
    'use strict';
    //User object will store activity of particular user and behave like use session  
    function User(userId, profile) {
        this.userId = userId; 
        this.status = false;
        this.profile = profile; 
        this.lastQuestion = {}; 
        this.reservationObject = {};
        this.tempQuestion = '';
        this.tempStore = '';
        this.city = '';
        this.changeSearchFlag = false;
        this.sorryCount = 0;
    }
    module.exports = User;
}());