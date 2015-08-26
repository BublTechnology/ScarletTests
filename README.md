# ScarletTests

These unit tests document our current support of the Open Spherical Camera API.
They are run and pass against our current implementation of the API, and
describe the current Bubl vendor extensions to the API.


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

Both projects use the `OscClient.js` file to connect to the camera. You will
have to adjust its default IP and port to match the camera on your network.
It will likely be `192.168.0.100:80` unless you're using the USB networking
method described on the beta firmware page.

# Beta Firmware

The latest beta firmware can be tested on your own bublcam! It exposes the
OSC API, see our beta download page for more information:

http://bubltechnology.github.io/ScarletTests/


# Licensing Information

This source release is licensed under the MIT license, which can be found
[here](https://github.com/BublTechnology/ScarletTests/blob/master/COPYING).
