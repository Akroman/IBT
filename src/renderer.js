import {glMatrix, vec3, mat4} from 'gl-matrix';
import * as twgl from "twgl.js";
import {fragmentShader, simpleFragmentShader} from "./fragmentShader.js";
import {vertexShader, simpleVertexShader} from "./vertexShader.js";
import Camera from "./camera.js";
import ObjParser from "./objParser.js";
import LightSource from "./lightSource";
import Utils from "./utils";
import LightField from "./lightField";
import LightFieldCamera from "./lightFieldCamera";


/**
 * Main class of whole program, takes care of rendering the scene with the help of other classes
 */
export default class Renderer
{
    /**
     * Constructor initializes necessary variables (WebGL context, ObjParser, program, camera and light field)
     */
    constructor()
    {
        this.canvas = document.querySelector("canvas");
        this.gl = this.canvas.getContext("webgl");
        if (!this.gl) {
            throw Error("WebGL not supported");
        }

        /**
         * Main program using the regular shaders with textures and lights
         * @type {ProgramInfo}
         */
        this.mainProgramInfo = twgl.createProgramInfo(this.gl, [vertexShader, fragmentShader]);

        /**
         * Second program using the simplified shaders without textures and lights
         * @type {ProgramInfo}
         */
        this.secondaryProgramInfo = twgl.createProgramInfo(this.gl, [simpleVertexShader, simpleFragmentShader]);

        this.objParser = new ObjParser();
        this.camera = new Camera(0, 0, 30);
        this.light = new LightSource(0, 0, 30);
        this.lightField = new LightField(0, 0, 0);
    }


    /**
     * Initiates inputs to handle value changes (display values and re-render scene)
     * Creates event listener for parsing .obj file on upload
     * @returns {Renderer}
     */
    initInputs()
    {
        document.getElementById("objUpload")
            .addEventListener("change", (event) => {
                const file = event.target.files[0];
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.objData = this.objParser.parseObj(e.target.result);
                    this.render();
                };
                reader.readAsText(file);
            });

        this.inputs = {
            sliders: {
                camera: {
                    cameraPosX: {
                        slider: document.getElementById("cameraXPos"),
                        sliderValue: document.getElementById("cameraXPosOut")
                    },
                    cameraPosY: {
                        slider: document.getElementById("cameraYPos"),
                        sliderValue: document.getElementById("cameraYPosOut")
                    },
                    cameraPosZ: {
                        slider: document.getElementById("cameraZPos"),
                        sliderValue: document.getElementById("cameraZPosOut")
                    },
                    cameraPitch: {
                        slider: document.getElementById("cameraPitch"),
                        sliderValue: document.getElementById("cameraPitchOut")
                    },
                    cameraYaw: {
                        slider: document.getElementById("cameraYaw"),
                        sliderValue: document.getElementById("cameraYawOut")
                    }
                },

                light: {
                    lightPosX: {
                        slider: document.getElementById("lightXPos"),
                        sliderValue: document.getElementById("lightXPosOut")
                    },
                    lightPosY: {
                        slider: document.getElementById("lightYPos"),
                        sliderValue: document.getElementById("lightYPosOut")
                    },
                    lightPosZ: {
                        slider: document.getElementById("lightZPos"),
                        sliderValue: document.getElementById("lightZPosOut")
                    },
                },

                lightField: {
                    lightFieldPosX: {
                        slider: document.getElementById("lightFieldXPos"),
                        sliderValue: document.getElementById("lightFieldXPosOut")
                    },
                    lightFieldPosY: {
                        slider: document.getElementById("lightFieldYPos"),
                        sliderValue: document.getElementById("lightFieldYPosOut")
                    },
                    lightFieldPosZ: {
                        slider: document.getElementById("lightFieldZPos"),
                        sliderValue: document.getElementById("lightFieldZPosOut")
                    }
                }
            },

            numbers: {
                light: {
                    lightColorRed: document.getElementById("lightRedColor"),
                    lightColorGreen: document.getElementById("lightGreenColor"),
                    lightColorBlue: document.getElementById("lightBlueColor")
                },

                lightField: {
                    horizontalCamerasCount: document.getElementById("lfHorCamNumber"),
                    verticalCamerasCount: document.getElementById("lfVertCamNumber")
                }
            },

            checkboxes: {
                camera: {
                    cameraLookAt: document.getElementById("cameraLookAt")
                }
            },

            selects: {
                light: {
                    lightPositionOptions: document.getElementById("lightPositionOptions")
                },

                lightField: {
                    lightFieldCameraSelection: document.getElementById("lfCameraSelection")
                }
            }
        }

