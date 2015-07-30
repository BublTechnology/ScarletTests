"use strict";

var poll = {
    pollPeriod: 2000,
    commandStatus: function(testClient, commandId, deferred, initialTimeStamp, statusCallback) {
         var intervalId = setInterval(function() {
             testClient.commandsStatus(commandId)
             .then( function(res) {
                 var finalTimeStamp = Date.now();
                 console.log("body of command status is " + JSON.stringify(res.body));
                 //console.log('body of command status is\n' + require('util').inspect(res.body, {colors:true, depth: null}));

                 if (res.body.state !== 'inProgress') {
                     deferred.resolve({'error': res.error, 'body': res.body, 'response': res.response, 'timeElapsed': (finalTimeStamp - initialTimeStamp)});
                     clearInterval(intervalId);
                 } else if (statusCallback !== undefined){
                     statusCallback({'error': res.err, 'body': res.body, 'response': res.response});
                 }
             });
        }, this.pollPeriod);
    }
};

module.exports = poll;
