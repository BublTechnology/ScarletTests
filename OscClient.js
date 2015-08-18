'use strict';

var request;
var Poll;
var Q;

(function(isNode, isAngular) {
    var OscClient = function(domainArg, portArg) {
        var domain = domainArg || 'localhost';
        var port = portArg || 8000;
        var serverAddress = 'http://' + domain + ':' + port;

        // HTTP CONTENT TYPES
        var applicationJsonType = 'application/json; charset=utf-8';

        var applicationOctetType = 'application/octet-stream';

        // HTTP REQUEST
        var makeHttpRequest = function(method, url, contentType, body) {
            var deferred = Q.defer();
            request(httpRequestBody(method, url, contentType, body), function(err, res, body) {
                if (res.headers['content-type'] === 'application/json; charset=utf-8') {
                    body = JSON.parse(body);
                }
                deferred.resolve({'error': err, 'body': body, 'response': res});
            });
            return deferred.promise;
        };

        // HTTP REQUEST BODY
        var httpRequestBody = function(method, url, contentType, body) {
            if (contentType !== 'application/octet-stream') {
                body = JSON.stringify(body);
            }
            return {
                method: method,
                url: url,
                body: body,
                headers: {
                    'Content-Type': contentType,
                    'X-XSRF-Protected': '1'
                },
                withCredentials: false,
                responseType: 'arraybuffer'
            };
        };

        // OSC INFO
        var infoUrl = serverAddress + '/osc/info';

        this.getInfo = function() {
            return makeHttpRequest('GET', infoUrl, applicationJsonType);
        };

        // OSC STATE
        var stateUrl = serverAddress + '/osc/state';

        this.getState = function() {
            return makeHttpRequest('POST', stateUrl, applicationJsonType); 
        };

        // OSC CHECK FOR UPDATES
        var checkForUpdatesUrl = serverAddress + '/osc/checkForUpdates';

        this.checkForUpdates = function(stateFingerprint, waitTimeout) {
            return makeHttpRequest('POST', checkForUpdatesUrl, applicationJsonType, {'stateFingerprint': stateFingerprint, 'waitTimeout': waitTimeout});
        };

        // OSC COMMANDS EXECUTE
        var commandsExecuteUrl = serverAddress + '/osc/commands/execute';

        var commandsRequest = function(name, params, callback) {
            request(httpRequestBody('POST', commandsExecuteUrl, 'application/json; charset=utf-8', {'name': name, 'parameters': params}), callback);
        };

        var commandsExecute = function(name, params, statusCallback) {
            var deferred = Q.defer();
            commandsRequest(name, params, function(err, res, body) {
                var timeStamp = Date.now();
                if (res.headers['content-type'] === 'application/json; charset=utf-8') {
                    var results = JSON.parse(body);
                    if (results.state !== 'inProgress') {
                        deferred.resolve({'error': err, 'response': res, 'body': results});
                    } else {
                        var commandId = results.id;
                        if(isNode) { // TODO: remove the condition once poll.js is set up for sharing
                            Poll.commandStatus(this, commandId, deferred, timeStamp, statusCallback);
                        } else {
                            deferred.resolve({'error': err, 'response': res, 'body': results});
                        }
                    }
                } else {
                    deferred.resolve({'error': err, 'response': res, 'body': body});  // only for getImage command
                }
            }.bind(this));
            return deferred.promise;
        }.bind(this);

        // OSC COMMANDS START SESSION
        this.startSession = function(timeout) {
            return commandsExecute('camera.startSession', {'timeout': timeout});
        };

        // OSC COMMANDS UPDATE SESSION
        this.updateSession = function(sessionId, timeout) {
            return commandsExecute('camera.updateSession', {'sessionId': sessionId, 'timeout': timeout});
        };

        // OSC COMMANDS CLOSE SESSION
        this.closeSession = function(sessionId) {
            return commandsExecute('camera.closeSession', {'sessionId': sessionId});
        };

        // OSC COMMANDS TAKE PICTURE
        this.takePicture = function(sessionId, statusCallback) {
            return commandsExecute('camera.takePicture', {'sessionId':sessionId}, statusCallback);
        };

        // OSC COMMANDS LIST IMAGES
        this.listImages = function(entryCount, includeThumb, maxSize, continuationToken) {
            return commandsExecute('camera.listImages', {'entryCount': entryCount, 'includeThumb': includeThumb, 'maxSize': maxSize, 'continuationToken': continuationToken});
        };

        // OSC COMMANDS DELETE
        this.delete = function(fileUri) {
            return commandsExecute('camera.delete', {'fileUri': fileUri});
        };

        // OSC COMMANDS GET IMAGE
        this.getImage = function(fileUri, maxSize) {
            return commandsExecute('camera.getImage', {'fileUri': fileUri, 'maxSize': maxSize});
        };

        // OSC COMMANDS GET METADATA
        this.getMetadata = function(fileUri) {
            return commandsExecute('camera.getMetadata', {'fileUri': fileUri});
        };

        // OSC COMMANDS SET OPTIONS
        this.setOptions = function(sessionId, options) {
            return commandsExecute('camera.setOptions', {'sessionId': sessionId, 'options': options});
        };

        // OSC COMMANDS GET OPTIONS
        this.getOptions = function(sessionId, optionNames) {
            return commandsExecute('camera.getOptions', {'sessionId': sessionId, 'optionNames': optionNames});
        };

        // OSC COMMANDS STATUS
        var commandsStatusUrl = serverAddress + '/osc/commands/status';

        this.commandsStatus = function(commandId) {
            return makeHttpRequest('POST', commandsStatusUrl, applicationJsonType, {'id': commandId});
        };

        /*********************************************************/
        /* Bubl's Vendor Specific Endpoints and Commands         */
        /*********************************************************/
        // OSC BUBL UPDATE
        var bublUpdateUrl = serverAddress + '/osc/_bublUpdate';

        this.bublUpdate = function(updateFileBin) {
            return makeHttpRequest('POST', bublUpdateUrl, applicationOctetType, updateFileBin);
        };

        // OSC BUBL GET IMAGE
        var bublGetImageUrl = serverAddress + '/osc/_bublGetImage/';

        this.bublGetImage = function(fileUri) {
            return makeHttpRequest('GET', bublGetImageUrl + encodeURIComponent(fileUri), applicationJsonType);
        };

        // BUBL STOP
        var bublStopUrl = serverAddress + '/osc/commands/_bublStop';

        this.bublStop = function(commandId) {
            return makeHttpRequest('POST', bublStopUrl, applicationJsonType, {'id': commandId});
        };

        // BUBL POLL
        var bublPollUrl = serverAddress + '/osc/commands/_bublPoll';

        this.bublPoll = function(commandId, fingerprint, waitTimeout) {
            return makeHttpRequest('POST', bublPollUrl, applicationJsonType, {'id': commandId, 'fingerprint': fingerprint, 'waitTimeout': waitTimeout});
        };

        // BUBL COMMANDS CAPTURE VIDEO
        this.bublCaptureVideo = function(sessionId, statusCallback) {
            return commandsExecute('camera._captureVideo', {'sessionId':sessionId}, statusCallback);
        };

        // OSC COMMANDS BUBL TIMELAPSE
        this.bublTimelapse = function(sessionId, statusCallback) {
            return commandsExecute('camera._bublTimelapse', {'sessionId':sessionId}, statusCallback);
        };

        // OSC COMMANDS BUBL STREAM
        this.bublStream = function(sessionId, statusCallback) {
            return commandsExecute('camera._bublStream', {'sessionId': sessionId}, statusCallback);
        };

        // OSC COMMANDS BUBL SHUTDOWN
        this.bublShutdown = function(sessionId, shutdownDelay) {
            return commandsExecute('camera._bublShutdown', {'sessionId':sessionId, 'shutdownDelay':shutdownDelay});
        };
    };
    if(isAngular) {
        angular.module('clientUi')
            .factory('OscClient', function() { return OscClient; });
        var $http = angular.injector(['ng']).get('$http');
        var _convert2String = function(data) {
            if(data === null) { return 'null'; }
            var dataU8 = new Uint8Array(data);
            var dataStr = '';
            for(var i = 0; i < dataU8.byteLength; i++) {
                dataStr += String.fromCharCode(dataU8[i]);
            }
            return dataStr;
        };
        request = function(reqObject, callOnComplete) {
            reqObject.data = reqObject.body;
            delete reqObject.body;
            $http(reqObject)
                .success(function(data, status, headers) {
                    callOnComplete(
                        undefined,
                        {
                            'headers':{'content-type':headers('content-type')},
                            'statusCode':status
                        },
                        (headers('content-type') === 'application/json; charset=utf-8')?_convert2String(data):data
                    );
                })
                .error(function(err, status, headers) {
                    callOnComplete(
                        undefined,
                        {
                            'headers':{'content-type':headers('content-type')},
                            'statusCode':status
                        },
                        _convert2String(err)
                    );
                });
        };
        Q = window.Q;
    } else if(isNode) {
        request = require('./server_tests/node_modules/request');
        Poll = require('./server_tests/lib/poll.js');
        Q = require('./server_tests/node_modules/q');
        module.exports = OscClient;
    }
})( typeof module !== 'undefined' && module.exports,
    typeof angular !== 'undefined');
