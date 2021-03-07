import {glMatrix, vec3, mat4} from 'gl-matrix';
import * as twgl from "twgl.js";
import {fragmentShader} from "./fragmentShader.js";
import {vertexShader} from "./vertexShader.js";
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
        this.objParser = new ObjParser();
        this.gl = this.canvas.getContext("webgl");
        if (!this.gl) {
            throw "WebGL not supported";
        }
        this.meshProgramInfo = twgl.createProgramInfo(this.gl, [vertexShader, fragmentShader]);
        this.gl.useProgram(this.meshProgramInfo.program);
        this.camera = new Camera(0, 0, 30);
        this.light = new LightSource(0, 0, 30);
        this.lightField = new LightField(0, 0, 0);
        this.lightField.initCameras(8, 8);
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
                }
            }
        }

        /** Cycles through all inputs and initializes them */
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
                            }
                            break;
                        case "selects":
                            if (inputName === "lightPositionOptions") {
                                const renderer = this;
                                this.disableSliders(sceneObjectName, true);
                                input.oninput = function () {
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
                            }
                            break;
                        case "checkboxes":
                            const renderer = this;
                            this.disableSliders(sceneObjectName, true, ["cameraPitch", "cameraYaw"]);
                            input.oninput = function () {
                                if (this.checked) {
                                    renderer.disableSliders(sceneObjectName, false, ["cameraPitch", "cameraYaw"]);
                                } else {
                                    renderer.disableSliders(sceneObjectName, true, ["cameraPitch", "cameraYaw"]);
                                }
                                renderer.render();
                            };
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
            renderer.light[colorInputName] = Utils.convertRange(this.value, [0, 255], [0, 1]);
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
            renderer.inputs.sliders[sceneObjectName][sliderName].sliderValue.innerHTML = this.value;
            /** Light field needs special updating because we need to update the light field cameras as well */
            if (sceneObjectName === "lightField") {
                renderer.lightField.updatePosition(sliderName, this.value);
            } else {
                renderer[sceneObjectName][sliderName] = this.value;
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
        this.gl.clearColor(0.7, 0.7, 0.7, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        /** Proceed to draw only if user has already uploaded .obj file and it has been parsed */
        if (this.objData !== undefined) {
            /** Initialization of necessary variables and stuff around WebGL (resizing, culling, etc.) */
            const extents = this.objData.extents;
            let range = vec3.create(),
                objOffset = vec3.create();
            vec3.subtract(range, extents.max, extents.min);
            vec3.scale(range, range, 0.5);
            vec3.add(range, range, extents.min);
            vec3.scale(objOffset, range, -1);

            const fieldOfView = glMatrix.toRadian(60),
                aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight,
                zNear = 1,
                zFar = 5000;

            const cameraTarget = vec3.fromValues(0, 0, 0);
            const up = vec3.fromValues(0, 1.0, 0);

            twgl.resizeCanvasToDisplaySize(this.gl.canvas);
            this.gl.viewport(0, 0, this.gl.canvas.clientWidth, this.gl.canvas.clientHeight);
            this.gl.enable(this.gl.DEPTH_TEST);
            this.gl.enable(this.gl.CULL_FACE);

            /** Matrix logic around camera */
            this.camera.setPerspective(fieldOfView, aspect, zNear, zFar)
                .move()
                .lookAt(cameraTarget, up);

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

            let world = mat4.create(),
                worldViewProjectionMatrix = mat4.create(),
                worldInverseMatrix = mat4.create(),
                worldInverseTransposeMatrix = mat4.create();
            mat4.translate(world, world, objOffset);

            mat4.multiply(worldViewProjectionMatrix, this.camera.viewProjectionMatrix, world);
            mat4.invert(worldInverseMatrix, world);
            mat4.transpose(worldInverseTransposeMatrix, worldInverseMatrix);

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
            const sharedUniforms = {
                u_worldViewProjection: worldViewProjectionMatrix,
                u_worldInverseTranspose: worldInverseTransposeMatrix,
                u_viewWorldPosition: this.camera.position,
                u_lightWorldPosition: lightPosition,
                u_lightColor: this.light.color,
                u_shininess: 200
            };
            twgl.setUniforms(this.meshProgramInfo, sharedUniforms);

            /** Sets uniforms, attributes and calls method for drawing */
            for (const bufferInfo of infoBuffers) {
                twgl.setUniforms(this.meshProgramInfo, {
                    u_world: world
                });

                twgl.setBuffersAndAttributes(this.gl, this.meshProgramInfo, bufferInfo);
                twgl.drawBufferInfo(this.gl, bufferInfo);
            }

            const bufferInfo = LightFieldCamera.getBufferInfo(this.gl, 0.5);
            /** @param {LightFieldCamera} lfCamera */
            const lfCameraRenderCallback = (lfCamera) => {
                mat4.multiply(worldViewProjectionMatrix, this.camera.viewProjectionMatrix, lfCamera.positionMatrix);
                mat4.invert(worldInverseMatrix, lfCamera.positionMatrix);
                mat4.transpose(worldInverseTransposeMatrix, worldInverseMatrix);
                twgl.setUniforms(this.meshProgramInfo, {
                    u_worldViewProjection: worldViewProjectionMatrix,
                    u_worldInverseTranspose: worldInverseTransposeMatrix,
                    u_world: lfCamera.positionMatrix
                });

                twgl.setBuffersAndAttributes(this.gl, this.meshProgramInfo, bufferInfo);
                twgl.drawBufferInfo(this.gl, bufferInfo, this.gl.LINES);
            };
            this.lightField.iterateCameras(lfCameraRenderCallback);
        }
    }
}