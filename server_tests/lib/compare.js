// Copyright 2015 Bubl Technology Inc.
//
// Licensed under the MIT license
// <LICENSE-MIT or http://opensource.org/licenses/MIT>.
// This file may not be copied, modified, or distributed
// except according to those terms.

"use strict";

var chai = require('chai');
var factory = require('factory_girl');
var assert = chai.assert;
var Q = require('q');

/************************ GOOGLE OSC SPEC ************************/
/* /osc/info */
factory.define('oscInfo', function() {
  this.manufacturer = 'Bubl';
  this.model0 = 'bubl0';
  this.model1 = 'bubl1';
  this.serialNumber = '000000000000';
  this.firmwareVersion = '0';
  this._bublAtmelVersion = '__atmelVerMock__';
  this._bublAlteraVersion = 0;
  this.supportUrl = 'http://www.bublcam.com/support';
  this.endpoints = {
    httpPort: 8888,
    httpUpdatesPort: 8888,
    httpsPort: 443,
    httpsUpdatesPort: 443
  };
  this.gps = false;
  this.gyro = false;
  this.uptime = 0;
  this.api = [
    '/osc/info',
    '/osc/state',
    '/osc/checkForUpdates',
    '/osc/_bublUpdate',
    '/osc/_bublGetImage/:uri',
    '/osc/commands/execute',
    '/osc/commands/_bublStop',
    '/osc/commands/_bublPoll',
    '/osc/commands/status'
  ];
});

/* /osc/state */
factory.define('oscState', function() {
  this.fingerprint = '';
  this.sessionId = '';
  this.batteryLevel = 100;
  this.storageChanged = false;
  this._bublCommands = [];
  this._bublCharging = true;
  this._bublChargingSufficientPower = true;
});

/* /osc/checkForUpdates */
factory.define('oscCheckForUpdates', function() {
  this.stateFingerprint = '0';
  this.throttleTimeout = 5;
});

/* /osc/commands/status */
factory.define('oscCommandsStatus', function() {
  this.name = '';
  this.state = 'inProgress';
  this.id = '';
  this.completion = [0.1, 0.4, 0.7];
  this._bublCaptureStatus = ['exposing', 'capturing', 'saving'];
});

/* startSession, updateSession */
factory.define('oscSessionOpResults', function() {
  this.sessionId = '0';
  this.timeout = 60;
});

/* closeSession */
factory.define('oscCloseSessionResults', function() {
  this.name = 'camera.closeSession';
  this.state = 'done';
});

/* takePicture */
factory.define('oscTakePictureResults', function() {
  this.emptyString = '';
});
factory.define('oscTakePictureProgress', function() {
  this.id = '1';
});

/* takeHdrPicture */
factory.define('oscTakeHdrPictureResults', function() {
  this.emptyString = '';
});

/* listImage */
factory.define('oscListImagesResults', function() {
this.entries = [];
this.totalEntries = 0;
this.continuationToken = '';
});

/* delete */
factory.define('oscDeleteResults', function() {
  this.name = 'camera.delete';
  this.state = 'done';
});

/* setOptions */
factory.define('oscSetOptionsResults', function() {
  this.name = 'camera.setOptions';
  this.state = 'done';
});

