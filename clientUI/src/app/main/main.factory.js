'use strict';

var clientUiApp = angular.module('clientUi');

// Constructor for each commands:
// name: '',
// parameters: [
//     //{field: <str>, value: <data>}
// ],
// run: function() {},
var oscCommand = function(cmdName, cmdParams, cmdBinding) {
    this.name = cmdName;
    this.parameters = cmdParams;
    this.run = cmdBinding;
};

clientUiApp.factory('Camera', function($timeout, ngDialog, RustTestClient) {
    var testClient = new RustTestClient(null, 8000);
    var oscConsole = document.getElementById('oscConsole');
    var scope;

    function Camera($scope) {
        scope = $scope; // this is needed for updating the console
        scope._gridHelper = function(obj,idx){return !(inx%2);};

        // get /osc/info
        this.getInfo = new oscCommand(
            '/osc/info',
            [],
            function() {
                testClient.getInfo().then(
                    function(data) {
                        if(data.error !== undefined) { _pushError(data); return; }
                        _pushResult({name: 'GET /osc/info'},
                            '\nManufacturer: ' + data.manufacturer + '\n' +
                            'Model: ' + data.model + '\n' +
                            'Serial number: ' + data.serialNumber + '\n' +
                            'Firmware version: ' + data.firmwareVersion + '\n' +
                            'Support URL: ' + data.supportUrl + '\n' +
                            'Http port: ' + data.endpoints.httpPort + '\n' +
                            'Http Updates port: ' + data.endpoints.httpUpdatesPort + '\n' +
                            'GPS: ' + data.gps + '\n' +
                            'Gyro: ' + data.gyro + '\n' +
                            'Uptime: ' + data.uptime + '\n' +
                            'Apis: ' + data.api[0] + ', ' + data.api[1] + ', ' + data.api[2] + ', ' + data.api[3] + ', ' + data.api[4] + ', ' + data.api[5] + ', ' + data.api[6]);
                    }
                );
            }
        );

        // get /osc/state
        this.getState = new oscCommand(
            '/osc/state',
            [],
            function() {
                testClient.getState().then(function(data) {
                    if(data.error !== undefined) { _pushError(data); return; }
                    _pushResult({name: 'GET /osc/state'},
                        '\nfingerprint: ' + data.fingerprint + '\n' +
                        'state:\n' +
                        '\tsessionId: ' + data.state.sessionId + '\n' +
                        '\tbatteryLevel: ' + data.state.batteryLevel + '\n' +
                        '\tstorageChanged: ' + data.state.storageChanged + '\n' +
                        '\t_bublCharging: ' + data.state._bublCharging + '\n' +
                        '\t_bublChargingSufficientPower: ' + data.state._bublChargingSufficientPower + '\n' +
                        '\t_bublCommands: ' + '\t'+JSON.stringify(data.state._bublCommands, null, '\t').split('\n').join('\n\t'));
                });
            }
        );

        // get /osc/checkForUpdates
        this.getCheckForUpdates = new oscCommand(
            '/osc/checkForUpdates',
            [
                { field: 'stateFingerprint', value: '' },
                { field: 'waitTimeout(optional)', value: undefined }
            ],
            function() {
                _pushCommandDetails(this.name, this.parameters);
                this.parameters[1].value = (this.parameters[1].value === '')?undefined:this.parameters[1].value;
                testClient.checkForUpdates(
                    this.parameters[0].value,
                    this.parameters[1].value
                ).then(function(data) {
                    if(data.error !== undefined) { _pushError(data); return; }
                    _pushResult({name: 'POST /osc/checkForUpdates'},
                        'result:' +
                        '\n\tstateFingerprint : \"' + data.stateFingerprint + '\"' +
                        '\n\tthrottleTimeout : ' + data.throttleTimeout);
                });
            }
        );

        // post /osc/commands/status
        this.getCommandsStatus = new oscCommand(
            'POST /osc/commands/status',
            [],
            function() {
                _pushCommandDetails(this.name, [{field: 'commandId', value: scope.bublStatusCommandId}]);
                testClient.commandsStatus(scope.bublStatusCommandId)
                .then(function(data) {
                    if(data.error !== undefined) { _pushError(data); return; }
                    _pushResult({name: 'POST /osc/commands/status'},
                        'result:' +
                        '\n\tcommandId : ' + data.id + ' (' + data.name + ')' +
                        '\n\tprogress :' +
                        '\n\t\t'+JSON.stringify(data.progress, null, '\t').split('\n').join('\n\t\t'));
                });
            }
        );

        // post /osc/commands/_bublStop
        this.bublStop = new oscCommand(
            'POST /osc/commands/_bublStop',
            [],
            function() {
                _pushCommandDetails(this.name, [{field: 'commandId', value: scope.bublStatusCommandId}]);
                testClient.bublStop(scope.bublStatusCommandId)
                .then(function(data) {
                    if(data.error !== undefined) { _pushError(data); return; }
                    _pushResult({name: '/osc/commands/_bublStop'}, '');
                });
            }
        );

        // post /osc/commands/_bublPoll
        this.bublPoll = new oscCommand(
            'POST /osc/commands/_bublPoll',
            [],
            function() {
                _pushCommandDetails(
                    this.name,
                    [
                        {field: 'commandId', value: scope.bublPollCommandId},
                        {field: 'fingerprint', value: scope.bublPollFingerprint},
                        {field: 'waitTimeout', value: scope.bublPollWaitTimeout}
                    ]
                );
                testClient.bublPoll(
                    scope.bublPollCommandId,
                    scope.bublPollFingerprint,
                    scope.bublPollWaitTimeout
                ).then(function(data) {
                    if(data.error !== undefined) { _pushError(data); return; }
                    // retrieved fingerprint will override the textbox's original value everytime
                    scope.bublPollFingerprint = data.fingerprint;
                    _pushResult({name: 'POST /osc/commands/status'},
                        'result:' +
                        '\n\tcommandId : ' + data.command.id + ' (' + data.command.name + ')' +
                        '\n\tfingerprint : \'' + data.fingerprint + '\'' +
                        '\n\tthrottleTimeout : ' + data.throttleTimeout);
                });
            }
        );

        // post /osc/_bublGetImage/:uri
        this.endPointGetImage = new oscCommand(
            'GET /osc/_bublGetImage/',
            [],
            function(downloadFile) {
                _pushCommandDetails(
                    this.name + encodeURIComponent(scope.bublGetImageUri),
                    [{field: 'fileUri', value: scope.bublGetImageUri}]
                );
                if(scope.bublGetImageUri === '') {
                    _pushError(
                        {
                            name: 'GET /osc/_bublGetImage/',
                            error: {
                                code: 'clientUIError',
                                message: 'Invalid URI'
                            },
                            state: 'error'
                        }
                    );
                    return;
                }
                testClient.bublGetImage(encodeURIComponent(scope.bublGetImageUri))
                .then(function(data) {
                    if(data.error !== undefined) { _pushError(data); return; }
                    var blob = new Blob([data], {type: 'image/jpeg'});// TODO: implement handler for raw image type
                    if(downloadFile) {
                        _pushResult({name: 'GET /osc/_bublGetImage/:uri'},
                            '\n\t...prompting image download...');
                        _saveFileAs(blob, scope.bublGetImageUri.split('/')[4]);
                    } else {
                        _pushResult({name: 'GET /osc/_bublGetImage/:uri'},
                            '\n\t...displaying image...');
                        scope.imgUri = scope.bublGetImageUri;
                        scope.picturePopup = ngDialog.open({
                            template: '<div><h4>{{imgUri}} : </h4></div><div><img src="' + URL.createObjectURL(blob) + '" style="height: 100%; width: 100%" ></div>',
                            className: 'ngdialog-theme-default dialog720',
                            plain: true,
                            scope: scope
                        });
                    }
                });
            }
        );

        // post /osc/_bublUpdate
        this.bublUpdate = new oscCommand(
            'POST /osc/_bublUpdate',
            [],
            function() {
                //Wait for file to finish loading before sending http request
                var loadAndSend;
                loadAndSend = window.setInterval( function() {
                    //Camera::_loadBinFile() will set the following variables
                    if( typeof scope.uploadedFileBin !== undefined &&
                        typeof scope.uploadedFileList !== undefined) {
                        window.clearInterval(loadAndSend);
                        var bublUpdateFile = scope.uploadedFileList;
                        _pushCommandDetails(
                            'POST /osc/_bublUpdate',
                            [
                                {field: 'file', value: bublUpdateFile[0].name},
                                {field: 'size', value: bublUpdateFile[0].size + ' bytes'}
                            ]
                        );
                        testClient.bublUpdate(scope.uploadedFileBin)
                        .then(function(data) {
                            if(data.error !== undefined) { _pushError(data); return; }
                            if(data !== 200) {
                                _pushError(
                                    {
                                        name: 'POST /osc/_bublUpdate',
                                        error: {
                                            code: 'clientUIError',
                                            message: 'statusCode-' + data
                                        }
                                    }
                                );
                            } else {
                                _pushResult(
                                    {name: 'POST /osc/_bublUpdate'},
                                    'statusCode ' + data
                                );
                            }
                        });
                    }
                }, 100);
            }
        );
        // helper function for camera.bublUpdate
        this._loadBinFile = function(evt) {
            delete scope.uploadedFileBin;
            delete scope.uploadedFileList;
            var files = evt.target.files;
            var file = files[0];
            if(file && files) {
                var reader = new FileReader();
                reader.onload = function(readerEvt) {
                    var binaryString = readerEvt.target.result;
                    scope.uploadedFileBin = binaryString;
                    scope.uploadedFileList = files;
                };
                reader.readAsBinaryString(file);
            }
        };

        // startSession wrapper
        this.startSession = new oscCommand(
            'camera.startSession',
            [
                {field: 'timeout(optional)', value: 60}
            ],
            function() {
                _pushCommandDetails(this.name, this.parameters);
                testClient.startSession(this.parameters[0].value)
                .then(function(data) {
                    if(data.error !== undefined) { _pushError(data); return; }
                    _pushResult(data,
                        'result:' +
                        '\n\tsessionId : ' + data.results.sessionId +
                        '\n\ttimeout : ' + data.results.timeout);
                });
            }
        );

        // updateSession wrapper
        this.updateSession = new oscCommand(
            'camera.updateSession',
            [
                { field: 'sessionId', value: '0' },
                { field: 'timeout(optional)', value: undefined }
            ],
            function() {
                _pushCommandDetails(this.name, this.parameters);
                testClient.updateSession(
                    this.parameters[0].value,
                    this.parameters[1].value
                ).then(function(data) {
                    if(data.error !== undefined) { _pushError(data); return; }
                    _pushResult(data,
                        'result:' +
                        '\n\tsessionId : ' + data.results.sessionId +
                        '\n\ttimeout : ' + data.results.timeout);
                });
            }
        );

        // closeSession wrapper
        this.closeSession = new oscCommand(
            'camera.closeSession',
            [
                {field: 'sessionId', value: '0'}
            ],
            function() {
                _pushCommandDetails(this.name, this.parameters);
                testClient.closeSession(this.parameters[0].value)
                .then(function(data) {
                    if(data.error !== undefined) { _pushError(data); return; }
                    _pushResult(data, '');
                });
            }
        );

        // takePicture wrapper
        this.takePicture = new oscCommand(
            'camera.takePicture',
            [
                {field: 'sessionId', value: '0'}
            ],
            function() {
                _pushCommandDetails(this.name, this.parameters);
                testClient.takePicture(this.parameters[0].value)
                .then(function(data) {
                    if(data.error !== undefined) { _pushError(data); return; }
                    _pushResult(data,
                        'result:' +
                        '\n\tcommandId : ' + data.id +
                        '\n\timage capture in progress');
                    var commandId = data.id;
                    var pollCaptureResult;
                    pollCaptureResult = window.setInterval( function() {
                        testClient.commandsStatusCallback(commandId, function(err, res, body) {
                            var data = JSON.parse(body);
                            if(data.error !== undefined) { _pushError(data); window.clearInterval(pollCaptureResult); }
                            if(data.state === 'inProgress') {
                                scope.oscConsoleHistory += '.';
                            } else {
                                _pushResult({name: 'camera.takePicture'},
                                    'result:' +
                                    '\n\tfileUri : ' + data.results.fileUri);
                                window.clearInterval(pollCaptureResult);
                            }
                            _scrollToBottom();
                        });
                    }, 500);
                });
            }
        );

        // listImages wrapper
        this.listImages = new oscCommand(
            'camera.listImages',
            [
                { field: 'entryCount', value: undefined },
                { field: 'includeThumb(optional)', value: 'false' },
                { field: 'maxSize', value: undefined },
                { field: 'continuationToken(optional)', value: '' }
            ],
            function() {
                _pushCommandDetails(this.name, this.parameters);
                var includeThumb =
                    (this.parameters[1].value === 'true')?true:
                    (this.parameters[1].value === 'false')?false:
                    undefined;
                if(this.parameters[3].value === '') { this.parameters[3].value = undefined; }
                testClient.listImages(
                    this.parameters[0].value,
                    includeThumb,
                    this.parameters[2].value,
                    this.parameters[3].value
                ).then(function(data) {
                    if(data.error !== undefined) { _pushError(data); return; }
                    var result = 'result:\n\tentries:';
                    for(var i = 0; i < data.results.entries.length; i++) {
                        result +=
                            '\n\t['+i+']\t' +
                            'name : ' + data.results.entries[i].name + '\n\t\t' +
                            'uri : ' + data.results.entries[i].uri + '\n\t\t' +
                            'size : ' + data.results.entries[i].size + '\n';
                    }
                    result += '\n\ttotalEntries : ' + data.results.totalEntries;
                    result += '\n\tcontinuationToken : ' + data.results.continuationToken;
                    _pushResult(data, result);
                });
            }
        );

        // delete wrapper
        this.delete = new oscCommand(
            'camera.delete',
            [
                { field:'fileUri', value:'' }
            ],
            function() {
                _pushCommandDetails(this.name, this.parameters);
                testClient.delete(this.parameters[0].value)
                .then(function(data) {
                    if(data.error !== undefined) { _pushError(data); return; }
                    _pushResult(data, '');
                });
            }
        );

        // getImage wrapper
        this.getImage = new oscCommand(
            'camera.getImage',
            [
                { field: 'fileUri', value: '' },
                { field: 'maxSize(optional)', value: 0 }
            ],
            function() {
                _pushCommandDetails(this.name, this.parameters);
                scope.imgUri = this.parameters[0].value;
                testClient.getImage(
                    this.parameters[0].value,
                    this.parameters[1].value
                ).then(function(data) {
                    if(data.error !== undefined) { _pushError(data); return; }
                    var blob = new Blob([data], {type: 'image/jpeg'});// TODO: implement handler for raw image type
                    scope.picturePopup = ngDialog.open({
                      template: '<div><h4>{{imgUri}} : </h4></div><div><img src="' + URL.createObjectURL(blob) + '" style="height: 100%; width: 100%" ></div>',
                      className: 'ngdialog-theme-default dialog720',
                      plain: true,
                      scope: scope
                    });
                    _pushResult({name: 'camera.getImage'},
                        '\n\t...displaying image...');
                });
            }
        );

        // getMetadata wrapper
        this.getMetadata = new oscCommand(
            'camera.getMetadata',
            [
                { field: 'fileUri', value: '' },
            ],
            function() {
                _pushCommandDetails(this.name, this.parameters);
                testClient.getMetadata(this.parameters[0].value)
                .then(function(data) {
                    if(data.error !== undefined) { _pushError(data); return; }
                    _pushResult(data,
                        'result:' +
                        '\n\tmetadata JSON :' +
                        '\n\t\t'+JSON.stringify(data.results, null, '\t').split('\n').join('\n\t\t'));
                });
            }
        );

        // setOptions wrapper
        this.setOptions = new oscCommand(
            'camera.setOptions',
            [
                { field: 'sessionId', value: '' },
                {
                    field: 'options',
                    value: [
                        //TODO: make dropdown list options being populated JSON support list
                        { name: 'captureMode',          type: 'string',     value: [ 'UNCHANGED', 'image', '_bublVideo' ] },
                        { name: 'exposureProgram',      type: 'number',     value: [ 'UNCHANGED', 2 ] },
                        { name: 'whiteBalance',         type: 'string',     value: [ 'UNCHANGED', 'auto' ] },
                        { name: 'fileFormat',           type: 'object',     value: [ 'UNCHANGED', 'jpeg', 'raw' ] },
                        { name: 'exposureDelay',        type: 'number',     value: [ 'UNCHANGED', 4 ] },
                        { name: 'sleepDelay',           type: 'number',     value: [ 'UNCHANGED', 1, 5, 10, 30, 60, 300, 600, 1200, 2400, 65535 ] },
                        { name: 'offDelay',             type: 'number',     value: [ 'UNCHANGED', 1, 5, 10, 30, 60, 300, 600, 1200, 2400, 65535 ] },
                        { name: 'hdr',                  type: 'boolean',    value: [ 'UNCHANGED', true, false ] },
                        { name: 'exposureBracket',      type: 'object',     value: [ 'UNCHANGED', 'autoMode' ] },
                        { name: 'imageStabilization',   type: 'string',     value: [ 'UNCHANGED', 'off' ] },
                        { name: '_bublVideoFileFormat', type: 'object',     value: [ 'UNCHANGED', '1920', '1440' ] },
                        //{ name: '_bublTimelapse',       type: 'object',     value: [ 'UNCHANGED', 5 ] },
                        { name: '_bublCalibration',     type: 'string',     value: '' },
                        { name: 'wifiPassword',         type: 'string',     value: '' }
                    ]
                },
            ],
            function() {
                var parsedOption = {};
                for(var i = 0; i < this.parameters[1].value.length; i++) {
                    var option = this.parameters[1].value[i];
                    if(angular.isArray(option.value)) {
                        var dropdown = document.getElementById('option_'+option.name);
                        var strValue = dropdown.options[dropdown.selectedIndex].text;
                        if(strValue === 'UNCHANGED') { continue; }
                        var trueValue;
                        var _parseOptionObject = function(optionToSet, selection) {
                            return
                            (optionToSet == 'fileFormat')?(
                                (selection == 'jpeg')?{ height: 3840, type: 'jpeg', width: 3840 }:
                                (selection == 'raw')?{ height: 3840, type: 'raw', width: 3840 }:
                                undefined
                            ):
                            (optionToSet == 'exposureBracket')?(
                                (selection == 'autoMode')?{ autoMode: true }:
                                undefined
                            ):
                            (optionToSet == '_bublVideoFileFormat')?(
                                (selection == '1920')?{ height: 1920, type: 'mp4', width: 1920 }:
                                (selection == '1440')?{ height: 1440, type: 'mp4', width: 1440 }:
                                undefined
                            ):
                            undefined;
                        };
                        trueValue = (option.type == 'string')?strValue:
                                    (option.type == 'number')?(Number(strValue)):
                                    (option.type == 'boolean')?(strValue === 'true'):
                                    (option.type == 'object')?(_parseOptionObject(option.name, strValue)):
                                    undefined;
                        parsedOption[option.name] = trueValue;

                    } else if(angular.isString(option.value)) {
                        if(option.value == '') { continue; }
                        parsedOption[option.name] = option.value;
                    }
                }
                _pushCommandDetails(
                    this.name,
                    [
                        this.parameters[0],
                        { field: 'options', value: '\n\t\t'+JSON.stringify(parsedOption, null, '\t').split('\n').join('\n\t\t') }
                    ]
                );
                testClient.setOptions(
                    this.parameters[0].value,
                    parsedOption
                ).then(function(data) {
                    if(data.error !== undefined) { _pushError(data); return; }
                    _pushResult(data,'');
                });
            }
        );

        // getOptions wrapper
        this.getOptions = new oscCommand(
            'camera.getOptions',
            [
                { field: 'sessionId', value: '' },
                {
                    field: 'optionNames',
                    value: [
                        'captureMode',
                        'captureModeSupport',
                        'exposureProgram',
                        'exposureProgramSupport',
                        'iso',
                        'isoSupport',
                        'shutterSpeed',
                        'shutterSpeedSupport',
                        'aperture',
                        'apertureSupport',
                        'whiteBalance',
                        'whiteBalanceSupport',
                        'exposureCompensation',
                        'exposureCompensationSupport',
                        'fileFormat',
                        'fileFormatSupport',
                        'exposureDelay',
                        'exposureDelaySupport',
                        'sleepDelay',
                        'sleepDelaySupport',
                        'offDelay',
                        'offDelaySupport',
                        'totalSpace',
                        'remainingSpace',
                        'remainingPictures',
                        'gpsInfo',
                        'dateTimeZone',
                        'hdr',
                        'hdrSupport',
                        'exposureBracket',
                        'exposureBracketSupport',
                        'gyro',
                        'gyroSupport',
                        'gps',
                        'gpsSupport',
                        'imageStabilization',
                        'imageStabilizationSupport',
                        'wifiPassword',
                        '_bublVideoFileFormat',
                        '_bublVideoFileFormatSupport',
                        '_bublCalibration',
                        '_bublTimelapse',
                        '_bublCount'
                    ]
                }
            ],
            function() {
                var selectedOptions = [];
                this.parameters[1].value.forEach( function(optionName) {
                    var checkbox = document.getElementById('checkbox_' + optionName);
                    if(checkbox.checked) {
                        selectedOptions.push(optionName);
                    }
                });
                _pushCommandDetails(
                    this.name,
                    [
                        this.parameters[0],
                        { field: this.parameters[1].field, value: '\n\t\t'+JSON.stringify(selectedOptions, null, '\t').split('\n').join('\n\t\t') }
                    ]
                );
                testClient.getOptions(
                    this.parameters[0].value,
                    selectedOptions
                ).then(function(data) {
                    if(data.error !== undefined) { _pushError(data); return; }
                    _pushResult(data,
                        'result:' +
                        '\n\toptions : ' +
                        '\n\t\t'+JSON.stringify(data.results.options, null, '\t').split('\n').join('\n\t\t'));
                });
            }
        );

        // _bublTimelapse wrapper
        this._bublTimelapse = new oscCommand(
            'camera._bublTimelapse',
            [
                { field: 'sessionId', value: '0' }
            ],
            function() {
                _pushCommandDetails(this.name, this.parameters);
                testClient.bublTimelapse(this.parameters[0].value)
                .then(function(data) {
                    if(data.error !== undefined) { _pushError(data); return; }
                    _pushResult(data,
                        'result:' +
                        '\n\tcommandId : ' + data.id +
                        '\n\ttimelapse capture in progress');
                    var commandId = data.id;
                    var pollCaptureResult;
                    pollCaptureResult = window.setInterval( function() {
                        testClient.commandsStatusCallback(commandId, function(err, res, body) {
                            var data = JSON.parse(body);
                            if(data.error !== undefined) { _pushError(data); window.clearInterval(pollCaptureResult); }
                            if(data.state === 'inProgress') {
                                scope.oscConsoleHistory += '.';
                            } else {
                                var fileUris = '';
                                for(var i = 0; i < data.results._bublFileUris.length; i++) {
                                    fileUris += '\n\t[' + i + '] : \t' + data.results._bublFileUris[i];
                                }
                                _pushResult({name: 'camera._bublTimelapse'},
                                    'result:' +
                                    '\n\t_bublFileUris : ' + fileUris);
                                window.clearInterval(pollCaptureResult);
                            }
                            _scrollToBottom();
                        });
                    }, 500);
                });
            }
        );

        // _bublCaptureVideo wrapper
        this._bublCaptureVideo = new oscCommand(
            'camera._bublCaptureVideo',
            [
                { field: 'sessionId', value: '' }
            ],
            function() {
            }
        );

        // _bublStream wrapper
        this._bublStream = new oscCommand(
            'camera._bublStream',
            [
                { field: 'sessionId', value: '' }
            ],
            function() {
            }
        );

        // _bublShutdown wrapper
        this._bublShutdown = new oscCommand(
            'camera._bublShutdown',
            [
                { field: 'sessionId', value: '' },
                { field: 'shutdownDelay(optional)', value: '' }
            ],
            function() {
            }
        );

    };

    // Helper functions below
    var _pushCommandDetails = function(name, parameters) {
        scope.oscConsoleHistory += _parseCurrentTime() + '\n\"' + name + '\" sent with parameters:';
        for (var i in parameters) {
            scope.oscConsoleHistory += '\n\t' + parameters[i].field + ' : ' + parameters[i].value;
        }
        _scrollToBottom();
    };
    var _pushResult = function(data, successMsg) {
        scope.oscConsoleHistory += _parseCurrentTime() +
            '\n\"' + data.name + '\" returned ' + successMsg;
        _scrollToBottom();
    };
    var _pushError = function(data) {
        scope.oscConsoleHistory += _parseCurrentTime() +
            '\n\"' + data.name + '\" returned an ERROR:\n\tERROR type : ' + data.error.code +
            '\n\tERROR message : ' + data.error.message;
        _scrollToBottom();
    };
    var _scrollToBottom = function() {
        $timeout(function() {
            $timeout(function() {
                oscConsole.scrollTop = oscConsole.scrollHeight;
            })
        });
    };
    var _parseCurrentTime = function() {
        var currentTime = new Date();
        var _padZero = function(number) { return (number<10)?('0'+number):(''+number) };
        var hh = _padZero(currentTime.getHours());
        var mm = _padZero(currentTime.getMinutes());
        var ss = _padZero(currentTime.getSeconds());
        return '\n\n'+hh+':'+mm+':'+ss;
    };
    var _saveFileAs = (function() {
        var a = document.createElement('a');
        document.body.appendChild(a);
        a.style.display = 'none';
        return function(blobData, fileName) {
            var url = window.URL.createObjectURL(blobData);
            a.href = url;
            a.download = fileName;
            a.click();
            window.URL.createObjectURL(url);
        };
    }());

    return Camera;
});
