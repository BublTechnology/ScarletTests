// Copyright 2015 Bubl Technology Inc.
//
// Licensed under the MIT license
// <LICENSE-MIT or http://opensource.org/licenses/MIT>.
// This file may not be copied, modified, or distributed
// except according to those terms.

"use strict";

var OscClient = require('osc-client').BublOscClient;
var Compare = require('../lib/compare.js');
var Schema = require('../lib/schema.js');
var Validator = require('../lib/validator.js');
var Q = require('q');
var Util = require('../lib/util');
var chai = require('chai');
var assert = chai.assert;

Q.longStackSupport = true;

describe("RUST API TEST SUITE", function() {
    var testClient = new OscClient(process.env.SCARLET_TEST_HOST, process.env.SCARLET_TEST_PORT);
    var Utility = new Util(testClient);
    var defaultOptionsFile = './defaults/mock.json';
    var camModels = {
      BUBLCAM1_0 : "bubl1",
      BUBLCAM1_2 : "bubl2",
      GENERIC : "osc",
      BUBLMOCK : "bublmock"
    };
    var testModel = process.env.SCARLET_TEST_MODEL || camModels.BUBLMOCK;
    var isBublcam = testModel === camModels.BUBLCAM1_0 || testModel === camModels.BUBLCAM1_2 || testModel === camModels.BUBLMOCK;
    var isMock = testModel === camModels.BUBLMOCK;
    var testViaWifi = process.env.SCARLET_TEST_WIFI === '1';
    var timeoutValue = 30000;
    var schema = new Schema({ bubl: isBublcam, apiLevel: 1});
    var validate = new Validator(schema);
    function wrapError(err) {
        if (!(err instanceof Error)) {
            if (err.error && err.error.response) {
                err = err.error.response.text;
            } else {
                err = "Code execution should not have reached here";
            }
            throw new Error(err);
        } else {
            throw err;
        }
    }
    function expectError(res) {
        assert.fail("Should not resolve, expecting an error.");
    }

    // OSC INFO
    describe("Testing /osc/info endpoint", function() {

        it("Expect success. /osc/info returns correct info", function() {
            return testClient.getInfo()
            .then((res) => validate.info(res.body), wrapError);
        });
    });

    // OSC STATE
    describe("Testing /osc/state endpoint", function() {
        var sessionId;

        before( function() {
            return testClient.startSession()
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandStartSession);
                sessionId = res.body.results.sessionId;
            }, wrapError);
        });

        it("Expect success. /osc/state endpoint successfully returns state when state has not changed", function() {
            return testClient.getState()
            .then( function onSuccess (res) {
                validate.state(res.body);
                assert.equal(res.body.state.sessionId, sessionId);
            }, wrapError);
        });

        it("Expect success. confirming /osc/state endpoint returns correct value when state has changed", function() {
            var oldFingerprint;

            return testClient.getState()
            .then( function onSuccess (res) {
                validate.state(res.body);
                assert.equal(res.body.state.sessionId, sessionId);
                oldFingerprint = res.body.fingerprint;
                return testClient.closeSession(sessionId);
            })
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandCloseSession);
                return testClient.getState();
            })
            .then( function onSuccess (res) {
                validate.state(res.body);
                assert.notEqual(res.body.state.fingerprint, oldFingerprint);
                assert.notEqual(res.body.state.sessionId, sessionId);
            })
            .catch(wrapError)
        });
    });

    // OSC CHECK FOR UPDATES
    describe("Testing /osc/checkForUpdates endpoint", function() {
        var sessionId;
        var oldFingerprint;

        beforeEach( function() {
            return testClient.startSession()
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandStartSession);
                sessionId = res.body.results.sessionId;
            }, wrapError);
        });

        afterEach( function() {
            return Utility.checkActiveSession()
            .then( function(isActive) {
                if (isActive) {
                    return testClient.closeSession(sessionId)
                    .then( function onSuccess (res) {
                        validate.done(res.body, schema.names.commandCloseSession);
                    }, wrapError);
                }
            }, wrapError);
        });

        it("Expect success. /osc/checkForUpdates endpoint successfully gets updates when state has not changed", function() {
            return testClient.getState()
            .then( function onSuccess (res) {
                validate.state(res.body);
                assert.equal(res.body.state.sessionId, sessionId);
                oldFingerprint = res.body.fingerprint;
                return testClient.checkForUpdates(oldFingerprint);
            })
            .then( function onSuccess (res) {
                validate.checkForUpdates(res.body);
                assert.equal(res.body.stateFingerprint, oldFingerprint);
            })
            .catch(wrapError);
        });

        it("Expect success. /osc/checkForUpdates endpoint successfully gets updates when state has changed", function() {
            return testClient.getState()
            .then( function onSuccess (res) {
                validate.state(res.body);
                assert.equal(res.body.state.sessionId, sessionId);
                oldFingerprint = res.body.fingerprint;
                return testClient.closeSession(sessionId);
            })
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandCloseSession);
                return testClient.checkForUpdates(oldFingerprint);
            })
            .then( function onSuccess (res) {
                validate.checkForUpdates(res.body);
                assert.notEqual(res.body.stateFingerprint, oldFingerprint);
            })
            .catch(wrapError);
        });

        it("Expect success. /osc/checkForUpdates endpoint successfully gets updates when state has not changed with waitTimeout set to 5", function() {
            this.timeout(timeoutValue);
            return testClient.getState()
            .then( function onSuccess (res) {
                validate.state(res.body);
                assert.equal(res.body.state.sessionId, sessionId);
                oldFingerprint = res.body.fingerprint;
                return testClient.checkForUpdates(oldFingerprint, 5);
            })
            .then( function onSuccess (res) {
                validate.checkForUpdates(res.body);
                assert.equal(res.body.stateFingerprint, oldFingerprint);
            })
            .catch(wrapError);
        });

        it("Expect missingParameter Error. /osc/checkForUpdates endpoint cannot get updates when no fingerprint is provided", function() {
            return testClient.checkForUpdates()
            .then(expectError,
                (res) => validate.error(res.error.response.body, schema.names.checkForUpdates, schema.errors.missingParameter)
            )
        });
    });


    // START SESSION
    describe("Testing /osc/commands/execute camera.startSession endpoint", function() {
        var sessionId;

        afterEach( function() {
            return Utility.checkActiveSession()
            .then( function(isActive) {
                if (isActive) {
                    return testClient.closeSession(sessionId)
                    .then( function onSuccess (res) {
                        validate.done(res.body, schema.names.commandCloseSession);
                    }, wrapError);
                }
            }, wrapError);
        });

        it("Expect success. camera.startSession successfully starts a session", function() {
            return testClient.startSession()
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandStartSession);
                sessionId = res.body.results.sessionId;
            }, wrapError);
        });

        it("Expect success.  camera.startSession successfully starts a session when a timeout value of 30 is specified", function() {
            return testClient.startSession(30)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandStartSession);
                sessionId = res.body.results.sessionId;
                assert.equal(res.body.results.timeout, 30);
            }, wrapError);
        });

        it("Expect success. camera.startSession will timeout after the the specified timeout value", function() {
            this.timeout(timeoutValue);
            return testClient.startSession(5)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandStartSession);
                sessionId = res.body.results.sessionId;
                assert.equal(res.body.results.timeout, 5);
                return Q.delay(8000);
            })
            .then( function() {
                return testClient.startSession();
            })
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandStartSession);
                sessionId = res.body.results.sessionId;
            })
            .catch(wrapError);
        });

        it("Expect cameraInExclusiveUse Error. camera.startSession cannot start session while another session is already running", function() {
            return testClient.startSession()
            .then(
              function onSuccess (res) {
                validate.done(res.body, schema.names.commandStartSession);
                sessionId = res.body.results.sessionId;
                return testClient.startSession();
              },wrapError)
              .then(expectError,
                  (err) => validate.error(err.error.response.body, schema.names.commandStartSession, schema.errors.cameraInExclusiveUse)
            );
        });

        it("Expect invalidParameterValue Error. camera.startSession cannot start session when incorrect timeout type is provided", function() {
            return testClient.startSession('wrongtype')
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandStartSession, schema.errors.invalidParameterError)
            );
        });
    });

    // UPDATE SESSION
    describe("Testing /osc/commands/execute camera.updateSession endpoint", function() {
        var sessionId;

        beforeEach( function() {
            return testClient.startSession()
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandStartSession);
                sessionId = res.body.results.sessionId;
            }, wrapError);
        });

        afterEach( function() {
            return Utility.checkActiveSession()
            .then( function(isActive) {
                if (isActive) {
                    return testClient.closeSession(sessionId)
                    .then((res) => validate.done(res.body, schema.names.commandCloseSession),
                        wrapError);
                }
            }, wrapError);
        });

        it("Expect success. camera.updateSession successfully updates a session", function() {
            return testClient.updateSession(sessionId)
            .then( (res) => validate.done(res.body, schema.names.commandUpdateSession), wrapError);
        });

        it("Expect success. camera.updateSession successfully updates a session with a timeout value specified", function() {
            return testClient.updateSession(sessionId, 15)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandUpdateSession);
                assert.equal(res.body.results.timeout, 15);
            }, wrapError);
        });

        it("Expect missingParameter Error. camera.updateSession cannot update session when sessionId is not specified", function() {
            return testClient.updateSession()
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandUpdateSession, schema.errors.missingParameter)
            );
        });

        it("Expect invalidParameterValue Error. camera.updateSession cannot update session when sessionId is an incorrect type", function() {
            return testClient.updateSession('wrongtype')
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandUpdateSession, schema.errors.invalidParameterValue)
            );
        });

        it("Expect invalidParameterValue Error. camera.updateSession cannot update session when timeout is an incorrect type", function() {
            return testClient.updateSession(sessionId, 'wrongtype')
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandUpdateSession, schema.errors.invalidParameterValue)
            );
        });
    });

    // CLOSE SESSION
    describe("Testing /osc/commands/execute camera.closeSession endpoint", function() {
        var sessionId;

        beforeEach( function() {
            return testClient.startSession()
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandStartSession);
                sessionId = res.body.results.sessionId;
            }, wrapError);
        });

        afterEach( function() {
            return Utility.checkActiveSession()
            .then( function(isActive) {
                if (isActive) {
                    return testClient.closeSession(sessionId)
                    .then((res) => validate.done(res.body, schema.names.commandCloseSession),
                        wrapError);
                }
            }, wrapError);
        });

        it("Expect success. camera.closeSession successfully closes a session", function() {
            return testClient.closeSession(sessionId)
            .then( (res) => validate.done(res.body, schema.names.commandCloseSession),
                wrapError);
        });

        it("Expect missingParameter Error. camera.closeSession cannot close session when sessionId is not provided", function() {
            return testClient.closeSession()
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandCloseSession, schema.errors.missingParameter)
            );
        });

        it("Expect invalidParameterValue Error. camera.closeSession cannot close session when sessionId is an incorrect type", function() {
            return testClient.closeSession('wrongtype')
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandCloseSession, schema.errors.invalidParameterValue)
            );
        });

        it("Expect invalidParameterValue Error. camera.closeSession cannot close session when no session is active", function() {
            return testClient.closeSession(sessionId)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandCloseSession);
                return testClient.closeSession(sessionId);
            }, wrapError)
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandCloseSession, schema.errors.invalidParameterValue)
            );
        });
    });

    // TAKE PICTURE
    describe("Testing /osc/commands/execute camera.takePicture endpoint", function() {
        var sessionId;

        before( function() {
            return testClient.startSession()
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandStartSession);
                sessionId = res.body.results.sessionId;
                return Utility.restoreDefaultOptions(defaultOptionsFile);
            }, wrapError)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandSetOptions);
            }, wrapError);
        });

        afterEach( function() {
            return Utility.restoreDefaultOptions(defaultOptionsFile)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandSetOptions);
            }, wrapError);
        });

        after( function() {
            return Utility.checkActiveSession()
            .then( function(isActive) {
                if (isActive) {
                    return testClient.closeSession(sessionId)
                    .then((res) => validate.done(res.body, schema.names.commandCloseSession), wrapError);
                }
            }, wrapError);
        });

        it("Expect success.  camera.takePicture successfully takes a picture", function() {
            this.timeout(timeoutValue);
            return testClient.takePicture(sessionId)
            .then((res) => validate.done(res.body, schema.names.commandTakePicture), wrapError);
        });

        it("Expect success. camera.takePicture successfully takes an HDR picture", function() {
            this.timeout(timeoutValue * 2);
            return testClient.setOptions(sessionId, {'hdr': true})
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandSetOptions);
                return testClient.takePicture(sessionId);
            })
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandTakePicture);
                assert.equal(res.body.results._bublFileUris.length, 3);
            })
            .catch(wrapError);
        });

        it("Expect invalidParameterValue Error. camera.takePicture cannot take picture when incorrect sessionId type is provided", function() {
            return testClient.takePicture('wrongtype')
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandTakePicture, schema.errors.invalidParameterValue)
            );
        });

        it("Expect missingParameter Error. camera.takePicture cannot take picture when sessionId is not provided", function() {
            return testClient.takePicture()
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandTakePicture, schema.errors.missingParameter)
            );
        });
    });

    // LIST IMAGES
    describe("Testing /osc/commands/execute camera.listImage endpoint", function() {
        var sessionId;

        before( function() {
            return testClient.startSession()
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandStartSession);
                sessionId = res.body.results.sessionId;
            }, wrapError);
        });

        beforeEach( function() {
            this.timeout(timeoutValue);
            return Utility.deleteAllImages();
        });

        after( function() {
            return Utility.checkActiveSession()
            .then( function(isActive) {
                if (isActive) {
                    return testClient.closeSession(sessionId)
                    .then((res) => validate.done(res.body, schema.names.commandCloseSession),
                        wrapError);
                }
            }, wrapError);
        });

        it("Expect success. camera.listImages returns one entry when provided with entryCount = 1 when server has 1 image", function() {
            this.timeout(timeoutValue);
            return testClient.takePicture(sessionId)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandTakePicture);
                return testClient.listImages(1, true, 100);
            })
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandListImages);
                assert.equal(res.body.results.entries.length, 1);
                assert.equal(res.body.results.totalEntries, 1);
                assert.notProperty(res.body.results, 'continuationToken');
                for(let i = 0; i < res.body.results.entries.length; i++) {
                    assert.property(res.body.results.entries[i], 'thumbnail');
                }
            })
            .catch(wrapError);
        });

        it("Expect success. camera.listImages returns one entry without thumbnail when provided with entryCount = 1 and includeThumb = false when server has 1 image", function() {
            this.timeout(timeoutValue);
            return testClient.takePicture(sessionId)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandTakePicture);
                return testClient.listImages(1, false);
            })
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandListImages);
                assert.equal(res.body.results.entries.length, 1);
                assert.equal(res.body.results.totalEntries, 1);
                assert.notProperty(res.body.results, 'continuationToken');
                for(let i = 0; i < res.body.results.entries.length; i++) {
                    assert.notProperty(res.body.results.entries[i], 'thumbnail');
                }
            })
            .catch(wrapError);
        });

        it("Expect success. camera.listImages returns one entry and a continuation token when provided with entryCount = 1 when server has 2 images", function() {
            this.timeout(timeoutValue);
            return testClient.takePicture(sessionId)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandTakePicture);
                return testClient.takePicture(sessionId);
            })
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandTakePicture);
                return testClient.listImages(1, false);
            })
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandListImages);
                assert.equal(res.body.results.entries.length, 1);
                assert.equal(res.body.results.totalEntries, 2);
                assert.property(res.body.results, 'continuationToken');
                for(let i = 0; i < res.body.results.entries.length; i++) {
                    assert.notProperty(res.body.results.entries[i], 'thumbnail');
                }
            })
            .catch(wrapError);
        });

        it("Expect success. camera.listImages returns one entry when provided with a continuation token and entryCount = 1 when server has 2 images", function() {
            this.timeout(timeoutValue);
            return testClient.takePicture(sessionId)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandTakePicture);
                return testClient.takePicture(sessionId);
            })
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandTakePicture);
                return testClient.listImages(1, false);
            })
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandListImages);
                assert.equal(res.body.results.entries.length, 1);
                assert.equal(res.body.results.totalEntries, 2);
                assert.property(res.body.results, 'continuationToken');
                for(let i = 0; i < res.body.results.entries.length; i++) {
                    assert.notProperty(res.body.results.entries[i], 'thumbnail');
                }
                return testClient.listImages(1, false, undefined, res.body.results.continuationToken);
            })
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandListImages);
                assert.equal(res.body.results.entries.length, 1);
                assert.equal(res.body.results.totalEntries, 2);
                assert.notProperty(res.body.results, 'continuationToken');
                for(let i = 0; i < res.body.results.entries.length; i++) {
                    assert.notProperty(res.body.results.entries[i], 'thumbnail');
                }
            })
            .catch(wrapError);
        });

        it("Expect success. camera.listImages returns two entries and and no continuation token when provided with entryCount = 2 when server has 2 images", function() {
            this.timeout(timeoutValue);
            return testClient.takePicture(sessionId)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandTakePicture);
                return testClient.takePicture(sessionId);
            })
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandTakePicture);
                return testClient.listImages(2, false);
            })
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandListImages);
                assert.equal(res.body.results.entries.length, 2);
                assert.equal(res.body.results.totalEntries, 2);
                assert.notProperty(res.body.results, 'continuationToken');
                for(let i = 0; i < res.body.results.entries.length; i++) {
                    assert.notProperty(res.body.results.entries[i], 'thumbnail');
                }
            })
            .catch(wrapError);
        });

        it("Expect success. camera.listImages lists zero images when no images are in the system", function() {
            return testClient.listImages(2, false)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandListImages);
                assert.equal(res.body.results.entries.length, 0);
                assert.equal(res.body.results.totalEntries, 0);
                assert.notProperty(res.body.results, 'continuationToken');
                for(let i = 0; i < res.body.results.entries.length; i++) {
                    assert.notProperty(res.body.results.entries[i], 'thumbnail');
                }
            }, wrapError);
        });

        it("Expect missingParameter Error. camera.listImages cannot list images when entryCount is not provided", function() {
            return testClient.listImages()
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandListImages, schema.errors.missingParameter)
            );
        });

        it("Expect missingParameter Error. camera.listImages cannot list images when maxSize is not provided", function() {
            return testClient.listImages(1, true)
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandListImages, schema.errors.missingParameter)
            );
        });

        it("Expect missingParameter Error. camera.listImages cannot list images when maxSize is not provided and includeThumb defaults to true", function() {
            return testClient.listImages(1, undefined)
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandListImages, schema.errors.missingParameter)
            );
        });

        it("Expect invalidParameterValue Error. camera.listImages cannot list images when false token is given", function() {
            return testClient.listImages('wrongtype')
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandListImages, schema.errors.invalidParameterValue)
            );
        });
    });

    // DELETE
    describe("Testing /osc/commands/execute camera.delete endpoint", function() {
        var sessionId;
        var fileUri;

        before( function() {
            return testClient.startSession()
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandStartSession);
                sessionId = res.body.results.sessionId;
            }, wrapError);
        });

        after( function() {
            return Utility.checkActiveSession()
            .then( function(isActive) {
                if (isActive) {
                    return testClient.closeSession(sessionId)
                    .then( function onSuccess (res) {
                        validate.done(res.body, schema.names.commandCloseSession);
                    }, wrapError);
                }
            }, wrapError);
        });

        it("Expect success. camera.delete successfully deletes file when provided with a valid fileUri", function() {
            this.timeout(timeoutValue);
            return testClient.takePicture(sessionId)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandTakePicture);
                fileUri = res.body.results.fileUri;
                return testClient.delete(fileUri);
            })
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandDelete);
            })
            .catch(wrapError);
        });

        it("Expect invalidParameterValue Error. camera.delete cannot delete file when incorrect fileUri type is provided", function() {
            return testClient.delete('wrongtype')
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandDelete, schema.errors.invalidParameterValue)
            );
        });

        it("Expect missingParameter Error. camera.delete cannot delete file when fileUri is not provided", function() {
            return testClient.delete()
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandDelete, schema.errors.missingParameter)
            );
        });
    });

    // GET IMAGE
    describe("Testing /osc/commands/execute camera.getImage endpoint", function() {
        var sessionId;
        var fileUri;

        before( function() {
            return testClient.startSession()
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandStartSession);
                sessionId = res.body.results.sessionId;
            }, wrapError);
        });

        after( function() {
            return Utility.checkActiveSession()
            .then( function(isActive) {
                if (isActive) {
                    return testClient.closeSession(sessionId)
                    .then( function onSuccess (res) {
                        validate.done(res.body, schema.names.commandCloseSession);
                    }, wrapError);
                }
            }, wrapError);
        });

        it("Expect success. camera.getImage successfully gets image when provided with a valid fileUri", function() {
            this.timeout(timeoutValue);
            return testClient.takePicture(sessionId)
            .then(function onSuccess (res) {
                validate.done(res.body, schema.names.commandTakePicture);
                fileUri = res.body.results.fileUri;
                return testClient.getImage(fileUri);
            })
            .then((res) => validate.checkForBinary(res.body))
            .catch(wrapError);
        });

        it("Expect success. camera.getImage successfully gets image when provided with a valid fileUri and maxSize", function() {
            this.timeout(timeoutValue);
            return testClient.takePicture(sessionId)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandTakePicture);
                fileUri = res.body.results.fileUri;
                return testClient.getImage(fileUri, 100);
            })
            .then((res) => validate.checkForBinary(res.body))
            .catch(wrapError);
        });

        it("Expect missingParameter Error. camera.getImage cannot get image when fileUri is not provided", function() {
            return testClient.getImage()
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandGetImage, schema.errors.missingParameter)
            );
        });

        it("Expect invalidParameterValue Error. camera.getImage cannot get image when fileUri is incorrect", function() {
            return testClient.getImage('wrongtype')
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandGetImage, schema.errors.invalidParameterValue)
            );
        });
    });

    // GET METADATA
    describe("Testing /osc/commands/execute camera.getMetadata endpoint", function() {
        var sessionId;
        var fileUri;

        before( function() {
            this.timeout(timeoutValue);
            return testClient.startSession()
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandStartSession);
                sessionId = res.body.results.sessionId;
                return testClient.takePicture(sessionId);
            }, wrapError)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandTakePicture);
                fileUri = res.body.results.fileUri;
            }, wrapError);
        });

        after( function() {
            return Utility.checkActiveSession()
            .then( function(isActive) {
                if (isActive) {
                    return testClient.closeSession(sessionId)
                    .then( function onSuccess (res) {
                        validate.done(res.body, schema.names.commandCloseSession);
                    }, wrapError);
                }
            }, wrapError);
        });

        it("Expect success. camera.getMetadata successfully gets metadata when provided with a valid fileUri", function() {
            return testClient.getMetadata(fileUri)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandGetMetadata);
            }, wrapError);
        });

        it("Expect invalidParameterValue Error. camera.getMetadata cannot get metadata when fileUri does not exist", function() {
            return testClient.getMetadata('wrongtype')
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandGetMetadata, schema.errors.invalidParameterValue)
            );
        });

        it("Expect missingParameter Error. camera.getMetadata cannot get metadata when fileUri is not provided", function() {
            return testClient.getMetadata()
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandGetMetadata, schema.errors.missingParameter)
            );
        });
    });

    // GET OPTIONS
    describe("Testing /osc/commands/execute camera.getOptions endpoint", function() {
        var sessionId;
        var specifiedOptions = ['captureMode', 'exposureProgram', 'iso', 'shutterSpeed', 'aperture',
                                'whiteBalance', 'exposureCompensation', 'fileFormat', 'exposureDelay',
                                'sleepDelay', 'offDelay', 'hdr', 'exposureBracket', 'gyro', 'gps',
                                'imageStabilization', '_bublVideoFileFormat'];

        before( function() {
            return testClient.startSession()
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandStartSession);
                sessionId = res.body.results.sessionId;
            }, wrapError);
        });

        after( function() {
            return Utility.checkActiveSession()
            .then( function(isActive) {
                if (isActive) {
                    return testClient.closeSession(sessionId)
                    .then( function onSuccess (res) {
                        validate.done(res.body, schema.names.commandCloseSession);
                    }, wrapError);
                }
            }, wrapError);
        });

        it("Expect success. camera.getOptions gets correct options when gettable options are set to supported values", function() {
            return testClient.getOptions(sessionId, specifiedOptions)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandGetOptions);
                for(let i = 0; i < specifiedOptions.length; i++) {
                    assert.property(res.body.results.options, specifiedOptions[i]);
                    }
                }, wrapError);
        });

        it("Expect missingParameter Error. camera.getOptions cannot get options when options is not provided", function() {
            return testClient.getOptions(sessionId)
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandGetOptions, schema.errors.missingParameter)
            );
        });

        it("Expect missingParameter Error. camera.getOptions cannot get options when sessionId is not provided", function() {
            return testClient.getOptions(undefined, specifiedOptions)
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandGetOptions, schema.errors.missingParameter)
            );
        });

        // RE-ADD ONCE EXTRA FIELD CHECKING HAS BEEN IMPLEMENTED
        it.skip("Expect invalidParameterValue Error. camera.getOptions cannot get options when options is set to unsupported value", function() {
            return testClient.getOptions(sessionId, ['wrongtype'])
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandGetOptions, schema.errors.invalidParameterValue)
            );
        });
    });

    // SET OPTIONS
    describe("Testing /osc/commands/execute camera.setOptions endpoint", function() {
        var sessionId;

        before( function() {
            return testClient.startSession()
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandStartSession);
                sessionId = res.body.results.sessionId;
            }, wrapError);
        });

        after( function() {
            return Utility.restoreDefaultOptions(defaultOptionsFile)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandSetOptions);
                return testClient.closeSession(sessionId);
            }, wrapError)
            .then( (res) => validate.done(res.body, schema.names.commandCloseSession),
                wrapError);
        });

        it("Expect success. camera.setOptions successfully sets options when sleepDelay option is set to supported value", function() {
            return testClient.setOptions(sessionId, {'sleepDelay': 5})
            .then( (res) => validate.done(res.body, schema.names.commandSetOptions),
                wrapError);
        });

        it("Expect invalidParameterValue Error. camera.setOptions cannot set options when sleepDelay option is set to unsupported value", function() {
            return testClient.setOptions(sessionId, {'sleepDelay': -1})
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandSetOptions, schema.errors.invalidParameterValue)
            );
        });

        it("Expect success. camera.setOptions successfully sets options when offDelay option is set to supported value", function() {
            return testClient.setOptions(sessionId, {'offDelay': 5})
            .then( (res) => validate.done(res.body, schema.names.commandSetOptions),
                wrapError);
        });

        it("Expect invalidParameterValue Error. camera.setOptions cannot set options when offDelay option is set to unsupported value", function() {
            return testClient.setOptions(sessionId, {'offDelay': -1})
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandSetOptions, schema.errors.invalidParameterValue)
            );
        });

        it("Expect success. camera.setOptions successfully sets options when imageStabilization option is set to supported value", function() {
            return testClient.setOptions(sessionId, {'imageStabilization': 'off'})
            .then( (res) => validate.done(res.body, schema.names.commandSetOptions),
                wrapError);
        });

        it("Expect invalidParameterValue Error. camera.setOptions cannot set options when imageStabilization option is set to unsupported value", function() {
            return testClient.setOptions(sessionId, {'imageStabilization': 'UNSUPPORTED'})
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandSetOptions, schema.errors.invalidParameterValue)
            );
        });

        it("Expect success. camera.setOptions successfully sets options when hdr option is set to supported value", function() {
            return testClient.setOptions(sessionId, {'hdr': true})
            .then( (res) => validate.done(res.body, schema.names.commandSetOptions),
                wrapError);
        });

        it("Expect invalidParameterValue Error. camera.setOptions cannot set options when hdr option is set to unsupported value", function() {
            return testClient.setOptions(sessionId, {'hdr': 'UNSUPPORTED'})
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandSetOptions, schema.errors.invalidParameterValue)
            );
        });

        it("Expect success. camera.setOptions successfully sets options when captureMode option is set to supported value _bublVideo", function() {
            return testClient.setOptions(sessionId, {'captureMode': '_bublVideo'})
            .then( (res) => validate.done(res.body, schema.names.commandSetOptions),
                wrapError);
        });

        it("Expect success. camera.setOptions successfully sets options when captureMode option is set to supported value Image", function() {
            return testClient.setOptions(sessionId, {'captureMode': 'image'})
            .then( (res) => validate.done(res.body, schema.names.commandSetOptions),
                wrapError);
        });

        it("Expect invalidParameterValue Error. camera.setOptions cannot set options when captureMode option is set to unsupported value", function() {
            return testClient.setOptions(sessionId, {'captureMode': 'UNSUPPORTED'})
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandSetOptions, schema.errors.invalidParameterValue)
            );
        });

        it("Expect success. camera.setOptions successfully sets options when exposureProgram option is set to supported value", function() {
            return testClient.setOptions(sessionId, {'exposureProgram': 2})
            .then( (res) => validate.done(res.body, schema.names.commandSetOptions),
                wrapError);
        });

        it("Expect invalidParameterValue Error. camera.setOptions cannot set options when exposureProgram option is set to unsupported value", function() {
            return testClient.setOptions(sessionId, {'exposureProgram': -1})
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandSetOptions, schema.errors.invalidParameterValue)
            );
        });

        it("Expect success. camera.setOptions successfully sets options when whiteBalance option is set to supported value", function() {
            return testClient.setOptions(sessionId, {'whiteBalance': 'auto'})
            .then( (res) => validate.done(res.body, schema.names.commandSetOptions),
                wrapError);
        });

        it("Expect invalidParameterValue Error. camera.setOptions cannot set options when whiteBalance option is set to unsupported value", function() {
            return testClient.setOptions(sessionId, {'whiteBalance': 'UNSUPPORTED'})
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandSetOptions, schema.errors.invalidParameterValue)
            );
        });

        it("Expect success. camera.setOptions successfully sets options when fileFormat option is set to supported value raw for image", function() {
            return testClient.setOptions(sessionId, {'fileFormat': {'type':'raw', 'width': 3840, 'height': 3840}})
            .then( (res) => validate.done(res.body, schema.names.commandSetOptions),
                wrapError);
        });

        it("Expect success. camera.setOptions successfully sets options when fileFormat option is set to supported value jpeg for image", function() {
            return testClient.setOptions(sessionId, {'fileFormat': {'type':'jpeg', 'width': 3840, 'height': 3840}})
            .then( (res) => validate.done(res.body, schema.names.commandSetOptions),
                wrapError);
        });

        it("Expect invalidParameterValue Error. camera.setOptions cannot set options when fileFormat option is set to unsupported value", function() {
            return testClient.setOptions(sessionId, {'fileFormat': 'UNSUPPORTED'})
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandSetOptions, schema.errors.invalidParameterValue)
            );
        });

        it("Expect success. camera.setOptions successfully sets options when _bublVideoFileFormat option is set to supported value 1920x1920", function() {
            return testClient.setOptions(sessionId, {'_bublVideoFileFormat': {'type':'mp4', 'width': 1920, 'height': 1920}})
            .then( (res) => validate.done(res.body, schema.names.commandSetOptions),
                wrapError);
        });

        it("Expect success. camera.setOptions successfully sets options when _bublVideoFileFormat option is set to supported value 1920x1920", function() {
            return testClient.setOptions(sessionId, {'_bublVideoFileFormat': {'type':'mp4', 'width': 1920, 'height': 1920}})
            .then( (res) => validate.done(res.body, schema.names.commandSetOptions),
                wrapError);
        });

        it("Expect invalidParameterValue Error. camera.setOptions cannot set options when _bublVideoFileFormat option is set to unsupported value", function() {
            return testClient.setOptions(sessionId, {'_bublVideoFileFormat': 'UNSUPPORTED'})
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandSetOptions, schema.errors.invalidParameterValue)
            );
        });

        it("Expect success. camera.setOptions successfully sets options when exposureDelay option is set to supported value", function() {
            return testClient.setOptions(sessionId, {'exposureDelay': 4})
            .then( (res) => validate.done(res.body, schema.names.commandSetOptions),
                wrapError);
        });

        it("Expect invalidParameterValue Error. camera.setOptions cannot set options when exposureDelay option is set to unsupported value", function() {
            return testClient.setOptions(sessionId, {'exposureDelay': -1})
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandSetOptions, schema.errors.invalidParameterValue)
            );
        });

        it("Expect success. camera.setOptions successfully sets options when dateTimeZone option is set to supported value", function() {
            if (!isBublcam) {
                return this.skip();
            }

            return testClient.setOptions(sessionId, {'dateTimeZone': '2015:07:23 14:27:39-04:00'})
            .then( (res) => validate.done(res.body, schema.names.commandSetOptions),
                wrapError);
        });

        it("Expect success. camera.setOptions successfully sets options when dateTimeZone option is set to supported value and bubl timezone", function() {
            return testClient.setOptions(sessionId, {'dateTimeZone': '2015:07:23 14:27:39-04:00|America/Toronto'})
            .then( (res) => validate.done(res.body, schema.names.commandSetOptions),
                wrapError);
        });

        it("Expect success. camera.setOptions successfully sets options when wifiPassword option is set to supported value", function() {
            if (testViaWifi) {
                return this.skip();
            }

            return testClient.setOptions(sessionId, {'wifiPassword': '12345678'})
            .then( (res) => validate.done(res.body, schema.names.commandSetOptions),
                wrapError);
        });

        it("Expect invalidParameterValue Error. camera.setOptions cannot set options when wifiPassword option is set to unsupported value", function() {
            return testClient.setOptions(sessionId, {'wifiPassword': '1234'})
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandSetOptions, schema.errors.invalidParameterValue)
            );
        });

        it("Expect missingParameter Error. camera.setOptions cannot set options when options is not provided", function() {
            return testClient.setOptions(sessionId, undefined)
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandSetOptions, schema.errors.missingParameter)
            );
        });
    });

    // OSC COMMAND STATUS
    describe("Testing /osc/commands/status endpoint", function() {
        var sessionId;

        before( function() {
            return testClient.startSession()
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandStartSession);
                sessionId = res.body.results.sessionId;
            }, wrapError);
        });

        after( function() {
            return Utility.checkActiveSession()
            .then( function(isActive) {
                if (isActive) {
                    return testClient.closeSession(sessionId)
                    .then( function onSuccess (res) {
                        validate.done(res.body, schema.names.commandCloseSession);
                    }, wrapError);
                }
            }, wrapError);
        });

        it("Expect success. /osc/commands/status successfully grabs command status after take picture has been called", function() {
            this.timeout(timeoutValue);
            var deferred = Q.defer();

            return Q.all([testClient.takePicture(sessionId, function(res) {
                var commandId = res.body.id;

                try {
                  validate.inProgress(res.body, schema.names.commandTakePicture);
                  deferred.resolve();
                } catch (err) {
                  deferred.reject(err);
                }
            })
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandTakePicture);
            }, wrapError), deferred.promise])
        });

        it("Expect missingParameter Error. /osc/commands/status endpoint cannot get status when command ID is not provided", function() {
            return testClient.commandsStatus()
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandsStatus, schema.errors.missingParameter)
            );
        });

        it("Expect invalidParameterValue Error. /osc/commands/status endpoint cannot get status when incorrect sessionId is provided", function() {
            return testClient.commandsStatus('wrongtype')
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandsStatus, schema.errors.invalidParameterValue)
            );
        });
    });

    // BUBL POLL
    describe("Testing /osc/commands/_bublPoll endpoint", function() {
        var sessionId;

        before( function() {
            if (!isBublcam) {
              return this.skip();
            }

            return testClient.startSession()
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandStartSession);
                sessionId = res.body.results.sessionId;
            }, wrapError);
        });

        after( function() {
            return Utility.checkActiveSession()
            .then( function(isActive) {
                if (isActive) {
                    return testClient.closeSession(sessionId)
                    .then( function onSuccess (res) {
                        validate.done(res.body, schema.names.commandCloseSession);
                    }, wrapError);
                }
            }, wrapError);
        });

        it("Expect success. /osc/commands/_bublPoll returns immediately if no waitTimeout argument is provided", function() {
            this.timeout(timeoutValue);
            var deferred = Q.defer();
            var commandId = '';
            var fingerprint = '';

            return Q.all([testClient.takePicture(sessionId, function(res) {
                if (commandId === '') {
                    commandId = res.body.id;
                    testClient.bublPoll(commandId, fingerprint)
                    .then( function onSuccess (res) {
                        validate.bublPoll(res.body);
                        validate.inProgress(res.body.command, schema.names.cameraTakePicture);
                        assert.notEqual(res.body.fingerprint, fingerprint);
                        assert.equal(res.body.command.id, commandId);
                        fingerprint = res.body.fingerprint;
                        return testClient.bublPoll(commandId, fingerprint);
                    }, wrapError)
                    .then( function onSuccess (res) {
                        validate.bublPoll(res.body);
                        assert.equal(res.body.fingerprint, fingerprint);
                        assert.equal(res.body.command.id, commandId);
                    }, wrapError)
                    .then(deferred.resolve, deferred.reject)
                }

            })
            .then( (res) => validate.done(res.body, schema.names.commandTakePicture),
              wrapError), deferred.promise])
        });

        it("Expect success. /osc/commands/_bublPoll returns once command state has changed", function() {
            this.timeout(timeoutValue);
            var fingerprint = '';
            var commandId = '';
            var deferred = Q.defer();

            return Q.all([testClient.bublCaptureVideo(sessionId, function(res) {
                if (commandId === '') {
                    commandId = res.body.id;
                    Q.delay(8000)
                    .then( function() {
                        return testClient.bublPoll(commandId, fingerprint);
                    })
                    .then( function onSuccess (res) {
                        validate.bublPoll(res.body);
                        assert.notEqual(res.body.fingerprint, fingerprint);
                        assert.equal(res.body.command.id, commandId);
                        fingerprint = res.body.fingerprint;
                        return testClient.bublStop(commandId);
                    })
                    .then( function onSuccess (res) {
                        assert(Object.keys(res.body).length === 0);
                        return testClient.bublPoll(commandId, fingerprint, 4);
                    })
                    .then( function onSuccess (res) {
                        validate.bublPoll(res.body);
                        assert.notEqual(res.body.fingerprint, fingerprint);
                        assert.equal(res.body.command.id, commandId);
                    })
                    .then(deferred.resolve, deferred.reject);
                }
            })
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandBublCaptureVideo);
            }, wrapError), deferred.promise])
        });

        it("Expect success. /osc/commands/_bublPoll endpoint successfully gets updates when state has not changed with waitTimeout set to 5", function() {
            this.timeout(timeoutValue);
            var fingerprint = '';
            var commandId = '';
            var deferred = Q.defer();
            return Q.all([testClient.bublCaptureVideo(sessionId, function(res) {
                if (commandId === '') {
                    commandId = res.body.id;
                    Q.delay(8000)
                    .then( function() {
                        return testClient.bublPoll(commandId, fingerprint);
                    })
                    .then( function onSuccess (res) {
                        validate.bublPoll(res.body);
                        assert.notEqual(res.body.fingerprint, fingerprint);
                        assert.equal(res.body.command.id, commandId)
                        fingerprint = res.body.fingerprint;
                        return Q.delay(4000);
                    })
                    .then( function() {
                        return testClient.bublPoll(commandId, fingerprint, 5);
                    })
                    .then( function onSuccess (res) {
                        validate.bublPoll(res.body);
                        assert.equal(res.body.fingerprint, fingerprint);
                        assert.equal(res.body.command.id, commandId)
                        return testClient.bublStop(commandId);
                    })
                    .then( function onSuccess (res) {
                      assert(Object.keys(res.body).length === 0);
                    })
                    .then(deferred.resolve, deferred.reject);
                }
            })
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandBublCaptureVideo);
            }, wrapError), deferred.promise])
        });

        it("Expect missingParameter Error. /osc/commands/_bublPoll cannot get updates when no commandId is provided", function() {
            return testClient.bublPoll(undefined, '')
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandsBublPoll, schema.errors.missingParameter)
            );
        });

        it("Expect missingParameter Error. /osc/commands/_bublPoll cannot get updates when no fingerprint is provided", function() {
            this.timeout(timeoutValue);
            var stopped = false;
            var deferred = Q.defer();
            return Q.all([testClient.takePicture(sessionId, function(res) {
                if (!stopped) {
                    testClient.bublPoll(res.body.id)
                    .then( expectError,
                        (err) => {validate.error(err.error.response.body, schema.names.commandsBublPoll, schema.errors.missingParameter);
                        stopped = true;
                    })
                    .then(deferred.resolve, deferred.reject);
                }
            })
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandTakePicture);
                assert.isTrue(stopped);
            }, wrapError), deferred.promise]);
        });

        it("Expect invalidParameterValue Error. /osc/commands/_bublPoll cannot get updates when commandId is invalid", function() {
            this.timeout(timeoutValue);
            return testClient.bublPoll('wrongtype', '')
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandsBublPoll, schema.errors.invalidParameterValue)
            );
        });

        it("Expect invalidParameterValue Error. /osc/commands/_bublPoll cannot get updates when waitTimeout is invalid", function() {
            this.timeout(timeoutValue);
            var deferred = Q.defer();

            return Q.all([testClient.takePicture(sessionId, function(res) {
                testClient.bublPoll(res.body.id, '', 'wrongtype')
                .then( expectError,
                    (err) => validate.error(err.error.response.body, schema.names.commandsBublPoll, schema.errors.invalidParameterValue)
                )
                .then( deferred.resolve, deferred.reject);
            })
            .then( (res) => validate.done(res.body, schema.names.commandTakePicture),
            wrapError), deferred.promise]);
        });
    });

    // BUBL TIMELAPSE
    describe('Testing /osc/commands/execute camera._bublTimelapse command', function() {

        var sessionId;

        before( function() {
            if (!isBublcam) {
              return this.skip();
            }

            this.timeout(timeoutValue);
            return testClient.startSession()
            .then( function(res) {
                sessionId = res.body.results.sessionId;
            });
        });

        beforeEach( function() {
            this.timeout(timeoutValue);
            return Utility.restoreDefaultOptions(defaultOptionsFile)
            .then(function() {
                return Utility.deleteAllImages();
            }, wrapError);
        });

        after( function() {
            return Utility.checkActiveSession()
            .then( function(isActive) {
                if (isActive) {
                    return testClient.closeSession(sessionId)
                    .then( function onSuccess (res) {
                        validate.done(res.body, schema.names.commandCloseSession);
                    }, wrapError);
                }
            }, wrapError);
        });

        it('Expect missingParameter Error. sessionId is mandatory for command camera._bublTimelapse', function() {
            return testClient.bublTimelapse()
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandBublTimelapse, schema.errors.missingParameter)
            );
        });

        it('Expect invalidParameterValue Error. camera._bublTimelapse expects active session\'s sessionId', function() {
            return testClient.bublTimelapse(sessionId + '0')
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandBublTimelapse, schema.errors.invalidParameterValue)
            );
        });

        it('Expect cameraInExclusiveUse Error. camera._bublTimelapse cannot be run when another timelapse capture procedure is already active', function() {
            this.timeout(timeoutValue * 2);
            var expectedResults = {
                results: {
                    _bublFileUris: ['']
                }
            };
            var commandId;
            var deferred = Q.defer();

            return Q.all([testClient.bublTimelapse(sessionId, function onUpdate (res) {
                if (!commandId) {
                    commandId = res.body.id;

                    testClient.bublTimelapse(sessionId)
                    .then(
                        () => assert.fail('Should have received cameraInExclusiveUse'),
                        (err) => validate.error(err.error.response.body, schema.names.commandBublTimelapse, schema.errors.cameraInExclusiveUse)
                    )
                    .then(() => testClient.bublStop(commandId))
                    .then((res) => assert(Object.keys(res.body).length === 0))
                    .then(deferred.resolve, deferred.reject)
                }
            })
            .then((res) => validate.done(res.body, schema.names.commandBublTimelapse), wrapError), deferred.promise])
        });

        it('Expect cameraInExclusiveUse Error. camera._bublTimelapse cannot be run when a video capture procedure is already active', function() {
            this.timeout(timeoutValue * 2);
            var commandId;
            var deferred = Q.defer();

            return Q.all([testClient.bublCaptureVideo(sessionId, function onUpdate (res) {
                if(!commandId) {
                    commandId = res.body.id;
                    testClient.bublTimelapse(sessionId)
                    .then(
                        () => assert.fail("Should have received cameraInExclusiveUseError"),
                        (err) => validate.error(err.error.response.body, schema.names.commandBublTimelapse, schema.errors.cameraInExclusiveUse)
                    )
                    .then(() => testClient.bublStop(commandId))
                    .then((res) => assert(Object.keys(res.body).length === 0))
                    .then(deferred.resolve, deferred.reject)
                  }
            })
            .then((res) => validate.done(res.body, schema.names.commandBublCaptureVideo), wrapError), deferred.promise])
        });

        it('Expect success. camera._bublTimelapse successfully captures with default settings', function() {
            this.timeout(timeoutValue * 4);
            var stopped = false;
            var deferred = Q.defer();

            //Run camera._bublTimelapse
            return Q.all([testClient.bublTimelapse(sessionId, function(res) {
                if (!stopped) {
                    stopped = true;
                    Q.delay(15000)
                    .then(() => testClient.bublStop(res.body.id))
                    .then((res) => assert(Object.keys(res.body).length === 0))
                    .then(deferred.resolve, deferred.reject)
                }
            })
            .then((res) => validate.done(res.body, schema.names.commandBublTimelapse), wrapError), deferred.promise])
        });

        it('Expect success. camera._bublTimelapse captures with specific timelapse interval and count, then finishes within the max tolerable completion time', function() {
            this.timeout(120000);
            var timelapseInterval = 10;
            var timelapseCount = 3;
            var assumedMaxOverhead = 15000;
            var maxAcceptableTime = (timelapseInterval * timelapseCount * 1000) + assumedMaxOverhead;
            var expectedResults = {
              results: {
                  _bublFileUris: ['','','']
              }
            };
            return testClient.setOptions(
                sessionId,
                {
                    "_bublTimelapse": {
                        "interval": timelapseInterval,
                        "count": timelapseCount
                    }
                }
            )
            .then(function onSuccess (res) {
                validate.done(res.body, schema.names.commandSetOptions)
                return testClient.bublTimelapse(sessionId);
            })
            .then(function onSuccess (res) {
                //Under consistent latency, we can assume the following:
                //  (1) timelapseRunTime ≈ finalResponseTime - initialResponseTime
                //  (2) timeElapsed <= timelapseRunTime + pollingPeriod
                var timeElapsed = res.timeElapsed;
                if (timeElapsed > maxAcceptableTime) {
                    assert.fail('operation took too long. timeElapsed : ' + timeElapsed + ' > maxAcceptableTime : ' + maxAcceptableTime);
                } else {
                    validate.done(res.body, schema.names.commandBublTimelapse);
                    assert.notEqual(res.body.results.fileUri.length, timelapseCount);
                }
            })
            .catch(wrapError);
        });
    });

    // BUBL CAPTURE VIDEO
    describe("Testing /osc/commands/execute camera._bublCaptureVideo endpoint", function() {
        var sessionId;

        before( function() {
            if (!isBublcam) {
                return this.skip();
            }

            return testClient.startSession()
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandStartSession);
                sessionId = res.body.results.sessionId;
                return Utility.restoreDefaultOptions(defaultOptionsFile);
            }, wrapError)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandSetOptions)
            }, wrapError);
        });

        afterEach( function() {
            this.timeout(timeoutValue);
            return Utility.restoreDefaultOptions(defaultOptionsFile)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandSetOptions)
            }, wrapError);
        });

        after( function() {
            return Utility.checkActiveSession()
            .then( function(isActive) {
                if (isActive) {
                    return testClient.closeSession(sessionId)
                    .then( function onSuccess (res) {
                        validate.done(res.body, schema.names.commandCloseSession);
                    }, wrapError);
                }
            }, wrapError);
        });

        it("Expect success.  camera._bublCaptureVideo successfully captures a video", function() {
            this.timeout(timeoutValue);
            var stopped = false;
            var deferred = Q.defer();

            return Q.all([testClient.bublCaptureVideo(sessionId, function(res) {
                if (!stopped) {
                    Q.delay(2000)
                    .then( () => testClient.bublStop(res.body.id))
                    .then( (res) => assert(Object.keys(res.body).length === 0))
                    .then(deferred.resolve, deferred.reject);
                    stopped = true;
                }
            })
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandBublCaptureVideo);
                assert.isTrue(stopped);
            }, wrapError), deferred.promise])
        });

        it("Expect cameraInExclusiveUse Error. camera._bublCaptureVideo cannot start video capture when a video capture is already active", function() {
            this.timeout(timeoutValue);
            var stopped = false;
            var deferred = Q.defer();

            return Q.all([testClient.bublCaptureVideo(sessionId, function(res) {
                var commandId = res.body.id;
                if (!stopped) {
                    testClient.bublCaptureVideo(sessionId)
                    .then( expectError,
                        (err) => {validate.error(err.error.response.body, schema.names.commandBublCaptureVideo, schema.errors.cameraInExclusiveUse);
                        stopped = true;
                        return testClient.bublStop(commandId);
                    })
                    .then( function onSuccess(res){
                        assert(Object.keys(res.body).length === 0)
                    })
                    .then(deferred.resolve, deferred.reject);
                }

            }).then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandBublCaptureVideo);
                assert.isTrue(stopped);
            }, wrapError), deferred.promise])
        });

        it("Expect invalidParameterValue Error. camera._bublCaptureVideo cannot capture video when incorrect sessionId type is provided", function() {
            return testClient.bublCaptureVideo('wrongtype')
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandBublCaptureVideo, schema.errors.invalidParameterValue)
            );
        });

        it("Expect missingParameter Error. camera._bublCaptureVideo cannot capture video when sessionId is not provided", function() {
            return testClient.bublCaptureVideo()
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandBublCaptureVideo, schema.errors.missingParameter)
            );
        });
    });

    // BUBL STOP
    describe("Testing /osc/commands/_bublStop endpoint", function() {
        var sessionId;

        before( function() {
            if (!isBublcam) {
                return this.skip();
            }

            return testClient.startSession()
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandStartSession);
                sessionId = res.body.results.sessionId;
                return Utility.restoreDefaultOptions(defaultOptionsFile);
            }, wrapError)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandSetOptions)
            }, wrapError);
        });

        afterEach( function() {
            this.timeout(timeoutValue);
            return Utility.restoreDefaultOptions(defaultOptionsFile)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandSetOptions)
            }, wrapError);
        });

        after( function() {
            return Utility.checkActiveSession()
            .then( function(isActive) {
                if (isActive) {
                    return testClient.closeSession(sessionId)
                    .then( function onSuccess (res) {
                        validate.done(res.body, schema.names.commandCloseSession);
                    }, wrapError);
                }
            }, wrapError);
        });

        it("Expect success.  camera._bublStop successfully stops a video capture", function() {
            this.timeout(timeoutValue);
            var stopped = false;
            var commandId;
            var deferred = Q.defer();

            return Q.all([testClient.bublStream(sessionId, function(res) {
                if (!stopped) {
                    commandId = res.body.id;
                    Q.delay(1000)
                    .then( function() {
                        return testClient.bublStop(commandId);
                    })
                    .then( function onSuccess (res) {
                        assert(Object.keys(res.body).length === 0);
                    })
                    .then(deferred.resolve, deferred.reject);
                    stopped = true;
                }
            })
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandBublStream);
                assert.equal(res.body.id, commandId);
                assert.isTrue(stopped);
            }, wrapError), deferred.promise])
        });

        it("Expect invalidParameterValue Error. camera._bublStop cannot stop video capture when incorrect commandId type is provided", function() {
            return testClient.bublStop('wrongtype')
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandsBublStop, schema.errors.invalidParameterValue)
            );
        });

        it("Expect missingParameter Error. camera._bublStop cannot stop video capture when commandId is not provided", function() {
            return testClient.bublStop()
            .then( expectError,
                (err) => validate.error(err.error.response.body, schema.names.commandsBublStop, schema.errors.missingParameter)
            );
        });
    });

    // BUBL STREAM
    describe("Testing /osc/commands/execute camera._bublStream endpoint", function() {
        var sessionId;
        var commandId;

        before(function () {
            if (!isBublcam) {
                return this.skip();
            }

            return testClient.startSession()
            .then(function onSuccess  (res) {
                validate.done(res.body, schema.names.commandStartSession);
                sessionId = res.body.results.sessionId;
                return Utility.restoreDefaultOptions(defaultOptionsFile);
            }).then(function onSuccess  (res) {
                validate.done(res.body, schema.names.commandSetOptions)
            }, wrapError);
        });

        afterEach(function () {
            this.timeout(timeoutValue);
            return Utility.restoreDefaultOptions(defaultOptionsFile)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandSetOptions)
            }, wrapError);
        });

        after( function() {
            return Utility.checkActiveSession()
            .then( function(isActive) {
                if (isActive) {
                    return testClient.closeSession(sessionId)
                    .then( function onSuccess (res) {
                        validate.done(res.body, schema.names.commandCloseSession);
                    }, wrapError);
                }
            }, wrapError);
        });

        it("Expect success.  camera._bublStream successfully streams", function() {
            this.timeout(10000);
            var commandId;
            var deferred = Q.defer();

            return Q.all([testClient.bublStream(sessionId, function onStatusUpdate (res) {
                if (!commandId) {
                    commandId = res.body.id;
                    testClient.bublStop(commandId).then( function onSuccess (res) {
                        assert(Object.keys(res.body).length === 0);
                    })
                    .then(deferred.resolve, deferred.reject);
                }
            })
            .then( function onStreamCompleted (res) {
                validate.done(res.body, schema.names.commandBublStream);
                assert.equal(res.body.id, commandId);
            }, wrapError), deferred.promise])
        });

        it("Expect success. camera._bublStream can start another stream when a stream is already active", function() {
            this.timeout(timeoutValue);
            var commandId1;
            var commandId2;
            var deferred1 = Q.defer();
            var deferred2 = Q.defer();

            return Q.all([testClient.bublStream(sessionId, function onStatusUpdate (res) {
                if (!commandId1) {
                    commandId1 = res.body.id;
                    //Starting this stream, stops the first one
                    testClient.bublStream(sessionId, function onStatusUpdate (res) {
                        if (!commandId2) {
                            commandId2 = res.body.id;
                            testClient.bublStop(commandId2)
                            .then( function onSuccess (res) {
                                assert(Object.keys(res.body).length === 0);
                            })
                            .then(deferred1.resolve, deferred1.reject);
                        }
                    })
                    .then( function onSuccess (res) {
                        validate.done(res.body, schema.names.commandBublStream);
                        assert.equal(res.body.id, commandId2);
                    })
                    .then(deferred2.resolve, deferred2.reject);
                }
            })
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandBublStream);
                assert.equal(res.body.id, commandId1);
            }, wrapError), deferred1.promise, deferred2.promise])

        });

        it("Expect invalidParameterValue Error. camera._bublStream cannot stream when incorrect sessionId type is provided", function() {
            return testClient.bublStream('wrongtype')
            .then( wrapError, function onError (err) {
                validate.error(err.error.response.body, schema.names.commandBublStream, schema.errors.invalidParameterValue)
            });
        });

        it("Expect missingParameter Error. camera._bublStream cannot stream when sessionId is not provided", function() {
            return testClient.bublStream()
            .then( wrapError, function onError (err) {
                validate.error(err.error.response.body, schema.names.commandBublStream, schema.errors.missingParameter)
            });
        });
    });

    // BUBL GET IMAGE
    describe("Testing /osc/commands/_bublGetImage endpoint", function() {
        var sessionId;
        var fileUri;

        before( function() {
            if (!isBublcam) {
                return this.skip();
            }

            return testClient.startSession()
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandStartSession);
                sessionId = res.body.results.sessionId;
            }, wrapError);
        });

        after( function() {
            return Utility.checkActiveSession()
            .then( function(isActive) {
                if (isActive) {
                    return testClient.closeSession(sessionId)
                    .then( function onSuccess (res) {
                        validate.done(res.body, schema.names.commandCloseSession);
                    }, wrapError);
                }
            }, wrapError);
        });

        it("Expect success. camera._bublGetImage successfully gets image when provided with a valid fileUri", function() {
            this.timeout(timeoutValue);
            return testClient.takePicture(sessionId)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandTakePicture);
                fileUri = res.body.results.fileUri;
                return testClient.bublGetImage(fileUri);
            }, wrapError)
            .then( function onSuccess (res) {
                validate.checkForBinary(res.body);
            }, wrapError);
        });

        it("Expect invalidParameterValue Error. camera._bublGetImage cannot get image when fileUri is incorrect", function() {
            return testClient.bublGetImage('wrongtype')
            .then( wrapError, function onError (err) {
                validate.error(err.error.response.body, schema.names.commandGetImage, schema.errors.invalidParameterValue)
            });
        });
    });

    // BUBL UPDATE
    describe('Testing /osc/_bublUpdate endpoint', function() {
        before(function() {
            if (!isMock) {
                return this.skip();
            }
        });

        it('Expect success. /osc/_bublUpdate endpoint successfully returned status code 200', function() {
            this.timeout(timeoutValue);
            return testClient.bublUpdate('dummy_content')
            .then( function onSuccess (res) {
                assert.isNull(res.body);
            }, wrapError);
        });
    });

    // BUBL SHUTDOWN
    describe('Testing /osc/commands/execute camera._bublShutdown', function() {
        before(function() {
            if (!isBublcam) {
                return this.skip();
            }
        });

        var sessionId;

        beforeEach( function() {
            return testClient.startSession()
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandStartSession);
                sessionId = res.body.results.sessionId;
                return Utility.restoreDefaultOptions(defaultOptionsFile);
            }, wrapError)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandSetOptions)
            }, wrapError);
        });

        afterEach( function() {
            return Utility.checkActiveSession()
            .then( function(isActive) {
                if (isActive) {
                    return testClient.closeSession(sessionId)
                    .then( function onSuccess (res) {
                        validate.done(res.body, schema.names.commandCloseSession);
                    }, wrapError);
                }
            }, wrapError);
        });

        it('Expect missingParameter Error. camera._bublShutdown won\'t run unless the active session\'s sessionId is provided', function() {
            this.timeout(timeoutValue);
            return testClient.bublShutdown()
            .then( wrapError, function onError (err) {
                validate.error(err.error.response.body, schema.names.commandBublShutdown, schema.errors.missingParameter);
            });
        });

        it('Expect invalidParameterValue Error. camera._bublShutdown cannot shutdown camera when incorrect sessionId is provided', function() {
            this.timeout(timeoutValue);
            return testClient.bublShutdown(sessionId + '0')
            .then( wrapError, function onError (err) {
                validate.error(err.error.response.body, schema.names.commandBublShutdown, schema.errors.invalidParameterValue);
            });
        });

        it('Expect invalidParameterValue Error. camera._bublShutdown cannot shutdown camera when incorrect shutdownDelay value type is provided', function() {
            this.timeout(timeoutValue);
            return testClient.bublShutdown(sessionId, '...')
            .then( wrapError,
            function onError (err) {
                validate.error(err.error.response.body, schema.names.commandBublShutdown, schema.errors.invalidParameterValue);
            });
        });

        it('Expect success. camera._bublShutdown successfully returned', function() {
            if (!isMock) {
              //FORCE SESSSION CLOSURE BECAUSE OF MOCHA BUG
              return testClient.closeSession(sessionId)
              .then( () => this.skip(), wrapError)
            }

            this.timeout(timeoutValue);
            return testClient.bublShutdown(sessionId)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandBublShutdown);
            }, wrapError);
        });

        it('Expect success. camera._bublShutdown successfully returned when specific shutdownDelay is provided and returned at appropriate time', function() {
            if (!isMock) {
              //FORCE SESSSION CLOSURE BECAUSE OF MOCHA BUG
              return testClient.closeSession(sessionId)
              .then( () => this.skip(), wrapError)
            }

            this.timeout(timeoutValue);
            var expectedShutdownDelay = 3000;
            var startTime = Date.now();
            return testClient.bublShutdown(sessionId, expectedShutdownDelay)
            .then( function onSuccess (res) {
                validate.done(res.body, schema.names.commandBublShutdown);
                var endTime = Date.now();
                assert.isTrue((endTime - startTime) > expectedShutdownDelay);
            }, wrapError);
        });
    });
});