/* getOptions */
factory.define('oscGetOptionsResults', function() {
  this.captureMode = 'image';
  this.captureModeSupport = [];
  this.exposureProgram = 2;
  this.exposureProgramSupport = [0, 1, 2, 3, 4];
  this.iso = 0;
  this.isoSupport = [0];
  this.shutterSpeed = 0.0;
  this.shutterSpeedSupport = [0.0];
  this.aperture = 0.0;
  this.apertureSupport = [0.0];
  this.whiteBalance = 'auto';
  this.whiteBalanceSupport = ['auto'];
  this.exposureCompensation = 0.0;
  this.exposureCompensationSupport = [0.0];
  this.fileFormat = {
    type: 'jpeg',
    width: 3840,
    height: 3840
  };
  this.fileFormatSupport = [
    {
      type: 'jpeg',
      width: 3840,
      height: 3840
    },
    {
      type: 'raw',
      width: 3840,
      height: 3840
    }
  ];
  this.exposureDelay = 4;
  this.exposureDelaySupport = [0];
  this.sleepDelay = 5;
  this.sleepDelaySupport = [0];
  this.offDelay = 600;
  this.offDelaySupport = [0];
  this.totalSpace = 0;
  this.remainingSpace = 0;
  this.remainingPictures = 0;
  this.gpsInfo = {
    lat: 0.0,
    lng: 0.0
  };
  this.dateTimeZone = 'YYYY:MM:DD HH:MM:SS+(-)HH:MM';
  this.hdr = false;
  this.hdrSupport = true;
  this.exposureBracket = {autoMode:true};
  this.exposureBracketSupport = {
    autoMode: true,
    shotsSupport: [1,2,3],
    incrementSupport: [0.2,0.4,0.6]
  };
  this.gyro = false;
  this.gyroSupport = true;
  this.gps = false;
  this.gpsSupport = false;
  this.imageStabilization = 'off';
  this.imageStabilizationSupport = ['off','on'];
  this.wifiPassword = '12345678';
  this._bublVideoFileFormat = {
    type: 'mp4',
    width: 1920,
    height: 1920
  };
  this._bublVideoFileFormatSupport = [
    {
      type: 'mp4',
      width: 1920,
      height: 1920
    },
    {
      type: 'mp4',
      width: 960,
      height: 960
    }
  ];
  this._bublCalibration = '';
  this._bublTimelapse = {
    interval: 0,
    count: 0
  };
  this._bublCount = {
    count: [],
    hdr: 0,
    timelapse: 0
  };
});

/* getMetadata */
factory.define('oscGetMetadataResults', function() {
  // EXIF VALUES
  this.ExifVersion = '0220';
  this.ImageWidth = 3840;
  this.ImageLength = 3840;

  // XMP VALUES
  this.ProjectionType =               '_bublMultiplex';
  this.UsePanoramaViewer =            true;
  this.CroppedAreaImageWidthPixels =  3840;
  this.CroppedAreaImageHeightPixels = 3840;
  this.FullPanoWidthPixels =          3840;
  this.FullPanoHeightPixels =         3840;
  this.CroppedAreaLeftPixels =        0;
  this.CroppedAreaTopPixels =         0;
});

/************************ BUBL SPECIFIC ************************/
/* bublTimelapse */
factory.define('bublTimelapseResults', function() {
    this.state = 'done';
    this.results = {
        fileUri: 'bublfile://dcim/100bublc/t0000001.jpg',
        _bublFileUris: ['','']
    };
});

/* bublCaptureVideo */
factory.define('bublCaptureVideoResults', function() {
    this.emptyString = '';
});

/* bublStreamVideo */
factory.define('bublStreamResults', function() {
    this.state = 'done';
    this.id = '';
});


/* bublStop */
factory.define('bublStopResults', function() {
    this.body = '';
});

/* bublPoll */
factory.define('bublPollResults', function() {
    this.id = '';
    this.fingerprint = '0';
    this.throttleTimeout = 5;
});

/* bublShutdown */
factory.define('bublShutdownResults', function() {
    this.name = 'camera._bublShutdown';
    this.state = 'done';
});

/************************ ERRORS ************************/
/* cameraInExclusiveUse error response */
factory.define('cameraInExclusiveUseError', function() {
  this.code = 'cameraInExclusiveUse';
  this.message = '';
});

/* missingParameter error response */
factory.define('missingParameterError', function() {
  this.code = 'missingParameter';
  this.message = '';
});

/* invalidParameterValue error response */
factory.define('invalidParameterValueError', function() {
  this.code = 'invalidParameterValue';
  this.message = '';
});

/* pageNotFound error response */
factory.define('pageNotFoundError', function() {
});

/* serverError response */
factory.define('serverError', function() {
  this.code = 'serverError';
  this.message = '';
});

