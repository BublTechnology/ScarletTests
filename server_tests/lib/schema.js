// Copyright 2015 Bubl Technology Inc.
//
// Licensed under the MIT license
// <LICENSE-MIT or http://opensource.org/licenses/MIT>.
// This file may not be copied, modified, or distributed
// except according to those terms.

"use strict";

let Schema = function(options_) {
    let options = options_ || {};
    this.apiLevel = options.apiLevel || 1;
    this.bubl = options.bubl || false;

    this.states = {
        done: "done",
        inProgress: "inProgress",
        error: "error",
    };

    this.names = {
        info: "camera.info",
        state: "camera.state",
        checkForUpdates: "camera.checkForUpdates",
        bublUpdate: "camera._bublUpdate",
        commandsExecute: "camera.commands.execute",
        commandsStatus: "camera.commands.status",
        commandsBublStop: "camera.commands._bublStop",
        commandsBublPoll: "camera.commands._bublPoll",
        commandStartSession: "camera.startSession",
        commandUpdateSession: "camera.updateSession",
        commandCloseSession: "camera.closeSession",
        commandTakePicture: "camera.takePicture",
        commandProcessPicture: "camera.processPicture",
        commandStartCapture: "camera.startCapture",
        commandStopCapture: "camera.stopCapture",
        commandGetLivePreview: "camera.getLivePreview",
        commandGetImage: "camera.getImage",
        commandListImages: "camera.listImages",
        commandListFiles: "camera.listFiles",
        commandDelete: "camera.delete",
        commandGetMetadata: "camera.getMetadata",
        commandSetOptions: "camera.setOptions",
        commandGetOptions: "camera.getOptions",
        commandReset: "camera.reset",
        commandBublTimelapse: "camera._bublTimelapse",
        commandBublCaptureVideo: "camera._bublCaptureVideo",
        commandBublStream: "camera._bublStream",
        commandBublShutdown: "camera._bublShutdown",
        commandBublLogs: "camera._bublLogs"
    },

    this.errors = {
        unknownCommand: "unknownCommand",
        cameraInExclusiveUse: "cameraInExclusiveUse",
        missingParameter: "missingParameter",
        invalidParameterName: "invalidParameterName",
        invalidParameterValue: "invalidParameterValue",
    };

    this.info = {
        type: "object",
        additionalProperties: false,
        patternProperties: {
            "^_": {},
        },
        required: [
            "manufacturer",
            "model",
            "serialNumber",
            "firmwareVersion",
            "supportUrl",
            "gps",
            "gyro",
            "uptime",
            "api",
            "endpoints"
        ].concat(this.apiLevel == 2 ? ["apiLevel"] : []),
        properties: {
            manufacturer: {
                type: "string",
            },
            model: {
                type: "string",
            },
            serialNumber: {
                type: "string",
            },
            firmwareVersion: {
                type: "string",
            },
            supportUrl: {
                type: "string",
            },
            gps: {
                type: "boolean",
            },
            gyro: {
                type: "boolean",
            },
            uptime: {
                type: "number",
                minimum: 0,
            },
            api: {
                type: "array",
                items: {
                    type: "string",
                },
            },
            endpoints: {
                type: "object",
                additionalProperties: false,
                patternProperties: {
                    "^_": {},
                },
                required: ["httpPort", "httpUpdatesPort"],
                properties: {
                    httpPort: {
                        type: "number",
                        minimum: 0,
                        maximum: 65535,
                    },
                    httpUpdatesPort: {
                        type: "number",
                        minimum: 0,
                        maximum: 65535,
                    },
                    httpsPort: {
                        type: "number",
                        minimum: 0,
                        maximum: 65535,
                    },
                    httpsUpdatesPort: {
                        type: "number",
                        minimum: 0,
                        maximum: 65535,
                    },
                },
            },
            _bublAtmelVersion: {
                type: "string",
            },
            _bublAlteraVersion: {
                type: "number",
                minimum: 0,
            },
            apiLevel: {
                type: "array",
                items: {
                    type: "number",
                    enum: [1, 2],
                },
            },
        },
    };

    this._commandResults1 = {
        [this.names.commandStartSession]: {
            additionalProperties: false,
            patternProperties: {
                "^_": {},
            },
            required: ["sessionId", "timeout"],
            properties: {
                sessionId: {
                    type: "string",
                },
                timeout: {
                    type: "number",
                    minimum: 0,
                },
            },
        },
        [this.names.commandUpdateSession]: {
            additionalProperties: false,
            patternProperties: {
                "^_": {},
            },
            required: ["sessionId", "timeout"],
            properties: {
                sessionId: {
                    type: "string",
                },
                timeout: {
                    type: "number",
                    minimum: 0,
                },
            },
        },
        [this.names.commandCloseSession]: {
            additionalProperties: false,
            patternProperties: {
                "^_": {},
            },
        },
        [this.names.commandTakePicture]: {
            additionalProperties: false,
            patternProperties: {
                "^_": {},
            },
            required: ["fileUri"],
            properties: {
                fileUri: {
                    type: "string",
                    minLength: 1,
                },
                _bublFileUris: {
                    type: "array",
                    items: {
                        type: "string",
                        minLength: 1,
                    },
                },
            },
        },
        [this.names.commandListImages]: {
            additionalProperties: false,
            patternProperties: {
                "^_": {},
            },
            required: ["entries", "totalEntries"],
            properties: {
                entries: {
                    type: "array",
                    items: {
                        type: "object",
                        additionalProperties: false,
                        patternProperties: {
                            "^_": {},
                        },
                        required: ["name", "uri", "size", "dateTimeZone", "width", "height"],
                        properties: {
                            name: {
                                type: "string",
                            },
                            uri: {
                                type: "string",
                                minLength: 1,
                            },
                            size: {
                                type: "number",
                                minimum: 0,
                            },
                            dateTimeZone: {
                                type: "string",
                                pattern: "\\d\\d\\d\\d:\\d\\d:\\d\\d \\d\\d:\\d\\d:\\d\\d[+-]\\d\\d:\\d\\d",
                            },
                            width: {
                                type: "number",
                                minimum: 0,
                            },
                            height: {
                                type: "number",
                                minimum: 0,
                            },
                            thumbnail: {
                                type: "string",
                            },
                            lat: {
                                type: "number",
                                minimum: -90,
                                maximum: 90,
                            },
                            lng: {
                                type: "number",
                                minimum: -180,
                                maximum: 180,
                            },
                        },
                    },
                },
                totalEntries: {
                    type: "number",
                    minimum: 0,
                },
                continuationToken: {
                    type: "string",
                },
            },
        },
        [this.names.commandDelete]: {
            type: "object",
            additionalProperties: false,
            patternProperties: {
                "^_": {},
            },
        },
        [this.names.commandGetMetadata]: {
            type: "object",
            additionalProperties: false,
            patternProperties: {
                "^_": {},
            },
            properties: {
                "exif": {
                    type: "object",
                },
                "xmp": {
                    type: "object",
                },
            },
        },
        [this.names.commandSetOptions]: {
            type: "object",
            additionalProperties: false,
            patternProperties: {
                "^_": {},
            },
        },
        [this.names.commandGetOptions]: {
            type: "object",
            additionalProperties: false,
            patternProperties: {
                "^_": {},
            },
            required: ["options"],
            properties: {
                options: {
                    captureMode: {
                        type: "string",
                        enum: [
                            "image",
                        ],
                    },
                    captureModeSupport: {
                        type: "array",
                        items: {
                            type: "string",
                            enum: [
                                "image",
                            ],
                        },
                    },
                    exposureProgram: {
                        type: "number",
                        enum: [0, 1, 2, 3, 4],
                    },
                    exposureProgramSupport: {
                        type: "array",
                        items: {
                            type: "number",
                            enum: [0, 1, 2, 3, 4],
                        },
                    },
                    iso: {
                        type: "number",
                    },
                    isoSupport: {
                        type: "array",
                        items: {
                            type: "number",
                        },
                    },
                    shutterSpeed: {
                        type: "number",
                    },
                    shutterSpeedSupport: {
                        type: "array",
                        items: {
                            type: "number",
                        },
                    },
                    aperture: {
                        type: "number",
                    },
                    apertureSupport: {
                        type: "array",
                        items: {
                            type: "number",
                        },
                    },
                    whiteBalance: {
                        type: "string",
                        oneOf: [
                            {
                                enum: [
                                    "auto",
                                    "incandescent",
                                    "fluorescent",
                                    "daylight",
                                    "cloudy-daylight",
                                    "shade",
                                    "twilight",
                                ],
                            },
                            {
                                pattern: "^_.*$",
                            },
                        ],
                    },
                    whiteBalanceSupport: {
                        type: "array",
                        items: {
                            type: "string",
                            oneOf: [
                                {
                                    enum: [
                                        "auto",
                                        "incandescent",
                                        "fluorescent",
                                        "daylight",
                                        "cloudy-daylight",
                                        "shade",
                                        "twilight",
                                    ],
                                },
                                {
                                    pattern: "^_.*$",
                                },
                            ],
                        },
                    },
                    exposureCompensation: {
                        type: "number",
                    },
                    exposureCompensationSupport: {
                        type: "array",
                        items: {
                            type: "number",
                        },
                    },
                    fileFormat: {
                        type: "object",
                        additionalProperties: false,
                        patternProperties: {
                            "^_": {},
                        },
                        required: ["type", "width", "height"],
                        properties: {
                            type: {
                                type: "string",
                            },
                            width: {
                                type: "number",
                                minimum: 0,
                            },
                            height: {
                                type: "number",
                                minimum: 0,
                            },
                        },
                    },
                    fileFormatSupport: {
                        type: "array",
                        items: {
                            type: "object",
                            additionalProperties: false,
                            patternProperties: {
                                "^_": {},
                            },
                            required: ["type", "width", "height"],
                            properties: {
                                type: {
                                    type: "string",
                                },
                                width: {
                                    type: "number",
                                    minimum: 0,
                                },
                                height: {
                                    type: "number",
                                    minimum: 0,
                                },
                            },
                        },
                    },
                    exposureDelay: {
                        type: "number",
                        minimum: 0,
                    },
                    exposureDelaySupport: {
                        type: "array",
                        items: {
                            type: "number",
                            minimum: 0,
                        },
                    },
                    sleepDelay: {
                        type: "number",
                        minimum: 0,
                    },
                    sleepDelaySupport: {
                        type: "array",
                        items: {
                            type: "number",
                            minimum: 0,
                        },
                    },
                    offDelay: {
                        type: "number",
                        minimum: 0,
                    },
                    offDelaySupport: {
                        type: "array",
                        items: {
                            type: "number",
                            minimum: 0,
                        },
                    },
                    totalSpace: {
                        type: "number",
                        minimum: 0,
                    },
                    remainingSpace: {
                        type: "number",
                        minimum: 0,
                    },
                    remainingPictures: {
                        type: "number",
                        minimum: 0,
                    },
                    gpsInfo: {
                        type: "object",
                        additionalProperties: false,
                        patternProperties: {
                            "^_": {},
                        },
                        required: ["lat", "lng"],
                        properties: {
                            lat: {
                                type: "number",
                                oneOf: [
                                    {
                                        minimum: -90,
                                        maximum: 90,
                                    },
                                    {
                                        enum: [65535],
                                    },
                                ],
                            },
                            lng: {
                                type: "number",
                                oneOf: [
                                    {
                                        minimum: -180,
                                        maximum: 180,
                                    },
                                    {
                                        enum: [65535],
                                    },
                                ],
                            },
                        },
                    },
                    dateTimeZone: {
                        type: "string",
                        pattern: "\\d\\d\\d\\d:\\d\\d:\\d\\d \\d\\d:\\d\\d:\\d\\d[+-]\\d\\d:\\d\\d",
                    },
                    hdr: {
                        type: "boolean",
                    },
                    hdrSupport: {
                        type: "boolean",
                    },
                    exposureBracket: {
                        type: "object",
                        additionalProperties: false,
                        patternProperties: {
                            "^_": {},
                        },
                        properties: {
                            shots: {
                                type: "number",
                                minimum: 0,
                            },
                            increment: {
                                type: "number",
                                minimum: 0,
                            },
                            autoMode: {
                                type: "boolean",
                            },
                        },
                    },
                    exposureBracketSupport: {
                        type: "object",
                        additionalProperties: false,
                        patternProperties: {
                            "^_": {},
                        },
                        properties: {
                            shotsSupport: {
                                type: "array",
                                items: {
                                    type: "number",
                                    minimum: 0,
                                },
                            },
                            incrementSupport: {
                                type: "array",
                                items: {
                                    type: "number",
                                    minimum: 0,
                                },
                            },
                            autoMode: {
                                type: "boolean",
                            },
                        },
                    },
                    gyro: {
                        type: "boolean",
                    },
                    gyroSupport: {
                        type: "boolean",
                    },
                    gps: {
                        type: "boolean",
                    },
                    gpsSupport: {
                        type: "boolean",
                    },
                    imageStabilization: {
                        type: "string",
                    },
                    imageStabilizationSupport: {
                        type: "array",
                        items: {
                            type: "string",
                            oneOf: [
                                {
                                    enum: [
                                        "on",
                                        "off",
                                    ],
                                },
                                {
                                    pattern: "^_.*$",
                                },
                            ],
                        },
                    },
                    wifiPassword: {
                        type: "string",
                        minLength: 8,
                    },
                },
            },
        },
    };

    this._commandResults2 = {
        [this.names.commandTakePicture]: {
            type: "object",
            additionalProperties: false,
            patternProperties: {
                "^_": {},
            },
            required: ["fileUrl"],
            properties: {
                fileUrl: {
                    type: "string",
                    minLength: 1,
                },
            },
        },
        [this.names.commandProcessPicture]: {
            type: "object",
            additionalProperties: false,
            patternProperties: {
                "^_": {},
            },
            required: ["previewToFinalFileUrls"],
            properties: {
                previewToFinalFileUrls: {
                    type: "object",
                },
            },
        },
        [this.names.commandStartCapture]: {
            type: "object",
            additionalProperties: false,
            patternProperties: {
                "^_": {},
            },
            properties: {
                fileUrls: {
                    type: "array",
                    items: {
                        type: "string",
                        minLength: 1,
                    },
                },
            },
        },
        [this.names.commandStopCapture]: {
            type: "object",
            additionalProperties: false,
            patternProperties: {
                "^_": {},
            },
            required: ["fileUrls"],
            properties: {
                fileUrls: {
                    type: "array",
                    items: {
                        type: "string",
                        minLength: 1,
                    },
                },
            },
        },
        [this.names.commandListFiles]: {
            type: "object",
            additionalProperties: false,
            patternProperties: {
                "^_": {},
            },
            required: ["entries", "totalEntries"],
            properties: {
                entries: {
                    type: "array",
                    items: {
                        type: "object",
                        additionalProperties: false,
                        patternProperties: {
                            "^_": {},
                        },
                        required: ["name", "fileUrl", "size", "dateTimeZone", "width", "height", "isProcessed", "previewUrl"],
                        properties: {
                            name: {
                                type: "string",
                            },
                            fileUrl: {
                                type: "string",
                                minLength: 1,
                            },
                            size: {
                                type: "number",
                                minimum: 0,
                            },
                            dateTimeZone: {
                                type: "string",
                                pattern: "\\d\\d\\d\\d:\\d\\d:\\d\\d \\d\\d:\\d\\d:\\d\\d[+-]\\d\\d:\\d\\d",
                            },
                            width: {
                                type: "number",
                                minimum: 0,
                            },
                            height: {
                                type: "number",
                                minimum: 0,
                            },
                            thumbnail: {
                                type: "string",
                            },
                            lat: {
                                type: "number",
                                minimum: -90,
                                maximum: 90,
                            },
                            lng: {
                                type: "number",
                                minimum: -180,
                                maximum: 180,
                            },
                            isProcessed: {
                                type: "boolean",
                            },
                            previewUrl: {
                                type: "string",
                            },
                        },
                    },
                },
                totalEntries: {
                    type: "number",
                    minimum: 0,
                },
            },
        },
        [this.names.commandDelete]: {
            type: "object",
            additionalProperties: false,
            patternProperties: {
                "^_": {},
            },
            required: ["fileUrls"],
            properties: {
                fileUrls: {
                    type: "array",
                    items: {
                        type: "string",
                        minLength: 1,
                    },
                },
            },
        },
        [this.names.commandSetOptions]: {
            type: "object",
            additionalProperties: false,
            patternProperties: {
                "^_": {},
            },
        },
        [this.names.commandReset]: {
            type: "object",
            additionalProperties: false,
            patternProperties: {
                "^_": {},
            },
        },
    };

    let inProgressCaptureStatus = {
        type: "string",
        enum: ["exposing", "capturing", "saving"],
    };

    let inProgressCaptureMultiple = {
        required: ["_bublCaptureStatus", "_bublCaptureCount", "_bublCaptureUris"],
        properties: {
            _bublCaptureStatus: inProgressCaptureStatus,
            _bublCaptureCount: {
                type: "number",
            },
            _bublCaptureTotal: {
                type: "number",
            },
            _bublCaptureUris: {
                type: "array",
                items: {
                    type: "string",
                },
            },
        },
    };

    let inProgressCapture = {
        required: ["_bublCaptureStatus"],
        properties: {
            _bublCaptureStatus: inProgressCaptureStatus,
        },
    };

    this._commandInProgress1 = {
        [this.names.commandBublStream]: {
            required: ["_bublStreamPort", "_bublStreamEndpoint", "_bublAccelTilt"],
            properties: {
                _bublStreamPort: {
                    type: "number",
                    minimum: 0,
                    maximum: 65535,
                },
                _bublStreamEndpoint: {
                    type: "string",
                },
                _bublAccelTilt: {
                    type: "number",
                },
            },
        },
        [this.names.commandTakePicture]: inProgressCapture,
        [this.names.commandBublTimelapse]: inProgressCaptureMultiple,
        [this.names.commandBublCaptureVideo]: inProgressCapture,
    };

    this._commandInProgress2 = {
        [this.names.commandBublStream]: this._commandInProgress1[this.names.commandBublStream],
        [this.names.commandTakePicture]: inProgressCapture,
        [this.names.commandStartCapture]: inProgressCaptureMultiple,
        [this.names.commandBublTimelapse]: inProgressCaptureMultiple,
        [this.names.commandBublCaptureVideo]: inProgressCapture,
    };

    this.status = {
        type: "object",
        additionalProperties: false,
        patternProperties: {
            "^_": {},
        },
        required: ["state", "name"],
        properties: {
            state: {
                type: "string",
                enum: [this.states.done, this.states.inProgress, this.states.error],
            },
            id: {
                type: "string",
            },
            name: {
                type: "string",
            },
            progress: {
                type: "object",
                additionalProperties: false,
                patternProperties: {
                    "^_": {},
                },
                required: ["completion"],
                properties: {
                    completion: {
                        type: "number",
                        minimum: 0,
                        maximum: 1,
                    },
                },
            },
            error: {
                type: "object",
                additionalProperties: false,
                patternProperties: {
                    "^_": {},
                },
                required: ["code", "message"],
                properties: {
                    code: {
                        type: "string",
                        enum: [
                            this.errors.cameraInExclusiveUse,
                            this.errors.missingParameter,
                            this.errors.invalidParameterName,
                            this.errors.invalidParameterValue,
                        ].concat(this.apiLevel == 2 ? [this.errors.unknownCommand] : []),
                    },
                    message: {
                        type: "string",
                    },
                },
            },
            results: {
                type: "object",
            },
        },
        allOf: [
            {
                oneOf: [
                    {
                        properties: {
                            state: {
                                enum: [this.states.done],
                            },
                        },
                        not: {
                            properties: {
                                name: {
                                    enum: [],
                                },
                            },
                        },
                    },
                    {
                        required: ["progress"],
                        properties: {
                            state: {
                                enum: [this.states.inProgress],
                            },
                        },
                        not: {
                            properties: {
                                name: {
                                    enum: [],
                                },
                            },
                        },
                    },
                    {
                        required: ["error"],
                        properties: {
                            state: {
                                enum: [this.states.error],
                            },
                        },
                    },
                ],
            },
            {
                oneOf: [
                    {
                        properties: {
                            name: {
                                enum: [
                                    this.names.info,
                                    this.names.state,
                                    this.names.checkForUpdates,
                                    this.names.commandsExecute,
                                    this.names.commandsStatus,
                                    this.names.commandTakePicture,
                                    this.names.commandDelete,
                                    this.names.commandSetOptions,
                                    this.names.commandGetOptions,
                                ].concat(this.apiLevel == 1 ? [
                                    this.names.commandStartSession,
                                    this.names.commandUpdateSession,
                                    this.names.commandCloseSession,
                                    this.names.commandGetImage,
                                    this.names.commandListImages,
                                    this.names.commandGetMetadata,
                                ] : [
                                    this.names.commandProcessPicture,
                                    this.names.commandStartCapture,
                                    this.names.commandStopCapture,
                                    this.names.commandGetLivePreview,
                                    this.names.commandListFiles,
                                    this.names.commandReset,
                                ]),
                            },
                        },
                    },
                    {
                        properties: {
                            name: {
                                pattern: "^camera\\._.*$",
                            },
                        },
                    },
                    {
                        properties: {
                            name: {
                                pattern: "^camera\\.commands\\._.*$",
                            },
                        },
                    },
                    {
                        properties: {
                            name: {
                                pattern: "^_.*$",
                            },
                        },
                    },
                ],
            },
        ],
    };

    let commandResults = this.apiLevel == 1 ? this._commandResults1 : this._commandResults2;
    for (let name in commandResults) {
        let results = commandResults[name];

        this.status.allOf[0].oneOf.push(
            {
                required: (results.properties && Object.keys(results.properties).length > 0) ? ["results"] : undefined,
                properties: {
                    state: {
                        enum: [this.states.done],
                    },
                    name: {
                        enum: [name],
                    },
                    results: results,
                },
            }
        );
        this.status.allOf[0].oneOf[0].not.properties.name.enum.push(name);
    }

    let commandInProgress = this.apiLevel == 1 ? this._commandInProgress1 : this._commandInProgress2;
    for (let name in commandInProgress) {
        let progress = commandInProgress[name];

        this.status.allOf[0].oneOf.push(
            {
                required: ["progress"],
                properties: {
                    state: {
                        enum: [this.states.inProgress],
                    },
                    name: {
                        enum: [name],
                    },
                    progress: progress,
                },
            }
        );
        this.status.allOf[0].oneOf[1].not.properties.name.enum.push(name);
    }

    this.state = {
        type: "object",
        additionalProperties: false,
        patternProperties: {
            "^_": {},
        },
        required: ["fingerprint", "state"],
        properties: {
            fingerprint: {
                type: "string",
            },
            state: {
                type: "object",
                additionalProperties: false,
                patternProperties: {
                    "^_": {},
                },
                required: ["sessionId", "batteryLevel"],
                properties: {
                    sessionId: {
                        type: "string",
                    },
                    batteryLevel: {
                        type: "number",
                        minimum: 0,
                        maximum: 1,
                    },
                    storageChanged: {
                        type: "boolean",
                    },
                    storageUri: {
                        type: "string",
                    },
                    _bublCaptureMode: {
                        type: "string",
                    },
                    _bublCaptureMode2: {
                        type: "string",
                    },
                    _bublCommands: {
                        type: "array",
                        items: this.status,
                    },
                    _bublCharging: {
                        type: "boolean",
                    },
                    _bublChargingSufficientPower: {
                        type: "boolean",
                    },
                    _bublSdInserted: {
                        type: "boolean",
                    },
                    _bublLatestCapture: this._commandResults1[this.names.commandListImages].properties.entries.items,
                    _bublLatestCapture2: this._commandResults2[this.names.commandListFiles].properties.entries.items,
                },
            },
        },
    };

    this.checkForUpdates = {
        type: "object",
        additionalProperties: false,
        patternProperties: {
            "^_": {},
        },
        required: ["stateFingerprint", "throttleTimeout"],
        properties: {
            stateFingerprint: {
                type: "string",
            },
            throttleTimeout: {
                type: "number",
                minimum: 0,
            },
        },
    };
};

module.exports = Schema;
