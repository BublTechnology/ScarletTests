// Copyright 2015 Bubl Technology Inc.
//
// Licensed under the MIT license
// <LICENSE-MIT or http://opensource.org/licenses/MIT>.
// This file may not be copied, modified, or distributed
// except according to those terms.

'use strict'

var Q = require('q')
var fs = require('fs')

/* Util Constructor:
 *  - argument:
 *    1) client: a reference to an object which possesses the required osc http request calls
 *       such as oscCommandsStartSessionCall, oscCommandsCloseSessionCall, etc.
 */
var Util = function (client) {
  var testClient = client

  /* restoreDefaultOptions(optionsFile):
   * restore the camera options to what are specified in the options JSON file
   *  - argument:
   *      1) optionsFile: string containing the path to the option JSON file
   *         eg: './defaults/mock.json'
   *
  */
  this.restoreDefaultOptions = function (optionsFile) {
    var deferred = Q.defer()
    fs.readFile(optionsFile, 'utf8', function (err, data) {
      var sessionId
      if (err) {
        deferred.reject(JSON.parse(err))
      } else {
        testClient.getState()
          .then(function (res) {
            sessionId = res.state.sessionId
            return testClient.setOptions(sessionId, JSON.parse(data))
          })
          .then(deferred.resolve, deferred.reject)
      }
    })
    return deferred.promise
  }

  /* checkActiveSession():
   * checks to see if there is an active session on the camera
  */
  this.checkActiveSession = function () {
    return testClient.getState()
      .then(function (res) {
        return res.state.sessionId
      })
  }

  /* deleteAllImages():
   * removes all images from the camera.
  */
  this.deleteAllImages = function () {
    var deferred = Q.defer()
    var totalImages
    testClient.listImages(1, false)
      .then(function (res) {
        totalImages = res.results.totalEntries
        return testClient.listImages(totalImages, false)
      })
      .then(function (res) {
        Q.all(deleteImages(res))
          .then(function () {
            deferred.resolve({
              commandStatus: 'done'
            })
          })
      })
    return deferred.promise
  }

  var deleteImages = function (res) {
    var calls = []
    for (var i = 0; i < res.results.entries.length; i++) {
      calls.push((testClient.delete(res.results.entries[i].uri)))
    }
    return calls
  }
}

module.exports = Util