var Compare = function() {

    /* oscInfoOutput():
    * verifies if results device info matches expected device info
    */
    this.oscInfoOutput = function(results, overrideExpectation) {
        var expected = factory.create('oscInfo', overrideExpectation);
        verifyHttpStatus200(results);
        assert.equal(results.body.manufacturer, expected.manufacturer);
        assert.ok(results.body.model === expected.model0 || results.body.model === expected.model1);
        assert.equal(results.body.serialNumber.length, expected.serialNumber.length);
        assert.ok(results.body.firmwareVersion >= expected.firmwareVersion);
        assert.ok(results.body._bublAtmelVersion !== undefined);
        assert.ok(results.body._bublAlteraVersion !== undefined);
        assert.equal(results.body.supportUrl, expected.supportUrl);
        assert.equal(typeof results.body.endpoints.httpPort, 'number');
        assert.equal(typeof results.body.endpoints.httpUpdatesPort, 'number');
        assert.equal(results.body.gps, expected.gps);
        assert.equal(results.body.gyro, expected.gyro);
        assert.equal(results.body.api[0], expected.api[0]);
        assert.equal(results.body.api[1], expected.api[1]);
        assert.equal(results.body.api[2], expected.api[2]);
        assert.equal(results.body.api[3], expected.api[3]);
        assert.equal(results.body.api[4], expected.api[4]);
        assert.equal(results.body.api[5], expected.api[5]);
        assert.equal(results.body.api[6], expected.api[6]);
        assert.equal(results.body.api[7], expected.api[7]);
        assert.equal(results.body.api[8], expected.api[8]);
    };

    /* oscStateOutput():
    * verifies if response state matches expected state
    */
    this.oscStateOutput = function(results, overrideExpectation) {
        var expected = factory.create('oscState', overrideExpectation);
        var obj;
        var i;
        verifyHttpStatus200(results);
        assert.notEqual(results.body.fingerprint, expected.fingerprint);// it is important to override results.body.fingerprint if test does not want to verify its matching
        assert.equal(results.body.state.sessionId, expected.sessionId);
        assert.ok(results.body.state.batteryLevel <= expected.batteryLevel);
        assert.equal(typeof results.body.state.storageChanged, 'boolean');
        assert.equal(results.body.state._bublCommands.length, expected._bublCommands.length);
        //Note: we shouldn'tsdfadf require the array elements to be in the same order. hence we loop through and match element by command id.
        for(i = 0; i < results.body.state._bublCommands.length; i++) {
            var filteredCommands = results.body.state._bublCommands.filter(filterCommands(obj, expected, i));
            assert.equal(filteredCommands.length, 1);
            var responseCmdStatus = filteredCommands[0];
            var expectedCmdStatus = expected._bublCommands[i];
            assert.deepEqual(responseCmdStatus, expectedCmdStatus);
        }
        assert.equal(typeof results.body.state._bublCharging, 'boolean');
        assert.equal(typeof results.body.state._bublChargingSufficientPower, 'boolean');
    };

    var filterCommands = function(object, expected, i) {
        return (object.id === expected._bublCommands[i].id);
    };

    /* oscCheckForUpdatesOutput():
    * verifies if stateFingerprint and throttleTimeout matches
    */
    this.oscCheckForUpdatesOutput = function(results, stateChanged, overrideExpectation) {
        var expected = factory.create('oscCheckForUpdates', overrideExpectation);
        verifyHttpStatus200(results);
        assert.equal(results.body.throttleTimeout, expected.throttleTimeout);
        if (stateChanged) {
            assert.notEqual(results.body.stateFingerprint, expected.stateFingerprint);
        } else {
            assert.equal(results.body.stateFingerprint, expected.stateFingerprint);
        }
    };

    /* oscCommandsStatus():
    * verifies if command status matches expected status given a command id
    */
    this.oscCommandsStatusOutput = function(results, overrideExpectation) {
        var hasValidCompletion = false;
        var hasValidCaptureStatus = false;
        var expected = factory.create('oscCommandsStatus', overrideExpectation);
        verifyHttpStatus200(results);
        for(var i = 0; i < expected.completion.length; i++) {
            if (results.body.progress.completion === expected.completion[i]) {
                hasValidCompletion = true;
                break;
            }
        }
        for(i = 0; i < expected._bublCaptureStatus.length; i++) {
            if (results.body.progress._bublCaptureStatus === expected._bublCaptureStatus[i]) {
                hasValidCaptureStatus = true;
                break;
            }
        }
        assert.equal(results.body.name, expected.name);
        assert.equal(results.body.state, expected.state);
        assert.equal(results.body.id, expected.id);
        assert.equal(hasValidCompletion, true);
        assert.equal(hasValidCaptureStatus, true);
    };

    /* oscSessionOpOutput():
    * verifies if response for commands startSession, updateSession, and
    * closeSession matches the expected correct response
    */
    this.oscSessionOpOutput = function(results, overrideExpectation) {
        var expected = factory.create('oscSessionOpResults', overrideExpectation);
        verifyHttpStatus200(results);
        assert.equal(results.body.results.sessionId, expected.sessionId);
        assert.equal(results.body.results.timeout, expected.timeout);
    }.bind(this);

    /* oscCloseSessionOutput():
    * verifies if response for command closeSession matches the expected correct response
    */
    this.oscCloseSessionOutput = function(results, overrideExpectation) {
        var expected = factory.create('oscCloseSessionResults', overrideExpectation);
        verifyHttpStatus200(results);
        assert.equal(results.body.name, expected.name);
        assert.equal(results.body.state, expected.state);
    };

    /* oscTakePictureOutput():
    * verifies if fileUri returned by takePicture command is a non-empty string
    */
    this.oscTakePictureOutput = function(results, overrideExpectation) {
        var expected = factory.create('oscTakePictureResults', overrideExpectation);
        verifyHttpStatus200(results);
        assert.notEqual(results.body.results.fileUri, expected.emptyString);
    };

    /* oscTakeHdrPictureOutput():
    * verifies if fileUri returned by takePicture w/ hdr option command is valid
    */
    this.oscTakeHdrPictureOutput = function(results, overrideExpectation) {
        var expected = factory.create('oscTakeHdrPictureResults', overrideExpectation);
        verifyHttpStatus200(results);
        assert.equal(results.body.results._bublFileUris.length, 3);
        for(var i = 0; i < results.body.results._bublFileUris.length; i++) {
            assert.notEqual(results.body.results._bublFileUris[i], expected.emptyString);
        }
    };

    /* oscListImageOutput():
    * verifies if entry list, totalEntries matches, and continuationToken matches expected output
    */
    this.oscListImagesOutput = function(results, hasContinuationToken, hasThumb, overrideExpectation) {
        var expected = factory.create('oscListImagesResults', overrideExpectation);
        var i;
        verifyHttpStatus200(results);
        assert.equal(results.body.results.entries.length, expected.entries.length);
        assert.equal(results.body.results.totalEntries, expected.totalEntries);

        if (hasContinuationToken) {
            assert.notEqual(results.body.results.continuationToken, expected.continuationToken);
        } else {
            assert.equal(results.body.results.continuationToken, undefined);
        }

        if (hasThumb) {
            for(i = 0; i < results.body.results.entries.length; i++) {
                assert.property(results.body.results.entries[i], 'thumbnail');
            }
        } else {
            for(i = 0; i < results.body.results.entries.length; i++) {
                assert.notProperty(results.body.results.entries[i], 'thumbnail');
            }
        }
    };

    /* oscDeleteOutput():
    * verifies if response for command delete matches the expected correct response
    */
    this.oscDeleteOutput = function(results, overrideExpectation) {
        var expected = factory.create('oscDeleteResults', overrideExpectation);
        verifyHttpStatus200(results);
        assert.equal(results.body.name, expected.name);
        assert.equal(results.body.state, expected.state);
    };

    /* oscSetOptionsOutput():
    * verifies if response for command setOptions matches the expected correct response
    */
    this.oscSetOptionsOutput = function(results, overrideExpectation) {
        var expected = factory.create('oscSetOptionsResults', overrideExpectation);
        verifyHttpStatus200(results);
        assert.equal(results.body.name, expected.name);
        assert.equal(results.body.state, expected.state);
    };

    /* oscGetOptionsOutput():
    * verifies if response for command getOptions matches the expected correct response
    * note: argument specifiedOptions is a list of options intended for verification
    */
    this.oscGetOptionsOutput = function(specifiedOptions, results, overrideExpectation) {
        var expected = {};
        expected.options = factory.create('oscGetOptionsResults', overrideExpectation);
        verifyHttpStatus200(results);
        for(var i = 0; i < specifiedOptions.length; i++) {
            assert.deepEqual(results.body.results.options[specifiedOptions[i]], expected.options[specifiedOptions[i]]);
        }
    };

    /* oscGetImageOutput():
    * verifies if response is consisted of image binaries
    */
    this.oscGetImageOutput = function(results) {
        verifyHttpStatus200(results);
        require('istextorbinary').isBinary(null, results.body, function(err, result) {
            if(err) { throw err; }
            assert(result, 'Response is not of binaries.');
        });
    };

    /* oscGetMetadataOutput()
    * verifies if metadata fields matches
    */
    this.oscGetMetadataOutput = function(results, overrideExpectation) {
    var expected = factory.create('oscGetMetadataResults', overrideExpectation);
        verifyHttpStatus200(results);
        assert.equal( results.body.results.exif.ExifVersion,
                    expected.ExifVersion);
        assert.equal( results.body.results.exif.ImageWidth,
                    expected.ImageWidth);
        assert.equal( results.body.results.exif.ImageLength,
                    expected.ImageLength);
        assert.equal( results.body.results.xmp.ProjectionType,
                    expected.ProjectionType);
        assert.equal( results.body.results.xmp.UsePanoramaViewer,
                    expected.UsePanoramaViewer);
        assert.equal( results.body.results.xmp.CroppedAreaImageWidthPixels,
                    expected.CroppedAreaImageWidthPixels);
        assert.equal( results.body.results.xmp.CroppedAreaImageHeightPixels,
                    expected.CroppedAreaImageHeightPixels);
        assert.equal( results.body.results.xmp.FullPanoWidthPixels,
                    expected.FullPanoWidthPixels);
        assert.equal( results.body.results.xmp.FullPanoHeightPixels,
                    expected.FullPanoHeightPixels);
        assert.equal( results.body.results.xmp.CroppedAreaLeftPixels,
                    expected.CroppedAreaLeftPixels);
        assert.equal( results.body.results.xmp.CroppedAreaTopPixels,
                    expected.CroppedAreaTopPixels);
    };

    /* bublStopOutput():
     * verifies if bublStop fields match
     */
    this.bublStopOutput = function(results, overrideExpectation) {
        var expected = factory.create('bublStopResults', overrideExpectation);
        verifyHttpStatus200(results);
        assert.equal(results.body, expected.body);
    };

    /* bublTimelapseOutput():
     * verifies if fileUri returned by _bublTimelapse command is the expected URI
     * and if the length of list _bublFileUris is greater than expected length of
     * _bublFileUris
     */
    this.bublTimelapseOutput = function(results, overrideExpectation) {
        var expected = factory.create('bublTimelapseResults', overrideExpectation);
        verifyHttpStatus200(results);
        assert.notEqual(results.body.results.fileUri, expected.emptyString);
        assert(results.body.results._bublFileUris.length >= expected.results._bublFileUris.length, 'should have taken more than ' + expected.results._bublFileUris.length + ' images');
    };

    /* bublCaptureVideoOutput():
    * verifies if fileUri returned by bublCaptureVideo command is a non-empty string
    */
    this.bublCaptureVideoOutput = function(results, overrideExpectation) {
        var expected = factory.create('bublCaptureVideoResults', overrideExpectation);
        verifyHttpStatus200(results);
        assert.notEqual(results.body.results.fileUri, expected.emptyString);
    };

    /* bublStreamOutput():
    * verifies if fileUri returned by bublStream command is a non-empty string
    */
    this.bublStreamOutput = function(results, overrideExpectation) {
        var expected = factory.create('bublStreamResults', overrideExpectation);
        verifyHttpStatus200(results);
        assert.equal(results.body.state, expected.state);
        assert.equal(results.body.id, expected.id);
    };

    /* bublPoll Output():
    * verifies if bublPoll fields match
    */
    this.bublPollOutput = function(results, stateChanged, overrideExpectation) {
        var expected = factory.create('bublPollResults', overrideExpectation);
        verifyHttpStatus200(results);
        assert.equal(results.body.throttleTimeout, expected.throttleTimeout);
        assert.equal(results.body.command.id, expected.id);
        if (stateChanged) {
            assert.notEqual(results.body.fingerprint, expected.fingerprint);
        } else {
            assert.equal(results.body.fingerprint, expected.fingerprint);
        }
    };

    /* bublUpdateOutput():
    * verifies if bublUpdate returned status code matches
    * */
    this.bublUpdateOutput = function(results) {
        verifyHttpStatus200(results);
    };

    /* bublShutdownOutput():
    * verifies if bublShutdown returns correct name and state
    * */
    this.bublShutdownOutput = function(results, overrideExpectation) {
        var expected = factory.create('bublShutdownResults', overrideExpectation);
        assert.equal(results.body.name, expected.name);
        assert.equal(results.body.state, expected.state);
    };

    this.shutdownDelay = function(startTime, stopTime, expectedTime) {
        assert.isTrue((stopTime - startTime) > expectedTime);
    };

    /* invalidParameterValueError():
    * verifies if error code from any command matches invalidParameterValueError
    */
    this.invalidParameterValueError = function(results, overrideExpectation) {
        var expected = factory.create('invalidParameterValueError', overrideExpectation);
        verifyHttpStatus400(results);
        assert.equal(results.body.error.code, expected.code);
    };

    /* cameraInExclusiveUseError():
    * verifies response from any command matches cameraInExclusiveUse
    */
    this.cameraInExclusiveUseError = function(results, overrideExpectation) {
        var expected = factory.create('cameraInExclusiveUseError', overrideExpectation);
        verifyHttpStatus400(results);
        assert.equal(results.body.error.code, expected.code);
    };

    /* missingParameterError():
    * verifies response from any command matches missingParameter
    */
    this.missingParameterError = function(results, overrideExpectation) {
        var expected = factory.create('missingParameterError', overrideExpectation);
        verifyHttpStatus400(results);
        assert.equal(results.body.error.code, expected.code);
    };

    /* pageNotFoundError():
    * verifies HTTP 404 page not found
    */
    this.pageNotFoundError = function(results) {
        verifyHttpStatus404(results);
    };

    /* serverError():
    * verifies response matches expected value
    */
    this.serverError = function(results, overrideExpectation) {
        var expected = factory.create('serverError', overrideExpectation);
        verifyHttpStatus400(results);
        assert.equal(results.body.error.code, expected.code);
    };

    var verifyHttpStatus200 = function(results) {
        assert.equal(results.error, undefined);
        assert.equal(results.response.statusCode, 200);
    };

    var verifyHttpStatus400 = function(results) {
        assert.equal(results.error, undefined);
        assert.equal(results.response.statusCode, 400);
    };

    var verifyHttpStatus404 = function(results) {
        assert.equal(results.error, undefined);
        assert.equal(results.response.statusCode, 404);
    };

    this.assertTrue = function(flag) {
        assert.isTrue(flag);
    };

    this.deleteAllImagesOutput = function(results) {
        assert.equal(results.commandStatus, 'done');
    };

    this.verifyStatus200 = function(results) {
        verifyHttpStatus200(results);
    };

    this.catchExceptions = function(done, func) {
        return function(res) {
            try {
                return func(res);
            } catch (err) {
                done(err);
                return Q.reject(err);
            }
        };
    };
};

module.exports = Compare;
