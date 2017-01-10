# ScarletTests

These unit tests document our current support of the Open Spherical Camera API.
They are run and pass against our current implementation of the API, and
describe the current Bubl vendor extensions to the API.

**NOTE:** Upgrade your mobile app to the latest release. This contains the
latest version of the camera firmware and will allow you to update that to the
latest supported release.

## Client UI

The `client_ui` folder contains an angular web app that can be used to control
the camera. It's a very technical interface that allows you to try out different
API endpoints and see what they return. To build and run it:

    $ cd client_ui/
    $ npm install
    $ npm install bower
    $ `npm bin`/bower install
    $ `npm bin`/gulp serve


## Server Tests

These unit tests can be run against the API server, and test the camera's
various functionality. To run the tests:

    $ npm install
    $ `npm bin`/mocha


## Configuration

The tests use the environment variables `SCARLET_TEST_HOST` and
`SCARLET_TEST_PORT` to determine how to connect to the camera. You will likely
need to specify these to match the camera on your network, like so:

    $ SCARLET_TEST_HOST=192.168.0.100 SCARLET_TEST_PORT=80 `npm bin`/mocha

### Model Variants

The `SCARLET_TEST_MODEL` environment variable may be used to specify the API
variant and model to be tested. Valid values are:

- `osc` to test against an OSC-compliant API.
- `bubl1` for the Bublcam, testing our exclusive functionality extensions.

### Wi-Fi

`SCARLET_TEST_WIFI=1` may be used to indicate that the test is being performed
over Wi-Fi, and therefore should not execute tests that may interrupt
connectivity such as changing the access point password.

# Licensing Information

This source release is licensed under the MIT license, which can be found
[here](COPYING).
