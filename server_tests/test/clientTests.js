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
  var schema = schema = new Schema({
    bubl: isBublcam,
    apiLevel: camApi
  })
  var validate = new Validator(schema)
  function wrapError (err) {
    if (!(err instanceof Error)) {
      if (err.error && err.error.response) {
        err = err.error.response.text
      } else if (err.error) {
        err = JSON.stringify(err.error)
      } else {
        err = 'Code execution should not have reached here'
      }
      throw new Error(err)
    } else {
      throw err
    }
  }
  function expectError (res) {
    if (res.body) {
      res = res.body
    }
    assert.fail('Should not resolve, expecting an error, got ' + JSON.stringify(res))
  }

  before(function () {
    var sessionId

    return testClient.startSession()
    .then(function onSuccess (res) {
      console.log("res of startSession " + JSON.stringify(res.body))
      console.log("StartedSession")
      sessionId = res.body.results.sessionId
      console.log(sessionId)
        if (isOSC1) {
          console.log("I shall close session")
          return testClient.closeSession(sessionId)
            .then((res) => validate.done(res.body, schema.names.commandCloseSession))
        } else {
          console.log("I shall switch to osc2")

          return testClient.setOptions(sessionId, { clientVersion: 2 })
            .then(function onSuccess (res) {
              validate.done(res.body, schema.names.commandSetOptions) // Need to be verified against level 2 schema
          })
        }
    }, function (err) {
      if (err.error.response.body.code === "unknownCommand") {
        resolve("Already in OSC 2.0")
      } else {
        throw err
      }
    }).catch(wrapError)
  })

  // OSC INFO
  describe.skip('Testing /osc/info endpoint', function () {
    it('Expect success. /osc/info returns correct info', function () {
      return testClient.getInfo()
        .then((res) => validate.info(res.body), wrapError)
    })
  })

  // OSC STATE
  describe('Testing /osc/state endpoint', function () {
    var sessionId

    before(function () {
      switch (camApi) {
        case oscApiLevels.APILEVEL1:
          return testClient.startSession()
            .then(function onSuccess (res) {
              validate.done(res.body, schema.names.commandStartSession)
              sessionId = res.body.results.sessionId
            }, wrapError)
          break
        case oscApiLevels.APILEVEL2:
          break
      }
    })

    it('Expect success. /osc/state endpoint successfully returns state when state has not changed', function () {
      return testClient.getState()
        .then(function onSuccess (res) {
          validate.state(res.body)
          if (isOSC1) {
            assert.equal(res.body.state.sessionId, sessionId)
          }
        }, wrapError)
    })

    it('Expect success. confirming /osc/state endpoint returns correct value when state has changed', function () {
      var oldFingerprint

      return testClient.getState()
        .then(function onSuccess (res) {
          validate.state(res.body)
          if (isOSC1) {
            assert.equal(res.body.state.sessionId, sessionId)
            oldFingerprint = res.body.fingerprint
            return testClient.closeSession(sessionId)
            .then(function onSuccess (res) {
              validate.done(res.body, schema.names.commandCloseSession)
              return testClient.getState()
            })
            .then(function onSuccess (res) {
              validate.state(res.body)
              assert.notEqual(res.body.state.fingerprint, oldFingerprint)
              assert.notEqual(res.body.state.sessionId, sessionId)
            })
          }
        }).catch(wrapError)
    })
  })

  // OSC CHECK FOR UPDATES
  describe('Testing /osc/checkForUpdates endpoint', function () {
    var sessionId
    var oldFingerprint

    beforeEach(function () {
      switch (camApi) {
        case oscApiLevels.APILEVEL1:
          return testClient.startSession()
            .then(function onSuccess (res) {
              validate.done(res.body, schema.names.commandStartSession)
              sessionId = res.body.results.sessionId
            }).catch(wrapError)
          break
        case oscApiLevels.APILEVEL2:
          break
      }
    })

    afterEach(function () {
      switch (camApi) {
        case oscApiLevels.APILEVEL1:
          return Utility.checkActiveSession()
            .then(function (isActive) {
              if (isActive) {
                return testClient.closeSession(sessionId)
                  .then(function onSuccess (res) {
                    validate.done(res.body, schema.names.commandCloseSession)
                  }).catch(wrapError)
              }
            })
          break
        case oscApiLevels.APILEVEL2:
          break
      }
    })

    it('successfully gets updates when state has not changed', function () {
      return testClient.getState()
        .then(function onSuccess (res) {
          validate.state(res.body)
          if (isOSC1) {
            assert.equal(res.body.state.sessionId, sessionId)
          }
          oldFingerprint = res.body.fingerprint
          return testClient.checkForUpdates(oldFingerprint)
        })
        .then(function onSuccess (res) {
          validate.checkForUpdates(res.body)
          assert.equal(res.body.stateFingerprint, oldFingerprint)
        })
        .catch(wrapError)
    })

    it('Expect success. /osc/checkForUpdates endpoint successfully gets updates when state has changed', function () {
      if (!isOSC1) {
        return this.skip() // For now, until I can figure out how to change the state without close session
      }

      return testClient.getState()
        .then(function onSuccess (res) {
          validate.state(res.body)
          oldFingerprint = res.body.fingerprint
          if (isOSC1) {
            assert.equal(res.body.state.sessionId, sessionId)
            return testClient.closeSession(sessionId)
            .then(function onSuccess (res) {
              validate.done(res.body, schema.names.commandCloseSession)
              return testClient.checkForUpdates(oldFingerprint)
            })
          }
          // else {
            // commandId = res.body.id
            // return testClient.bublPoll(commandId, oldFingerprint)
            // .then(function onSuccess (res) {
            //   validate.done(res.body, schema.names.commandsBublPoll)
            //   return testClient.checkForUpdates(oldFingerprint)
            // })
          // }
        })
        .then(function onSuccess (res) {
          validate.checkForUpdates(res.body)
          assert.notEqual(res.body.stateFingerprint, oldFingerprint)
        })
        .catch(wrapError)
    })

    it('successfully gets updates when state has not changed with waitTimeout set to 2', function () {
      var state

      this.timeout(timeoutValue)
      return testClient.getState()
        .then(function onSuccess (res) {
          validate.state(res.body)
          if (isOSC1) {
            assert.equal(res.body.state.sessionId, sessionId)
          }
          oldFingerprint = res.body.fingerprint
          state = res.body.state
          return testClient.checkForUpdates(oldFingerprint, 2)
        })
        .then(function onSuccess (res) {
          validate.checkForUpdates(res.body)
          return testClient.getState()
        })
        .then(function onSuccess (res) {
          validate.state(res.body)
          if (isOSC1) {
            assert.equal(res.body.state.sessionId, sessionId)
          }
          if (res.body.fingerprint === oldFingerprint) {
            assert.deepEqual(res.body.state, state)
          } else {
            assert.notDeepEqual(res.body.state, state)
          }
        })
        .catch(wrapError)
    })

    it('throws missingParameter when no fingerprint is provided', function () {
      return testClient.checkForUpdates()
        .then(expectError,
          (res) => validate.error(res.error.response.body, schema.names.checkForUpdates, schema.errors.missingParameter)
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
                validate.done(res.body, schema.names.commandCloseSession)
              })
          }
        }, wrapError)
    })

    it('Expect success. camera.startSession successfully starts a session', function () {
      return testClient.startSession()
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandStartSession)
          sessionId = res.body.results.sessionId
        }, wrapError)
    })

    it('successfully starts a session when a timeout value of 30 is specified', function () {
      return testClient.startSession(30)
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandStartSession)
          sessionId = res.body.results.sessionId
          assert.equal(res.body.results.timeout, 30)
        }, wrapError)
    })

    it('Expect success. camera.startSession will timeout after the the specified timeout value', function () {
      this.timeout(timeoutValue)
      return testClient.startSession(5)
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandStartSession)
          sessionId = res.body.results.sessionId
          assert.equal(res.body.results.timeout, 5)
          return Q.delay(8000)
        })
        .then(function () {
          return testClient.startSession()
        })
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandStartSession)
          sessionId = res.body.results.sessionId
        })
        .catch(wrapError)
    })

    it('throws cameraInExclusiveUse while another session is already running', function () {
      return testClient.startSession()
        .then(
          (res) => {
            validate.done(res.body, schema.names.commandStartSession)
            sessionId = res.body.results.sessionId
            return testClient.startSession()
          },
          wrapError
        ).then(
          expectError,
          (err) => validate.error(
            err.error.response.body,
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
            err.error.response.body,
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
          validate.done(res.body, schema.names.commandStartSession)
          sessionId = res.body.results.sessionId
        }, wrapError)
    })

    afterEach(function () {
      return Utility.checkActiveSession()
        .then(function (isActive) {
          if (isActive) {
            return testClient.closeSession(sessionId)
              .then((res) => validate.done(res.body, schema.names.commandCloseSession))
          }
        })
        .catch(wrapError)
    })

    it('Expect success. camera.updateSession successfully updates a session', function () {
      return testClient.updateSession(sessionId)
        .then((res) => validate.done(res.body, schema.names.commandUpdateSession), wrapError)
    })

    it('successfully updates a session with a timeout value specified', function () {
      return testClient.updateSession(sessionId, 15)
        .then(
          (res) => {
            validate.done(res.body, schema.names.commandUpdateSession)
            assert.equal(res.body.results.timeout, 15)
          },
          wrapError
        )
    })

    it('throws missingParameter when sessionId is not specified', function () {
      return testClient.updateSession()
        .then(
          expectError,
          (err) => validate.error(
            err.error.response.body,
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
            err.error.response.body,
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
            err.error.response.body,
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
          validate.done(res.body, schema.names.commandStartSession)
          sessionId = res.body.results.sessionId
        }, wrapError)
    })

    afterEach(function () {
      return Utility.checkActiveSession()
        .then(function (isActive) {
          if (isActive) {
            return testClient.closeSession(sessionId)
              .then((res) => validate.done(res.body, schema.names.commandCloseSession))
          }
        })
        .catch(wrapError)
    })

    it('Expect success. camera.closeSession successfully closes a session', function () {
      return testClient.closeSession(sessionId)
        .then((res) => validate.done(res.body, schema.names.commandCloseSession),
          wrapError)
    })

    it('throws missingParameter when sessionId is not provided', function () {
      return testClient.closeSession()
        .then(
          expectError,
          (err) => validate.error(
            err.error.response.body,
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
            err.error.response.body,
            schema.names.commandCloseSession,
            schema.errors.invalidParameterValue
          )
      )
    })

    it('throws invalidParameterValue when no session is active', function () {
      return testClient.closeSession(sessionId)
        .then(
          (res) => {
            validate.done(res.body, schema.names.commandCloseSession)
            return testClient.closeSession(sessionId)
          },
          wrapError
        ).then(
          expectError,
          (err) => validate.error(
            err.error.response.body,
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
            validate.done(res.body, schema.names.commandStartSession)
            sessionId = res.body.results.sessionId
            return Utility.restoreDefaultOptions(defaultOptionsFile)
          })
          .then(function onSuccess (res) {
            validate.done(res.body, schema.names.commandSetOptions)
          })
          .catch(wrapError)
      } else {
          return testClient.reset()
          .then(function onSuccess (res) {
            validate.done(res.body, schema.names.commandReset)
          })
          .catch(wrapError)
      }
    })

    afterEach(function () {
      if (isOSC1) {
        return Utility.restoreDefaultOptions(defaultOptionsFile)
          .then(function onSuccess (res) {
            validate.done(res.body, schema.names.commandSetOptions)
          }, wrapError)
      } else {
        return testClient.reset()
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandReset)
        })
        .catch(wrapError)
      }


    })

    after(function () {
      if (isOSC1) {
        return Utility.checkActiveSession()
          .then(function (isActive) {
            if (isActive) {
              return testClient.closeSession(sessionId)
                .then((res) => validate.done(res.body, schema.names.commandCloseSession))
            }
          })
          .catch(wrapError)
      }
    })

    it('Expect success.  camera.takePicture successfully takes a picture', function () {
      this.timeout(timeoutValue)
      return testClient.takePicture(sessionId)
        .then((res) => validate.done(res.body, schema.names.commandTakePicture), wrapError)
    })

    it('Expect success. camera.takePicture successfully takes an HDR picture', function () {
      this.timeout(timeoutValue * 2)
      return testClient.setOptions(sessionId, {
        hdr: true
      })
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandSetOptions)
          return testClient.takePicture(sessionId)
        })
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandTakePicture)
          assert.equal(res.body.results._bublFileUris.length, 3) // eslint-disable-line
        })
        .catch(wrapError)
    })

    it('throws invalidParameterValue when incorrect sessionId type is provided', function () {
      return testClient.takePicture('wrongtype')
        .then(
          expectError,
          (err) => validate.error(
            err.error.response.body,
            schema.names.commandTakePicture,
            schema.errors.invalidParameterValue
          )
      )
    })

    it('throws missingParameter when sessionId is not provided', function () {
      return testClient.takePicture()
        .then(
          expectError,
          (err) => validate.error(
            err.error.response.body,
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
          validate.done(res.body, schema.names.commandStartSession)
          sessionId = res.body.results.sessionId
        }, wrapError)
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
              .then((res) => validate.done(res.body, schema.names.commandCloseSession))
          }
        })
        .catch(wrapError)
    })

    it('returns one entry when provided with entryCount = 1 when server has 1 image', function () {
      this.timeout(timeoutValue)
      return testClient.takePicture(sessionId)
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandTakePicture)
          return testClient.listImages(1, true, 100)
        })
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandListImages)
          assert.equal(res.body.results.entries.length, 1)
          assert.equal(res.body.results.totalEntries, 1)
          assert.notProperty(res.body.results, 'continuationToken')
          for (let i = 0; i < res.body.results.entries.length; i++) {
            assert.property(res.body.results.entries[i], 'thumbnail')
          }
        })
        .catch(wrapError)
    })

    it('returns 1 entry when entryCount=1 and includeThumb=false and server has 1 image', function () {
      this.timeout(timeoutValue)
      return testClient.takePicture(sessionId)
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandTakePicture)
          return testClient.listImages(1, false)
        })
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandListImages)
          assert.equal(res.body.results.entries.length, 1)
          assert.equal(res.body.results.totalEntries, 1)
          assert.notProperty(res.body.results, 'continuationToken')
          for (let i = 0; i < res.body.results.entries.length; i++) {
            assert.notProperty(res.body.results.entries[i], 'thumbnail')
          }
        })
        .catch(wrapError)
    })

    it('returns 1 entry and a continuation token when entryCount = 1 and server has 2 images', function () {
      this.timeout(timeoutValue)
      return testClient.takePicture(sessionId)
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandTakePicture)
          return testClient.takePicture(sessionId)
        })
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandTakePicture)
          return testClient.listImages(1, false)
        })
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandListImages)
          assert.equal(res.body.results.entries.length, 1)
          assert.equal(res.body.results.totalEntries, 2)
          assert.property(res.body.results, 'continuationToken')
          for (let i = 0; i < res.body.results.entries.length; i++) {
            assert.notProperty(res.body.results.entries[i], 'thumbnail')
          }
        })
        .catch(wrapError)
    })

    it('returns 1 entry when called with continuation token and entryCount=1 and server has 2 images', function () {
      this.timeout(timeoutValue)
      return testClient.takePicture(sessionId)
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandTakePicture)
          return testClient.takePicture(sessionId)
        })
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandTakePicture)
          return testClient.listImages(1, false)
        })
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandListImages)
          assert.equal(res.body.results.entries.length, 1)
          assert.equal(res.body.results.totalEntries, 2)
          assert.property(res.body.results, 'continuationToken')
          for (let i = 0; i < res.body.results.entries.length; i++) {
            assert.notProperty(res.body.results.entries[i], 'thumbnail')
          }
          return testClient.listImages(1, false, undefined, res.body.results.continuationToken)
        })
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandListImages)
          assert.equal(res.body.results.entries.length, 1)
          assert.equal(res.body.results.totalEntries, 2)
          assert.notProperty(res.body.results, 'continuationToken')
          for (let i = 0; i < res.body.results.entries.length; i++) {
            assert.notProperty(res.body.results.entries[i], 'thumbnail')
          }
        })
        .catch(wrapError)
    })

    it('returns 2 entries and no continuation token when entryCount = 2 when server has 2 images', function () {
      this.timeout(timeoutValue)
      return testClient.takePicture(sessionId)
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandTakePicture)
          return testClient.takePicture(sessionId)
        })
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandTakePicture)
          return testClient.listImages(2, false)
        })
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandListImages)
          assert.equal(res.body.results.entries.length, 2)
          assert.equal(res.body.results.totalEntries, 2)
          assert.notProperty(res.body.results, 'continuationToken')
          for (let i = 0; i < res.body.results.entries.length; i++) {
            assert.notProperty(res.body.results.entries[i], 'thumbnail')
          }
        })
        .catch(wrapError)
    })

    it('Expect success. camera.listImages lists zero images when no images are in the system', function () {
      return testClient.listImages(2, false)
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandListImages)
          assert.equal(res.body.results.entries.length, 0)
          assert.equal(res.body.results.totalEntries, 0)
          assert.notProperty(res.body.results, 'continuationToken')
          for (let i = 0; i < res.body.results.entries.length; i++) {
            assert.notProperty(res.body.results.entries[i], 'thumbnail')
          }
        }, wrapError)
    })

    it('throws missingParameter when entryCount is not provided', function () {
      return testClient.listImages()
        .then(
          expectError,
          (err) => validate.error(
            err.error.response.body,
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
            err.error.response.body,
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
            err.error.response.body,
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
            err.error.response.body,
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
    var fileUrls



    before(function () {
      if (isOSC1) {
        return testClient.startSession()
          .then(function onSuccess (res) {
            validate.done(res.body, schema.names.commandStartSession)
            sessionId = res.body.results.sessionId
          }, wrapError)
      }
    })

    after(function () {
      if (isOSC1) {
        return Utility.checkActiveSession()
          .then(function (isActive) {
            if (isActive) {
              return testClient.closeSession(sessionId)
                .then(function onSuccess (res) {
                  validate.done(res.body, schema.names.commandCloseSession)
                })
            }
          })
          .catch(wrapError)
      }
    })

    it('Expect success. camera.delete successfully deletes file when provided with valid fileUri/fileUrls', function () {
      this.timeout(timeoutValue)
      return testClient.takePicture(sessionId)
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandTakePicture)
          if (isOSC1) {
            fileUri = res.body.results.fileUri
            return testClient.delete(fileUri)
          } else {
            fileUrls = res.body.results.fileUrls
            return testClient.delete(fileUrls)
          }
        })
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandDelete)
        })
        .catch(wrapError)
    })

    it('successfully delete all files when fileUri only constains string "all"', function () {
      if (isOSC1) {
        return this.skip()
      }

      var fileUrls = ['all']

      this.timeout(timeoutValue)
      return testClient.takePicture()
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandTakePicture)
          return testClient.setOptions(sessionId, { captureMode: 'video' })
        }).then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandSetOptions)
          return testClient.startCapture()
        }).then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandStartCapture)
          Q.delay(5000)
        }).then(() => testClient.stopCapture())
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandStopCapture)
          return testClient.delete(fileUrls)
        }).then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandDelete)
          assert.equal(res.body.results.fileUrls.length, 0)
        }).catch(wrapError)
    })

    it('successfully delete all images when fileUri only constains string "image"', function () {
      if (isOSC1) {
        return this.skip()
      }

      var fileUrls = ['image']

      this.timeout(timeoutValue)
      return testClient.takePicture()
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandTakePicture)
          return testClient.setOptions(sessionId, { captureMode: 'video' })
        }).then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandSetOptions)
          return testClient.startCapture()
        }).then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandStartCapture)
          Q.delay(5000)
        }).then(() => testClient.stopCapture())
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandStopCapture)
          return testClient.delete(fileUrls)
        }).then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandDelete)
          assert.equal(res.body.results.fileUrls.length, 1)
          assert.match(res.body.results.fileUrls[0], /mp4$/i)
        }).catch(wrapError)
    })

    it('successfully delete all images when fileUri only constains string "video"', function () {
      if (isOSC1) {
        return this.skip()
      }

      var fileUrls = ['video']

      this.timeout(timeoutValue)
      return testClient.takePicture()
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandTakePicture)
          return testClient.setOptions(sessionId, { captureMode: 'video' })
        }).then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandSetOptions)
          return testClient.startCapture()
        }).then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandStartCapture)
          Q.delay(5000)
        }).then(() => testClient.stopCapture())
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandStopCapture)
          return testClient.delete(fileUrls)
        }).then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandDelete)
          assert.equal(res.body.results.fileUrls.length, 1)
          assert.match(res.body.results.fileUrls[0], /jpg$/i)
        }).catch(wrapError)
    })

    it('throws invalidParameterValue/Name when incorrect fileUri/fileUrls type is provided', function () {
      return testClient.delete('wrongtype')
        .then(
          expectError,
          (err) => validate.error(
            err.error.response.body,
            schema.names.commandDelete,
            isOSC1 ? schema.errors.invalidParameterValue : schema.errors.invalidParameterName
          )
      )
    })

    it('Expect missingParameter Error. camera.delete cannot delete file when fileUri/fileUrls are not provided', function () {
      return testClient.delete()
        .then(expectError,
          (err) => validate.error(
            err.error.response.body,
            schema.names.commandDelete,
            schema.errors.missingParameter)
      )
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
          validate.done(res.body, schema.names.commandStartSession)
          sessionId = res.body.results.sessionId
        }, wrapError)
    })

    after(function () {
      if (isOSC1) {
        return Utility.checkActiveSession()
          .then(function (isActive) {
            if (isActive) {
              return testClient.closeSession(sessionId)
                .then(function onSuccess (res) {
                  validate.done(res.body, schema.names.commandCloseSession)
                })
            }
          })
          .catch(wrapError)
      }

    })

    it('Expect success. camera.getImage successfully gets image when provided with a valid fileUri', function () {
      this.timeout(timeoutValue)
      return testClient.takePicture(sessionId)
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandTakePicture)
          fileUri = res.body.results.fileUri
          return testClient.getImage(fileUri)
        })
        .then((res) => validate.checkForBinary(res.body))
        .catch(wrapError)
    })

    it('successfully gets image when provided with a valid fileUri and maxSize', function () {
      this.timeout(timeoutValue)
      return testClient.takePicture(sessionId)
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandTakePicture)
          fileUri = res.body.results.fileUri
          return testClient.getImage(fileUri, 100)
        })
        .then((res) => validate.checkForBinary(res.body))
        .catch(wrapError)
    })

    it('Expect missingParameter Error. camera.getImage cannot get image when fileUri is not provided', function () {
      return testClient.getImage()
        .then(expectError,
          (err) => validate.error(err.error.response.body, schema.names.commandGetImage, schema.errors.missingParameter)
      )
    })

    it('Expect invalidParameterValue Error. camera.getImage cannot get image when fileUri is incorrect', function () {
      return testClient.getImage('wrongtype')
        .then(
          expectError,
          (err) => validate.error(
            err.error.response.body,
            schema.names.commandGetImage,
            schema.errors.invalidParameterValue
          )
      )
    })
  })

  // LIST FILES (OSC2.0)
  describe('Testing /osc/commands/execute camera.listFiles endpoint', function () {
    var sessionId
    var expectedImageCount
    var expectedVideoCount
    var totalEntryCount

    before(function () {
      if (!isOSC2) {
        return this.skip()
      }
      // delete exisiting files on SD card, if any
      return testClient.delete(["all"])
      .then(function onSuccess () {
        validate.done(res.body, schema.names.commandDelete)
        assert.equal(res.body.results.fileUrls.length, 0)
        return testClient.takePicture(sessionId)
      }).then(function onSuccess (res) {
        validate.done(res.body, schema.names.commandTakePicture)
        expectedImageCount++
        totalEntryCount++
        return testClient.takePicture(sessionId)
      }).then(function onSuccess (res) {
        validate.done(res.body, schema.names.commandTakePicture)
        expectedImageCount++
        totalEntryCount++
        return testClient.takePicture(sessionId)
      }).then(function onSuccess (res) {
        validate.done(res.body, schema.names.commandTakePicture)
        expectedImageCount++
        totalEntryCount++
        return testClient.setOptions(sessionId, { captureMode: 'video' })
      })
      .then(function onSuccess (res) {
        validate.done(res.body, schema.names.commandSetOptions)
        return testClient.startCapture()
      })
      .then(function onSuccess (res) {
        validate.done(res.body, schema.names.commandStartCapture)
        expectedVideoCount++
        totalEntryCount++
        Q.delay(5000)
        return testClient.stopCapture()
      }).then(function onSuccess (res) {
        validate.done(res.body, schema.names.commandStopCapture)
        assert(Object.keys(res.body).length === 0)
      }).catch(wrapError)
    })

    after(function () {
      // delete all files on SD card
      return testClient.delete(["all"])
      .then(function onSuccess () {
        validate.done(res.body, schema.names.commandDelete)
        assert.equal(res.body.results.fileUrls.length, 0)
      })
    })
  // testClient.listFiles(fileType, entryCount, maxThumbSize, startPosition(opstion))    //

    it('Successfully lists correct entries when fileType is supported', function () {
      return testClient.listFiles('image', expectedImageCount, 1024)
      .then(function onSuccess (res) {
        validate.done(res.body, schema.names.commandListFiles)
        assert.equal(res.body.results.totalEntries, expectedImageCount)
        return testClient.listFiles('video', expectedVideoCount, 1024)
      }).then(function onSuccess (res) {
        validate.done(res.body, schema.names.commandListFiles)
        assert.equal(res.body.results.totalEntries, expectedVideoCount)
        return testClient.listFiles('all', totalEntryCount, 1024)
      }).then(function onSuccess (res) {
        validate.done(res.body, schema.names.commandListFiles)
        assert.equal(res.body.results.totalEntries, totalEntryCount)
      }).catch(wrapError)
    })

    it('Returns base on maximum hardware capability when requested parameters exceeds maximum', function () {
      var maxResults

      return testClient.listFiles('all', totalEntryCount + 10, 1024 * 2)
      .then(function onSuccess (res) {
        validate.done(res.body, schema.names.commandListFiles)
        maxResults = res.body.results
        return testClient.listFiles('all', totalEntryCount, 1024)
      }).then(function onSuccess (res) {
        validate.done(res.body, schema.names.commandListFiles)
        assert.equal(res.body.results, maxResults)
      }).catch(wrapError)
    })

    it('Lists file entries starting from startPosition', function () {
      var shortList

      return testClient.listFiles('all', totalEntryCount, 1024, 2)
      .then(function onSuccess (res) {
        validate.done(res.body, schema.names.commandListFiles)
        shortList = res.body.results.entries
        return testClient.listFiles('all', totalEntryCount, 1024)
      }).then(function onSuccess (res) {
        validate.done(res.body, schema.names.commandListFiles)
        assert.equal(res.body.results.entries.slice(0, 1), shortList)
      }).catch(wrapError)
    })

    it('Returns empty array if startPosition is bigger than the position of the last entry', function () {
      return testClient.listFiles('all', totalEntryCount, 1024, totalEntryCount)
      .then(function onSuccess (res) {
        validate.done(res.body, schema.names.commandListFiles)
        assert(res.body.results.entries.length === 0)
        assert.equal(res.body.results.totalEntries, totalEntryCount)
      }).catch(wrapError)
    })

    it('Lists 2 entries when entryCount is 2', function () {
      return testClient.listFiles('all', 2, 1024)
      .then(function onSuccess (res) {
        validate.done(res.body, schema.names.commandListFiles)
        assert(res.body.results.entries.length === 2)
        assert.equal(res.body.results.totalEntries, totalEntryCount)
      }).catch(wrapError)
    })

    it('Lists actual number of files remaining if requested entryCount is bigger than the files remaining', function () {
      return testClient.listFiles('all', totalEntryCount + 10, 1024)
      .then(function onSuccess (res) {
        validate.done(res.body, schema.names.commandListFiles)
        assert.equal(res.body.results.entries.length, totalEntryCount)
        assert.equal(res.body.results.totalEntries, totalEntryCount)
      }).catch(wrapError)
    })

    it('Exclude thumbnails from list entries when maxThumbSize set to null', function () {
      return testClient.listFiles('all', totalEntryCount, null)
      .then(function onSuccess (res) {
        validate.done(res.body, schema.names.commandListFiles)
        assert.equal(res.body.results.entries.length, totalEntryCount)
        assert.equal(res.body.results.totalEntries, totalEntryCount)
        assert.notProperty(res.body.results.entries, 'thumbnails')
      }).catch(wrapError)
    })

    it('Throw missingParameter error if fileType not specified', function () {
      return testClient.listFiles(undefined, totalEntryCount, 1024)
      .then(expectError,
        (err) => validate.error(
          err.error.response.body,
          schema.names.commandListFiles,
          schema.errors.missingParameter)
      )
    })

    it('Throw missingParameter error if entryCount not specified', function () {
      return testClient.listFiles('all', undefined, 1024)
      .then(expectError,
        (err) => validate.error(
          err.error.response.body,
          schema.names.commandListFiles,
          schema.errors.missingParameter)
      )
    })

    it('Throw invalidParameterName error if fileType is "thumbnail"', function () {
      return testClient.listFiles('thumbnail', totalEntryCount, 1024)
      .then(expectError,
        (err) => validate.error(
          err.error.response.body,
          schema.names.commandListFiles,
          schema.errors.invalidParameterName)
      )
    })

    it('Throw invalidParameterValue error if entryCount is negative', function () {
      return testClient.listFiles('all', -10, 1024)
      .then(expectError,
        (err) => validate.error(
          err.error.response.body,
          schema.names.commandListFiles,
          schema.errors.invalidParameterValue)
      )
    })

    it('Throw invalidParameterValue error if entryCount is the wrong type', function () {
      return testClient.listFiles('all', 'wrongtype', 1024)
      .then(expectError,
        (err) => validate.error(
          err.error.response.body,
          schema.names.commandListFiles,
          schema.errors.invalidParameterValue)
      )
    })

    it('Throw invalidParameterValue error if maxThumbSize is negative', function () {
      return testClient.listFiles('all', totalEntryCount, -1024)
      .then(expectError,
        (err) => validate.error(
          err.error.response.body,
          schema.names.commandListFiles,
          schema.errors.invalidParameterValue)
      )
    })

    it('Throw invalidParameterValue Error if maxThumbSize is the wrong type', function () {
      return testClient.listFiles('all', totalEntryCount, 'wrongtype')
      .then(expectError,
        (err) => validate.error(
          err.error.response.body,
          schema.names.commandListFiles,
          schema.errors.invalidParameterValue)
      )
    })

    it('Return empty array if no files on the SD card', function () {
      return Utility.deleteAllImages
      .then((res) => testClient.listFiles('all', totalEntryCount, 1024))
      .then(function onSuccess (res) {
        validate.done(res.body, schema.names.commandListFiles)
        assert(Object.keys(res.body.results.entries).length === 0)
        assert.equal(res.body.results.totalEntries, 0)
      }).catch(wrapError)
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
          validate.done(res.body, schema.names.commandStartSession)
          sessionId = res.body.results.sessionId
          return testClient.takePicture(sessionId)
        })
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandTakePicture)
          fileUri = res.body.results.fileUri
        })
        .catch(wrapError)
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
                validate.done(res.body, schema.names.commandCloseSession)
              })
          }
        })
        .catch(wrapError)
    })

    it('Expect success. camera.getMetadata successfully gets metadata when provided with a valid fileUri', function () {
      return testClient.getMetadata(fileUri)
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandGetMetadata)
        }, wrapError)
    })

    it('throws invalidParameterValue when fileUri does not exist', function () {
      return testClient.getMetadata('wrongtype')
        .then(
          expectError,
          (err) => validate.error(
            err.error.response.body,
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
            err.error.response.body,
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
      'imageStabilization', '_bublVideoFileFormat'].concat(isOSC2 ? ['previewFormat',
        'captureInterval', 'captureNumber', 'remainingVideoSeconds', 'pollingDelay',
        'delayProcessing', 'clientVersion'] : [])

    before(function () {
      if (isOSC1) {
        return testClient.startSession()
          .then(function onSuccess (res) {
            validate.done(res.body, schema.names.commandStartSession)
            sessionId = res.body.results.sessionId
          }, wrapError)
      }
    })

    after(function () {
      if (isOSC1) {
        return Utility.checkActiveSession()
          .then(function (isActive) {
            if (isActive) {
              return testClient.closeSession(sessionId)
                .then(function onSuccess (res) {
                  validate.done(res.body, schema.names.commandCloseSession)
                })
            }
          })
          .catch(wrapError)
      }
    })

    it('gets correct options when gettable options are set to supported values', function () {
      return testClient.getOptions(sessionId, specifiedOptions)
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandGetOptions)
          for (let i = 0; i < specifiedOptions.length; i++) {
            assert.property(res.body.results.options, specifiedOptions[i])
          }
        }, wrapError)
    })

    it('Expect missingParameter Error. camera.getOptions cannot get options when options is not provided', function () {
      return testClient.getOptions(sessionId)
        .then(
          expectError,
          (err) => validate.error(
            err.error.response.body,
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
            err.error.response.body,
            schema.names.commandGetOptions,
            schema.errors.missingParameter
          )
      )
    })

    // RE-ADD ONCE EXTRA FIELD CHECKING HAS BEEN IMPLEMENTED
    // Also, for this test needs to report different error based on OSC version
    // OSC1: invalidParameterValue OSC2: invalidParameterName
    it('throws invalidParameterValue when options is set to unsupported value', function () {
      if (isBublcam && serverVersion < 2) {
          return this.skip()
      }

      return testClient.getOptions(sessionId, ['wrongtype'])
        .then(
          expectError,
          (err) => validate.error(
            err.error.response.body,
            schema.names.commandGetOptions,
            schema.errors.invalidParameterValue
          )
      )
    })

    // Doesn't work properly since no OSC1 doesn't report invalidParameterName
    it('throws invalidParameterName if OSC1 camera requests OSC2-specific options', function () {
      if (isBublcam && serverVersion < 2) {
          return this.skip()
      }

      if (!isOSC1) {
        return this.skip()
      }

      return testClient.getOptions(sessionId, ['captureInterval'])
        .then(expectError,
          (err) => validate.error(
            err.error.response.body,
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
      if (!isOSC1) {
        return testClient.startSession()
          .then(function onSuccess (res) {
            validate.done(res.body, schema.names.commandStartSession)
            sessionId = res.body.results.sessionId
          }, wrapError)
      }
    })

    after(function () {
      if (isOSC1) {
        return Utility.restoreDefaultOptions(defaultOptionsFile)
          .then(function onSuccess (res) {
            validate.done(res.body, schema.names.commandSetOptions)
            return testClient.closeSession(sessionId)
          })
          .then((res) => validate.done(res.body, schema.names.commandCloseSession))
          .catch(wrapError)
      } else {
        return testClient.reset()
          .then(res.body, schema.names.commandReset)
      }

    })

    it(' successfully sets options when sleepDelay option is set to supported value', function () {
      return testClient.setOptions(sessionId, { sleepDelay: 5 })
        .then(
          (res) => validate.done(res.body, schema.names.commandSetOptions),
          wrapError
        )
    })

    it('throws invalidParameterValue when sleepDelay option is set to unsupported value', function () {
      return testClient.setOptions(sessionId, { sleepDelay: -1 })
        .then(
          expectError,
          (err) => validate.error(
            err.error.response.body,
            schema.names.commandSetOptions,
            schema.errors.invalidParameterValue
          )
      )
    })

    it('successfully sets options when offDelay option is set to supported value', function () {
      return testClient.setOptions(sessionId, { offDelay: 5 })
        .then(
          (res) => validate.done(res.body, schema.names.commandSetOptions),
          wrapError
        )
    })

    it('throws invalidParameterValue when offDelay option is set to unsupported value', function () {
      return testClient.setOptions(sessionId, { offDelay: -1 })
        .then(
          expectError,
          (err) => validate.error(
            err.error.response.body,
            schema.names.commandSetOptions,
            schema.errors.invalidParameterValue
          )
      )
    })

    it('successfully sets options when imageStabilization option is set to supported value', function () {
      return testClient.setOptions(sessionId, {
        imageStabilization: 'off'
      })
        .then((res) => validate.done(res.body, schema.names.commandSetOptions),
          wrapError)
    })

    it('throws invalidParameterValue when imageStabilization option is set to unsupported value', function () {
      return testClient.setOptions(sessionId, { imageStabilization: 'UNSUPPORTED' })
        .then(
          expectError,
          (err) => validate.error(
            err.error.response.body,
            schema.names.commandSetOptions,
            schema.errors.invalidParameterValue
          )
      )
    })

    it('successfully sets options when hdr option is set to supported value', function () {
      return testClient.setOptions(sessionId, {
        hdr: true
      })
        .then((res) => validate.done(res.body, schema.names.commandSetOptions),
          wrapError)
    })

    it('throws invalidParameterValue when hdr option is set to unsupported value', function () {
      return testClient.setOptions(sessionId, { hdr: 'UNSUPPORTED' })
        .then(
          expectError,
          (err) => validate.error(
            err.error.response.body,
            schema.names.commandSetOptions,
            schema.errors.invalidParameterValue
          )
      )
    })

    it('successfully sets options when captureMode option is set to supported value _bublVideo', function () {
      if (!isBublcam) {
        return this.skip()
      }

      return testClient.setOptions(sessionId, {
        captureMode: '_bublVideo'
      })
        .then((res) => validate.done(res.body, schema.names.commandSetOptions),
          wrapError)
    })

    it('successfully sets options when captureMode option is set to supported value Image', function () {
      return testClient.setOptions(sessionId, {
        captureMode: 'image'
      })
        .then((res) => validate.done(res.body, schema.names.commandSetOptions),
          wrapError)
    })

    it('throws invalidParameterValue when captureMode option is set to unsupported value', function () {
      return testClient.setOptions(sessionId, { captureMode: 'UNSUPPORTED' })
        .then(
          expectError,
          (err) => validate.error(
            err.error.response.body,
            schema.names.commandSetOptions,
            schema.errors.invalidParameterValue
          )
      )
    })

    it('successfully sets options when exposureProgram option is set to supported value', function () {
      return testClient.setOptions(sessionId, {
        exposureProgram: 2
      })
        .then((res) => validate.done(res.body, schema.names.commandSetOptions),
          wrapError)
    })

    it('throws invalidParameterValue when exposureProgram option is set to unsupported value', function () {
      return testClient.setOptions(sessionId, { exposureProgram: -1 })
        .then(
          expectError,
          (err) => validate.error(
            err.error.response.body,
            schema.names.commandSetOptions,
            schema.errors.invalidParameterValue
          )
      )
    })

    it('successfully sets options when whiteBalance option is set to supported value', function () {
      return testClient.setOptions(sessionId, {
        whiteBalance: 'auto'
      })
        .then((res) => validate.done(res.body, schema.names.commandSetOptions),
          wrapError)
    })

    it('throws invalidParameterValue when whiteBalance option is set to unsupported value', function () {
      return testClient.setOptions(sessionId, { whiteBalance: 'UNSUPPORTED' })
        .then(
          expectError,
          (err) => validate.error(
            err.error.response.body,
            schema.names.commandSetOptions,
            schema.errors.invalidParameterValue
          )
      )
    })

    it('successfully sets options when fileFormat option is set to supported value raw for image', function () {
      if (isBubl1 || isMock) {
        return testClient.setOptions(sessionId, rawFileFormat)
          .then((res) => validate.done(res.body, schema.names.commandSetOptions),
            wrapError)
      } else {
        return this.skip()
      }
    })

    it('successfully sets options when fileFormat option is set to supported value jpeg for image', function () {
      return testClient.setOptions(sessionId, jpegFileFormat)
        .then((res) => validate.done(res.body, schema.names.commandSetOptions),
          wrapError)
    })

    it('throws invalidParameterValue when fileFormat option is set to unsupported value', function () {
      return testClient.setOptions(sessionId, { fileFormat: 'UNSUPPORTED' })
        .then(
          expectError,
          (err) => validate.error(
             err.error.response.body,
            schema.names.commandSetOptions,
            schema.errors.invalidParameterValue
          )
        )
    })

    it('successfully sets options when _bublVideoFileFormat option is set to supported value', function () {
      if (!isBublcam) {
        return this.skip()
      }

      return testClient.setOptions(sessionId, bublVideoFileFormat)
        .then((res) => validate.done(res.body, schema.names.commandSetOptions),
          wrapError)
    })

    it('successfully sets options when _bublVideoFileFormat option is set to supported value (SD)', function () {
      if (isBubl1 || isMock) {
        return testClient.setOptions(sessionId,
          { _bublVideoFileFormat: { type: 'mp4', width: 1440, height: 1440 } })
          .then((res) => validate.done(res.body, schema.names.commandSetOptions),
            wrapError)
      } else {
        return this.skip()
      }
    })

    it('throws invalidParameterValue when _bublVideoFileFormat option is set to unsupported value', function () {
      if (!isBublcam) {
        return this.skip()
      }

      return testClient.setOptions(sessionId,
        { _bublVideoFileFormat: 'UNSUPPORTED' })
        .then(
          expectError,
          (err) => validate.error(
            err.error.response.body,
            schema.names.commandSetOptions,
            schema.errors.invalidParameterValue
          )
      )
    })

    it('successfully sets options when exposureDelay option is set to supported value', function () {
      return testClient.setOptions(sessionId, { exposureDelay: 4 })
        .then((res) => validate.done(res.body, schema.names.commandSetOptions), wrapError)
    })

    it('throws invalidParameterValue when exposureDelay option is set to unsupported value', function () {
      return testClient.setOptions(sessionId, { exposureDelay: -1 })
        .then(
          expectError,
          (err) => validate.error(
            err.error.response.body,
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
      .then((res) => validate.done(res.body, schema.names.commandSetOptions), wrapError)
    })

    it('successfully sets options when dateTimeZone option is set to supported value and bubl timezone', function () {
      return testClient.setOptions(sessionId, {
        dateTimeZone: '2015:07:23 14:27:39-04:00|America/Toronto'
      })
        .then((res) => validate.done(res.body, schema.names.commandSetOptions),
          wrapError)
    })

    it('successfully sets options when wifiPassword option is set to supported value', function () {
      if (testViaWifi) {
        return this.skip()
      }

      return testClient.setOptions(sessionId, { wifiPassword: '12345678' })
      .then((res) => validate.done(res.body, schema.names.commandSetOptions), wrapError)
    })

    it('throws invalidParameterValue when wifiPassword option is set to unsupported value', function () {
      return testClient.setOptions(sessionId, { wifiPassword: '1234' })
        .then(
          expectError,
          (err) => validate.error(
            err.error.response.body,
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
            err.error.response.body,
            schema.names.commandSetOptions,
            schema.errors.missingParameter
          )
        )
    })

    // Does not work properly with current BublScarlet OSC 1.0
    it.skip('throw invalidParameterName when setting to an OSC2.0-specific option on an OSC1.0 camera', function () {
      if (!isOSC1) {
        return this.skip()
      }

      return testClient.setoptions(sessionId, { captureInterval: 5 })
        .then(expectError,
          (err) => validate.error(
            err.error.response.body,
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
            validate.done(res.body, schema.names.commandStartSession)
            sessionId = res.body.results.sessionId
          }, wrapError)
      }
    })

    after(function () {
      if (isOSC1) {
        return Utility.checkActiveSession()
          .then(function (isActive) {
            if (isActive) {
              return testClient.closeSession(sessionId)
                .then(function onSuccess (res) {
                  validate.done(res.body, schema.names.commandCloseSession)
                })
            }
          })
          .catch(wrapError)
      }
    })

    it('successfully grabs command status after take picture has been called', function () {
      this.timeout(timeoutValue)
      var deferred = Q.defer()

      return Q.all([
        testClient.takePicture(sessionId, function (res) {
          try {
            validate.inProgress(res.body, schema.names.commandTakePicture)
            deferred.resolve()
          } catch (err) {
            deferred.reject(err)
          }
        })
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandTakePicture)
        }, wrapError),
        deferred.promise
      ])
    })

    it('throws missingParameter when command ID is not provided', function () {
      return testClient.commandsStatus().then(
        expectError,
        (err) => validate.error(
          err.error.response.body,
          schema.names.commandsStatus,
          schema.errors.missingParameter)
      )
    })

    it('throws invalidParameterValue when incorrect sessionId is provided', function () {
      return testClient.commandsStatus('wrongtype').then(
        expectError,
        (err) => validate.error(
          err.error.response.body,
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
        .then((res) => validate.done(res.body, schema.names.commandReset))
        .catch(wrapError)
    })

    afterEach(function () {
      return testClient.stopCapture()
      .then((res) => {
        validate.done(res.body, schema.names.commandStopCapture)
        return testClient.reset()
      }).then((res) => validate.done(res.body, schema.names.commandReset))
      .catch(wrapError)
    })

    it('Successfully startCpature a video', function () {
      this.timeout(timeoutValue)

      return testClient.setOptions({captureMode: 'video'})
        .then((res) => {
          validate.done(res.body, schema.names.commandSetOptions)
          return testClient.startCapture()
        }).then((res) => {
          validate.done(res.body, schema.names.commandStartCapture)
        }).catch(wrapError)
    })

    it('Succesfully startCapture interval images', function () {
      this.timeout(timeoutValue)

      return testClient.setOptions({
        captureMode: 'interval',
        captureInterval: 3,
        captureNumber: 3
      }).then((res) => {
        validate.done(res.body, schema.names.commandSetOptions)
        return testClient.startCapture()
      }).then((res) => {
        validate.done(res.body, schema.names.commandStartCapture)
      }).catch(wrapError)
    })

    it('Throw disabledCommand error if startCapture in captureModes other than video or interval', function () {
      this.timeout(timeoutValue)

      return testClient.setOptions({
        captureMode: 'image'
      }).then((res) => {
        validate.done(res.body, schema.names.commandSetOptions)
        return testClient.startCapture()
      }).then(expectError,
      (err) => validate.error(
        err.error.response.body,
        schema.names.commandStartCapture,
        schema.errors.disabledCommand)
      )
    })

    it('Throw disabledCommand error if attempt to start a video capture during an active open-ended capture', function () {
      this.timeout(timeoutValue)

      return testClient.setOptions({
        captureMode: 'video'
      }).then((res) => {
        validate.done(res.body, schema.names.commandSetOptions)
        return testClient.startCapture()
      }).then((res) => {
        validate.done(res.body, schema.names.commandStartCapture)
        return testClient.startCapture()
      }).then(expectError,
        (err) => validate.error(
          err.error.response.body,
          schema.names.commandStartCapture,
          schema.errors.disabledCommand)
      )
    })

    it('Throw disabledCommand error if attempt to start an interval capture during an active open-ended capture', function () {
      this.timeout(timeoutValue)

      return testClient.setoptions({
        captureMode: 'video'
      }).then((res) => {
        validate.done(res.body, schema.names.commandSetOptions)
        return testClient.startCapture()
      }).then((res) => {
        validate.done(res.body, schema.names.commandStartCapture)
        return testClient.setoptions({
          captureMode: 'interval',
          captureInterval: 3
        })
      }).then((res) => {
        validate.done(res.body, schema.names.commandSetOptions)
        return testClient.startCapture()
      }).then(expectError,
        (err) => validate.error(
          err.error.response.body,
          schema.names.commandStartCapture,
          schema.errors.disabledCommand)
        )
    })

    it('Throw invalidParameterName error if an unsupported parameter is entered', function () {
      this.timeout(timeoutValue)

      return testClient.setOptions({
        captureMode: 'video'
      }).then((res) => {
        validate.done(res.body, schema.names.commandSetOptions)
        return testClient.startCapture('unsupported')
      }).then(expectError,
      (err) => validate.error(
        err.error.response.body,
        schema.names.commandStartCapture,
        schema.errors.invalidParameterName)
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
        .then((res) => validate.done(res.body, schema.names.commandReset))
        .catch(wrapError)
    })

    afterEach(function () {
      return testClient.reset()
        .then((res) => validate.done(res.body, schema.names.commandReset))
        .catch(wrapError)
    })

    it('Successfully stopCapture a video', function () {
      return testClient.setOptions({
        captureMode: 'video'
      }).then((res) => {
        validate.done(res.body, schema.names.commandSetOptions)
        return testClient.startCapture()
      }).then((res) => {
        validate.done(res.body, schema.names.commandStartCapture)
        return testClient.stopCapture()
      }).then((res) => {
        validate.done(res.body, schema.names.commandStopCapture)
        assert(Object.keys(res.body).length === 0)
      }).catch(wrapError)
    })

    it('Successfully stopCapture an open-ended interval image capture', function () {
      return testClient.setOptions({
        captureMode: 'interval',
        captureInterval: 5,
        captureNumber: 0
      }).then((res) => {
        validate.done(res.body, schema.names.commandSetOptions)
        return testClient.startCapture()
      }).then((res) => {
        validate.done(res.body, schema.names.commandStartCapture)
        return testClient.stopCapture()
      }).then((res) => {
        validate.done(res.body, schema.names.commandStopCapture)
        assert(Object.keys(res.body).length === 0)
      }).catch(wrapError)
    })

    it('Successfully stopCapture a non-open-ended interval capture before the set-interval is reached', function () {
      return testClient.setOptions({
        captureMode: 'interval',
        captureInterval: 5,
        captureNumber: 30
      }).then((res) => {
        validate.done(res.body, schema.names.commandSetOptions)
        return testClient.startCapture()
      }).then((res) => {
        validate.done(res.body, schema.names.commandStartCapture)
        return testClient.stopCapture()
      }).then((res) => {
        validate.done(res.body, schema.names.commandStopCapture)
        assert(Object.keys(res.body).length === 0)
      }).catch(wrapError)
    })

    it('Throw disabledCommand Error if there is not active capture to be stopped', function () {
      return testClient.stopCapture()
      .then(expectError,
      (err) => validate.error(
        err.error.response.body,
        schema.names.commandStopCapture,
        schema.errors.disabledCommand)
      )
    })

    it('Throw invalidParameterName Error if an unsupported parameter is entered', function () {
      return testClient.stopCapture('unsupported')
      .then(expectError,
        (err) => validate.error(
          err.error.response.body,
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
      .then((res) => validate.done(res.body, schema.names.commandReset))
    })

    it('Throw invalidParameterName Error if an unsupported parameter is entered', function () {
      return testClient.reset(defaultOptionsFile)
      .then(expectError,
      (err) => validate.error(
        err.error.response.body,
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
            validate.done(res.body, schema.names.commandStartSession)
            sessionId = res.body.results.sessionId
          }, wrapError)
      }
    })

    after(function () {
      if (isOSC1) {
        return Utility.checkActiveSession()
          .then(function (isActive) {
            if (isActive) {
              return testClient.closeSession(sessionId)
                .then(function onSuccess (res) {
                  validate.done(res.body, schema.names.commandCloseSession)
                })
            }
          })
          .catch(wrapError)
      }
    })

    it.only('returns immediately if no waitTimeout argument is provided', function () {
      this.timeout(timeoutValue)
      var deferred = Q.defer()
      var commandId = ''
      var fingerprint = ''

      return Q.all([
        testClient.takePicture(sessionId, function (initRes) {
          if (commandId === '') {
            commandId = initRes.body.id
            testClient.bublPoll(commandId, fingerprint)
              .then(function onSuccess (res) {
                console.log(res.body)
                validate.bublPoll(res.body)
                validate.inProgress(res.body.command, schema.names.cameraTakePicture)
                assert.notEqual(res.body.fingerprint, fingerprint)
                assert.equal(res.body.command.id, commandId)
                fingerprint = res.body.fingerprint
                return testClient.bublPoll(commandId, fingerprint)
              })
              .then(function onSuccess (res) {
                validate.bublPoll(res.body)
                assert.equal(res.body.fingerprint, fingerprint)
                assert.equal(res.body.command.id, commandId)
              })
              .then(deferred.resolve, deferred.reject)
              .catch(wrapError)
          }
        }).then((res) => validate.done(res.body, schema.names.commandTakePicture), wrapError),
        deferred.promise
      ])
    })

    it.only('Expect success. /osc/commands/_bublPoll returns once command state has changed', function () {
      this.timeout(timeoutValue)
      var fingerprint = ''
      var commandId = ''
      var deferred = Q.defer()

      return Q.all([
        testClient.bublCaptureVideo(sessionId, function (initRes) {
          if (commandId === '') {
            commandId = initRes.body.id
            Q.delay(8000)
            .then(function () {
              return testClient.bublPoll(commandId, fingerprint)
            })
            .then(function onSuccess (res) {
              console.log("Code just got to first layer")
              console.log(res.body)
              validate.bublPoll(res.body)
              assert.notEqual(res.body.fingerprint, fingerprint)
              assert.equal(res.body.command.id, commandId)
              fingerprint = res.body.fingerprint
              return testClient.bublStop(commandId)
            })
            .then(function onSuccess (res) {
              assert(Object.keys(res.body).length === 0)
              return testClient.bublPoll(commandId, fingerprint, 4)
            })
            .then(function onSuccess (res) {
              console.log("Code gets to second layer")
              console.log(res.body)
              validate.bublPoll(res.body)
              assert.notEqual(res.body.fingerprint, fingerprint)
              assert.equal(res.body.command.id, commandId)
            })
            .then(deferred.resolve, deferred.reject)
          }
        })
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandBublCaptureVideo)
        }, wrapError),
        deferred.promise
      ])
    })

    it('successfully gets updates when state has not changed with waitTimeout set to 5', function () {
      this.timeout(timeoutValue)
      var fingerprint = ''
      var commandId = ''
      var deferred = Q.defer()
      return Q.all([
        testClient.bublCaptureVideo(sessionId, function (initRes) {
          if (commandId === '') {
            commandId = initRes.body.id
            Q.delay(8000)
            .then(function () {
              return testClient.bublPoll(commandId, fingerprint)
            })
            .then(function onSuccess (res) {
              validate.bublPoll(res.body)
              assert.notEqual(res.body.fingerprint, fingerprint)
              assert.equal(res.body.command.id, commandId)
              fingerprint = res.body.fingerprint
              return Q.delay(4000)
            })
            .then(function () {
              return testClient.bublPoll(commandId, fingerprint, 5)
            })
            .then(function onSuccess (res) {
              validate.bublPoll(res.body)
              assert.equal(res.body.fingerprint, fingerprint)
              assert.equal(res.body.command.id, commandId)
              return testClient.bublStop(commandId)
            })
            .then(function onSuccess (res) {
              assert(Object.keys(res.body).length === 0)
            })
            .then(deferred.resolve, deferred.reject)
          }
        })
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandBublCaptureVideo)
        }, wrapError),
        deferred.promise
      ])
    })

    it('throws missingParameter when no commandId is provided', function () {
      return testClient.bublPoll(undefined, '').then(
        expectError,
        (err) => validate.error(
          err.error.response.body,
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
            testClient.bublPoll(res.body.id)
            .then(expectError,
              (err) => {
                validate.error(
                  err.error.response.body,
                  schema.names.commandsBublPoll,
                  schema.errors.missingParameter)
                stopped = true
              })
            .then(deferred.resolve, deferred.reject)
          }
        })
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandTakePicture)
          assert.isTrue(stopped)
        }, wrapError),
        deferred.promise
      ])
    })

    it('throws invalidParameterValue when commandId is invalid', function () {
      this.timeout(timeoutValue)
      return testClient.bublPoll('wrongtype', '').then(
        expectError,
        (err) => validate.error(
          err.error.response.body,
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
            commandId = initRes.body.id
            testClient.bublPoll(commandId, '', 'wrongtype').then(
              (res) => { deferred.reject(expectError(res)) },
              (err) => {
                validate.error(
                  err.error.response.body,
                  schema.names.commandsBublPoll,
                  schema.errors.invalidParameterValue
                )
                deferred.resolve()
              }
            ).catch(wrapError)
          }
        })
        .then((res) => validate.done(res.body, schema.names.commandTakePicture), wrapError),
        deferred.promise
      ])
    })
  })

  // BUBL TIMELAPSE
  describe('Testing /osc/commands/execute camera._bublTimelapse command', function () {
    var sessionId

    before(function () {
      if (!isBublcam) {
        return this.skip()
      }

      if (isOSC1) {
        this.timeout(timeoutValue)
        return testClient.startSession()
          .then(function (res) {
            sessionId = res.body.results.sessionId
          })
      }
    })

    beforeEach(function () {
      this.timeout(timeoutValue)
      if (isOSC1) {
        return Utility.restoreDefaultOptions(defaultOptionsFile)
          .then(function () {
            return Utility.deleteAllImages()
          })
          .catch(wrapError)
      } else {
        return testClient.reset()
          .then((res) => validate.done(res.body, schema.names.commandReset))
      }

    })

    after(function () {
      if (isOSC1) {
        return Utility.checkActiveSession()
          .then(function (isActive) {
            if (isActive) {
              return testClient.closeSession(sessionId)
                .then(function onSuccess (res) {
                  validate.done(res.body, schema.names.commandCloseSession)
                })
            }
          })
          .catch(wrapError)
      }
    })

    it('Expect missingParameter Error. sessionId is mandatory for command camera._bublTimelapse', function () {
      return testClient.bublTimelapse().then(
        expectError,
        (err) => validate.error(
          err.error.response.body,
          schema.names.commandBublTimelapse,
          schema.errors.missingParameter
        )
      )
    })

    it('Expect invalidParameterValue Error. camera._bublTimelapse expects active session\'s sessionId', function () {
      return testClient.bublTimelapse(sessionId + '0').then(
        expectError,
        (err) => validate.error(
          err.error.response.body,
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
            commandId = initRes.body.id

            testClient.bublTimelapse(sessionId)
            .then(
              () => assert.fail('Should have received cameraInExclusiveUse'),
              (err) => validate.error(
                err.error.response.body,
                schema.names.commandBublTimelapse,
                schema.errors.cameraInExclusiveUse
              )
            )
            .then(() => testClient.bublStop(commandId))
            .then((res) => assert(Object.keys(res.body).length === 0))
            .then(deferred.resolve, deferred.reject)
          }
        })
        .then((res) => validate.done(res.body, schema.names.commandBublTimelapse), wrapError),
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
            commandId = initRes.body.id
            testClient.bublTimelapse(sessionId)
            .then(
              () => assert.fail('Should have received cameraInExclusiveUseError'),
              (err) => validate.error(
                err.error.response.body,
                schema.names.commandBublTimelapse,
                schema.errors.cameraInExclusiveUse
              )
            )
            .then(() => testClient.bublStop(commandId))
            .then((res) => assert(Object.keys(res.body).length === 0))
            .then(deferred.resolve, deferred.reject)
          }
        })
        .then((res) => validate.done(res.body, schema.names.commandBublCaptureVideo), wrapError),
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
            var commandId = initRes.body.id
            stopped = true
            Q.delay(15000)
            .then(() => testClient.bublStop(commandId))
            .then((res) => assert(Object.keys(res.body).length === 0))
            .then(deferred.resolve, deferred.reject)
          }
        })
        .then((res) => validate.done(res.body, schema.names.commandBublTimelapse), wrapError),
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
          validate.done(res.body, schema.names.commandSetOptions)
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
            validate.done(res.body, schema.names.commandBublTimelapse)
            assert.notEqual(res.body.results.fileUri.length, timelapseCount)
          }
        })
        .catch(wrapError)
    })
  })

  // BUBL CAPTURE VIDEO
  describe('Testing /osc/commands/execute camera._bublCaptureVideo endpoint', function () {
    var sessionId

    before(function () {
      if (!isBublcam) {
        return this.skip()
      }

      if (isOSC1) {
        return testClient.startSession()
          .then(function onSuccess (res) {
            validate.done(res.body, schema.names.commandStartSession)
            sessionId = res.body.results.sessionId
            return Utility.restoreDefaultOptions(defaultOptionsFile)
          })
          .then(function onSuccess (res) {
            validate.done(res.body, schema.names.commandSetOptions)
          })
          .catch(wrapError)
      } else {
        return testClient.reset()
          .then((res) => validate.done(res.body, schema.names.commandReset))
          .catch(wrapError)
      }
    })

    afterEach(function () {
      this.timeout(timeoutValue)
      if (isOSC1) {
        return Utility.restoreDefaultOptions(defaultOptionsFile)
          .then(function onSuccess (res) {
            validate.done(res.body, schema.names.commandSetOptions)
          })
          .catch(wrapError)
      } else {
        return testClient.reset()
         .then((res) => validate.done(res.body, schema.names.commandReset))
         .catch(wrapError)
      }
    })

    after(function () {
      if (isOSC1) {
        return Utility.checkActiveSession()
          .then(function (isActive) {
            if (isActive) {
              return testClient.closeSession(sessionId)
                .then(function onSuccess (res) {
                  validate.done(res.body, schema.names.commandCloseSession)
                })
            }
          })
          .catch(wrapError)
      }
    })


    it('Expect success.  camera._bublCaptureVideo successfully captures a video', function () {
      this.timeout(timeoutValue)
      var stopped = false
      var deferred = Q.defer()

      return Q.all([
        testClient.bublCaptureVideo(sessionId, function (initRes) {
          if (!stopped) {
            var commandId = initRes.body.id
            Q.delay(2000)
            .then(() => testClient.bublStop(commandId))
            .then((res) => assert(Object.keys(res.body).length === 0))
            .then(deferred.resolve, deferred.reject)
            stopped = true
          }
        })
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandBublCaptureVideo)
          assert.isTrue(stopped)
        }, wrapError),
        deferred.promise
      ])
    })

    it('throws cameraInExclusiveUse when a video capture is already active', function () {
      this.timeout(timeoutValue)
      var stopped = false
      var deferred = Q.defer()

      return Q.all([
        testClient.bublCaptureVideo(sessionId, function (initRes) {
          var commandId = initRes.body.id
          if (!stopped) {
            stopped = true
            testClient.bublCaptureVideo(sessionId).then(
              expectError,
              (err) => {
                validate.error(
                  err.error.response.body,
                  schema.names.commandBublCaptureVideo,
                  schema.errors.cameraInExclusiveUse
                )
                return testClient.bublStop(commandId)
              }
            ).then((res) => assert(Object.keys(res.body).length === 0))
            .then(deferred.resolve, deferred.reject)
          }
        }).then(
          function onSuccess (res) {
            validate.done(res.body, schema.names.commandBublCaptureVideo)
            assert.isTrue(stopped)
          },
          wrapError
        ),
        deferred.promise
      ])
    })

    it('throws invalidParameterValue when incorrect sessionId type is provided', function () {
      return testClient.bublCaptureVideo('wrongtype').then(
        expectError,
        (err) => validate.error(
          err.error.response.body,
          schema.names.commandBublCaptureVideo,
          schema.errors.invalidParameterValue
        )
      )
    })

    it('throws missingParameter when sessionId is not provided', function () {
      return testClient.bublCaptureVideo().then(
        expectError,
        (err) => validate.error(
          err.error.response.body,
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
            validate.done(res.body, schema.names.commandStartSession)
            sessionId = res.body.results.sessionId
            return Utility.restoreDefaultOptions(defaultOptionsFile)
          })
          .then(function onSuccess (res) {
            validate.done(res.body, schema.names.commandSetOptions)
          })
          .catch(wrapError)
      } else {
        return testClient.reset()
          .then((res) => validate.done(res.body, schema.names.commandReset))
      }

    })

    afterEach(function () {
      this.timeout(timeoutValue)
      if (isOSC1) {
        return Utility.restoreDefaultOptions(defaultOptionsFile)
          .then(function onSuccess (res) {
            validate.done(res.body, schema.names.commandSetOptions)
          }, wrapError)
      } else {
        return testClient.reset()
          .then((res) => validate.done(res.body, schema.names.commandReset))
      }

    })

    after(function () {
      if (isOSC1) {
        return Utility.checkActiveSession()
          .then(function (isActive) {
            if (isActive) {
              return testClient.closeSession(sessionId)
                .then(function onSuccess (res) {
                  validate.done(res.body, schema.names.commandCloseSession)
                })
            }
          })
          .catch(wrapError)
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
            commandId = initRes.body.id
            Q.delay(1000)
            .then(function () {
              return testClient.bublStop(commandId)
            })
            .then(function onSuccess (res) {
              assert(Object.keys(res.body).length === 0)
            })
            .then(deferred.resolve, deferred.reject)
            stopped = true
          }
        })
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandBublStream)
          assert.equal(res.body.id, commandId)
          assert.isTrue(stopped)
        }, wrapError),
        deferred.promise
      ])
    })

    it('throws invalidParameterValue when incorrect commandId type is provided', function () {
      return testClient.bublStop('wrongtype').then(
        expectError,
        (err) => validate.error(
          err.error.response.body,
          schema.names.commandsBublStop,
          schema.errors.invalidParameterValue
        )
      )
    })

    it('throws missingParameter when commandId is not provided', function () {
      return testClient.bublStop().then(expectError,
        (err) => validate.error(
          err.error.response.body,
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
            validate.done(res.body, schema.names.commandStartSession)
            sessionId = res.body.results.sessionId
            return Utility.restoreDefaultOptions(defaultOptionsFile)
          }).then(function onSuccess (res) {
            validate.done(res.body, schema.names.commandSetOptions)
          }, wrapError)
      } else {
        return testClient.reset()
          .then((res) => validate.done(res.body, schema.names.commandReset))
      }
    })

    afterEach(function () {
      this.timeout(timeoutValue)
      if (isOSC1) {
        return Utility.restoreDefaultOptions(defaultOptionsFile)
          .then(function onSuccess (res) {
            validate.done(res.body, schema.names.commandSetOptions)
          }, wrapError)
      } else {
        return testClient.reset()
          .then((res) => validate.done(res.body, schema.names.commandReset))
      }
    })

    after(function () {
      if (isOSC1) {
        return Utility.checkActiveSession()
          .then(function (isActive) {
            if (isActive) {
              return testClient.closeSession(sessionId)
                .then(function onSuccess (res) {
                  validate.done(res.body, schema.names.commandCloseSession)
                })
            }
          })
          .catch(wrapError)
      }
    })

    it('Expect success.  camera._bublStream successfully streams', function () {
      this.timeout(10000)
      var commandId
      var deferred = Q.defer()

      return Q.all([
        testClient.bublStream(sessionId, function onStatusUpdate (initRes) {
          if (!commandId) {
            commandId = initRes.body.id
            testClient.bublStop(commandId).then(function onSuccess (res) {
              assert(Object.keys(res.body).length === 0)
            })
            .then(deferred.resolve, deferred.reject)
          }
        })
        .then(function onStreamCompleted (res) {
          validate.done(res.body, schema.names.commandBublStream)
          assert.equal(res.body.id, commandId)
        }, wrapError),
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
            commandId1 = commandRes1.body.id
          // Starting this stream, stops the first one
            testClient.bublStream(sessionId, function onStatusUpdate2 (commandRes2) {
              if (!commandId2) {
                commandId2 = commandRes2.body.id
                testClient.bublStop(commandId2)
                .then(function onSuccess (res) {
                  assert(Object.keys(res.body).length === 0)
                })
                .then(deferred1.resolve, deferred1.reject)
              }
            })
            .then(function onSuccess (res) {
              validate.done(res.body, schema.names.commandBublStream)
              assert.equal(res.body.id, commandId2)
            })
            .then(deferred2.resolve, deferred2.reject)
          }
        })
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandBublStream)
          assert.equal(res.body.id, commandId1)
        }, wrapError),
        deferred1.promise,
        deferred2.promise
      ])
    })

    it('throws invalidParameterValue when incorrect sessionId type is provided', function () {
      return testClient.bublStream('wrongtype')
        .then(expectError, function onError (err) {
          validate.error(
            err.error.response.body,
            schema.names.commandBublStream,
            schema.errors.invalidParameterValue)
        })
    })

    it('Expect missingParameter Error. camera._bublStream cannot stream when sessionId is not provided', function () {
      return testClient.bublStream()
        .then(expectError, function onError (err) {
          validate.error(
            err.error.response.body,
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
          validate.done(res.body, schema.names.commandStartSession)
          sessionId = res.body.results.sessionId
        }, wrapError)
    })

    after(function () {
      return Utility.checkActiveSession()
        .then(function (isActive) {
          if (isActive) {
            return testClient.closeSession(sessionId)
              .then(function onSuccess (res) {
                validate.done(res.body, schema.names.commandCloseSession)
              })
          }
        })
        .catch(wrapError)
    })

    it('Expect success. camera._bublGetImage successfully gets image when provided with a valid fileUri', function () {
      this.timeout(timeoutValue)
      return testClient.takePicture(sessionId)
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandTakePicture)
          fileUri = res.body.results.fileUri
          return testClient.bublGetImage(fileUri)
        })
        .then(function onSuccess (res) {
          validate.checkForBinary(res.body)
        })
        .catch(wrapError)
    })

    it('throws invalidParameterValue when fileUri is incorrect', function () {
      return testClient.bublGetImage('wrongtype')
        .then(expectError, function onError (err) {
          validate.error(
            err.error.response.body,
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
          assert.isNull(res.body)
        }, wrapError)
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
            validate.done(res.body, schema.names.commandStartSession)
            sessionId = res.body.results.sessionId
            return Utility.restoreDefaultOptions(defaultOptionsFile)
          })
          .then(function onSuccess (res) {
            validate.done(res.body, schema.names.commandSetOptions)
          })
          .catch(wrapError)
      } else {
        return testClient.reset()
          .then((res) => validate.done(res.body, schema.names.commandReset))
      }
    })

    afterEach(function () {
      if (isOSC1) {
        return Utility.checkActiveSession()
          .then(function (isActive) {
            if (isActive) {
              return testClient.closeSession(sessionId)
                .then(function onSuccess (res) {
                  validate.done(res.body, schema.names.commandCloseSession)
                })
            }
          })
          .catch(wrapError)
      }
    })

    it('throws missingParameter unless the active session\'s sessionId is provided', function () {
      this.timeout(timeoutValue)
      return testClient.bublShutdown()
        .then(expectError, function onError (err) {
          validate.error(
            err.error.response.body,
            schema.names.commandBublShutdown,
            schema.errors.missingParameter)
        })
    })

    it('throws invalidParameterValue when incorrect sessionId is provided', function () {
      this.timeout(timeoutValue)
      return testClient.bublShutdown(sessionId + '0')
        .then(expectError, function onError (err) {
          validate.error(
            err.error.response.body,
            schema.names.commandBublShutdown,
            schema.errors.invalidParameterValue)
        })
    })

    it('throws invalidParameterValue when incorrect shutdownDelay value type is provided', function () {
      this.timeout(timeoutValue)
      return testClient.bublShutdown(sessionId, '...')
        .then(expectError, function onError (err) {
          validate.error(
            err.error.response.body,
            schema.names.commandBublShutdown,
            schema.errors.invalidParameterValue)
        })
    })

    it('Expect success. camera._bublShutdown successfully returned', function () {
      if (!isMock) {
        // FORCE SESSSION CLOSURE BECAUSE OF MOCHA BUG
        return testClient.closeSession(sessionId)
          .then(() => this.skip(), wrapError)
      }

      this.timeout(timeoutValue)
      return testClient.bublShutdown(sessionId)
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandBublShutdown)
        }, wrapError)
    })

    it('successfully returned when specific shutdownDelay is provided and returned at appropriate time', function () {
      if (!isMock) {
        // FORCE SESSSION CLOSURE BECAUSE OF MOCHA BUG
        return testClient.closeSession(sessionId)
          .then(() => this.skip(), wrapError)
      }

      this.timeout(timeoutValue)
      var expectedShutdownDelay = 3000
      var startTime = Date.now()
      return testClient.bublShutdown(sessionId, expectedShutdownDelay)
        .then(function onSuccess (res) {
          validate.done(res.body, schema.names.commandBublShutdown)
          var endTime = Date.now()
          assert.isTrue((endTime - startTime) > expectedShutdownDelay)
        }, wrapError)
    })
  })
})
