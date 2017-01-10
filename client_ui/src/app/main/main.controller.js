// Copyright 2015 Bubl Technology Inc.
//
// Licensed under the MIT license
// <LICENSE-MIT or http://opensource.org/licenses/MIT>.
// This file may not be copied, modified, or distributed
// except according to those terms.

'use strict';
/*global alert */
/*global document */
/*global window */

angular.module('clientUi')
  .controller('MainCtrl', function ($scope, $http, $timeout, ngDialog, OscClient, Camera) {
    //Set up initial content within the osc read-only console
    $scope.oscConsoleHistory = 'Welcome to Bubl\'s OSC command output console';

    //Set up initial value for _bublPollFingerprint
    $scope.bublPollFingerprint = '';

    //Set up initial value for EP _bublGetImage's uri
    $scope.bublGetImageUri = '';

    var camera = new Camera($scope);

    //Binds to button '/osc/info'
    $scope.cameraInfo = function() {
        camera.getInfo.run();
    };

    //Binds to button '/osc/state'
    $scope.cameraState = function() {
        camera.getState.run();
    };

    //Binds to button '/osc/checkForUpdates'
    $scope.cameraCheckForUpdates = function() {
        $scope.promptForParameters('_.getCheckForUpdates');
    };

    //Binds to button 'Status'
    $scope.cameraCommandsStatus = function() {
        camera.getCommandsStatus.run();
    };

    //Binds to button 'Stop'
    $scope.cameraCommandsBublStop = function() {
        camera.bublStop.run();
    };

    //Binds to button 'Poll'
    $scope.cameraCommandsBublPoll = function() {
        camera.bublPoll.run();
    };

    //Binds to button 'Download Image'
    $scope.cameraBublGetImage = function(downloadFile) {
        camera.endPointGetImage.run(downloadFile);
    };

    //Binds to button 'Upload Firmware'
    $scope.cameraBublUpdate = function() {
        camera.bublUpdate.run();
    };

    if(window.File && window.FileReader && window.FileList && window.Blob) {
        document.getElementById('selectedFile').addEventListener('change', camera._loadBinFile, false);
    } else {
        alert('The File APIs are not fully supported in this browser.');
    }

    //Interactive Sidebar Buttons: list of available commands.
    $scope.oscCommands = [
      'camera.startSession',
      'camera.updateSession',
      'camera.closeSession',
      'camera.takePicture',
      'camera.listImages',
      'camera.delete',
      'camera.getImage',
      'camera.getMetadata',
      'camera.setOptions',
      'camera.getOptions',
      'camera._bublTimelapse',
      'camera._bublCaptureVideo',
      'camera._bublStream',
      'camera._bublLogs',
      'camera._bublShutdown'
    ];

    //Method:       hasLimitedOptions()
    //Description:  The method is mainly used by setOptions, which prompts
    //              for values to set specified option(s) field(s) to. When
    //              an option can only be set to a value belonging to a set
    //              of supported values, method should return true, else
    //              return false.
    $scope.hasLimitedOptions = function (target) {
      if(angular.isArray(target.value)) {
          return true;
      } else if(angular.isString(target.value)) {
          return false;
      }
      return false;
    };

    //Method:       promptForParameters()
    //Description:  The method is binded to the sidebar which lists
    //              all of the available API commands. Selected/pressed
    //              command will pass its name as string into this
    //              method as the argument, and the method will
    //              activate a popup box to prompt for its corresponding
    //              parameters.
    $scope.promptForParameters = function (command) {
      $scope.oscCommand = camera[command.split('.')[1]];
      var htmlSelected =
          ($scope.oscCommand.name === 'camera.setOptions')?'app/main/main.dialog.setOptions.html':
          ($scope.oscCommand.name === 'camera.getOptions')?'app/main/main.dialog.getOptions.html':
          'app/main/main.dialog.default.html';
      var classSelected =
          ($scope.oscCommand.name === 'camera.getOptions')?'ngdialog-theme-default dialogGetOptions':
          'ngdialog-theme-default';
      $scope.dialog = ngDialog.open({
          template: htmlSelected,
          className: classSelected,
          plain: false,
          scope: $scope
      });
    };

    //Method:       sendCommand()
    //Description:  The method is binded to the "Confirm and Send"
    //              button in command popup. Upon being pressed, the
    //              method will close the popup window, and send
    //              command to camera by calling command's httpSend
    //              method.
    $scope.sendCommand = function (command) {
      $scope.dialog.close('closing');
      command.run();
    };

});
