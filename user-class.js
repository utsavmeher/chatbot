(function() {
    'use strict';
    //User object will store activity of particular user and behave like use session  
    function User(userId, profile) {
        this.userId = userId; //user if provided by Facebook
        this.status = false;
        this.profile = profile; //store user first name, profile image and other personal information requested by you 
        this.lastQuestion = {}; //last question that system had asked 
        this.chatData = {}, //save user chat history 
        this.lastQuestionKey = ''; //store key of last selected question
    }
    module.exports = User;
}());