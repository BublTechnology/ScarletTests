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
var Util = function (client, options_) {
  let testClient = client
  let options = options_ || {}
  options.apiLevel = options.apiLevel || 1
  options.model = options.model || 'bubl1'

  let loadJsonFile = function (optionsFile) {
    var deferred = Q.defer()
    fs.readFile(optionsFile, 'utf8', function (err, data) {
      Q(data).then((res) => {
        if (err) {
          throw err
        } else {
          return JSON.parse(res)
        }
      }).then(deferred.resolve, deferred.reject)
    })
    return deferred.promise
  }

  let openSession = function () {
    return testClient.getState()
      .then(function (state) {
        if (state.state.sessionId) {
          return state.state.sessionId
        } else {
          return testClient.startSession()
            .then((res) => res.results.sessionId)
        }
      })
  }

  let deleteImages = function (uris) {
    if (options.apiLevel < 2) {
      var calls = []
      for (var i = 0; i < uris.length; i++) {
        calls.push((testClient.delete(uris[i])))
      }
      return Q.all(calls)
    } else {
      return testClient.delete2(uris)
    }
  }

  /* restoreDefaultOptions():
   * restore the camera options to its defaults; leaks an open session
  */
  this.restoreDefaultOptions = function (keepSession) {
    let optionsFile = options.model === 'bubl2' ? './defaults/bubl2.json' : './defaults/mock.json'

    if (options.apiLevel < 2) {
      return Q.all([openSession(), loadJsonFile(optionsFile)])
        .then(function onSuccess (res) {
          let sessionId = res[0]
          return testClient.setOptions(sessionId, res[1])
            .then(() => {
              if (!keepSession) {
                return testClient.closeSession(sessionId)
              }
            })
        })
    } else {
      return testClient.reset()
    }
  }

  /* closeActiveSession():
   * closes any active session on the camera
  */
  this.closeActiveSession = function () {
    if (options.apiLevel < 2) {
      return testClient.getState()
      .then(function (res) {
        if (res.state.sessionId) {
          return testClient.closeSession(res.state.sessionId)
        }
      })
    }
  }

  /* deleteAllImages():
   * removes all images from the camera.
  */
  this.deleteAllImages = function () {
    if (options.apiLevel < 2) {
      return testClient.listImages(1, false)
        .then((res) => testClient.listImages(res.results.totalEntries, false))
        .then((res) => deleteImages(res.results.entries.map((entry) => entry.uri)))
    } else {
      return testClient.delete2(['all'])
    }
  }
}

module.exports = Util
