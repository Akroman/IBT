import {fragmentShader} from "./fragmentShader.js";
import {vertexShader} from "./vertexShader.js";
import {glMatrix, vec3, mat4} from 'gl-matrix';
import Camera from "./camera.js";
import ObjParser from "./objParser.js";
import * as twgl from 'twgl.js';
import LightSource from "./lightSource";
import Utils from "./utils";


/**
 * Main class of whole program, takes care of rendering the scene with the help of other classes
 */
export default class Renderer
{
    /**
     * Constructor initializes necessary variables (WebGL context, ObjParser, program and camera)
     */
    constructor()
    {
        this.canvas = document.querySelector('canvas');
        this.objParser = new ObjParser();
        this.gl = this.canvas.getContext('webgl');
        if (!this.gl) {
            throw "WebGL not supported";
        }
        this.meshProgramInfo = twgl.createProgramInfo(this.gl, [vertexShader, fragmentShader]);
        this.gl.useProgram(this.meshProgramInfo.program);
        this.camera = new Camera(0, 0, 30);
        this.light = new LightSource(0, 0, 30);
    }


    /**
     * Initiates inputs to handle value changes (display values and re-render scene)
     * Creates event listener for parsing .obj file on upload
     * @returns {Renderer}
     */
    initInputs()
    {
        document.getElementById('objUpload')
            .addEventListener('change', (event) => {
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
                        slider: document.getElementById("lightFieldZPos"),
                        sliderValue: document.getElementById("lightFieldZPosOut")
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
                cameraLookAt: document.getElementById("cameraLookAt")
            }
        }

        for (const [inputType, sceneObject] of Object.entries(this.inputs)) {
            for (const [sceneObjectName, inputs] of Object.entries(sceneObject)) {
                for (const inputName of Object.keys(inputs)) {
                    switch (inputType) {
                        case "sliders":
                            this.initSlider(inputName, sceneObjectName);
                            break;
                        case "numbers":
                            this.initNumber(inputName, sceneObjectName);
                            break;
                    }
                }
            }
        }
        return this;
    }


    /**
     * Initializes number inputs to handle changes and re-render scene
     * @param {string} numberName
     * @param {string} sceneObjectName
     */
    initNumber(numberName, sceneObjectName)
    {
        const renderer = this;
        this.inputs.numbers[sceneObjectName][numberName].value = Utils.convertRange(this[sceneObjectName][numberName], [0, 1], [0, 255]);
        this.inputs.numbers[sceneObjectName][numberName].oninput = function () {
            renderer[sceneObjectName][numberName] = Utils.convertRange(this.value, [0, 255], [0, 1]);
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
            renderer[sceneObjectName][sliderName] = this.value;
            renderer.render();
        }
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

            console.log(this.camera.viewProjectionMatrix);
            mat4.multiply(worldViewProjectionMatrix, this.camera.viewProjectionMatrix, world);
            mat4.invert(worldInverseMatrix, world);
            mat4.transpose(worldInverseTransposeMatrix, worldInverseMatrix);

            /** Uniforms that are the same for all parts */
            const sharedUniforms = {
                u_worldViewProjection: worldViewProjectionMatrix,
                u_worldInverseTranspose: worldInverseTransposeMatrix,
                u_viewWorldPosition: this.camera.position,
                u_lightWorldPosition: this.light.position,
                u_lightColor: this.light.color,
                u_shininess: 150
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
        }
    }
}