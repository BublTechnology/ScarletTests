"use strict";

var RustTestClient = require('../../RustTestClient.js');
var Compare = require('../lib/compare.js');
var Q = require('../node_modules/q');
var Util = require('../lib/util');

describe("RUST API TEST SUITE", function() {
    var testClient = new RustTestClient();
    var Comparison = new Compare();
    var Utility = new Util(testClient);
    var defaultOptionsFile = './defaults/mock.json';
    var timeoutValue = 30000;  // Change this variable depending on real HW vs mock HW test

    // OSC INFO
    describe("Testing /osc/info endpoint", function() {

        it("Expect success. /osc/info returns correct info", function(done) {
            testClient.getInfo()
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscInfoOutput(res);
                done();
            }));
        });
    });

    // OSC STATE
    describe("Testing /osc/state endpoint", function() {
        var sessionId;

        before( function(done) {
            testClient.startSession()
            .then( Comparison.catchExceptions(done, function(res) {
                sessionId = res.body.results.sessionId;
                Comparison.oscSessionOpOutput(res, {'sessionId': sessionId});
                done();
            }));
        });

        it("Expect success. /osc/state endpoint successfully returns state when state has not changed", function(done) {
            testClient.getState()
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscStateOutput(res, {'sessionId' : sessionId});
                done();
            }));
        });

        it("Expect success. confirming /osc/state endpoint returns correct value when state has changed", function(done) {
            var oldFingerprint;

            testClient.getState()
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscStateOutput(res, {'sessionId' : sessionId});
                oldFingerprint = res.fingerprint;
                return testClient.closeSession(sessionId);
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscCloseSessionOutput(res);
                return testClient.getState();
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscStateOutput(res, {'sessionId': '', 'fingerprint': oldFingerprint});
                done();
            }));
        });
    });

    // OSC CHECK FOR UPDATES
    describe("Testing /osc/checkForUpdates endpoint", function() {
        var sessionId;
        var oldFingerprint;

        beforeEach( function(done) {
            this.timeout(timeoutValue);
            Utility.checkActiveSession()
            .then( function() {
                done();
            }, function() {
                testClient.startSession()
                .then( Comparison.catchExceptions(done, function(res) {
                    sessionId = res.body.results.sessionId;
                    Comparison.oscSessionOpOutput(res, {'sessionId': sessionId});
                    done();
                }));
            });
        });

        afterEach( function(done) {
            this.timeout(timeoutValue);
            Utility.checkActiveSession()
            .then( function() {
                testClient.closeSession(sessionId)
                .then( Comparison.catchExceptions(done, function(res) {
                    Comparison.oscCloseSessionOutput(res);
                    done();
                }));
            }, function() {
                done();
            });
        });

        it("Expect success. /osc/checkForUpdates endpoint successfully gets updates when state has not changed", function(done) {
            testClient.getState()
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscStateOutput(res, {'sessionId': sessionId});
                oldFingerprint = res.body.fingerprint;
                return testClient.checkForUpdates(oldFingerprint);
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscCheckForUpdatesOutput(res, false, {stateFingerprint: oldFingerprint});
                done();
            }));
        });

        it("Expect success. /osc/checkForUpdates endpoint successfully gets updates when state has changed", function(done) {
            testClient.getState()
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscStateOutput(res, {'sessionId': sessionId});
                oldFingerprint = res.body.fingerprint;
                return testClient.closeSession(sessionId);
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscCloseSessionOutput(res);
                return testClient.checkForUpdates(oldFingerprint);
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscCheckForUpdatesOutput(res, true, {stateFingerprint: oldFingerprint});
                done();
            }));
        });

        it("Expect success. /osc/checkForUpdates endpoint successfully gets updates when state has not changed with waitTimeout set to 5", function(done) {
            this.timeout(timeoutValue);
            testClient.getState()
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscStateOutput(res, {'sessionId': sessionId});
                oldFingerprint = res.body.fingerprint;
                return testClient.checkForUpdates(oldFingerprint, 5);
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscCheckForUpdatesOutput(res, false, {stateFingerprint: oldFingerprint});
                done();
            }));
        });

        it("Expect missingParameter Error. /osc/checkForUpdates endpoint cannot get updates when no fingerprint is provided", function(done) {
            testClient.checkForUpdates()
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.missingParameterError(res);
                done();
            }));
        });
    });


    // START SESSION
    describe("Testing /osc/commands/execute camera.startSession endpoint", function() {
        var sessionId;

        afterEach( function(done) {
            Utility.checkActiveSession()
            .then( function() {
                testClient.closeSession(sessionId)
                .then( Comparison.catchExceptions(done, function(res) {
                    Comparison.oscCloseSessionOutput(res);
                    done();
                }));
            }, function() {
                done();
            });
        });

        it("Expect success. camera.startSession successfully starts a session", function(done) {
            testClient.startSession()
            .then( Comparison.catchExceptions(done, function(res) {
                sessionId = res.body.results.sessionId;
                Comparison.oscSessionOpOutput(res, {'sessionId': sessionId});
                done();
            }));
        });

        it("Expect success.  camera.startSession successfully starts a session when a timeout value of 30 is specified", function(done) {
            testClient.startSession(30)
            .then( Comparison.catchExceptions(done, function(res) {
                sessionId = res.body.results.sessionId;
                Comparison.oscSessionOpOutput(res, {'sessionId': sessionId, 'timeout': 30});
                done();
            }));
        });

        it("Expect success. camera.startSession will timeout after the the specified timeout value", function(done) {
            this.timeout(timeoutValue);
            testClient.startSession(5)
            .then( Comparison.catchExceptions(done, function(res) {
                sessionId = res.body.results.sessionId;
                Comparison.oscSessionOpOutput(res, {'sessionId': sessionId, 'timeout': 5});
                return Q.delay(8000);
            }))
            .then( function() {
                return testClient.startSession();
            })
            .then( Comparison.catchExceptions(done, function(res) {
                sessionId = res.body.results.sessionId;
                Comparison.oscSessionOpOutput(res, {'sessionId': sessionId});
                done();
            }));
        });
            
        it("Expect cameraInExclusiveUse Error. camera.startSession cannot start session while another session is already running", function(done) {
            testClient.startSession()
            .then( Comparison.catchExceptions(done, function(res) {
                sessionId = res.body.results.sessionId;
                Comparison.oscSessionOpOutput(res, {'sessionId': sessionId});
                return testClient.startSession();
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.cameraInExclusiveUseError(res);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. camera.startSession cannot start session when incorrect timeout type is provided", function(done) {
            testClient.startSession('wrongtype')
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });
    });

    // UPDATE SESSION
    describe("Testing /osc/commands/execute camera.updateSession endpoint", function() {
        var sessionId;

        before( function(done) {
            Utility.checkActiveSession()
            .then( function() {
                done();
            }, function() {
                testClient.startSession()
                .then( Comparison.catchExceptions(done, function(res) {
                    sessionId = res.body.results.sessionId;
                    Comparison.oscSessionOpOutput(res, {'sessionId': sessionId});
                    done();
                }));
            });
        });

        after( function(done) {
            Utility.checkActiveSession()
            .then( function() {
                testClient.closeSession(sessionId)
                .then( Comparison.catchExceptions(done, function(res) {
                    Comparison.oscCloseSessionOutput(res);
                    done();
                }));
            }, function() {
                done();
            });
        });

        it("Expect success. camera.updateSession successfully updates a session", function(done) {
            testClient.updateSession(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSessionOpOutput(res, {'sessionId': sessionId});
                done();
            }));
        });

        it("Expect success. camera.updateSession successfully updates a session with a timeout value specified", function(done) {
            testClient.updateSession(sessionId, 15)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSessionOpOutput(res, {'sessionId': sessionId, timeout: 15});
                done();
            }));
        });

        it("Expect missingParameter Error. camera.updateSession cannot update session when sessionId is not specified", function(done) {
            testClient.updateSession()
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.missingParameterError(res);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. camera.updateSession cannot update session when sessionId is an incorrect type", function(done) {
            testClient.updateSession('wrongtype')
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. camera.updateSession cannot update session when timeout is an incorrect type", function(done) {
            testClient.updateSession(sessionId, 'wrongtype')
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });
    });

    // CLOSE SESSION
    describe("Testing /osc/commands/execute camera.closeSession endpoint", function() {
        var sessionId;

        beforeEach( function(done) {
            Utility.checkActiveSession()
            .then( function() {
                done();
            }, function() {
                testClient.startSession()
                .then( Comparison.catchExceptions(done, function(res) {
                    sessionId = res.body.results.sessionId;
                    Comparison.oscSessionOpOutput(res, {'sessionId': sessionId});
                    done();
                }));
            });
        });

        afterEach( function(done) {
            Utility.checkActiveSession()
            .then( function() {
                testClient.closeSession(sessionId)
                .then( Comparison.catchExceptions(done, function(res) {
                    Comparison.oscCloseSessionOutput(res);
                    done();
                }));
            }, function() {
                done();
            });
        });

        it("Expect success. camera.closeSession successfully closes a session", function(done) {
            testClient.closeSession(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscCloseSessionOutput(res);
                done();
            }));
        });

        it("Expect missingParameter Error. camera.closeSession cannot close session when sessionId is not provided", function(done) {
            testClient.closeSession()
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.missingParameterError(res);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. camera.closeSession cannot close session when sessionId is an incorrect type", function(done) {
            testClient.closeSession('wrongtype')
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. camera.closeSession cannot close session when no session is active", function(done) {
            testClient.closeSession(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscCloseSessionOutput(res);
                return testClient.closeSession(sessionId);
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });
    });

    // TAKE PICTURE
    describe("Testing /osc/commands/execute camera.takePicture endpoint", function() {
        var sessionId;

        before( function(done) {
            testClient.startSession()
            .then( Comparison.catchExceptions(done, function(res) {
                sessionId = res.body.results.sessionId;
                Comparison.oscSessionOpOutput(res, {'sessionId': sessionId});
                return Utility.restoreDefaultOptions(defaultOptionsFile);
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                done();
            }));
        });

        afterEach( function(done) {
            Utility.restoreDefaultOptions(defaultOptionsFile)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                done();
            }));
        });

        after( function(done) {
            testClient.closeSession(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscCloseSessionOutput(res);
                done();
            }));
        });

        it("Expect success.  camera.takePicture successfully takes a picture", function(done) {
            this.timeout(timeoutValue);
            testClient.takePicture(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscTakePictureOutput(res);
                done();
            }));
        });

        it("Expect success. camera.takePicture successfully takes an HDR picture", function(done) {
            this.timeout(timeoutValue * 2);
            testClient.setOptions(sessionId, {'hdr': true})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                return testClient.takePicture(sessionId);
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscTakeHdrPictureOutput(res);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. camera.takePicture cannot take picture when incorrect sessionId type is provided", function(done) {
            testClient.takePicture('wrongtype')
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });

        it("Expect missingParameter Error. camera.takePicture cannot take picture when sessionId is not provided", function(done) {
            testClient.takePicture()
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.missingParameterError(res);
                done();
            }));
        });
    });

    // LIST IMAGES
    describe("Testing /osc/commands/execute camera.listImage endpoint", function() {
        var sessionId;

        before( function(done) {
            testClient.startSession()
            .then( Comparison.catchExceptions(done, function(res) {
                sessionId = res.body.results.sessionId;
                Comparison.oscSessionOpOutput(res, {'sessionId': sessionId});
                done();
            }));
        });

        beforeEach( function(done) {
            this.timeout(timeoutValue);
            Utility.deleteAllImages()
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.deleteAllImagesOutput(res);
                done();
            }));
        });

        after( function(done) {
            testClient.closeSession(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscCloseSessionOutput(res);
                done();
            }));
        });

        it("Expect success. camera.listImages returns one entry when provided with entryCount = 1 when server has 1 image", function(done) {
            this.timeout(timeoutValue);
            testClient.takePicture(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscTakePictureOutput(res);
                return testClient.listImages(1, true, 100);
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscListImagesOutput(res, false, true, {entries: [{'one': 'one'}], totalEntries: 1});
                done();
            }));
        });

        it("Expect success. camera.listImages returns one entry wihtout thumbnail when provided with entryCount = 1 and includeThumb = false when server has 1 image", function(done) {
            this.timeout(timeoutValue);
            testClient.takePicture(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscTakePictureOutput(res);
                return testClient.listImages(1, false); 
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscListImagesOutput(res, false, false, {entries: [{'one': 'one'}], totalEntries: 1});
                done();
            }));
        });

        it("Expect success. camera.listImages returns one entry and a continuation token when provided with entryCount = 1 when server has 2 images", function(done) {
            this.timeout(timeoutValue);
            testClient.takePicture(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscTakePictureOutput(res);
                return testClient.takePicture(sessionId);
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscTakePictureOutput(res);
                return testClient.listImages(1, false); 
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscListImagesOutput(res, true, false, {entries: [{'one': 'one'}], totalEntries: 2});
                done();
            }));
        });

        it("Expect success. camera.listImages returns one entry when provided with a continuation token and  entryCount = 1 when server has 2 images", function(done) {
            this.timeout(timeoutValue);
            testClient.takePicture(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscTakePictureOutput(res);
                return testClient.takePicture(sessionId);
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscTakePictureOutput(res);
                return testClient.listImages(1, false); 
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscListImagesOutput(res, true, false, {entries: [{'one': 'one'}], totalEntries: 2});
                return testClient.listImages(1, false, undefined, res.body.results.continuationToken);
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscListImagesOutput(res, false, false, {entries: [{'one': 'one'}], totalEntries: 2});
                done();
            }));
        });

        it("Expect success. camera.listImages returns two entries and and no continuation token when provided with entryCount = 2 when server has 2 images", function(done) {
            this.timeout(timeoutValue);
            testClient.takePicture(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscTakePictureOutput(res);
                return testClient.takePicture(sessionId);
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscTakePictureOutput(res);
                return testClient.listImages(2, false); 
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscListImagesOutput(res, true, false, {entries: [{'one': 'one'}, {'two': 'two'}], totalEntries: 2});
                done();
            }));
        });

        it("Expect success. camera.listImages lists zero images when no images are in the system", function(done) {
            testClient.listImages(2, false)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscListImagesOutput(res, false, false, {totalEntries: 0});
                done();
            }));
        });

        it("Expect missingParameter Error. camera.listImages cannot list images when entryCount is not provided", function(done) {
            testClient.listImages()
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.missingParameterError(res);
                done();
            }));
        });

        it("Expect missingParameter Error. camera.listImages cannot list images when maxSize is not provided", function(done) {
            testClient.listImages(1, true)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.missingParameterError(res);
                done();
            }));
        });

        it("Expect missingParameter Error. camera.listImages cannot list images when maxSize is not provided and includeThumb defaults to true", function(done) {
            testClient.listImages(1, undefined)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.missingParameterError(res);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. camera.listImages cannot list images when false token is given", function(done) {
            testClient.listImages('wrongtype')
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });
    });

    // DELETE
    describe("Testing /osc/commands/execute camera.delete endpoint", function() {
        var sessionId;
        var fileUri;

        before( function(done) {
            testClient.startSession()
            .then( Comparison.catchExceptions(done, function(res) {
                sessionId = res.body.results.sessionId;
                Comparison.oscSessionOpOutput(res, {'sessionId': sessionId});
                done();
            }));
        });

        after( function(done) {
            testClient.closeSession(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscCloseSessionOutput(res);
                done();
            }));
        });

        it("Expect success. camera.delete successfully deletes file when provided with a valid fileUri", function(done) {
            this.timeout(timeoutValue);
            testClient.takePicture(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscTakePictureOutput(res);
                fileUri = res.body.results.fileUri;
                return testClient.delete(fileUri);
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscDeleteOutput(res);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. camera.delete cannot delete file when incorrect fileUri type is provided", function(done) {
            testClient.delete('wrongtype')
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });

        it("Expect missingParameter Error. camera.delete cannot delete file when fileUri is not provided", function(done) {
            testClient.delete()
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.missingParameterError(res);
                done();
            }));
        });
    });

    // GET IMAGE
    describe("Testing /osc/commands/execute camera.getImage endpoint", function() {
        var sessionId;
        var fileUri;

        before( function(done) {
            testClient.startSession()
            .then( Comparison.catchExceptions(done, function(res) {
                sessionId = res.body.results.sessionId;
                Comparison.oscSessionOpOutput(res, {'sessionId': sessionId});
                done();
            }));
        });

        after( function(done) {
            testClient.closeSession(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscCloseSessionOutput(res);
                done();
            }));
        });

        it("Expect success. camera.getImage successfully gets image when provided with a valid fileUri", function(done) {
            this.timeout(timeoutValue);
            testClient.takePicture(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscTakePictureOutput(res);
                fileUri = res.body.results.fileUri;
                return testClient.getImage(fileUri);
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscGetImageOutput(res);
                done();
            }));
        });

        it("Expect success. camera.getImage successfully gets image when provided with a valid fileUri and maxSize", function(done) {
            this.timeout(timeoutValue);
            testClient.takePicture(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscTakePictureOutput(res);
                fileUri = res.body.results.fileUri; 
                return testClient.getImage(fileUri, 100);
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscGetImageOutput(res);
                done();
            }));
        });

        it("Expect missingParameter Error. camera.getImage cannot get image when fileUri is not provided", function(done) {
            testClient.getImage()
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.missingParameterError(res);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. camera.getImage cannot get image when fileUri is incorrect", function(done) {
            testClient.getImage('wrongtype')
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });
    });

    // GET METADATA
    describe("Testing /osc/commands/execute camera.getMetadata endpoint", function() {
        var sessionId;
        var fileUri;

        before( function(done) {
            this.timeout(timeoutValue);
            testClient.startSession()
            .then( Comparison.catchExceptions(done, function(res) {
                sessionId = res.body.results.sessionId;
                Comparison.oscSessionOpOutput(res, {'sessionId': sessionId});
                return testClient.takePicture(sessionId);
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                fileUri = res.body.results.fileUri;
                Comparison.oscTakePictureOutput(res);
                done();
             }));
        });

        after( function(done) {
            testClient.closeSession(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscCloseSessionOutput(res);
                done();
            }));
        });

        it("Expect success. camera.getMetadata successfully gets metadata when provided with a valid fileUri", function(done) {
            testClient.getMetadata(fileUri)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscGetMetadataOutput(res);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. camera.getMetadata cannot get metadata when fileUri does not exist", function(done) {
            testClient.getMetadata('wrongtype')
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });

        it("Expect missingParameter Error. camera.getMetadata cannot get metadata when fileUri is not provided", function(done) {
            testClient.getMetadata()
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.missingParameterError(res);
                done();
            }));
        });
    });

    // GET OPTIONS
    describe("Testing /osc/commands/execute camera.getOptions endpoint", function() {
        var sessionId;
        var specifiedOptions = ['captureMode', 'exposureProgram', 'iso', 'shutterSpeed', 'aperture',
                                'whiteBalance', 'exposureCompensation', 'fileFormat', 'exposureDelay',
                                'sleepDelay', 'offDelay', 'hdr', 'exposureBracket', 'gyro', 'gps',
                                'imageStabilization', '_bublVideoFileFormat'];

        before( function(done) {
            testClient.startSession()
            .then( Comparison.catchExceptions(done, function(res) {
                sessionId = res.body.results.sessionId;
                Comparison.oscSessionOpOutput(res, {'sessionId': sessionId});
                done();
            }));
        });

        after( function(done) {
            testClient.closeSession(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscCloseSessionOutput(res);
                done();
            }));
        });

        it("Expect success. camera.getOptions gets correct options when gettable options are set to supported values", function(done) {
            testClient.getOptions(sessionId, specifiedOptions)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscGetOptionsOutput(specifiedOptions, res);
                done();
            }));
        });

        it("Expect missingParameter Error. camera.getOptions cannot get options when options is not provided", function(done) {
            testClient.getOptions(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.missingParameterError(res);
                done();
            }));
        });

        it("Expect missingParameter Error. camera.getOptions cannot get options when sessionId is not provided", function(done) {
            testClient.getOptions(undefined, specifiedOptions)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.missingParameterError(res);
                done();
            }));
        });

        // RE-ADD ONCE EXTRA FIELD CHECKING HAS BEEN IMPLEMENTED
        it.skip("Expect invalidParameterValue Error. camera.getOptions cannot get options when options is set to unsupported value", function(done) {
            testClient.getOptions(sessionId, ['wrongtype'])
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });
    });

    // SET OPTIONS
    describe("Testing /osc/commands/execute camera.setOptions endpoint", function() {
        var sessionId;

        before( function(done) {
            testClient.startSession()
            .then( Comparison.catchExceptions(done, function(res) {
                sessionId = res.body.results.sessionId;
                Comparison.oscSessionOpOutput(res, {'sessionId': sessionId});
                done();
            }));
        });

        after( function(done) {
            Utility.restoreDefaultOptions(defaultOptionsFile)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                return testClient.closeSession(sessionId);
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscCloseSessionOutput(res);
                done();
            }));
        });

        it("Expect success. camera.setOptions successfully sets options when sleepDelay option is set to supported value", function(done) {
            testClient.setOptions(sessionId, {'sleepDelay': 5})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. camera.setOptions cannot set options when sleepDelay option is set to unsupported value", function(done) {
            testClient.setOptions(sessionId, {'sleepDelay': -1})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });

        it("Expect success. camera.setOptions successfully sets options when offDelay option is set to supported value", function(done) {
            testClient.setOptions(sessionId, {'offDelay': 5})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. camera.setOptions cannot set options when offDelay option is set to unsupported value", function(done) {
            testClient.setOptions(sessionId, {'offDelay': -1})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });

        it("Expect success. camera.setOptions successfully sets options when imageStabilization option is set to supported value", function(done) {
            testClient.setOptions(sessionId, {'imageStabilization': 'off'})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. camera.setOptions cannot set options when imageStabilization option is set to unsupported value", function(done) {
            testClient.setOptions(sessionId, {'imageStabilization': 'UNSUPPORTED'})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });

        it("Expect success. camera.setOptions successfully sets options when hdr option is set to supported value", function(done) {
            testClient.setOptions(sessionId, {'hdr': true})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. camera.setOptions cannot set options when hdr option is set to unsupported value", function(done) {
            testClient.setOptions(sessionId, {'hdr': 'UNSUPPORTED'})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });

        it("Expect success. camera.setOptions successfully sets options when captureMode option is set to supported value _bublVideo", function(done) {
            testClient.setOptions(sessionId, {'captureMode': '_bublVideo'})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                done();
            }));
        });

        it("Expect success. camera.setOptions successfully sets options when captureMode option is set to supported value Image", function(done) {
            testClient.setOptions(sessionId, {'captureMode': 'image'})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. camera.setOptions cannot set options when captureMode option is set to unsupported value", function(done) {
            testClient.setOptions(sessionId, {'captureMode': 'UNSUPPORTED'})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });

        it("Expect success. camera.setOptions successfully sets options when exposureProgram option is set to supported value", function(done) {
            testClient.setOptions(sessionId, {'exposureProgram': 2})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. camera.setOptions cannot set options when exposureProgram option is set to unsupported value", function(done) {
            testClient.setOptions(sessionId, {'exposureProgram': -1})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });

        it("Expect success. camera.setOptions successfully sets options when whiteBalance option is set to supported value", function(done) {
            testClient.setOptions(sessionId, {'whiteBalance': 'auto'})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. camera.setOptions cannot set options when whiteBalance option is set to unsupported value", function(done) {
            testClient.setOptions(sessionId, {'whiteBalance': 'UNSUPPORTED'})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });

        it("Expect success. camera.setOptions successfully sets options when fileFormat option is set to supported value raw for image", function(done) {
            testClient.setOptions(sessionId, {'fileFormat': {'type':'raw', 'width': 3840, 'height': 3840}})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                done();
            }));
        });

        it("Expect success. camera.setOptions successfully sets options when fileFormat option is set to supported value jpeg for image", function(done) {
            testClient.setOptions(sessionId, {'fileFormat': {'type':'jpeg', 'width': 3840, 'height': 3840}})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. camera.setOptions cannot set options when fileFormat option is set to unsupported value", function(done) {
            testClient.setOptions(sessionId, {'fileFormat': 'UNSUPPORTED'})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });

        it("Expect success. camera.setOptions successfully sets options when _bublVideoFileFormat option is set to supported value 1920x1920", function(done) {
            testClient.setOptions(sessionId, {'_bublVideoFileFormat': {'type':'mp4', 'width': 1920, 'height': 1920}})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                done();
            }));
        });

        it("Expect success. camera.setOptions successfully sets options when _bublVideoFileFormat option is set to supported value 1920x1920", function(done) {
            testClient.setOptions(sessionId, {'_bublVideoFileFormat': {'type':'mp4', 'width': 1920, 'height': 1920}})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. camera.setOptions cannot set options when _bublVideoFileFormat option is set to unsupported value", function(done) {
            testClient.setOptions(sessionId, {'_bublVideoFileFormat': 'UNSUPPORTED'})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });

        it("Expect success. camera.setOptions successfully sets options when exposureDelay option is set to supported value", function(done) {
            testClient.setOptions(sessionId, {'exposureDelay': 4})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. camera.setOptions cannot set options when exposureDelay option is set to unsupported value", function(done) {
            testClient.setOptions(sessionId, {'exposureDelay': -1})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });

        it("Expect success. camera.setOptions successfully sets options when dateTimeZone option is set to supported value", function(done) {
            testClient.setOptions(sessionId, {'dateTimeZone': '2015:07:23 14:27:39-04:00'})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                done();
            }));
        });

        it("Expect success. camera.setOptions successfully sets options when dateTimeZone option is set to supported value and bubl timezone", function(done) {
            testClient.setOptions(sessionId, {'dateTimeZone': '2015:07:23 14:27:39-04:00|America/Toronto'})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                done();
            }));
        });

        it("Expect success. camera.setOptions successfully sets options when wifiPassword option is set to supported value", function(done) {
            testClient.setOptions(sessionId, {'wifiPassword': '12345678'})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. camera.setOptions cannot set options when wifiPassword option is set to unsupported value", function(done) {
            testClient.setOptions(sessionId, {'wifiPassword': '1234'})
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });

        it("Expect missingParameter Error. camera.setOptions cannot set options when options is not provided", function(done) {
            testClient.setOptions(sessionId, undefined)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.missingParameterError(res);
                done();
            }));
        });
    });

    // OSC COMMAND STATUS
    describe("Testing /osc/commands/status endpoint", function() {
        var sessionId;

        before( function(done) {
            testClient.startSession()
            .then( Comparison.catchExceptions(done, function(res) {
                sessionId = res.body.results.sessionId;
                Comparison.oscSessionOpOutput(res, {'sessionId': sessionId});
                done();
            }));
        });

        after( function(done) {
            testClient.closeSession(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscCloseSessionOutput(res);
                done();
            }));
        });

        it("Expect success. /osc/commands/status successfully grabs command status after take picture has been called", function(done) {
            this.timeout(timeoutValue);
            testClient.takePicture(sessionId, Comparison.catchExceptions(done, function(res) {
                 Comparison.oscCommandsStatusOutput(res, {'name': 'camera.takePicture', 'id': res.body.id});
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscTakePictureOutput(res);
                done();
            }));
        });

        it("Expect missingParameter Error. /osc/commands/status endpoint cannot get status when command ID is not provided", function(done) {
            testClient.commandsStatus()
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.missingParameterError(res);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. /osc/commands/status endpoint cannot get status when incorrect sessionId is provided", function(done) {
            testClient.commandsStatus('wrongtype')
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });
    });

    // BUBL POLL
    describe("Testing /osc/commands/_bublPoll endpoint", function() {
        var sessionId;

        before( function(done) {
            testClient.startSession()
            .then( Comparison.catchExceptions(done, function(res) {
                sessionId = res.body.results.sessionId;
                Comparison.oscSessionOpOutput(res, {'sessionId': sessionId});
                done();
            }));
        });

        after( function(done) {
            testClient.closeSession(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscCloseSessionOutput(res);
                done();
            }));
        });

        it("Expect success. /osc/commands/_bublPoll returns immediately if no waitTimeout argument is provided", function(done) {
            this.timeout(timeoutValue);
            var fingerprint = '';
            testClient.takePicture(sessionId, function(res) {
                var commandId = res.body.id;
                testClient.bublPoll(res.body.id, fingerprint)
                .then( Comparison.catchExceptions(done, function(res) {
                    Comparison.bublPollOutput(res, true, {'id': commandId, 'fingerprint': fingerprint});
                }));
            })
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscTakePictureOutput(res);
                done();
            }));
        });

        it("Expect success. /osc/commands/_bublPoll returns once command state has changed", function(done) {
            this.timeout(timeoutValue);
            var fingerprint = '';
            var commandId = '';
            testClient.bublCaptureVideo(sessionId, function(res) {
                if (commandId === '') {
                    commandId = res.body.id;
                    Q.delay(8000)
                    .then( function() {
                        return testClient.bublPoll(commandId, fingerprint);
                    })
                    .then( Comparison.catchExceptions(done, function(res) {
                        Comparison.bublPollOutput(res, true, {'id': commandId, 'fingerprint': fingerprint});
                        fingerprint = res.body.fingerprint;
                        return testClient.bublStop(commandId);
                    }))
                    .then( Comparison.catchExceptions(done, function(res) {
                        Comparison.bublStopOutput(res);
                        return testClient.bublPoll(commandId, fingerprint, 4);
                    }))
                    .then( Comparison.catchExceptions(done, function(res) {
                        Comparison.bublPollOutput(res, true, {'id': commandId, 'fingerprint': fingerprint});
                    }));
                }
            })
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.bublCaptureVideoOutput(res);
                done();
            }));
        });

        it("Expect success. /osc/commands/_bublPoll endpoint successfully gets updates when state has not changed with waitTimeout set to 5", function(done) {
            this.timeout(timeoutValue);
            var fingerprint = '';
            var commandId = '';
            testClient.bublCaptureVideo(sessionId, function(res) {
                if (commandId === '') {
                    commandId = res.body.id;
                    Q.delay(8000)
                    .then( function() {
                        return testClient.bublPoll(commandId, fingerprint);
                    })
                    .then( Comparison.catchExceptions(done, function(res) {
                        Comparison.bublPollOutput(res, true, {'id': commandId, 'fingerprint': fingerprint});
                        fingerprint = res.body.fingerprint;
                        return Q.delay(4000);
                    }))
                    .then( function() {
                        return testClient.bublPoll(commandId, fingerprint, 4);
                    })
                    .then( Comparison.catchExceptions(done, function(res) {
                        Comparison.bublPollOutput(res, false, {'id': commandId, 'fingerprint': fingerprint});
                        return testClient.bublStop(commandId);
                    }))
                    .then( Comparison.catchExceptions(done, function(res) {
                        Comparison.bublStopOutput(res);
                    }));
                }
            })
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.bublCaptureVideoOutput(res);
                done();
            }));
        });           

        it("Expect missingParameter Error. /osc/commands/_bublPoll cannot get updates when no commandId is provided", function(done) {
            testClient.bublPoll(undefined, '')
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.missingParameterError(res);
                done();
            }));
        });

        it("Expect missingParameter Error. /osc/commands/_bublPoll cannot get updates when no fingerprint is provided", function(done) {
            this.timeout(timeoutValue);
            var stopped = false;
            testClient.takePicture(sessionId, function(res) {
                if (!stopped) {
                    testClient.bublPoll(res.body.id)
                    .then( Comparison.catchExceptions(done, function(res) {
                        Comparison.missingParameterError(res);
                    }));
                }
                stopped = true;
            })
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscTakePictureOutput(res);
                Comparison.assertTrue(stopped);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. /osc/commands/_bublPoll cannot get updates when commandId is invalid", function(done) {
            this.timeout(timeoutValue);
            testClient.bublPoll('wrongtype', '')
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. /osc/commands/_bublPoll cannot get updates when waitTimeout is invalid", function(done) {
            this.timeout(timeoutValue);
            testClient.takePicture(sessionId, function(res) {
                testClient.bublPoll(res.body.id, '', 'wrongtype')
                .then( Comparison.catchExceptions(done, function(res) {
                    Comparison.invalidParameterValueError(res);
                }));
            })
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscTakePictureOutput(res);
                done();
            }));
        });
    });

    // BUBL TIMELAPSE
    describe('Testing /osc/commands/execute camera._bublTimelapse command', function() {
        var sessionId;

        before( function(done) {
            this.timeout(timeoutValue);
            testClient.startSession()
            .then( function(res) {
                sessionId = res.body.results.sessionId;
                done();
            });
        });

        beforeEach( function(done) {
            this.timeout(timeoutValue);
            Utility.restoreDefaultOptions(defaultOptionsFile)
            .then(function() {
                Utility.deleteAllImages()
                .then(function() {
                    done();
                })
            });
        });

        after( function(done) {
            testClient.closeSession(sessionId)
            .then( function() {
                done();
            });
        });

        it('Expect missingParameter Error. sessionId is mandatory for command camera._bublTimelapse', function(done) {
            testClient.bublTimelapse()
            .then( function(res) {
                var err = Comparison.missingParameterError(res);
                done(err);
            });
        });

        it('Expect invalidParameterValue Error. camera._bublTimelapse expects active session\'s sessionId', function(done) {
            testClient.bublTimelapse(sessionId + '0')
            .then( function(res) {
                var err = Comparison.invalidParameterValueError(res);
                done(err);
            });
        });

        it('Expect cameraInExclusiveUse Error. camera._bublTimelapse cannot be run when another timelapse capture procedure is already active', function(done) {
            this.timeout(timeoutValue * 2);
            var firstTimelapseDone = false;
            var startTime = Date.now();
            var timeSendAnother = 1000;
            var stopTime = 5000;
            var stopSent = false;
            var stopErr;
            //instantiate the first camera._bublTimelapse command
            testClient.bublTimelapse(sessionId, function(res) {
                if(Date.now() - startTime >= stopTime && !stopSent) {
                    stopSent = true;
                    testClient.bublStop(res.body.id)
                    .then(function(res) {
                        stopErr = Comparison.bublStopOutput(res);
                    });
                }
            })
            .then( function(res) {
                firstTimelapseDone = true;
            });
            try {
                require('assert')(!firstTimelapseDone, 'first _bublTimelapse should not return at this point');
            } catch(e) {
                done(e);
                return;
            }
            //instantiate the second camera._bublTimelapse command
            setTimeout(function() {
                testClient.bublTimelapse(sessionId, function(res) {})
                .then( function(res) {
                    var err = Comparison.cameraInExclusiveUseError(res);
                    //make sure first timelapse finished before entering next test
                    var checkTimelapseDone;
                    checkTimelapseDone = setInterval(function() {
                        if(firstTimelapseDone) {
                            if(stopErr) {
                                done(stopErr);
                            } else {
                                done(err);
                            }
                            clearInterval(checkTimelapseDone);
                        }
                    }, 300);
                });
            }, timeSendAnother);
        });

        it('Expect cameraInExclusiveUse Error. camera._bublTimelapse cannot be run when a video capture procedure is already active', function(done) {
            this.timeout(timeoutValue);
            var captureVideoDone = false;
            var startTime = Date.now();
            var timeSendAnother = 1000;
            var stopTime = 5000;
            var stopSent = false;
            var stopErr;
            //instantiate the first camera._bublTimelapse command
            testClient.bublCaptureVideo(sessionId, function(res) {
                if(Date.now() - startTime >= stopTime && !stopSent) {
                    stopSent = true;
                    testClient.bublStop(res.body.id)
                    .then(function(res) {
                        stopErr = Comparison.bublStopOutput(res);
                    });
                }
            })
            .then( function(res) {
                captureVideoDone = true;
            });
            try {
                require('assert')(!captureVideoDone, 'first _bublCaptureVideo should not return at this point');
            } catch(e) {
                done(e);
                return;
            }
            //instantiate the camera._bublTimelapse command
            setTimeout(function() {
                testClient.bublTimelapse(sessionId, function(res) {})
                .then( function(res) {
                    var err = Comparison.cameraInExclusiveUseError(res);
                    //make sure first timelapse finished before entering next test
                    var checkTimelapseDone;
                    checkTimelapseDone = setInterval(function() {
                        if(captureVideoDone) {
                            if(stopErr) {
                                done(stopErr);
                            } else {
                                done(err);
                            }
                            clearInterval(checkTimelapseDone);
                        }
                    }, 300);
                });
            }, timeSendAnother);
        });

        it('Expect success. camera._bublTimelapse successfully captures with default settings', function(done) {
            this.timeout(timeoutValue * 4);
            var timelapseCompleted = false;
            var bublStopTimer = 5500;
            var bublStopErr;
            var bublTimelapseErr;
            var commandId;
            //POST to _bublStop at 5000ms
            setTimeout(function() {
                if(typeof commandId === undefined) {
                    bublStopErr = new Error('commandId not retrieved within 5 seconds');
                    return;
                }
                testClient.bublStop(commandId)
                .then(function(res) {
                    bublStopErr = Comparison.bublStopOutput(res);
                });
            }, bublStopTimer);
            //Run camera._bublTimelapse
            testClient.bublTimelapse(sessionId, function(res) {
                commandId = res.body.id;
            })
            .then( function(res) {
                bublTimelapseErr = Comparison.bublTimelapseOutput(res);
                timelapseCompleted = true;
            });
            //Wait for camera._bublTimelapse to complete before exiting the test
            var waitForCompletion = setInterval(function() {
                if(!timelapseCompleted) {
                    return;
                }
                if(bublStopErr) {
                    done(bublStopErr);
                } else {
                    done(bublTimelapseErr);
                }
                clearInterval(waitForCompletion);
            }, 300);
        });

        it('Expect success. camera._bublTimelapse captures with specific timelapse interval and count, then finishes within the max tolerable completion time', function(done) {
            this.timeout(120000);
            var timelapseInterval = 10;
            var timelapseCount = 3;
            var assumedMaxOverhead = 15000;
            var maxAcceptableTime = (timelapseInterval * timelapseCount * 1000) + assumedMaxOverhead;
            testClient.setOptions(
                sessionId,
                {
                    "_bublTimelapse": {
                        "interval": timelapseInterval,
                        "count": timelapseCount
                    }
                }
            )
            .then(function(res) {
                return testClient.bublTimelapse(sessionId);
            })
            .then(function(res) {
                //Under consistent latency, we can assume the following:
                //  (1) timelapseRunTime ≈ finalResponseTime - initialResponseTime
                //  (2) timeElapsed <= timelapseRunTime + pollingPeriod
                var timeElapsed = res.timeElapsed;
                var err = Comparison.bublTimelapseOutput(
                    res,
                    {
                        results: {
                            fileUri: 'bublfile://dcim/100bublc/t0000001.jpg',
                            _bublFileUris: ['','','']
                        }
                    }
                );
                var timeErr = (timeElapsed > maxAcceptableTime)?new Error('operation took too long. timeElapsed : ' + timeElapsed + ' > maxAcceptableTime : ' + maxAcceptableTime):undefined;
                if(err) {
                    done(err);
                } else {
                    done(timeErr);
                }
            });
        });
    });

    // BUBL CAPTURE VIDEO
    describe("Testing /osc/commands/execute camera._bublCaptureVideo endpoint", function() {
        var sessionId;

        before( function(done) {
            testClient.startSession()
            .then( Comparison.catchExceptions(done, function(res) {
                sessionId = res.body.results.sessionId;
                Comparison.oscSessionOpOutput(res, {'sessionId': sessionId});
                return Utility.restoreDefaultOptions(defaultOptionsFile);
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                done();
            }));
        });

        afterEach( function(done) {
            this.timeout(timeoutValue);
            Utility.restoreDefaultOptions(defaultOptionsFile)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                done();
            }));
        });

        after( function(done) {
            testClient.closeSession(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscCloseSessionOutput(res);
                done();
            }));
        });

        it("Expect success.  camera._bublCaptureVideo successfully captures a video", function(done) {
            this.timeout(timeoutValue);
            var stopped = false;
            testClient.bublCaptureVideo(sessionId, function(res) {
                if (!stopped) {
                    Q.delay(2000)
                    .then( function() {
                        return testClient.bublStop(res.body.id);
                    })
                    .then( Comparison.catchExceptions(done, function(res) {
                        Comparison.bublStopOutput(res);
                    }));
                    stopped = true;
                }
            })
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.bublCaptureVideoOutput(res);
                Comparison.assertTrue(stopped);
                done();
            }));
        });

        it("Expect cameraInExclusiveUse Error. camera._bublCaptureVideo cannot start video capture when a video capture is already active", function(done) {
            this.timeout(timeoutValue);
            var stopped = false;
            testClient.bublCaptureVideo(sessionId, function(res) {
                var commandId = res.body.id;
                if (!stopped) {
                    testClient.bublCaptureVideo(sessionId)
                    .then( Comparison.catchExceptions(done, function(res) {
                        Comparison.cameraInExclusiveUseError(res);
                        return testClient.bublStop(commandId);
                    }))
                    .then( Comparison.catchExceptions(done, function(res){
                        Comparison.bublStopOutput(res);
                    }));
                }
                stopped = true;
            })
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.bublCaptureVideoOutput(res);
                Comparison.assertTrue(stopped);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. camera._bublCaptureVideo cannot capture video when incorrect sessionId type is provided", function(done) {
            testClient.bublCaptureVideo('wrongtype')
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });

        it("Expect missingParameter Error. camera._bublCaptureVideo cannot capture video when sessionId is not provided", function(done) {
            testClient.bublCaptureVideo()
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.missingParameterError(res);
                done();
            }));
        });
    });

    // BUBL STOP
    describe("Testing /osc/commands/_bublStop endpoint", function() {
        var sessionId;

        before( function(done) {
            testClient.startSession()
            .then( Comparison.catchExceptions(done, function(res) {
                sessionId = res.body.results.sessionId;
                Comparison.oscSessionOpOutput(res, {'sessionId': sessionId});
                return Utility.restoreDefaultOptions(defaultOptionsFile);
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                done();
            }));
        });

        afterEach( function(done) {
            this.timeout(timeoutValue);
            Utility.restoreDefaultOptions(defaultOptionsFile)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                done();
            }));
        });

        after( function(done) {
            testClient.closeSession(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscCloseSessionOutput(res);
                done();
            }));
        });

        it("Expect success.  camera._bublStop successfully stops a video capture", function(done) {
            this.timeout(timeoutValue);
            var stopped = false;
            var commandId;
            testClient.bublStream(sessionId, function(res) {
                if (!stopped) {
                    commandId = res.body.id;
                    Q.delay(1000)
                    .then( function() {
                        return testClient.bublStop(commandId);
                    }) 
                    .then(Comparison.catchExceptions(done, function(res) {
                        Comparison.bublStopOutput(res);
                    }));
                    stopped = true;
                }
            })
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.bublStreamOutput(res, {'id': commandId});
                Comparison.assertTrue(stopped);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. camera._bublStop cannot stop video capture when no video capture is currently active", function(done) {
            this.timeout(timeoutValue);
            var stopped = false;
            var commandId;
            testClient.bublStream(sessionId, function(res) {
                if (!stopped) {
                    commandId = res.body.id;
                    testClient.bublStop(res.body.id)
                    .then( Comparison.catchExceptions(done, function(res) {
                        Comparison.bublStopOutput(res);
                        return testClient.bublStop(res);
                    }))
                    .then(Comparison.catchExceptions(done, function(res) {
                        Comparison.invalidParameterValueError(res);
                    }));
                    stopped = true;
                }
            })
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.bublStreamOutput(res, {'id': commandId});
                Comparison.assertTrue(stopped);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. camera._bublStop cannot stop video capture when incorrect sessionId type is provided", function(done) {
            testClient.bublStop('wrongtype')
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });

        it("Expect missingParameter Error. camera._bublStop cannot stop video capture when sessionId is not provided", function(done) {
            testClient.bublStop()
            .then( function(res) {
                Comparison.missingParameterError(res);
                done();
            });
        });
    });

    // BUBL STREAM
    describe("Testing /osc/commands/execute camera._bublStream endpoint", function() {
        var sessionId;
        var commandId;

        before( function(done) {
            testClient.startSession()
            .then( Comparison.catchExceptions(done, function(res) {
                sessionId = res.body.results.sessionId;
                Comparison.oscSessionOpOutput(res, {'sessionId': sessionId});
                return Utility.restoreDefaultOptions(defaultOptionsFile);
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                done();
            }));
        });

        afterEach( function(done) {
            this.timeout(timeoutValue);
            Utility.restoreDefaultOptions(defaultOptionsFile)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                done();
            }));
        });

        after( function(done) {
            testClient.closeSession(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscCloseSessionOutput(res);
                done();
            }));
        });

        it("Expect success.  camera._bublStream successfully streams", function(done) {
            this.timeout(timeoutValue);
            var stopped = false;
            testClient.bublStream(sessionId, function(res) {
                commandId = res.body.id;
                if (!stopped) {
                    Q.delay(5000)
                    .then( function() {
                        return testClient.bublStop(res.body.id);
                    })
                    .then( Comparison.catchExceptions(done, function(res) {
                        Comparison.bublStopOutput(res);
                    }));
                    stopped = true;
                }
            })
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.bublStreamOutput(res, {'id': commandId});
                done();
            }));
        });

        it("Expect success. camera._bublStream can start another stream when a stream is already active", function(done) {
            this.timeout(timeoutValue);
            var count = 0;
            var stopped1 = false;
            var stopped2 = false;
            var commandId1;
            var commandId2;
            testClient.bublStream(sessionId, function(res) {
                commandId1 = res.body.id;
                if (!stopped1) {
                    testClient.bublStream(sessionId, function(res) {
                        if (!stopped2) {
                            commandId2 = res.body.id;
                            testClient.bublStop(commandId2)
                            .then( Comparison.catchExceptions(done, function(res) {
                                Comparison.bublStopOutput(res);
                            }));
                            stopped2 = true;
                        }
                    })
                    .then( Comparison.catchExceptions(done, function(res) {
                        Comparison.bublStreamOutput(res, {'id': commandId2});
                        count++;
                        if (count === 2) {
                            Comparison.assertTrue(stopped1);
                            Comparison.assertTrue(stopped2);
                            done();
                        }
                    }));
                    stopped1 = true;
                }
            })
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.bublStreamOutput(res, {'id': commandId1});
                count++;
                if (count === 2) {
                    Comparison.assertTrue(stopped1);
                    Comparison.assertTrue(stopped2);
                    done();
                }
            }));
        });

        it("Expect invalidParameterValue Error. camera._bublStream cannot stream when incorrect sessionId type is provided", function(done) {
            testClient.bublStream('wrongtype')
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });

        it("Expect missingParameter Error. camera._bublStream cannot stream when sessionId is not provided", function(done) {
            testClient.bublStream()
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.missingParameterError(res);
                done();
            }));
        });

    });

    // BUBL GET IMAGE
    describe("Testing /osc/commands/_bublGetImage endpoint", function() {
        var sessionId;
        var fileUri;

        before( function(done) {
            testClient.startSession()
            .then( Comparison.catchExceptions(done, function(res) {
                sessionId = res.body.results.sessionId;
                Comparison.oscSessionOpOutput(res, {'sessionId': sessionId});
                done();
            }));
        });

        after( function(done) {
            testClient.closeSession(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscCloseSessionOutput(res);
                done();
            }));
        });

        it("Expect success. camera._bublGetImage successfully gets image when provided with a valid fileUri", function(done) {
            this.timeout(timeoutValue);
            testClient.takePicture(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscTakePictureOutput(res);
                fileUri = res.body.results.fileUri;
                return testClient.bublGetImage(fileUri);
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscGetImageOutput(res);
                done();
            }));
        });

        it("Expect invalidParameterValue Error. camera._bublGetImage cannot get image when fileUri is incorrect", function(done) {
            testClient.bublGetImage('wrongtype')
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });
    });

    // BUBL UPDATE
    describe('Testing /osc/_bublUpdate endpoint', function() {
        it('Expect success. /osc/_bublUpdate endpoint successfully returned status code 200', function(done) {
            this.timeout(timeoutValue);
            testClient.bublUpdate('dummy_content')
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.bublUpdateOutput(res);
                done();
            }));
        });
    });

    // BUBL SHUTDOWN
    describe('Testing /osc/commands/execute camera._bublShutdown', function() {
        var sessionId;

        beforeEach( function(done) {
            testClient.startSession()
            .then( Comparison.catchExceptions(done, function(res) {
                sessionId = res.body.results.sessionId;
                Comparison.oscSessionOpOutput(res, {'sessionId': sessionId});
                return Utility.restoreDefaultOptions(defaultOptionsFile);
            }))
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.oscSetOptionsOutput(res);
                done();
            }));
       });

       afterEach( function(done) {
            Utility.checkActiveSession()
            .then( function() {
                testClient.closeSession(sessionId)
                .then( Comparison.catchExceptions(done, function(res) {
                    Comparison.oscCloseSessionOutput(res);
                    done();
                }));
            }, function() {
                done();
            });
       });

        it('Expect missingParameter Error. camera._bublShutdown won\'t run unless the active session\'s sessionId is provided', function(done) {
            this.timeout(timeoutValue);
            testClient.bublShutdown()
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.missingParameterError(res);
                done();
            }));
        });

        it('Expect invalidParameterValue Error. camera._bublShutdown cannot shutdown camera when incorrect sessionId is provided', function(done) {
            this.timeout(timeoutValue);
            testClient.bublShutdown(sessionId + '0')
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });

        it('Expect invalidParameterValue Error. camera._bublShutdown cannot shutdown camera when incorrect shutdownDelay value type is provided', function(done) {
            this.timeout(timeoutValue);
            testClient.bublShutdown(sessionId, '...')
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.invalidParameterValueError(res);
                done();
            }));
        });

        it('Expect success. camera._bublShutdown successfully returned', function(done) {
            this.timeout(timeoutValue);
            testClient.bublShutdown(sessionId)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.bublShutdownOutput(res);
                done();
            }));
        });

        it('Expect success. camera._bublShutdown successfully returned when specific shutdownDelay is provided and returned at appropriate time', function(done) {
            this.timeout(timeoutValue);
            var expectedShutdownDelay = 3000;
            var startTime = Date.now();
            testClient.bublShutdown(sessionId, expectedShutdownDelay)
            .then( Comparison.catchExceptions(done, function(res) {
                Comparison.bublShutdownOutput(res);
                var endTime = Date.now();
                Comparison.shutdownDelay(startTime, endTime, expectedShutdownDelay);
                done();
            }));
        });
    });
});
