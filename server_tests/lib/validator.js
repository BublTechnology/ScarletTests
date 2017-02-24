// Copyright 2015 Bubl Technology Inc.
//
// Licensed under the MIT license
// <LICENSE-MIT or http://opensource.org/licenses/MIT>.
// This file may not be copied, modified, or distributed
// except according to those terms.

'use strict';

let jsen = require('jsen');
let assert = require('chai').assert;
let textorbinary = require('istextorbinary');

let Validator = function (schema) {
  this.schema = schema;

  this.validate = function (schema, data) {
    let validator = jsen(schema);
    if (!validator(data)) {
      throw new Error('JSON validation failed: ' + JSON.stringify(validator.errors, null, 2));
    }
  };

  this.info = function (data) {
    this.validate(this.schema.info, data);
  };

  this.checkForUpdates = function (data) {
    this.validate(this.schema.checkForUpdates, data);
  };

  this.state = function (data) {
    this.validate(this.schema.state, data);
  };

  this.status = function (data, options) {
    this.validate(this.schema.status, data);
    if (options) {
      if (options.name) {
        assert.equal(data.name, options.name);
      }

      if (options.state) {
        assert.equal(data.state, options.state);
      }
    }
  };

  this.done = function (data, name) {
    this.status(data, { name: name, state: this.schema.states.done });
  };

  this.error = function (data, name, error) {
    this.status(data, { name: name, state: this.schema.states.error });

    if (error) {
      assert.equal(data.error.code, error);
    }
  };

  this.inProgress = function (data, name) {
    this.status(data, {name: name, state: this.schema.state.inProgress});
  };

  this.checkForBinary = function (data) {
    textorbinary.isBinary(null, data, function (err, res) {
      if (err) { throw err; }
      assert(res, 'Response is not of binaries.');
    });
  };

  this.bublPoll = function (data) {
    this.validate(this.schema.bublPoll, data);
  };

  // initial validation
  let draft04 = { $ref: 'http://json-schema.org/draft-04/schema#' };
  this.validate(draft04, this.schema.info);
  this.validate(draft04, this.schema.checkForUpdates);
  this.validate(draft04, this.schema.status);
  this.validate(draft04, this.schema.state);
};

module.exports = Validator;
