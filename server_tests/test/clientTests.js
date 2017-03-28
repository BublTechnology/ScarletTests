// Copyright 2015 Bubl Technology Inc.
//
// Licensed under the MIT license
// <LICENSE-MIT or http://opensource.org/licenses/MIT>.
// This file may not be copied, modified, or distributed
// except according to those terms.
// jscs:disable disallowDanglingUnderscores
/* global describe, it, before, beforeEach, after, afterEach */

'use strict'

var OscClient = require('osc-client').BublOscClient
var Schema = require('../lib/schema.js')
var Validator = require('../lib/validator.js')
var Q = require('q')
var Util = require('../lib/util')
var chai = require('chai')
var assert = chai.assert

Q.longStackSupport = true

describe('RUST API TEST SUITE', function () {
  var testClient = new OscClient(process.env.SCARLET_TEST_HOST, process.env.SCARLET_TEST_PORT)
  var Utility = new Util(testClient)
  var camModels = {
    BUBLCAM1_0: 'bubl1',
    BUBLCAM1_2: 'bubl2',
    GENERIC: 'osc',
    BUBLMOCK: 'bublmock'
  }
  var oscApiLevels = {
    APILEVEL1: 1,
    APILEVEL2: 2
  }
  var scarletVersions = {
    SCARLET1: 1,
    SCARLET2: 2
  }
  var serverVersion = process.env.SCARLET_TEST_SCARLET_VERSION || scarletVersions.SCARLET1
  var camApi = Number(process.env.SCARLET_TEST_OSCAPI) || oscApiLevels.APILEVEL1
  var isOSC1 = camApi === oscApiLevels.APILEVEL1
  var isOSC2 = camApi === oscApiLevels.APILEVEL2
  var testModel = process.env.SCARLET_TEST_MODEL || camModels.BUBLMOCK
  var isBublcam = testModel === camModels.BUBLCAM1_0 ||
    testModel === camModels.BUBLCAM1_2 ||
    testModel === camModels.BUBLMOCK
  var isBubl1 = testModel === camModels.BUBLCAM1_0
  var isBubl2 = testModel === camModels.BUBLCAM1_2
  var isMock = testModel === camModels.BUBLMOCK
  var testViaWifi = process.env.SCARLET_TEST_WIFI === '1'
  var defaultOptionsFile = isBubl1 || isMock ? './defaults/mock.json' : './defaults/bubl2.json'
  var timeoutValue = 30000
  var schema = new Schema({
    bubl: isBublcam,
    apiLevel: camApi
  })
  var validate = new Validator(schema)
  function expectError (res) {
    assert.fail('Should not resolve, expecting an error, got ' + JSON.stringify(res))
  }

  before(function () {
    var sessionId

    return testClient.startSession()
    .then(function onSuccess (res) {
      sessionId = res.results.sessionId
      if (isOSC1) {
        return testClient.closeSession(sessionId)
            .then((output) => validate.done(output, schema.names.commandCloseSession))
      } else {
        return testClient.setOptions(sessionId, { clientVersion: 2 })
            .then((output) => validate.done(output, schema.names.commandSetOptions))
      }
    }, function onError (err) {
      if (err.error.code === "unknownCommand") {
        Promise.resolve("Already in OSC 2.0")
      } else {
        throw err
      }
    })
  })

  // OSC INFO
  describe('Testing /osc/info endpoint', function () {
    it('Expect success. /osc/info returns correct info', function () {
      return testClient.getInfo()
        .then((res) => {
          validate.info(res)
        })
    })
  })

  // OSC STATE
  describe('Testing /osc/state endpoint', function () {
    var sessionId

    before(function () {
      if (isOSC1) {
        return testClient.startSession()
          .then(function onSuccess (res) {
            validate.done(res, schema.names.commandStartSession)
            sessionId = res.results.sessionId
          })
      }
    })

    it('Expect success. /osc/state endpoint successfully returns state when state has not changed', function () {
      return testClient.getState()
        .then(function onSuccess (res) {
          validate.state(res)
          if (isOSC1) {
            assert.equal(res.state.sessionId, sessionId)
          }
        })
    })

    it('Expect success. confirming /osc/state endpoint returns correct value when state has changed', function () {
      var oldFingerprint

      return testClient.getState()
        .then(function onSuccess (res) {
          validate.state(res)
          if (isOSC1) {
            assert.equal(res.state.sessionId, sessionId)
            oldFingerprint = res.fingerprint
            return testClient.closeSession(sessionId)
            .then(function onClose (output) {
              validate.done(output, schema.names.commandCloseSession)
              return testClient.getState()
            })
            .then(function onReturn (sta) {
              validate.state(sta)
              assert.notEqual(sta.state.fingerprint, oldFingerprint)
              assert.notEqual(sta.state.sessionId, sessionId)
            })
          }
        })
    })
  })

  // OSC CHECK FOR UPDATES
  describe('Testing /osc/checkForUpdates endpoint', function () {
    var sessionId
    var oldFingerprint

    beforeEach(function () {
      if (isOSC1) {
        return testClient.startSession()
          .then(function onSuccess (res) {
            validate.done(res, schema.names.commandStartSession)
            sessionId = res.results.sessionId
          })
      }
    })

    afterEach(function () {
      if (isOSC1) {
        return Utility.checkActiveSession()
          .then(function (isActive) {
            if (isActive) {
              return testClient.closeSession(sessionId)
                .then(function onSuccess (res) {
                  validate.done(res, schema.names.commandCloseSession)
                })
            }
          })
      }
    })

    it('successfully gets updates when state has not changed', function () {
      return testClient.getState()
        .then(function onSuccess (res) {
          validate.state(res)
          if (isOSC1) {
            assert.equal(res.state.sessionId, sessionId)
          }
          oldFingerprint = res.fingerprint
          return testClient.checkForUpdates(oldFingerprint)
        })
        .then(function onSuccess (res) {
          validate.checkForUpdates(res)
          assert.equal(res.stateFingerprint, oldFingerprint)
        })
    })

    it('Expect success. /osc/checkForUpdates endpoint successfully gets updates when state has changed', function () {
      this.timeout(timeoutValue)

      return testClient.getState()
        .then(function onSuccess (res) {
          validate.state(res)
          oldFingerprint = res.fingerprint
          if (isOSC1) {
            assert.equal(res.state.sessionId, sessionId)
            return testClient.closeSession(sessionId)
            .then(function onClose (output) {
              validate.done(output, schema.names.commandCloseSession)
              return testClient.checkForUpdates(oldFingerprint)
            })
          } else {
            // Only easily changeable state is _bublLatestCapture in OSC2.0
            return testClient.takePicture()
            .then(function onPicture (pic) {
              validate.done(pic, schema.names.takePicture)
              return testClient.checkForUpdates(oldFingerprint)
            })
          }
        })
        .then(function onSuccess (res) {
          validate.checkForUpdates(res)
          assert.notEqual(res.stateFingerprint, oldFingerprint)
        })
    })

    it('successfully gets updates when state has not changed with waitTimeout set to 2', function () {
      var state

      this.timeout(timeoutValue)
      return testClient.getState()
        .then(function onSuccess (res) {
          validate.state(res)
          if (isOSC1) {
            assert.equal(res.state.sessionId, sessionId)
          }
          oldFingerprint = res.fingerprint
          state = res.state
          return testClient.checkForUpdates(oldFingerprint, 2)
        })
        .then(function onSuccess (res) {
          validate.checkForUpdates(res)
          return testClient.getState()
        })
        .then(function onSuccess (res) {
          validate.state(res)
          if (isOSC1) {
            assert.equal(res.state.sessionId, sessionId)
          }
          if (res.fingerprint === oldFingerprint) {
            assert.deepEqual(res.state, state)
          } else {
            assert.notDeepEqual(res.state, state)
          }
        })
    })

    it('throws missingParameter when no fingerprint is provided', function () {
      return testClient.checkForUpdates()
        .then(expectError,
          (err) => validate.error(err, schema.names.checkForUpdates, schema.errors.missingParameter)
      )
    })
  })

  // START SESSION
  describe('Testing /osc/commands/execute camera.startSession endpoint', function () {
    var sessionId

    before(function () {
      if (!isOSC1) {
        return this.skip()
      }
    })

    afterEach(function () {
      return Utility.checkActiveSession()
        .then(function (isActive) {
          if (isActive) {
            return testClient.closeSession(sessionId)
              .then(function onSuccess (res) {
                validate.done(res, schema.names.commandCloseSession)
              })
          }
        })
    })

    it('Expect success. camera.startSession successfully starts a session', function () {
      return testClient.startSession()
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandStartSession)
          sessionId = res.results.sessionId
        })
    })

    it('successfully starts a session when a timeout value of 30 is specified', function () {
      return testClient.startSession(30)
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandStartSession)
          sessionId = res.results.sessionId
          assert.equal(res.results.timeout, 30)
        })
    })

    it('Expect success. camera.startSession will timeout after the the specified timeout value', function () {
      this.timeout(timeoutValue)
      return testClient.startSession(5)
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandStartSession)
          sessionId = res.results.sessionId
          assert.equal(res.results.timeout, 5)
          return Q.delay(8000)
        })
        .then(function () {
          return testClient.startSession()
        })
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandStartSession)
          sessionId = res.results.sessionId
        })
    })

    it('throws cameraInExclusiveUse while another session is already running', function () {
      return testClient.startSession()
        .then(
          (res) => {
            validate.done(res, schema.names.commandStartSession)
            sessionId = res.results.sessionId
            return testClient.startSession()
          }).then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandStartSession,
            schema.errors.cameraInExclusiveUse
          )
      )
    })

    it('throws invalidParameterValue when incorrect timeout type is provided', function () {
      return testClient.startSession('wrongtype')
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandStartSession,
            schema.errors.invalidParameterError
          )
      )
    })
  })

  // UPDATE SESSION
  describe('Testing /osc/commands/execute camera.updateSession endpoint', function () {
    var sessionId

    before(function () {
      if (!isOSC1) {
        return this.skip()
      }
    })

    beforeEach(function () {
      return testClient.startSession()
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandStartSession)
          sessionId = res.results.sessionId
        })
    })

    afterEach(function () {
      return Utility.checkActiveSession()
        .then(function (isActive) {
          if (isActive) {
            return testClient.closeSession(sessionId)
              .then((res) => validate.done(res, schema.names.commandCloseSession))
          }
        })
    })

    it('Expect success. camera.updateSession successfully updates a session', function () {
      return testClient.updateSession(sessionId)
        .then((res) => validate.done(res, schema.names.commandUpdateSession))
    })

    it('successfully updates a session with a timeout value specified', function () {
      return testClient.updateSession(sessionId, 15)
        .then(
          (res) => {
            validate.done(res, schema.names.commandUpdateSession)
            assert.equal(res.results.timeout, 15)
          })
    })

    it('throws missingParameter when sessionId is not specified', function () {
      return testClient.updateSession()
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandUpdateSession,
            schema.errors.missingParameter
          )
      )
    })

    it('throws invalidParameterValue when sessionId is an incorrect type', function () {
      return testClient.updateSession('wrongtype')
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandUpdateSession,
            schema.errors.invalidParameterValue
          )
      )
    })

    it('throws invalidParameterValue when timeout is an incorrect type', function () {
      return testClient.updateSession(sessionId, 'wrongtype')
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandUpdateSession,
            schema.errors.invalidParameterValue
          )
      )
    })
  })

  // CLOSE SESSION
  describe('Testing /osc/commands/execute camera.closeSession endpoint', function () {
    var sessionId

    before(function () {
      if (!isOSC1) {
        return this.skip()
      }
    })

    beforeEach(function () {
      return testClient.startSession()
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandStartSession)
          sessionId = res.results.sessionId
        })
    })

    afterEach(function () {
      return Utility.checkActiveSession()
        .then(function (isActive) {
          if (isActive) {
            return testClient.closeSession(sessionId)
              .then((res) => validate.done(res, schema.names.commandCloseSession))
          }
        })
    })

    it('Expect success. camera.closeSession successfully closes a session', function () {
      return testClient.closeSession(sessionId)
        .then((res) => validate.done(res, schema.names.commandCloseSession))
    })

    it('throws missingParameter when sessionId is not provided', function () {
      return testClient.closeSession()
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandCloseSession,
            schema.errors.missingParameter
          )
      )
    })

    it('throws invalidParameterValue when sessionId is an incorrect type', function () {
      return testClient.closeSession('wrongtype')
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandCloseSession,
            schema.errors.invalidParameterValue
          )
      )
    })

    it('throws invalidParameterValue when no session is active', function () {
      return testClient.closeSession(sessionId)
        .then(
          (res) => {
            validate.done(res, schema.names.commandCloseSession)
            return testClient.closeSession(sessionId)
          }).then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandCloseSession,
            schema.errors.invalidParameterValue
          )
        )
    })
  })

  // TAKE PICTURE
  describe('Testing /osc/commands/execute camera.takePicture endpoint', function () {
    var sessionId

    before(function () {
      if (isOSC1) {
        return testClient.startSession()
          .then(function onSuccess (res) {
            validate.done(res, schema.names.commandStartSession)
            sessionId = res.results.sessionId
            return Utility.restoreDefaultOptions(defaultOptionsFile)
          })
          .then(function onSuccess (res) {
            validate.done(res, schema.names.commandSetOptions)
          })
      } else {
        return testClient.reset()
          .then(function onSuccess (res) {
            validate.done(res, schema.names.commandReset)
          }, function onError (err) {
          })
      }
    })

    afterEach(function () {
      if (isOSC1) {
        return Utility.restoreDefaultOptions(defaultOptionsFile)
          .then(function onSuccess (res) {
            validate.done(res, schema.names.commandSetOptions)
          })
      } else {
        return testClient.reset()
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandReset)
        })
      }


    })

    after(function () {
      if (isOSC1) {
        return Utility.checkActiveSession()
          .then(function (isActive) {
            if (isActive) {
              return testClient.closeSession(sessionId)
                .then((res) => validate.done(res, schema.names.commandCloseSession))
            }
          })
      }
    })

    it('Expect success.  camera.takePicture successfully takes a picture', function () {

      this.timeout(timeoutValue)
      return testClient.takePicture(sessionId)
        .then((res) => {
          validate.done(res, schema.names.commandTakePicture)
        })
    })

    it('Expect success. camera.takePicture successfully takes an HDR picture', function () {
      this.timeout(timeoutValue * 2)
      return testClient.setOptions(sessionId, {
        hdr: isOSC1 ? true : 'hdr'
      })
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandSetOptions)
          return testClient.takePicture(sessionId)
        })
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandTakePicture)
          if (isOSC1) {
            // eslint-disable-next-line no-underscore-dangle
            assert.equal(res.results._bublFileUris.length, 3)
          } else {
            // eslint-disable-next-line no-underscore-dangle
            assert.equal(res.results._bublFileUrls.length, 3)
          }
        })
    })

    it('throws invalidParameterValue when incorrect sessionId type is provided', function () {
      return testClient.takePicture('wrongtype')
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandTakePicture,
            schema.errors.invalidParameterValue
          )
      )
    })

    it('throws missingParameter when sessionId is not provided', function () {
      if (!isOSC1) {
        return this.skip()
      }

      return testClient.takePicture()
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandTakePicture,
            schema.errors.missingParameter
          )
      )
    })
  })

  // LIST IMAGES
  describe('Testing /osc/commands/execute camera.listImage endpoint', function () {
    var sessionId

    before(function () {
      if (!isOSC1) {
        return this.skip()
      }

      return testClient.startSession()
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandStartSession)
          sessionId = res.results.sessionId
        })
    })

    beforeEach(function () {
      this.timeout(timeoutValue)
      return Utility.deleteAllImages()
    })

    after(function () {
      if (!isOSC1) {
        return this.skip()
      }

      return Utility.checkActiveSession()
        .then(function (isActive) {
          if (isActive) {
            return testClient.closeSession(sessionId)
              .then((res) => validate.done(res, schema.names.commandCloseSession))
          }
        })
    })

    it('returns one entry when provided with entryCount = 1 when server has 1 image', function () {
      this.timeout(timeoutValue)
      return testClient.takePicture(sessionId)
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandTakePicture)
          return testClient.listImages(1, true, 100)
        })
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandListImages)
          assert.equal(res.results.entries.length, 1)
          assert.equal(res.results.totalEntries, 1)
          assert.notProperty(res.results, 'continuationToken')
          for (let i = 0; i < res.results.entries.length; i++) {
            assert.property(res.results.entries[i], 'thumbnail')
          }
        })
    })

    it('returns 1 entry when entryCount=1 and includeThumb=false and server has 1 image', function () {
      this.timeout(timeoutValue)
      return testClient.takePicture(sessionId)
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandTakePicture)
          return testClient.listImages(1, false)
        })
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandListImages)
          assert.equal(res.results.entries.length, 1)
          assert.equal(res.results.totalEntries, 1)
          assert.notProperty(res.results, 'continuationToken')
          for (let i = 0; i < res.results.entries.length; i++) {
            assert.notProperty(res.results.entries[i], 'thumbnail')
          }
        })
    })

    it('returns 1 entry and a continuation token when entryCount = 1 and server has 2 images', function () {
      this.timeout(timeoutValue)
      return testClient.takePicture(sessionId)
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandTakePicture)
          return testClient.takePicture(sessionId)
        })
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandTakePicture)
          return testClient.listImages(1, false)
        })
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandListImages)
          assert.equal(res.results.entries.length, 1)
          assert.equal(res.results.totalEntries, 2)
          assert.property(res.results, 'continuationToken')
          for (let i = 0; i < res.results.entries.length; i++) {
            assert.notProperty(res.results.entries[i], 'thumbnail')
          }
        })
    })

    it('returns 1 entry when called with continuation token and entryCount=1 and server has 2 images', function () {
      this.timeout(timeoutValue)
      return testClient.takePicture(sessionId)
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandTakePicture)
          return testClient.takePicture(sessionId)
        })
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandTakePicture)
          return testClient.listImages(1, false)
        })
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandListImages)
          assert.equal(res.results.entries.length, 1)
          assert.equal(res.results.totalEntries, 2)
          assert.property(res.results, 'continuationToken')
          for (let i = 0; i < res.results.entries.length; i++) {
            assert.notProperty(res.results.entries[i], 'thumbnail')
          }
          return testClient.listImages(1, false, undefined, res.results.continuationToken)
        })
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandListImages)
          assert.equal(res.results.entries.length, 1)
          assert.equal(res.results.totalEntries, 2)
          assert.notProperty(res.results, 'continuationToken')
          for (let i = 0; i < res.results.entries.length; i++) {
            assert.notProperty(res.results.entries[i], 'thumbnail')
          }
        })
    })

    it('returns 2 entries and no continuation token when entryCount = 2 when server has 2 images', function () {
      this.timeout(timeoutValue)
      return testClient.takePicture(sessionId)
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandTakePicture)
          return testClient.takePicture(sessionId)
        })
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandTakePicture)
          return testClient.listImages(2, false)
        })
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandListImages)
          assert.equal(res.results.entries.length, 2)
          assert.equal(res.results.totalEntries, 2)
          assert.notProperty(res.results, 'continuationToken')
          for (let i = 0; i < res.results.entries.length; i++) {
            assert.notProperty(res.results.entries[i], 'thumbnail')
          }
        })
    })

    it('Expect success. camera.listImages lists zero images when no images are in the system', function () {
      return testClient.listImages(2, false)
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandListImages)
          assert.equal(res.results.entries.length, 0)
          assert.equal(res.results.totalEntries, 0)
          assert.notProperty(res.results, 'continuationToken')
          for (let i = 0; i < res.results.entries.length; i++) {
            assert.notProperty(res.results.entries[i], 'thumbnail')
          }
        })
    })

    it('throws missingParameter when entryCount is not provided', function () {
      return testClient.listImages()
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandListImages,
            schema.errors.missingParameter
          )
      )
    })

    it('Expect missingParameter Error. camera.listImages cannot list images when maxSize is not provided', function () {
      return testClient.listImages(1, true)
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandListImages,
            schema.errors.missingParameter
          )
      )
    })

    it('throw missingParameter when maxSize is not provided and includeThumb defaults to true', function () {
      return testClient.listImages(1, undefined)
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandListImages,
            schema.errors.missingParameter
          )
      )
    })

    it('throws invalidParameterValue when false token is given', function () {
      return testClient.listImages('wrongtype')
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandListImages,
            schema.errors.invalidParameterValue
          )
      )
    })
  })

  // DELETE
  describe('Testing /osc/commands/execute camera.delete endpoint', function () {
    var sessionId
    var fileUri
    var fileUrl



    before(function () {
      if (isOSC1) {
        return testClient.startSession()
          .then(function onSuccess (res) {
            validate.done(res, schema.names.commandStartSession)
            sessionId = res.results.sessionId
          })
      }
    })

    after(function () {
      if (isOSC1) {
        return Utility.checkActiveSession()
          .then(function (isActive) {
            if (isActive) {
              return testClient.closeSession(sessionId)
                .then(function onSuccess (res) {
                  validate.done(res, schema.names.commandCloseSession)
                })
            }
          })
      }
    })

    it('Expect success. camera.delete successfully deletes file when provided with valid fileUri/fileUrl', function () {
      this.timeout(timeoutValue)
      return testClient.takePicture(sessionId)
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandTakePicture)
          if (isOSC1) {
            fileUri = res.results.fileUri
            return testClient.delete(fileUri)
          } else {
            fileUrl = res.results.fileUrl
            return testClient.delete2([fileUrl])
          }
        })
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandDelete)
        })
    })

    it('successfully delete all files when fileUrls only constains string "all"', function () {
      if (isOSC1) {
        return this.skip()
      }

      var deferred = Q.defer()
      var captureStart = false

      this.timeout(timeoutValue * 2)
      return testClient.takePicture()
        .then(function onSuccess (res) {
          return testClient.setOptions(sessionId, { captureMode: 'video' })
        }).then(function onSuccess (res) {
          validate.done(res, schema.names.commandSetOptions)
          return Q.all([testClient.startCapture(function onStatusChange (sta) {
            if (!captureStart) {
              captureStart = true
              Q.delay(5000)
              .then(() => testClient.stopCapture())
              .then(deferred.resolve, deferred.reject)
            }
          }), deferred.promise])
        }).then(function onSuccess () {
          return testClient.delete2(['all'])
        }).then(function onSuccess (res) {
          validate.done(res, schema.names.commandDelete)
          assert.equal(res.results.fileUrls.length, 0)
          return testClient.listFiles('all', 1000, null)
        }).then(function onSuccess (res) {
          validate.done(res, schema.names.commandListFiles)
          assert.equal(res.results.totalEntries, 0)
        })
    })

    it('successfully delete all images when fileUrls only constains string "image"', function () {
      if (isOSC1) {
        return this.skip()
      }

      var deferred = Q.defer()
      var captureStart = false

      this.timeout(timeoutValue * 2)
      return testClient.takePicture()
        .then(function onSuccess (res) {
          return testClient.setOptions(sessionId, { captureMode: 'video' })
        }).then(function onSuccess (res) {
          validate.done(res, schema.names.commandSetOptions)
          return Q.all([testClient.startCapture(function onStatusChange (sta) {
            if (!captureStart) {
              captureStart = true
              Q.delay(5000)
              .then(() => testClient.stopCapture())
              .then(deferred.resolve, deferred.reject)
            }
          }), deferred.promise])
        }).then(function onSuccess (res) {
          return testClient.delete2(['image'])
        }).then(function onSuccess (res) {
          validate.done(res, schema.names.commandDelete)
          assert.equal(res.results.fileUrls.length, 0)
          return testClient.listFiles('all', 1000, null)
        }).then(function onSuccess (res) {
          validate.done(res, schema.names.commandListFiles)
          res.results.entries.forEach(function isMP4 (file) {
            assert.match(file.fileUrl, /mp4$/i)
          })
        })
    })

    it('successfully delete all images when fileUrls only constains string "video"', function () {
      if (isOSC1) {
        return this.skip()
      }

      var deferred = Q.defer()
      var captureStart = false

      this.timeout(timeoutValue * 2)
      return testClient.takePicture()
        .then(function onSuccess (res) {
          return testClient.setOptions(sessionId, { captureMode: 'video' })
        }).then(function onSuccess (res) {
          validate.done(res, schema.names.commandSetOptions)
          return Q.all([testClient.startCapture(function onStatusChange (sta) {
            if (!captureStart) {
              captureStart = true
              Q.delay(5000)
              .then(() => testClient.stopCapture())
              .then(deferred.resolve, deferred.reject)
            }
          }), deferred.promise])
        }).then(function onSuccess (res) {
          return testClient.delete2(['video'])
        }).then(function onSuccess (res) {
          validate.done(res, schema.names.commandDelete)
          assert.equal(res.results.fileUrls.length, 0)
          return testClient.listFiles('all', 1000, null)
        }).then(function onSuccess (res) {
          validate.done(res, schema.names.commandListFiles)
          res.results.entries.forEach(function isMP4 (file) {
            assert.match(file.fileUrl, /jpg$/i)
          })
        })
    })

    it('throws invalidParameterValue when incorrect fileUri/fileUrls type is provided', function () {
      if (isOSC1) {
        return testClient.delete('wrongtype')
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandDelete,
            schema.errors.invalidParameterValue
          )
        )
      } else {
        return testClient.delete2('wrongtype')
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandDelete,
            schema.errors.invalidParameterValue
          )
        )
      }
    })

    it('throw missingParameter error when fileUri/fileUrls are not provided', function () {
      if (isOSC1) {
        return testClient.delete()
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandDelete,
            schema.errors.missingParameter
          )
        )
      } else {
        return testClient.delete2()
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandDelete,
            schema.errors.missingParameter
          )
        )
      }
    })
  })

  // GET IMAGE
  describe('Testing /osc/commands/execute camera.getImage endpoint', function () {
    var sessionId
    var fileUri

    before(function () {
      if (!isOSC1) {
        return this.skip()
      }

      return testClient.startSession()
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandStartSession)
          sessionId = res.results.sessionId
        })
    })

    after(function () {
      if (isOSC1) {
        return Utility.checkActiveSession()
          .then(function (isActive) {
            if (isActive) {
              return testClient.closeSession(sessionId)
                .then(function onSuccess (res) {
                  validate.done(res, schema.names.commandCloseSession)
                })
            }
          })
      }

    })

    it('Expect success. camera.getImage successfully gets image when provided with a valid fileUri', function () {
      this.timeout(timeoutValue)
      return testClient.takePicture(sessionId)
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandTakePicture)
          fileUri = res.results.fileUri
          return testClient.getImage(fileUri)
        })
        .then((res) => validate.checkForBinary(res))
    })

    it('successfully gets image when provided with a valid fileUri and maxSize', function () {
      this.timeout(timeoutValue)
      return testClient.takePicture(sessionId)
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandTakePicture)
          fileUri = res.results.fileUri
          return testClient.getImage(fileUri, 100)
        })
        .then((res) => validate.checkForBinary(res))
    })

    it('Expect missingParameter Error. camera.getImage cannot get image when fileUri is not provided', function () {
      return testClient.getImage()
        .then(expectError,
          (err) => validate.error(err, schema.names.commandGetImage, schema.errors.missingParameter)
      )
    })

    it('Expect invalidParameterValue Error. camera.getImage cannot get image when fileUri is incorrect', function () {
      return testClient.getImage('wrongtype')
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandGetImage,
            schema.errors.invalidParameterValue
          )
      )
    })
  })

  // LIST FILES (OSC2.0)
  describe('Testing /osc/commands/execute camera.listFiles endpoint', function () {
    var sessionId
    var expectedImageCount = 0
    var expectedVideoCount = 0
    var totalEntryCount = 0
    var deferred = Q.defer()
    var startCapture = false

    before(function () {
      if (!isOSC2) {
        return this.skip()
      }
      this.timeout(timeoutValue * 2)
      // delete exisiting files on SD card, if any
      return testClient.delete2(["all"])
      .then(function onSuccess (res) {
        validate.done(res, schema.names.commandDelete)
        assert.equal(res.results.fileUrls.length, 0)
        return testClient.takePicture(sessionId)
      }).then(function onSuccess (res) {
        validate.done(res, schema.names.commandTakePicture)
        expectedImageCount++
        totalEntryCount++
        return testClient.takePicture(sessionId)
      }).then(function onSuccess (res) {
        validate.done(res, schema.names.commandTakePicture)
        expectedImageCount++
        totalEntryCount++
        return testClient.takePicture(sessionId)
      }).then(function onSuccess (res) {
        validate.done(res, schema.names.commandTakePicture)
        expectedImageCount++
        totalEntryCount++
        return testClient.setOptions(sessionId, { captureMode: 'video' })
      })
      .then(function onVideo (res) {
        validate.done(res, schema.names.commandSetOptions)
        return Q.all([testClient.startCapture(function onStatusChange (sta) {
          if (!startCapture) {
            startCapture = true
            Q.delay(5000)
            .then(() => testClient.stopCapture())
            .then(deferred.resolve, deferred.reject)
          }
        }).then((output) => {
          expectedVideoCount++
          totalEntryCount++
          validate.done(output, schema.names.commandStartCapture)
        }),
          deferred.promise])
      })
    })

    after(function () {
      if (!isOSC2) {
        return this.skip()
      }
      // delete all files on SD card
      return testClient.delete2(["all"])
      .then(function onSuccess (res) {
        validate.done(res, schema.names.commandDelete)
        assert.equal(res.results.fileUrls.length, 0)
      })
    })
    // testClient.listFiles(fileType, entryCount, maxThumbSize, startPosition(opstion))

    it('Successfully lists correct entries when fileType is supported', function () {
      return testClient.listFiles('image', expectedImageCount, 1024)
      .then(function onSuccess (res) {
        validate.done(res, schema.names.commandListFiles)
        assert.equal(res.results.totalEntries, expectedImageCount)
        res.results.entries.forEach(function isMP4 (file) {
          assert.match(file.fileUrl, /jpg$/i)
        })
        return testClient.listFiles('video', expectedVideoCount, 1024)
      }).then(function onSuccess (res) {
        validate.done(res, schema.names.commandListFiles)
        assert.equal(res.results.totalEntries, expectedVideoCount)
        res.results.entries.forEach(function isMP4 (file) {
          assert.match(file.fileUrl, /mp4$/i)
        })
        return testClient.listFiles('all', totalEntryCount, 1024)
      }).then(function onSuccess (res) {
        validate.done(res, schema.names.commandListFiles)
        assert.equal(res.results.totalEntries, totalEntryCount)
      })
    })

    it('Returns maximum number of entries when requested entryCount exceeds totalEntries', function () {
      var maxEntries
      var maxThumbnails = []

      return testClient.listFiles('all', totalEntryCount + 10, 1024 * 2)
      .then(function onSuccess (res) {
        validate.done(res, schema.names.commandListFiles)
        maxEntries = res.results.totalEntries
        res.results.entries.forEach(function getMaxThumbList (entry) {
          maxThumbnails.push(entry.thumbnail)
        })
        return testClient.listFiles('all', totalEntryCount, 1024)
      }).then(function onSuccess (res) {
        validate.done(res, schema.names.commandListFiles)
        assert.equal(res.results.totalEntries, maxEntries)
        for (let i = 0; i < res.results.totalEntries; i++) {
          assert.include(maxThumbnails, res.results.entries[i].thumbnail)
        }
      })
    })

    it('Lists file entries starting from startPosition', function () {
      var shortList
      var expectedList

      return testClient.listFiles('all', totalEntryCount, 1024, 2)
      .then(function onSuccess (res) {
        validate.done(res, schema.names.commandListFiles)
        shortList = res.results.entries
        return testClient.listFiles('all', totalEntryCount, 1024)
      }).then(function onSuccess (res) {
        validate.done(res, schema.names.commandListFiles)
        expectedList = res.results.entries.slice(2, 4)
        for (let i = 0; i < expectedList.length; i++) {
          assert.include(shortList, expectedList[i])
        }
      })
    })

    it('Returns empty array if startPosition is bigger than the position of the last entry', function () {
      return testClient.listFiles('all', totalEntryCount, 1024, totalEntryCount)
      .then(function onSuccess (res) {
        validate.done(res, schema.names.commandListFiles)
        assert(res.results.entries.length === 0)
        assert.equal(res.results.totalEntries, totalEntryCount)
      })
    })

    it('Lists 2 entries when entryCount is 2', function () {
      return testClient.listFiles('all', 2, 1024)
      .then(function onSuccess (res) {
        validate.done(res, schema.names.commandListFiles)
        assert(res.results.entries.length === 2)
        assert.equal(res.results.totalEntries, totalEntryCount)
      })
    })

    it('Lists actual number of files remaining if entryCount exceeds the files remaining', function () {
      return testClient.listFiles('all', totalEntryCount + 10, 1024)
      .then(function onSuccess (res) {
        validate.done(res, schema.names.commandListFiles)
        assert.equal(res.results.entries.length, totalEntryCount)
        assert.equal(res.results.totalEntries, totalEntryCount)
      })
    })

    it('Exclude thumbnails from list entries when maxThumbSize set to null', function () {
      return testClient.listFiles('all', totalEntryCount, null)
      .then(function onSuccess (res) {
        validate.done(res, schema.names.commandListFiles)
        assert.equal(res.results.entries.length, totalEntryCount)
        assert.equal(res.results.totalEntries, totalEntryCount)
        assert.notProperty(res.results.entries, 'thumbnails')
      })
    })

    it('Throw missingParameter error if fileType not specified', function () {
      return testClient.listFiles(undefined, totalEntryCount, 1024)
      .then(expectError,
        (err) => validate.error(
          err,
          schema.names.commandListFiles,
          schema.errors.missingParameter)
      )
    })

    it('Throw missingParameter error if entryCount not specified', function () {
      return testClient.listFiles('all', undefined, 1024)
      .then(expectError,
        (err) => validate.error(
          err,
          schema.names.commandListFiles,
          schema.errors.missingParameter)
      )
    })

    // Skip for now until invalidParameterName reporting implemented
    it.skip('Throw invalidParameterName error if fileType is "thumbnail"', function () {
      return testClient.listFiles('thumbnail', totalEntryCount, 1024)
      .then(expectError,
        (err) => validate.error(
          err,
          schema.names.commandListFiles,
          schema.errors.invalidParameterName)
      )
    })

    it('Throw invalidParameterValue error if entryCount is negative', function () {
      return testClient.listFiles('all', -10, 1024)
      .then(expectError,
        (err) => validate.error(
          err,
          schema.names.commandListFiles,
          schema.errors.invalidParameterValue)
      )
    })

    it('Throw invalidParameterValue error if entryCount is the wrong type', function () {
      return testClient.listFiles('all', 'wrongtype', 1024)
      .then(expectError,
        (err) => validate.error(
          err,
          schema.names.commandListFiles,
          schema.errors.invalidParameterValue)
      )
    })

    it('Throw invalidParameterValue error if maxThumbSize is negative', function () {
      return testClient.listFiles('all', totalEntryCount, -1024)
      .then(expectError,
        (err) => validate.error(
          err,
          schema.names.commandListFiles,
          schema.errors.invalidParameterValue)
      )
    })

    it('Throw invalidParameterValue Error if maxThumbSize is the wrong type', function () {
      return testClient.listFiles('all', totalEntryCount, 'wrongtype')
      .then(expectError,
        (err) => validate.error(
          err,
          schema.names.commandListFiles,
          schema.errors.invalidParameterValue)
      )
    })

    it('Return empty array if no files on the SD card', function () {
      return testClient.delete2(['all'])
      .then((res) => testClient.listFiles('all', totalEntryCount, 1024))
      .then(function onSuccess (res) {
        validate.done(res, schema.names.commandListFiles)
        assert(Object.keys(res.results.entries).length === 0)
        assert.equal(res.results.totalEntries, 0)
      })
    })
  })

  // GET METADATA
  describe('Testing /osc/commands/execute camera.getMetadata endpoint', function () {
    var sessionId
    var fileUri

    before(function () {
      if (!isOSC1) {
        return this.skip()
      }

      this.timeout(timeoutValue)
      return testClient.startSession()
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandStartSession)
          sessionId = res.results.sessionId
          return testClient.takePicture(sessionId)
        })
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandTakePicture)
          fileUri = res.results.fileUri
        })
    })

    after(function () {
      if (!isOSC1) {
        return this.skip()
      }

      return Utility.checkActiveSession()
        .then(function (isActive) {
          if (isActive) {
            return testClient.closeSession(sessionId)
              .then(function onSuccess (res) {
                validate.done(res, schema.names.commandCloseSession)
              })
          }
        })
    })

    it('Expect success. camera.getMetadata successfully gets metadata when provided with a valid fileUri', function () {
      return testClient.getMetadata(fileUri)
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandGetMetadata)
        })
    })

    it('throws invalidParameterValue when fileUri does not exist', function () {
      return testClient.getMetadata('wrongtype')
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandGetMetadata,
            schema.errors.invalidParameterValue
          )
      )
    })

    it('throws missingParameter when fileUri is not provided', function () {
      return testClient.getMetadata()
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandGetMetadata,
            schema.errors.missingParameter
          )
      )
    })
  })

  // GET OPTIONS
  describe('Testing /osc/commands/execute camera.getOptions endpoint', function () {
    if (isOSC1) {
      var sessionId
    }

    var specifiedOptions = ['captureMode', 'exposureProgram', 'iso', 'shutterSpeed', 'aperture',
      'whiteBalance', 'exposureCompensation', 'fileFormat', 'exposureDelay',
      'sleepDelay', 'offDelay', 'hdr', 'exposureBracket', 'gyro', 'gps',
      'imageStabilization'].concat(isOSC1 ? ['_bublVideoFileFormat'] : ['previewFormat',
        'captureInterval', 'captureNumber', 'remainingVideoSeconds', 'pollingDelay',
        'delayProcessing', 'clientVersion'])

    before(function () {
      if (isOSC1) {
        return testClient.startSession()
          .then(function onSuccess (res) {
            validate.done(res, schema.names.commandStartSession)
            sessionId = res.results.sessionId
          })
      }
    })

    after(function () {
      if (isOSC1) {
        return Utility.checkActiveSession()
          .then(function (isActive) {
            if (isActive) {
              return testClient.closeSession(sessionId)
                .then(function onSuccess (res) {
                  validate.done(res, schema.names.commandCloseSession)
                })
            }
          })
      }
    })

    it('gets correct options when gettable options are set to supported values', function () {
      return testClient.getOptions(sessionId, specifiedOptions)
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandGetOptions)
          for (let i = 0; i < specifiedOptions.length; i++) {
            assert.property(res.results.options, specifiedOptions[i])
          }
        })
    })

    it('Expect missingParameter Error. camera.getOptions cannot get options when options is not provided', function () {
      return testClient.getOptions(sessionId)
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandGetOptions,
            schema.errors.missingParameter
          )
      )
    })

    it('throws missingParameter when sessionId is not provided', function () {
      if (!isOSC1) {
        return this.skip()
      }
      return testClient.getOptions(undefined, specifiedOptions)
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandGetOptions,
            schema.errors.missingParameter
          )
      )
    })

    // RE-ADD ONCE EXTRA FIELD CHECKING HAS BEEN IMPLEMENTED
    // Also, for this test needs to report different error based on OSC version
    // OSC1: invalidParameterValue OSC2: invalidParameterName
    // Skip for now until invalidParameterName reporting implemented in osc-client 2
    it('throws invalidParameterValue when options is set to unsupported value', function () {
      if (isBublcam && serverVersion < 2) {
        return this.skip()
      }

      return testClient.getOptions(sessionId, ['wrongtype'])
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandGetOptions,
            schema.errors.invalidParameterValue
          )
      )
    })

    // Doesn't work properly since OSC1 doesn't report invalidParameterName
    // Skip for now until invalidParameterName reporting implemented
    it.skip('throws invalidParameterName if OSC1 camera requests OSC2-specific options', function () {
      if (isBublcam && serverVersion < 2) {
        return this.skip()
      }

      if (!isOSC1) {
        return this.skip()
      }

      return testClient.getOptions(sessionId, ['captureInterval'])
        .then(expectError,
          (err) => validate.error(
            err,
            schema.names.commandGetOptions,
            schema.errors.invalidParameterName
          )
      )
    })
  })

  // SET OPTIONS
  describe('Testing /osc/commands/execute camera.setOptions endpoint', function () {
    var sessionId
    var jpegFileFormat
    if (isBubl1 || isMock) {
      jpegFileFormat = { fileFormat: { type: 'jpeg', width: 3840, height: 3840 } }
    } else if (isBubl2) {
      jpegFileFormat = { fileFormat: { type: 'jpeg', width: 4896, height: 4896 } }
    }
    var rawFileFormat = { fileFormat: { type: 'raw', width: 3840, height: 3840 } }
    var bublVideoFileFormat
    if (isBubl1 || isMock) {
      bublVideoFileFormat = {
        _bublVideoFileFormat: { type: 'mp4', width: 1920, height: 1920 }
      }
    } else if (isBubl2) {
      bublVideoFileFormat = {
        _bublVideoFileFormat: { type: 'mp4', width: 2448, height: 2448 }
      }
    }

    before(function () {
      if (isOSC1) {
        return testClient.startSession()
          .then(function onSuccess (res) {
            validate.done(res, schema.names.commandStartSession)
            sessionId = res.results.sessionId
          })
      }
    })

    after(function () {
      if (isOSC1) {
        return Utility.restoreDefaultOptions(defaultOptionsFile)
          .then(function onSuccess (res) {
            validate.done(res, schema.names.commandSetOptions)
            return testClient.closeSession(sessionId)
          })
          .then((res) => validate.done(res, schema.names.commandCloseSession))
      } else {
        return testClient.reset()
          .then((res) => validate.done(res, schema.names.commandReset))
      }
    })

    it(' successfully sets options when sleepDelay option is set to supported value', function () {
      return testClient.setOptions(sessionId, { sleepDelay: 5 })
        .then(
          (res) => validate.done(res, schema.names.commandSetOptions)
        )
    })

    it('throws invalidParameterValue when sleepDelay option is set to unsupported value', function () {
      return testClient.setOptions(sessionId, { sleepDelay: -1 })
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandSetOptions,
            schema.errors.invalidParameterValue
          )
      )
    })

    it('successfully sets options when offDelay option is set to supported value', function () {
      return testClient.setOptions(sessionId, { offDelay: 5 })
        .then(
          (res) => validate.done(res, schema.names.commandSetOptions)
        )
    })

    it('throws invalidParameterValue when offDelay option is set to unsupported value', function () {
      return testClient.setOptions(sessionId, { offDelay: -1 })
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandSetOptions,
            schema.errors.invalidParameterValue
          )
      )
    })

    it('successfully sets options when imageStabilization option is set to supported value', function () {
      return testClient.setOptions(sessionId, {
        imageStabilization: 'off'
      })
        .then((res) => validate.done(res, schema.names.commandSetOptions))
    })

    it('throws invalidParameterValue when imageStabilization option is set to unsupported value', function () {
      return testClient.setOptions(sessionId, { imageStabilization: 'UNSUPPORTED' })
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandSetOptions,
            schema.errors.invalidParameterValue
          )
      )
    })

    it('successfully sets options when hdr option is set to supported value', function () {
      return testClient.setOptions(sessionId, {
        hdr: isOSC1 ? true : 'hdr'
      })
        .then((res) => validate.done(res, schema.names.commandSetOptions))
      })

    it('throws invalidParameterValue when hdr option is set to unsupported value', function () {
      return testClient.setOptions(sessionId, { hdr: 'UNSUPPORTED' })
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandSetOptions,
            schema.errors.invalidParameterValue
          )
      )
    })

    it('successfully sets options when captureMode option is set to supported value _bublVideo', function () {
      if (!isBublcam || !isOSC1) {
        return this.skip()
      }

      return testClient.setOptions(sessionId, {
        captureMode: '_bublVideo'
      })
        .then((res) => validate.done(res, schema.names.commandSetOptions))
    })

    it('successfully sets options when captureMode option is set to supported value Image', function () {
      return testClient.setOptions(sessionId, {
        captureMode: 'image'
      })
        .then((res) => validate.done(res, schema.names.commandSetOptions))
    })

    it('throws invalidParameterValue when captureMode option is set to unsupported value', function () {
      return testClient.setOptions(sessionId, { captureMode: 'UNSUPPORTED' })
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandSetOptions,
            schema.errors.invalidParameterValue
          )
      )
    })

    it('successfully sets options when exposureProgram option is set to supported value', function () {
      return testClient.setOptions(sessionId, {
        exposureProgram: 2
      })
        .then((res) => validate.done(res, schema.names.commandSetOptions))
    })

    it('throws invalidParameterValue when exposureProgram option is set to unsupported value', function () {
      return testClient.setOptions(sessionId, { exposureProgram: -1 })
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandSetOptions,
            schema.errors.invalidParameterValue
          )
      )
    })

    it('successfully sets options when whiteBalance option is set to supported value', function () {
      return testClient.setOptions(sessionId, {
        whiteBalance: 'auto'
      })
        .then((res) => validate.done(res, schema.names.commandSetOptions))
    })

    it('throws invalidParameterValue when whiteBalance option is set to unsupported value', function () {
      return testClient.setOptions(sessionId, { whiteBalance: 'UNSUPPORTED' })
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandSetOptions,
            schema.errors.invalidParameterValue
          )
      )
    })

    it('successfully sets options when fileFormat option is set to supported value raw for image', function () {
      if (isBubl1 || isMock) {
        return testClient.setOptions(sessionId, rawFileFormat)
          .then((res) => validate.done(res, schema.names.commandSetOptions))
      } else {
        return this.skip()
      }
    })

    it('successfully sets options when fileFormat option is set to supported value jpeg for image', function () {
      return testClient.setOptions(sessionId, jpegFileFormat)
        .then((res) => validate.done(res, schema.names.commandSetOptions))
    })

    it('throws invalidParameterValue when fileFormat option is set to unsupported value', function () {
      return testClient.setOptions(sessionId, { fileFormat: 'UNSUPPORTED' })
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandSetOptions,
            schema.errors.invalidParameterValue
          )
        )
    })

    it('successfully sets options when _bublVideoFileFormat option is set to supported value', function () {
      if (!isBublcam || !isOSC1) {
        return this.skip()
      }

      return testClient.setOptions(sessionId, bublVideoFileFormat)
        .then((res) => validate.done(res, schema.names.commandSetOptions))
    })

    it('successfully sets options when _bublVideoFileFormat option is set to supported value (SD)', function () {
      if (isBubl1 || (isMock && isOSC1)) {
        return testClient.setOptions(sessionId,
          { _bublVideoFileFormat: { type: 'mp4', width: 1440, height: 1440 } })
          .then((res) => validate.done(res, schema.names.commandSetOptions))
      } else {
        return this.skip()
      }
    })

    it('throws invalidParameterValue when _bublVideoFileFormat option is set to unsupported value', function () {
      if (!isBublcam || !isOSC1) {
        return this.skip()
      }

      return testClient.setOptions(sessionId,
        { _bublVideoFileFormat: 'UNSUPPORTED' })
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandSetOptions,
            schema.errors.invalidParameterValue
          )
      )
    })

    it('successfully sets options when exposureDelay option is set to supported value', function () {
      return testClient.setOptions(sessionId, { exposureDelay: 4 })
        .then((res) => validate.done(res, schema.names.commandSetOptions))
    })

    it('throws invalidParameterValue when exposureDelay option is set to unsupported value', function () {
      return testClient.setOptions(sessionId, { exposureDelay: -1 })
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandSetOptions,
            schema.errors.invalidParameterValue
          )
        )
    })

    it('successfully sets options when dateTimeZone option is set to supported value', function () {
      if (!isBublcam) {
        return this.skip()
      }

      return testClient.setOptions(sessionId, { dateTimeZone: '2015:07:23 14:27:39-04:00' })
      .then((res) => validate.done(res, schema.names.commandSetOptions))
    })

    it('successfully sets options when dateTimeZone option is set to supported value and bubl timezone', function () {
      return testClient.setOptions(sessionId, {
        dateTimeZone: '2015:07:23 14:27:39-04:00|America/Toronto'
      })
        .then((res) => validate.done(res, schema.names.commandSetOptions))
    })

    it('successfully sets options when wifiPassword option is set to supported value', function () {
      if (testViaWifi) {
        return this.skip()
      }

      return testClient.setOptions(sessionId, { wifiPassword: '12345678' })
      .then((res) => validate.done(res, schema.names.commandSetOptions))
    })

    it('throws invalidParameterValue when wifiPassword option is set to unsupported value', function () {
      return testClient.setOptions(sessionId, { wifiPassword: '1234' })
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandSetOptions,
            schema.errors.invalidParameterValue
          )
        )
    })

    it('Expect missingParameter Error. camera.setOptions cannot set options when options is not provided', function () {
      return testClient.setOptions(sessionId, undefined)
        .then(
          expectError,
          (err) => validate.error(
            err,
            schema.names.commandSetOptions,
            schema.errors.missingParameter
          )
        )
    })

    // Does not work properly with current BublScarlet OSC 1.0
    // Skip for now until invalidParameterName reporting implemented
    it.skip('throw invalidParameterName when setting to an OSC2.0-specific option on an OSC1.0 camera', function () {
      if (!isOSC1) {
        return this.skip()
      }

      return testClient.setoptions(sessionId, { captureInterval: 5 })
        .then(expectError,
          (err) => validate.error(
            err,
            schema.names.commandSetOptions,
            schema.errors.invalidParameterName
          )
        )
    })
  })

  // OSC COMMAND STATUS
  describe('Testing /osc/commands/status endpoint', function () {
    var sessionId

    before(function () {
      if (isOSC1) {
        return testClient.startSession()
          .then(function onSuccess (res) {
            validate.done(res, schema.names.commandStartSession)
            sessionId = res.results.sessionId
          })
      }
    })

    after(function () {
      if (isOSC1) {
        return Utility.checkActiveSession()
          .then(function (isActive) {
            if (isActive) {
              return testClient.closeSession(sessionId)
                .then(function onSuccess (res) {
                  validate.done(res, schema.names.commandCloseSession)
                })
            }
          })
      }
    })

    it('successfully grabs command status after take picture has been called', function () {
      this.timeout(timeoutValue)
      var deferred = Q.defer()

      return Q.all([
        testClient.takePicture(sessionId, function (res) {
          try {
            validate.inProgress(res, schema.names.commandTakePicture)
            deferred.resolve()
          } catch (err) {
            deferred.reject(err)
          }
        })
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandTakePicture)
        }),
        deferred.promise
      ])
    })

    it('throws missingParameter when command ID is not provided', function () {
      return testClient.commandsStatus().then(
        expectError,
        (err) => validate.error(
          err,
          schema.names.commandsStatus,
          schema.errors.missingParameter)
      )
    })

    it('throws invalidParameterValue when incorrect sessionId is provided', function () {
      return testClient.commandsStatus('wrongtype').then(
        expectError,
        (err) => validate.error(
          err,
          schema.names.commandsStatus,
          schema.errors.invalidParameterValue
        )
      )
    })
  })

  // OSC 2.0 START CAPTURE
  describe('Testing /osc/commands/execute camera.startCapture endpoint', function () {
    before(function () {
      if (!isOSC2) {
        return this.skip()
      }
      return testClient.reset()
        .then((res) => validate.done(res, schema.names.commandReset))
    })

    it('Successfully startCapture a video', function () {
      this.timeout(timeoutValue)
      var deferred = Q.defer()
      var captureStart = false

      return testClient.setOptions(undefined, { captureMode: 'video' })
      .then(function onVideo () {
        return Q.all([testClient.startCapture(function onStatusChange (res) {
          if (!captureStart) {
            captureStart = true
            Q.delay(5000)
            .then(() => testClient.stopCapture())
            .then(deferred.resolve, deferred.reject)
          }
        }).then((res) => {
          validate.done(res, schema.names.commandStartCapture)
        }),
          deferred.promise])
      })
    })

    it('Succesfully startCapture interval images', function () {
      this.timeout(timeoutValue)
      var deferred = Q.defer()
      var captureStart = false

      return testClient.setOptions(undefined, {
        captureMode: 'interval',
        captureInterval: 3,
        captureNumber: 3
      })
      .then(function onVideo () {
        return Q.all([testClient.startCapture(function onStatusChange (res) {
          if (!captureStart) {
            captureStart = true
            Q.delay(5000)
            .then(() => testClient.stopCapture())
            .then(deferred.resolve, deferred.reject)
          }
        }).then((res) => {
          validate.done(res, schema.names.commandStartCapture)
        }),
          deferred.promise])
      })
    })

    it('Throw disabledCommand error if startCapture in captureModes other than video or interval', function () {
      this.timeout(timeoutValue)
      var deferred = Q.defer()
      var captureStart = false

      return testClient.setOptions(undefined, { captureMode: 'image' })
      .then((res) => {
        validate.done(res, schema.names.commandSetOptions)
        return Q.all([testClient.startCapture(function onStatusChange () {
          if (!captureStart) {
            captureStart = true
            Q.delay(5000)
            .then(() => testClient.stopCapture())
            .then(deferred.resolve, deferred.reject)
          }
        }), deferred.promise])
      }).then(expectError,
        (err) => validate.error(
          err,
          schema.names.commandStartCapture,
          schema.errors.disabledCommand)
      )
    })

    it('Throw disabledCommand error when starting a capture during an open-ended capture', function () {
      this.timeout(timeoutValue)
      var deferred = Q.defer()
      var captureStart = false

      return testClient.setOptions(undefined, { captureMode: 'video' })
      .then((res) => {
        validate.done(res, schema.names.commandSetOptions)
        return Q.all([testClient.startCapture(function onStatusChange (sta) {
          if (!captureStart) {
            captureStart = true
            return testClient.startCapture()
            .then(expectError, function faileSecondCapture (err) {
              validate.error(
                err,
                schema.names.commandStartCapture,
                schema.errors.disabledCommand
              )
              return testClient.stopCapture()
            })
            .then(deferred.resolve, deferred.reject)
          }
        }).then((output) => validate.done(output, schema.names.commandStartCapture)),
          deferred.promise])
      })
    })

    it('Throw disabledCommand error if starting an interval capture during an open-ended capture', function () {
      this.timeout(timeoutValue)
      var deferred = Q.defer()
      var captureStart = false

      return testClient.setOptions(undefined, { captureMode: 'video' })
      .then((res) => {
        validate.done(res, schema.names.commandSetOptions)
        return Q.all([testClient.startCapture(function onStatusChange () {
          if (!captureStart) {
            captureStart = true
            return testClient.setOptions(undefined, {
              captureMode: 'interval',
              captureInterval: 3,
              captureNumber: 3
            }).then(() => testClient.startCapture())
            .then(expectError, function faileSecondCapture (err) {
              validate.error(
                err,
                schema.names.commandStartCapture,
                schema.errors.disabledCommand
              )
              return testClient.stopCapture()
            })
            .then(deferred.resolve, deferred.reject)
          }
        }).then((output) => validate.done(output, schema.names.commandStartCapture)),
          deferred.promise])
      })
    })

    // Skip for now until invalidParameterName reporting implemented
    it.skip('Throw invalidParameterName error if an unsupported parameter is entered', function () {
      this.timeout(timeoutValue)

      return testClient.setOptions(undefined, { captureMode: 'video' })
      .then((res) => {
        validate.done(res, schema.names.commandSetOptions)
        return testClient.startCapture('unsupported')
      })
      .then(expectError,
        (err) => validate.error(
          err,
          schema.names.commandStartCapture,
          schema.errors.invalidParameterName
        )
      )
    })
  })

  // OSC 2.0 STOP CAPTURE
  describe('Testing /osc/commands/execute camera.stopCapture endpoint', function () {
    before(function () {
      if (!isOSC2) {
        return this.skip()
      }
      return testClient.reset()
        .then((res) => validate.done(res, schema.names.commandReset))
    })

    afterEach(function () {
      return testClient.reset()
        .then((res) => validate.done(res, schema.names.commandReset))
    })

    it('Successfully stopCapture a video', function () {
      this.timeout(timeoutValue)
      var deferred = Q.defer()
      var startCapture = false

      return testClient.setOptions(undefined, {
        captureMode: 'video'
      }).then(() => Q.all([testClient.startCapture(function onStatusChange () {
        if (!startCapture) {
          startCapture = true
          Q.delay(5000)
          .then(() => testClient.stopCapture())
          .then((res) => validate.done(res, schema.names.commandStopCapture))
          .then(deferred.resolve, deferred.reject)
        }
      }).then((res) => validate.done(res, schema.names.commandStartCapture)),
        deferred.promise]))
    })

    it('Successfully stopCapture an open-ended interval image capture', function () {
      this.timeout(timeoutValue)
      var deferred = Q.defer()
      var startCapture = false

      return testClient.setOptions(undefined, {
        captureMode: 'interval',
        captureInterval: 5,
        captureNumber: 0
      }).then(() => Q.all([testClient.startCapture(function onStatusChange () {
        if (!startCapture) {
          startCapture = true
          Q.delay(5000)
          .then(() => testClient.stopCapture())
          .then((res) => {
            validate.done(res, schema.names.commandStopCapture)
          }).then(deferred.resolve, deferred.reject)
        }
      }).then((res) => validate.done(res, schema.names.commandStartCapture)),
        deferred.promise]))
    })

    it('Successfully stopCapture a non-open-ended interval capture before the set-interval is reached', function () {
      this.timeout(timeoutValue)
      var deferred = Q.defer()
      var startCapture = false

      return testClient.setOptions(undefined, {
        captureMode: 'interval',
        captureInterval: 5,
        captureNumber: 3
      }).then(() => Q.all([testClient.startCapture(function onStatusChange () {
        if (!startCapture) {
          startCapture = true
          Q.delay(5000)
          .then(() => testClient.stopCapture())
          .then((res) => {
            validate.done(res, schema.names.commandStopCapture)
          }).then(deferred.resolve, deferred.reject)
        }
      }).then((res) => validate.done(res, schema.names.commandStartCapture)),
        deferred.promise]))
    })

    it('Throw disabledCommand Error if there is not active capture to be stopped', function () {
      return testClient.stopCapture()
      .then(expectError,
      (err) => validate.error(
        err,
        schema.names.commandStopCapture,
        schema.errors.disabledCommand)
      )
    })

    // Skip for now until invalidParameterName reporting implemented
    it.skip('Throw invalidParameterName Error if an unsupported parameter is entered', function () {
      return testClient.stopCapture('unsupported')
      .then(expectError,
        (err) => validate.error(
          err,
          schema.names.commandStopCapture,
          schema.errors.invalidParameterName)
      )
    })
  })

  // OSC 2.0 reset
  describe('Testing /osc/commands/execute camera.reset endpoint', function () {
    before(function () {
      if (!isOSC2) {
        return this.skip()
      }
    })

    it('Successfully reset all options back to default values', function () {
      return testClient.reset()
      .then((res) => validate.done(res, schema.names.commandReset))
    })

    // Skip for now until invalidParameterName reporting implemented
    it.skip('Throw invalidParameterName Error if an unsupported parameter is entered', function () {
      return testClient.reset(defaultOptionsFile)
      .then(expectError,
      (err) => validate.error(
        err,
        schema.names.commandReset,
        schema.errors.invalidParameterName)
      )
    })
  })

  // BUBL POLL
  describe('Testing /osc/commands/_bublPoll endpoint', function () {
    var sessionId

    before(function () {
      if (!isBublcam) {
        return this.skip()
      }

      if (isOSC1) {
        return testClient.startSession()
          .then(function onSuccess (res) {
            validate.done(res, schema.names.commandStartSession)
            sessionId = res.results.sessionId
          })
      }
    })

    after(function () {
      if (isOSC1) {
        return Utility.checkActiveSession()
          .then(function (isActive) {
            if (isActive) {
              return testClient.closeSession(sessionId)
                .then(function onSuccess (res) {
                  validate.done(res, schema.names.commandCloseSession)
                })
            }
          })
      }
    })

    it('returns immediately if no waitTimeout argument is provided', function () {
      this.timeout(timeoutValue)
      var deferred = Q.defer()
      var commandId = ''
      var fingerprint = ''

      return Q.all([
        testClient.takePicture(sessionId, function (initRes) {
          if (commandId === '') {
            commandId = initRes.id
            testClient.bublPoll(commandId, fingerprint)
              .then(function onSuccess (res) {
                validate.bublPoll(res)
                validate.inProgress(res.command, schema.names.cameraTakePicture)
                assert.notEqual(res.fingerprint, fingerprint)
                assert.equal(res.command.id, commandId)
                fingerprint = res.fingerprint
                return testClient.bublPoll(commandId, fingerprint)
              })
              .then(function onSuccess (res) {
                validate.bublPoll(res)
                assert.equal(res.fingerprint, fingerprint)
                assert.equal(res.command.id, commandId)
              })
              .then(deferred.resolve, deferred.reject)
          }
        }).then((res) => validate.done(res, schema.names.commandTakePicture)),
        deferred.promise
      ])
    })

    it('Expect success. /osc/commands/_bublPoll returns once command state has changed', function () {
      this.timeout(timeoutValue)
      var fingerprint = ''
      var commandId = ''
      var deferred = Q.defer()

      if (isOSC1) {
        return Q.all([
          testClient.bublCaptureVideo(sessionId, function (initRes) {
            if (commandId === '') {
              commandId = initRes.id
              Q.delay(8000)
              .then(function () {
                return testClient.bublPoll(commandId, fingerprint)
              })
              .then(function onSuccess (res) {
                validate.bublPoll(res)
                assert.notEqual(res.fingerprint, fingerprint)
                assert.equal(res.command.id, commandId)
                fingerprint = res.fingerprint
                return testClient.bublStop(commandId)
              })
              .then(function onSuccess (res) {
                assert(Object.keys(res).length === 0)
                return testClient.bublPoll(commandId, fingerprint, 4)
              })
              .then(function onSuccess (res) {
                validate.bublPoll(res)
                assert.notEqual(res.fingerprint, fingerprint)
                assert.equal(res.command.id, commandId)
              })
              .then(deferred.resolve, deferred.reject)
            }
          })
          .then(function onSuccess (res) {
            validate.done(res, schema.names.commandBublCaptureVideo)
          }),
          deferred.promise
        ])
      } else {
        return testClient.setOptions(sessionId, { captureMode: 'video' })
        .then(function onVideo (res) {
          validate.done(res, schema.names.commandSetOptions)
          return Q.all([
            testClient.startCapture(function onStatusChange (initRes) {
              if (commandId === '') {
                commandId = initRes.id
                Q.delay(8000)
                .then(function () {
                  return testClient.bublPoll(commandId, fingerprint)
                })
                .then(function onSuccess (sta) {
                  validate.bublPoll(sta)
                  assert.notEqual(sta.fingerprint, fingerprint)
                  assert.equal(sta.command.id, commandId)
                  fingerprint = sta.fingerprint
                  return testClient.bublStop(commandId)
                })
                .then(function onSuccess (output) {
                  assert(Object.keys(output).length === 0)
                  return testClient.bublPoll(commandId, fingerprint, 4)
                })
                .then(function onSuccess (sta) {
                  validate.bublPoll(sta)
                  assert.notEqual(sta.fingerprint, fingerprint)
                  assert.equal(sta.command.id, commandId)
                })
                .then(deferred.resolve, deferred.reject)
              }
            })
            .then(function onSuccess (vid) {
              validate.done(vid, schema.names.commandStartCapture)
            }),
            deferred.promise
          ])
        })
      }
    })

    it('successfully gets updates when state has not changed with waitTimeout set to 5', function () {
      this.timeout(timeoutValue)
      var fingerprint = ''
      var commandId = ''
      var deferred = Q.defer()

      if (isOSC1) {
        return Q.all([
          testClient.bublCaptureVideo(sessionId, function (initRes) {
            if (commandId === '') {
              commandId = initRes.id
              Q.delay(8000)
              .then(function () {
                return testClient.bublPoll(commandId, fingerprint)
              })
              .then(function onSuccess (res) {
                validate.bublPoll(res)
                assert.notEqual(res.fingerprint, fingerprint)
                assert.equal(res.command.id, commandId)
                fingerprint = res.fingerprint
                return Q.delay(4000)
              })
              .then(function () {
                return testClient.bublPoll(commandId, fingerprint, 5)
              })
              .then(function onSuccess (res) {
                validate.bublPoll(res)
                assert.equal(res.fingerprint, fingerprint)
                assert.equal(res.command.id, commandId)
                return testClient.bublStop(commandId)
              })
              .then(function onSuccess (res) {
                assert(Object.keys(res).length === 0)
              })
              .then(deferred.resolve, deferred.reject)
            }
          })
          .then(function onSuccess (res) {
            validate.done(res, schema.names.commandBublCaptureVideo)
          }),
          deferred.promise
        ])
      } else {
        return testClient.setOptions(sessionId, { captureMode: 'video' })
        .then(function onVideo () {
          return Q.all([
            testClient.startCapture(function (initRes) {
              if (commandId === '') {
                commandId = initRes.id
                Q.delay(8000)
                .then(function () {
                  return testClient.bublPoll(commandId, fingerprint)
                })
                .then(function onSuccess (res) {
                  validate.bublPoll(res)
                  assert.notEqual(res.fingerprint, fingerprint)
                  assert.equal(res.command.id, commandId)
                  fingerprint = res.fingerprint
                  return Q.delay(4000)
                })
                .then(function () {
                  return testClient.bublPoll(commandId, fingerprint, 5)
                })
                .then(function onSuccess (res) {
                  validate.bublPoll(res)
                  assert.equal(res.fingerprint, fingerprint)
                  assert.equal(res.command.id, commandId)
                  return testClient.stopCapture()
                })
                .then(function onSuccess (res) {
                  validate.done(res, schema.names.commandStopCapture)
                })
                .then(deferred.resolve, deferred.reject)
              }
            })
            .then(function onSuccess (res) {
              validate.done(res, schema.names.commandStartCapture)
            }),
            deferred.promise
          ])
        })
      }
    })

    it('throws missingParameter when no commandId is provided', function () {
      return testClient.bublPoll(undefined, '').then(
        expectError,
        (err) => validate.error(
          err,
          schema.names.commandsBublPoll,
          schema.errors.missingParameter
        )
      )
    })

    it('throws missingParameter when no fingerprint is provided', function () {
      this.timeout(timeoutValue)
      var stopped = false
      var deferred = Q.defer()
      return Q.all([
        testClient.takePicture(sessionId, function (res) {
          if (!stopped) {
            testClient.bublPoll(res.id)
            .then(expectError,
              (err) => {
                validate.error(
                  err,
                  schema.names.commandsBublPoll,
                  schema.errors.missingParameter)
                stopped = true
              })
            .then(deferred.resolve, deferred.reject)
          }
        })
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandTakePicture)
          assert.isTrue(stopped)
        }),
        deferred.promise
      ])
    })

    it('throws invalidParameterValue when commandId is invalid', function () {
      this.timeout(timeoutValue)
      return testClient.bublPoll('wrongtype', '').then(
        expectError,
        (err) => validate.error(
          err,
          schema.names.commandsBublPoll,
          schema.errors.invalidParameterValue
        )
      )
    })

    it('throws invalidParameterValue when waitTimeout is invalid', function () {
      this.timeout(timeoutValue)
      var commandId = ''
      var deferred = Q.defer()

      return Q.all([
        testClient.takePicture(sessionId, function (initRes) {
          if (commandId === '') {
            commandId = initRes.id
            testClient.bublPoll(commandId, '', 'wrongtype').then(
              (res) => { deferred.reject(expectError(res)) },
              (err) => {
                validate.error(
                  err,
                  schema.names.commandsBublPoll,
                  schema.errors.invalidParameterValue
                )
                deferred.resolve()
              }
            )
          }
        })
        .then((res) => validate.done(res, schema.names.commandTakePicture)),
        deferred.promise
      ])
    })
  })

  // BUBL TIMELAPSE
  describe('Testing /osc/commands/execute camera._bublTimelapse command', function () {
    var sessionId

    before(function () {
      if (isBublcam && isOSC1) {
        this.timeout(timeoutValue)
        return testClient.startSession()
          .then(function (res) {
            sessionId = res.results.sessionId
          })
      } else {
        return this.skip()
      }
    })

    beforeEach(function () {
      this.timeout(timeoutValue)
      if (isOSC1) {
        return Utility.restoreDefaultOptions(defaultOptionsFile)
          .then(function () {
            return Utility.deleteAllImages()
          })
      } else {
        return testClient.reset()
          .then((res) => validate.done(res, schema.names.commandReset))
      }

    })

    after(function () {
      if (isOSC1) {
        return Utility.checkActiveSession()
          .then(function (isActive) {
            if (isActive) {
              return testClient.closeSession(sessionId)
                .then(function onSuccess (res) {
                  validate.done(res, schema.names.commandCloseSession)
                })
            }
          })
      }
    })

    it('Expect missingParameter Error. sessionId is mandatory for command camera._bublTimelapse', function () {
      return testClient.bublTimelapse().then(
        expectError,
        (err) => validate.error(
          err,
          schema.names.commandBublTimelapse,
          schema.errors.missingParameter
        )
      )
    })

    it('Expect invalidParameterValue Error. camera._bublTimelapse expects active session\'s sessionId', function () {
      return testClient.bublTimelapse(sessionId + '0').then(
        expectError,
        (err) => validate.error(
          err,
          schema.names.commandBublTimelapse,
          schema.errors.invalidParameterValue
        )
      )
    })

    it('throws cameraInExclusiveUse when another timelapse capture procedure is already active', function () {
      this.timeout(timeoutValue * 2)
      var commandId
      var deferred = Q.defer()

      return Q.all([
        testClient.bublTimelapse(sessionId, function onUpdate (initRes) {
          if (!commandId) {
            commandId = initRes.id

            testClient.bublTimelapse(sessionId)
            .then(
              () => assert.fail('Should have received cameraInExclusiveUse'),
              (err) => validate.error(
                err,
                schema.names.commandBublTimelapse,
                schema.errors.cameraInExclusiveUse
              )
            )
            .then(() => testClient.bublStop(commandId))
            .then((res) => assert(Object.keys(res).length === 0))
            .then(deferred.resolve, deferred.reject)
          }
        })
        .then((res) => validate.done(res, schema.names.commandBublTimelapse)),
        deferred.promise
      ])
    })

    it('throws cameraInExclusiveUse when a video capture procedure is already active', function () {
      this.timeout(timeoutValue * 2)
      var commandId
      var deferred = Q.defer()

      return Q.all([
        testClient.bublCaptureVideo(sessionId, function onUpdate (initRes) {
          if (!commandId) {
            commandId = initRes.id
            testClient.bublTimelapse(sessionId)
            .then(
              () => assert.fail('Should have received cameraInExclusiveUseError'),
              (err) => validate.error(
                err,
                schema.names.commandBublTimelapse,
                schema.errors.cameraInExclusiveUse
              )
            )
            .then(() => testClient.bublStop(commandId))
            .then((res) => assert(Object.keys(res).length === 0))
            .then(deferred.resolve, deferred.reject)
          }
        })
        .then((res) => validate.done(res, schema.names.commandBublCaptureVideo)),
        deferred.promise
      ])
    })

    it('Expect success. camera._bublTimelapse successfully captures with default settings', function () {
      this.timeout(timeoutValue * 4)
      var stopped = false
      var deferred = Q.defer()

      // Run camera._bublTimelapse
      return Q.all([
        testClient.bublTimelapse(sessionId, function (initRes) {
          if (!stopped) {
            var commandId = initRes.id
            stopped = true
            Q.delay(15000)
            .then(() => testClient.bublStop(commandId))
            .then((res) => assert(Object.keys(res).length === 0))
            .then(deferred.resolve, deferred.reject)
          }
        })
        .then((res) => validate.done(res, schema.names.commandBublTimelapse)),
        deferred.promise
      ])
    })

    it('captures with specific timelapse interval and count, then finishes within a reasonable time', function () {
      this.timeout(120000)
      var timelapseInterval = 10
      var timelapseCount = 3
      var assumedMaxOverhead = 15000
      var maxAcceptableTime = (timelapseInterval * timelapseCount * 1000) + assumedMaxOverhead
      return testClient.setOptions(
        sessionId,
        {
          _bublTimelapse: {
            interval: timelapseInterval,
            count: timelapseCount
          }
        }
      )
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandSetOptions)
          return testClient.bublTimelapse(sessionId)
        })
        .then(function onSuccess (res) {
          // Under consistent latency, we can assume the following:
          //  (1) timelapseRunTime ≈ finalResponseTime - initialResponseTime
          //  (2) timeElapsed <= timelapseRunTime + pollingPeriod
          var timeElapsed = res.timeElapsed
          if (timeElapsed > maxAcceptableTime) {
            assert.fail(
              'operation took too long. timeElapsed : ' +
              timeElapsed + ' > maxAcceptableTime : ' + maxAcceptableTime
            )
          } else {
            validate.done(res, schema.names.commandBublTimelapse)
            assert.notEqual(res.results.fileUri.length, timelapseCount)
          }
        })
    })
  })

  // BUBL CAPTURE VIDEO
  describe('Testing /osc/commands/execute camera._bublCaptureVideo endpoint', function () {
    var sessionId

    before(function () {
      if (isBublcam && isOSC1) {
        return testClient.startSession()
          .then(function onSuccess (res) {
            validate.done(res, schema.names.commandStartSession)
            sessionId = res.results.sessionId
            return Utility.restoreDefaultOptions(defaultOptionsFile)
          })
          .then(function onSuccess (res) {
            validate.done(res, schema.names.commandSetOptions)
          })
      } else {
        return this.skip()
      }
    })

    afterEach(function () {
      this.timeout(timeoutValue)
      if (isOSC1) {
        return Utility.restoreDefaultOptions(defaultOptionsFile)
          .then(function onSuccess (res) {
            validate.done(res, schema.names.commandSetOptions)
          })
      } else {
        return testClient.reset()
         .then((res) => validate.done(res, schema.names.commandReset))
      }
    })

    after(function () {
      if (isOSC1) {
        return Utility.checkActiveSession()
          .then(function (isActive) {
            if (isActive) {
              return testClient.closeSession(sessionId)
                .then(function onSuccess (res) {
                  validate.done(res, schema.names.commandCloseSession)
                })
            }
          })
      }
    })


    it('Expect success.  camera._bublCaptureVideo successfully captures a video', function () {
      this.timeout(timeoutValue)
      var stopped = false
      var deferred = Q.defer()

      return Q.all([
        testClient.bublCaptureVideo(sessionId, function (initRes) {
          if (!stopped) {
            var commandId = initRes.id
            Q.delay(2000)
            .then(() => testClient.bublStop(commandId))
            .then((res) => assert(Object.keys(res).length === 0))
            .then(deferred.resolve, deferred.reject)
            stopped = true
          }
        })
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandBublCaptureVideo)
          assert.isTrue(stopped)
        }),
        deferred.promise
      ])
    })

    it('throws cameraInExclusiveUse when a video capture is already active', function () {
      this.timeout(timeoutValue)
      var stopped = false
      var deferred = Q.defer()

      return Q.all([
        testClient.bublCaptureVideo(sessionId, function (initRes) {
          var commandId = initRes.id
          if (!stopped) {
            stopped = true
            testClient.bublCaptureVideo(sessionId).then(
              expectError,
              (err) => {
                validate.error(
                  err,
                  schema.names.commandBublCaptureVideo,
                  schema.errors.cameraInExclusiveUse
                )
                return testClient.bublStop(commandId)
              }
            ).then((res) => assert(Object.keys(res).length === 0))
            .then(deferred.resolve, deferred.reject)
          }
        }).then(
          function onSuccess (res) {
            validate.done(res, schema.names.commandBublCaptureVideo)
            assert.isTrue(stopped)
          }),
        deferred.promise
      ])
    })

    it('throws invalidParameterValue when incorrect sessionId type is provided', function () {
      return testClient.bublCaptureVideo('wrongtype').then(
        expectError,
        (err) => validate.error(
          err,
          schema.names.commandBublCaptureVideo,
          schema.errors.invalidParameterValue
        )
      )
    })

    it('throws missingParameter when sessionId is not provided', function () {
      return testClient.bublCaptureVideo().then(
        expectError,
        (err) => validate.error(
          err,
          schema.names.commandBublCaptureVideo,
          schema.errors.missingParameter
        )
      )
    })
  })

  // BUBL STOP
  describe('Testing /osc/commands/_bublStop endpoint', function () {
    var sessionId

    before(function () {
      if (!isBublcam) {
        return this.skip()
      }

      if (isOSC1) {
        return testClient.startSession()
          .then(function onSuccess (res) {
            validate.done(res, schema.names.commandStartSession)
            sessionId = res.results.sessionId
            return Utility.restoreDefaultOptions(defaultOptionsFile)
          })
          .then(function onSuccess (res) {
            validate.done(res, schema.names.commandSetOptions)
          })
      } else {
        return testClient.reset()
          .then((res) => validate.done(res, schema.names.commandReset))
      }

    })

    afterEach(function () {
      this.timeout(timeoutValue)
      if (isOSC1) {
        return Utility.restoreDefaultOptions(defaultOptionsFile)
          .then(function onSuccess (res) {
            validate.done(res, schema.names.commandSetOptions)
          })
      } else {
        return testClient.reset()
          .then((res) => validate.done(res, schema.names.commandReset))
      }

    })

    after(function () {
      if (isOSC1) {
        return Utility.checkActiveSession()
          .then(function (isActive) {
            if (isActive) {
              return testClient.closeSession(sessionId)
                .then(function onSuccess (res) {
                  validate.done(res, schema.names.commandCloseSession)
                })
            }
          })
      }
    })

    it('Expect success.  camera._bublStop successfully stops a video capture', function () {
      this.timeout(timeoutValue)
      var stopped = false
      var commandId
      var deferred = Q.defer()

      return Q.all([
        testClient.bublStream(sessionId, function (initRes) {
          if (!stopped) {
            commandId = initRes.id
            Q.delay(1000)
            .then(function () {
              return testClient.bublStop(commandId)
            })
            .then(function onSuccess (res) {
              assert(Object.keys(res).length === 0)
            })
            .then(deferred.resolve, deferred.reject)
            stopped = true
          }
        })
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandBublStream)
          assert.equal(res.id, commandId)
          assert.isTrue(stopped)
        }),
        deferred.promise
      ])
    })

    it('throws invalidParameterValue when incorrect commandId type is provided', function () {
      return testClient.bublStop('wrongtype').then(
        expectError,
        (err) => validate.error(
          err,
          schema.names.commandsBublStop,
          schema.errors.invalidParameterValue
        )
      )
    })

    it('throws missingParameter when commandId is not provided', function () {
      return testClient.bublStop().then(expectError,
        (err) => validate.error(
          err,
          schema.names.commandsBublStop,
          schema.errors.missingParameter)
      )
    })
  })

  // BUBL STREAM
  describe('Testing /osc/commands/execute camera._bublStream endpoint', function () {
    var sessionId

    before(function () {
      if (!isBublcam) {
        return this.skip()
      }
      if (isOSC1) {
        return testClient.startSession()
          .then(function onSuccess (res) {
            validate.done(res, schema.names.commandStartSession)
            sessionId = res.results.sessionId
            return Utility.restoreDefaultOptions(defaultOptionsFile)
          }).then(function onSuccess (res) {
            validate.done(res, schema.names.commandSetOptions)
          })
      } else {
        return testClient.reset()
          .then((res) => validate.done(res, schema.names.commandReset))
      }
    })

    afterEach(function () {
      this.timeout(timeoutValue)
      if (isOSC1) {
        return Utility.restoreDefaultOptions(defaultOptionsFile)
          .then(function onSuccess (res) {
            validate.done(res, schema.names.commandSetOptions)
          })
      } else {
        return testClient.reset()
          .then((res) => validate.done(res, schema.names.commandReset))
      }
    })

    after(function () {
      if (isOSC1) {
        return Utility.checkActiveSession()
          .then(function (isActive) {
            if (isActive) {
              return testClient.closeSession(sessionId)
                .then(function onSuccess (res) {
                  validate.done(res, schema.names.commandCloseSession)
                })
            }
          })
      }
    })

    it('Expect success.  camera._bublStream successfully streams', function () {
      this.timeout(10000)
      var commandId
      var deferred = Q.defer()

      return Q.all([
        testClient.bublStream(sessionId, function onStatusUpdate (initRes) {
          if (!commandId) {
            commandId = initRes.id
            testClient.bublStop(commandId).then(function onSuccess (res) {
              assert(Object.keys(res).length === 0)
            })
            .then(deferred.resolve, deferred.reject)
          }
        })
        .then(function onStreamCompleted (res) {
          validate.done(res, schema.names.commandBublStream)
          assert.equal(res.id, commandId)
        }),
        deferred.promise
      ])
    })

    it('Expect success. camera._bublStream can start another stream when a stream is already active', function () {
      this.timeout(timeoutValue)
      var commandId1
      var commandId2
      var deferred1 = Q.defer()
      var deferred2 = Q.defer()

      return Q.all([
        testClient.bublStream(sessionId, function onStatusUpdate1 (commandRes1) {
          if (!commandId1) {
            commandId1 = commandRes1.id
          // Starting this stream, stops the first one
            testClient.bublStream(sessionId, function onStatusUpdate2 (commandRes2) {
              if (!commandId2) {
                commandId2 = commandRes2.id
                testClient.bublStop(commandId2)
                .then(function onSuccess (res) {
                  assert(Object.keys(res).length === 0)
                })
                .then(deferred1.resolve, deferred1.reject)
              }
            })
            .then(function onSuccess (res) {
              validate.done(res, schema.names.commandBublStream)
              assert.equal(res.id, commandId2)
            })
            .then(deferred2.resolve, deferred2.reject)
          }
        })
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandBublStream)
          assert.equal(res.id, commandId1)
        }),
        deferred1.promise,
        deferred2.promise
      ])
    })

    it('throws invalidParameterValue when incorrect sessionId type is provided', function () {
      return testClient.bublStream('wrongtype')
        .then(expectError, function onError (err) {
          validate.error(
            err,
            schema.names.commandBublStream,
            schema.errors.invalidParameterValue)
        })
    })

    it('Expect missingParameter Error. camera._bublStream cannot stream when sessionId is not provided', function () {
      // Only OSC1 _bublStream needs sessionId
      if (!isOSC1) {
        return this.skip()
      }

      return testClient.bublStream()
        .then(expectError, function onError (err) {
          validate.error(
            err,
            schema.names.commandBublStream,
            schema.errors.missingParameter)
        })
    })
  })

  // BUBL GET IMAGE
  describe('Testing /osc/commands/_bublGetImage endpoint', function () {
    var sessionId
    var fileUri

    before(function () {
      if (!isBublcam || !isOSC1) {
        return this.skip()
      }

      return testClient.startSession()
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandStartSession)
          sessionId = res.results.sessionId
        })
    })

    after(function () {
      if (!isBublcam || !isOSC1) {
        return this.skip()
      }

      return Utility.checkActiveSession()
        .then(function (isActive) {
          if (isActive) {
            return testClient.closeSession(sessionId)
              .then(function onSuccess (res) {
                validate.done(res, schema.names.commandCloseSession)
              })
          }
        })
    })

    it('Expect success. camera._bublGetImage successfully gets image when provided with a valid fileUri', function () {
      this.timeout(timeoutValue)
      return testClient.takePicture(sessionId)
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandTakePicture)
          fileUri = res.results.fileUri
          return testClient.bublGetImage(fileUri)
        })
        .then(function onSuccess (res) {
          validate.checkForBinary(res)
        })
    })

    it('throws invalidParameterValue when fileUri is incorrect', function () {
      return testClient.bublGetImage('wrongtype')
        .then(expectError, function onError (err) {
          validate.error(
            err,
            schema.names.commandGetImage,
            schema.errors.invalidParameterValue)
        })
    })
  })

  // BUBL UPDATE
  describe('Testing /osc/_bublUpdate endpoint', function () {
    before(function () {
      if (!isMock) {
        return this.skip()
      }
    })

    it('Expect success. /osc/_bublUpdate endpoint successfully returned status code 200', function () {
      this.timeout(timeoutValue)
      return testClient.bublUpdate('dummy_content')
        .then(function onSuccess (res) {
          assert.isNull(res)
        })
    })
  })

  // BUBL SHUTDOWN
  describe('Testing /osc/commands/execute camera._bublShutdown', function () {
    before(function () {
      if (!isBublcam) {
        return this.skip()
      }
    })

    var sessionId

    beforeEach(function () {
      if (isOSC1) {
        return testClient.startSession()
          .then(function onSuccess (res) {
            validate.done(res, schema.names.commandStartSession)
            sessionId = res.results.sessionId
            return Utility.restoreDefaultOptions(defaultOptionsFile)
          })
          .then(function onSuccess (res) {
            validate.done(res, schema.names.commandSetOptions)
          })
      } else {
        return testClient.reset()
          .then((res) => validate.done(res, schema.names.commandReset))
      }
    })

    afterEach(function () {
      if (isOSC1) {
        return Utility.checkActiveSession()
          .then(function (isActive) {
            if (isActive) {
              return testClient.closeSession(sessionId)
                .then(function onSuccess (res) {
                  validate.done(res, schema.names.commandCloseSession)
                })
            }
          })
      }
    })

    it('throws missingParameter unless the active session\'s sessionId is provided', function () {
      // Only OSC1 _bublShutdown needs sessionId
      if (!isOSC1) {
        return this.skip()
      }

      this.timeout(timeoutValue)
      return testClient.bublShutdown()
        .then(expectError, function onError (err) {
          validate.error(
            err,
            schema.names.commandBublShutdown,
            schema.errors.missingParameter)
        })
    })

    it('throws invalidParameterValue when incorrect sessionId is provided', function () {
      this.timeout(timeoutValue)
      return testClient.bublShutdown(sessionId + '0')
        .then(expectError, function onError (err) {
          validate.error(
            err,
            schema.names.commandBublShutdown,
            schema.errors.invalidParameterValue)
        })
    })

    it('throws invalidParameterValue when incorrect shutdownDelay value type is provided', function () {
      this.timeout(timeoutValue)
      return testClient.bublShutdown(sessionId, '...')
        .then(expectError, function onError (err) {
          validate.error(
            err,
            schema.names.commandBublShutdown,
            schema.errors.invalidParameterValue)
        })
    })

    it('Expect success. camera._bublShutdown successfully returned', function () {
      if (!isMock) {
        // FORCE SESSSION CLOSURE BECAUSE OF MOCHA BUG
        return testClient.closeSession(sessionId)
          .then(() => this.skip())
      }

      this.timeout(timeoutValue)
      return testClient.bublShutdown(sessionId)
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandBublShutdown)
        })
    })

    it('successfully returned when specific shutdownDelay is provided and returned at appropriate time', function () {
      if (!isMock) {
        // FORCE SESSSION CLOSURE BECAUSE OF MOCHA BUG
        return testClient.closeSession(sessionId)
          .then(() => this.skip())
      }

      this.timeout(timeoutValue)
      var expectedShutdownDelay = 3000
      var startTime = Date.now()
      return testClient.bublShutdown(sessionId, expectedShutdownDelay)
        .then(function onSuccess (res) {
          validate.done(res, schema.names.commandBublShutdown)
          var endTime = Date.now()
          assert.isTrue((endTime - startTime) > expectedShutdownDelay)
        })
    })
  })
})