        /** Cycles through all inputs and initializes them */
        const renderer = this;
        for (const [inputType, sceneObjects] of Object.entries(this.inputs)) {
            for (const [sceneObjectName, inputs] of Object.entries(sceneObjects)) {
                for (const [inputName, input] of Object.entries(inputs)) {
                    switch (inputType) {
                        case "sliders":
                            this.initSlider(inputName, sceneObjectName);
                            break;
                        case "numbers":
                            if (sceneObjectName === "light") {
                                this.initLightColorInput(inputName);
                            } else if (sceneObjectName === "lightField") {
                                input.value = this.lightField[inputName];
                                this.lightField.initCameras();
                                input.oninput = function () {
                                    renderer.lightField.initCameras(
                                        parseInt(renderer.inputs.numbers.lightField.horizontalCamerasCount.value),
                                        parseInt(renderer.inputs.numbers.lightField.verticalCamerasCount.value)
                                    );
                                    renderer.updateLightFieldCameraSelection();
                                    renderer.render();
                                };
                            }
                            break;
                        case "selects":
                            if (inputName === "lightPositionOptions") {
                                this.disableSliders(sceneObjectName, true);
                                input.onchange = function () {
                                    switch (this.value) {
                                        case "stickCamera":
                                        case "stickLightField":
                                            renderer.disableSliders(sceneObjectName, true);
                                            break;
                                        case "free":
                                            renderer.disableSliders(sceneObjectName, false);
                                            break;
                                    }
                                    renderer.render();
                                };
                            } else if (inputName === "lightFieldCameraSelection") {
                                this.lightField.setSelectedCamera(0, 0);
                                this.updateLightFieldCameraSelection();
                                input.onchange = function () {
                                    const rowAndColumn = this.value.split("_");
                                    const row = parseInt(rowAndColumn[0]);
                                    const column = parseInt(rowAndColumn[1]);
                                    renderer.lightField.setSelectedCamera(row, column);
                                    renderer.render();
                                };
                            }
                            break;
                        case "checkboxes":
                            if (inputName === "cameraLookAt") {
                                this.disableSliders(sceneObjectName, true, ["cameraPitch", "cameraYaw"]);
                                input.oninput = function () {
                                    if (this.checked) {
                                        renderer.disableSliders(sceneObjectName, true, ["cameraPitch", "cameraYaw"]);
                                    } else {
                                        renderer.disableSliders(sceneObjectName, false, ["cameraPitch", "cameraYaw"]);
                                    }
                                    renderer.render();
                                };
                            }
                            break;
                        default:
                            break;
                    }
                }
            }
        }
        return this;
    }


    /**
     * Updates selection for viewed light field camera
     */
    updateLightFieldCameraSelection()
    {
        const [selectedRow, selectedColumn] = this.lightField.selectedCameraIndex;
        const optionsCount = this.inputs.selects.lightField.lightFieldCameraSelection.length - 1;

        /** First remove all the options */
        for (let optionIndex = optionsCount; optionIndex >= 0; optionIndex--) {
            this.inputs.selects.lightField.lightFieldCameraSelection.remove(optionIndex);
        }

        /** And then iterate over all the cameras and add the to the selection */
        this.lightField.iterateCameras((camera, row, column) => {
            const option = document.createElement("option");
            option.value = row + "_" + column;
            row++;
            column++;
            option.text = "Kamera: " + row + "-" + column;
            this.inputs.selects.lightField.lightFieldCameraSelection.add(option);
        });
        this.inputs.selects.lightField.lightFieldCameraSelection.value = selectedRow + "_" + selectedColumn;
    }


    /**
     * Disables or enables given sliders
     * @param {string} sceneObjectName
     * @param {boolean} disable
     * @param {[string]} sliders
     */
    disableSliders(sceneObjectName, disable, sliders = [])
    {
        for (const [sliderName, input] of Object.entries(this.inputs.sliders[sceneObjectName])) {
            /**
             * If sliders is not empty, set only the sliders that are contained within the array
             * otherwise set all sliders to given value
             */
            if (sliders.length) {
                if (sliders.includes(sliderName)) {
                    input.slider.disabled = disable;
                }
            } else {
                input.slider.disabled = disable;
            }
        }
    }


    /**
     * Initializes light color inputs to handle changes and re-render scene
     * @param {string} colorInputName
     */
    initLightColorInput(colorInputName)
    {
        const renderer = this;
        this.inputs.numbers.light[colorInputName].value = Utils.convertRange(this.light[colorInputName], [0, 1], [0, 255]);
        this.inputs.numbers.light[colorInputName].oninput = function () {
            renderer.light[colorInputName] = Utils.convertRange(parseInt(this.value), [0, 255], [0, 1]);
            renderer.render();
        };
    }


    /**
     * Initializes sliders to handle changes and re-render scene
     * @param {string} sliderName
     * @param {string} sceneObjectName
     */
    initSlider(sliderName, sceneObjectName)
    {
        const renderer = this;
        this.inputs.sliders[sceneObjectName][sliderName].slider.value = this[sceneObjectName][sliderName];
        this.inputs.sliders[sceneObjectName][sliderName].sliderValue.innerHTML = this.inputs.sliders[sceneObjectName][sliderName].slider.value;
        this.inputs.sliders[sceneObjectName][sliderName].slider.oninput = function () {
            const value = parseInt(this.value);
            renderer.inputs.sliders[sceneObjectName][sliderName].sliderValue.innerHTML = value;
            /** Light field needs special updating because we need to update the light field cameras as well */
            if (sceneObjectName === "lightField") {
                renderer.lightField.updatePosition(sliderName, value);
            } else {
                renderer[sceneObjectName][sliderName] = value;
            }
            renderer.render();
        };
    }


    /**
     * Main function of program, passes parsed data to WebGL and handles drawing scene
     * Most of the matrix logic is located here
     */
    render()
    {
        /** Set background color */
        this.gl.useProgram(this.mainProgramInfo.program);
        this.gl.clearColor(0.7, 0.7, 0.7, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        /** Proceed to draw only if user has already uploaded .obj file and it has been parsed */
        if (this.objData !== undefined) {
            /** Center parsed object */
            const extents = this.objData.extents;
            let range = vec3.create(),
                objOffset = vec3.create();
            vec3.subtract(range, extents.max, extents.min);
            vec3.scale(range, range, 0.5);
            vec3.add(range, range, extents.min);
            vec3.scale(objOffset, range, -1);

            /** Initialization of necessary variables and stuff around WebGL (resizing, culling, etc.) */
            this.gl.enable(this.gl.DEPTH_TEST);
            this.gl.enable(this.gl.CULL_FACE);
            this.gl.enable(this.gl.SCISSOR_TEST);

            const effectiveHeight = this.gl.canvas.clientHeight / 2,
                fieldOfView = glMatrix.toRadian(60),
                aspect = this.gl.canvas.clientWidth / effectiveHeight,
                zNear = 1,
                zFar = 5000;

            const cameraTarget = this.inputs.checkboxes.camera.cameraLookAt.checked
                ? vec3.fromValues(0, 0, 0)
                : this.camera.direction;

            /** On the upper half of canvas draw view from the camera */
            twgl.resizeCanvasToDisplaySize(this.gl.canvas);
            const {width, height} = this.gl.canvas;
            const halfHeight = height / 2;

            this.gl.viewport(0, halfHeight, width, halfHeight);
            this.gl.scissor(0, halfHeight, width, halfHeight);

            /** Matrix logic around camera */
            this.camera.setPerspective(fieldOfView, aspect, zNear, zFar)
                .move()
                .lookAt(cameraTarget);

            /** Create buffers and custom uniforms for all the geometries */
            const infoBuffers = this.objData.geometries.map(({data}) => {
                if (data.color) {
                    if (data.position.length === data.color.length) {
                        data.color = {
                            numComponents: 3,
                            data: data.color
                        };
                    }
                } else {
                    data.color = {value: [0, 0.7, 0, 1]};
                }

                return twgl.createBufferInfoFromArrays(this.gl, data);
            });

            let world = mat4.create();
            mat4.translate(world, world, objOffset);

            let lightPosition;
            switch (this.inputs.selects.light.lightPositionOptions.value) {
                case "stickCamera":
                    lightPosition = this.camera.position;
                    break;
                case "stickLightField":
                    lightPosition = this.lightField.position;
                    break;
                case "free":
                    lightPosition = this.light.position;
                    break;
            }

            /** Uniforms that are the same for all parts */
            let sharedUniforms = {
                u_worldViewProjection: this.camera.getWorldViewProjectionMatrix(world),
                u_worldInverseTranspose: this.camera.getWorldInverseTransposeMatrix(world),
                u_viewWorldPosition: this.camera.position,
                u_lightWorldPosition: lightPosition,
                u_lightColor: this.light.color,
                u_shininess: 150
            };
            twgl.setUniforms(this.mainProgramInfo, sharedUniforms);

            /** Sets uniforms, attributes and calls method for drawing */
            for (const bufferInfo of infoBuffers) {
                twgl.setUniforms(this.mainProgramInfo, {
                    u_world: world
                });

                twgl.setBuffersAndAttributes(this.gl, this.mainProgramInfo, bufferInfo);
                twgl.drawBufferInfo(this.gl, bufferInfo);
            }

            /**
             * Iterate over cameras and draw them with the simple shaders
             * @param {LightFieldCamera} lfCamera
             */
            const lfCameraRenderCallback = (lfCamera) => {
                twgl.setUniforms(this.secondaryProgramInfo, {
                    u_worldViewProjection: this.camera.getWorldViewProjectionMatrix(lfCamera.positionMatrix),
                    u_color: lfCamera.selected ? [1, 0, 0, 1] : [0, 0, 0, 1]
                });

                const lfCameraBufferInfo = lfCamera.getBufferInfo(this.gl, 0.5);
                twgl.setBuffersAndAttributes(this.gl, this.secondaryProgramInfo, lfCameraBufferInfo);
                twgl.drawBufferInfo(this.gl, lfCameraBufferInfo, this.gl.LINES);
            };
            this.gl.useProgram(this.secondaryProgramInfo.program);
            this.lightField.iterateCameras(lfCameraRenderCallback);

            /** On the lower half of canvas draw view from selected light field camera */
            this.gl.useProgram(this.mainProgramInfo.program);
            this.gl.viewport(0, 0, width, halfHeight);
            this.gl.scissor(0, 0, width, halfHeight);

            /** Proceed to draw only if user has selected a camera */
            const lfCamera = this.lightField.selectedCamera;
            if (lfCamera) {
                lfCamera.setPerspective(fieldOfView, aspect, zNear, zFar)
                    .move();

                world = mat4.create();
                mat4.translate(world, world, objOffset);

                sharedUniforms = {
                    u_worldViewProjection: lfCamera.getWorldViewProjectionMatrix(world),
                    u_worldInverseTranspose: lfCamera.getWorldInverseTransposeMatrix(world),
                    u_viewWorldPosition: lfCamera.position,
                    u_lightWorldPosition: lightPosition,
                    u_lightColor: this.light.color,
                    u_shininess: 150
                };
                twgl.setUniforms(this.mainProgramInfo, sharedUniforms);

                for (const bufferInfo of infoBuffers) {
                    twgl.setUniforms(this.mainProgramInfo, {
                        u_world: world
                    });

                    twgl.setBuffersAndAttributes(this.gl, this.mainProgramInfo, bufferInfo);
                    twgl.drawBufferInfo(this.gl, bufferInfo);
                }
            }
        }
    }
}