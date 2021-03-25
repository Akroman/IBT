import {glMatrix, vec3} from "gl-matrix";
import * as twgl from "twgl.js";
import JSZip from "jszip";
import FileSaver from "file-saver";
import {fragmentShader, simpleFragmentShader} from "./fragmentShader.js";
import {vertexShader, simpleVertexShader} from "./vertexShader.js";
import Camera from "./camera.js";
import ObjParser from "./objParser.js";
import LightSource from "./lightSource";
import Utils from "./utils";
import LightField from "./lightField";
import LightFieldCamera from "./lightFieldCamera";
import chairObj from '../examples/chair.obj';
import chairMtl from '../examples/chair.mtl';


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
        this.canvas = document.getElementById("mainCanvas");
        this.createGl();
        this.objParser = new ObjParser(this.gl);
        this.camera = new Camera(0, 0, 30);
        this.light = new LightSource(0, 0, 30);
        this.lightField = new LightField(-5, 5, 15);
        this.mesh = this.objParser.parseObj(chairObj + "\n" + chairMtl);
        this.objBufferInfo = this.mesh.getBufferInfo(this.gl);
        this.lfCameraBufferInfo = LightFieldCamera.getBufferInfo(this.gl, 0.5);
    }


    /**
     * Gets WebGL rendering context from current canvas, creates programs from shaders
     */
    createGl()
    {
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
    }


    /**
     * Initiates inputs to handle value changes (display values and re-render scene)
     * Creates event listener for parsing .obj file on upload
     * @returns {Renderer}
     */
    initInputs()
    {
        document.getElementById("objUpload")
            .addEventListener("change", (event) => this.handleFileUpload(event.target.files));
        document.getElementById("exportLf").onclick = () => this.exportLightField();

        this.canvas.addEventListener("mousedown", (event) => {
            if (!this.inputs.checkboxes.camera.cameraLookAt.checked) {
                this.canvas.onmousemove = (ev) => {
                    const sensitivity = 0.3;
                    const previousScreenY = ev.screenY - ev.movementY;

                    const xOffset = ev.movementX * sensitivity;
                    const yOffset = (previousScreenY - ev.screenY) * sensitivity;

                    this.camera.cameraYaw += xOffset;
                    this.camera.cameraPitch += yOffset;

                    if (this.camera.cameraPitch > 89) {
                        this.camera.cameraPitch = 89;
                    } else if (this.camera.cameraPitch < -89) {
                        this.camera.cameraPitch = -89;
                    }
                    this.render();
                };
            }
        });
        this.canvas.addEventListener("mouseup", (event) => {
            this.canvas.onmousemove = null;
        });
        this.canvas.addEventListener("keydown", (event) => {
            this.inputs.keys[event.keyCode] = true;
            this.render();
        });
        this.canvas.addEventListener("keyup", (event) => {
            this.inputs.keys[event.keyCode] = false;
            this.render();
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

                mesh: {
                    meshPosX: {
                        slider: document.getElementById("meshXPos"),
                        sliderValue: document.getElementById("meshXPosOut")
                    },
                    meshPosY: {
                        slider: document.getElementById("meshYPos"),
                        sliderValue: document.getElementById("meshYPosOut")
                    },
                    meshPosZ: {
                        slider: document.getElementById("meshZPos"),
                        sliderValue: document.getElementById("meshZPosOut")
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
                    verticalCamerasCount: document.getElementById("lfVertCamNumber"),
                    horizontalCameraSpace: document.getElementById("lfHorCamSpace"),
                    verticalCameraSpace: document.getElementById("lfVertCamSpace"),
                    resolutionWidth: document.getElementById("lfResolutionWidth"),
                    resolutionHeight: document.getElementById("lfResolutionHeight")
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
            },

            keys: {}
        }

        /** Cycles through all inputs and initializes them */
        const renderer = this;
        for (const [inputType, sceneObjects] of Object.entries(this.inputs)) {
            for (const [sceneObjectName, inputs] of Object.entries(sceneObjects)) {
                for (const [inputName, input] of Object.entries(inputs)) {
                    switch (inputType) {
                        case "sliders":
                            this.initSlider(inputName, sceneObjectName, input);
                            break;
                        case "numbers":
                            this.initNumber(inputName, sceneObjectName, input);
                            break;
                        case "selects":
                            this.initSelect(inputName, sceneObjectName, input);
                            break;
                        case "checkboxes":
                            if (inputName === "cameraLookAt") {
                                this.toggleSliders(sceneObjectName, true, ["cameraPitch", "cameraYaw"]);
                                input.oninput = function () {
                                    if (this.checked) {
                                        renderer.toggleSliders(sceneObjectName, true, ["cameraPitch", "cameraYaw"]);
                                    } else {
                                        renderer.toggleSliders(sceneObjectName, false, ["cameraPitch", "cameraYaw"]);
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
     * Initializes number input to handle changes and re-render scene
     * @param {string} numberName
     * @param {string} sceneObjectName
     * @param {HTMLInputElement} input
     */
    initNumber(numberName, sceneObjectName, input)
    {
        const renderer = this;
        /** Light colors need to be converted to correct format */
        if (sceneObjectName === "light") {
            input.value = Utils.convertRange(this.light[numberName], [0, 1], [0, 255]);
            input.oninput = function () {
                renderer.light[numberName] = Utils.convertRange(parseInt(this.value), [0, 255], [0, 1]);
                renderer.render();
            };
        } else if (sceneObjectName === "lightField") {
            if (!numberName.startsWith("resolution")) {
                input.value = this.lightField[numberName];
                this.lightField.initCameras();
                input.oninput = function () {
                    if (numberName.endsWith("Space")) {
                        renderer.lightField[numberName] = parseFloat(this.value);
                    }
                    renderer.lightField.initCameras(
                        parseInt(renderer.inputs.numbers.lightField.horizontalCamerasCount.value),
                        parseInt(renderer.inputs.numbers.lightField.verticalCamerasCount.value)
                    );
                    renderer.updateLightFieldCameraSelection();
                    renderer.render();
                };
            }
        }
    }


    /**
     * Initializes select input to handle changes and re-render scene
     * @param {string} selectName
     * @param {string} sceneObjectName
     * @param {HTMLInputElement} input
     */
    initSelect(selectName, sceneObjectName, input)
    {
        const renderer = this;
        if (selectName === "lightPositionOptions") {
            this.toggleSliders(sceneObjectName, true);
            input.onchange = function () {
                switch (this.value) {
                    case "stickCamera":
                    case "stickLightField":
                        renderer.toggleSliders(sceneObjectName, true);
                        break;
                    case "free":
                        renderer.toggleSliders(sceneObjectName, false);
                        break;
                }
                renderer.render();
            };
        } else if (selectName === "lightFieldCameraSelection") {
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
    }


    /**
     * Initializes sliders to handle changes and re-render scene
     * @param {string} sliderName
     * @param {string} sceneObjectName
     * @param {Object} input
     */
    initSlider(sliderName, sceneObjectName, input)
    {
        const renderer = this;
        input.slider.value = this[sceneObjectName][sliderName];
        input.sliderValue.innerHTML = this[sceneObjectName][sliderName].toFixed(1);
        input.slider.oninput = function () {
            const value = parseFloat(this.value);
            input.sliderValue.innerHTML = value;
            renderer[sceneObjectName][sliderName] = value;
            renderer.render();
        };
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
     * @param {boolean} toggle
     * @param {[string]} sliders
     */
    toggleSliders(sceneObjectName, toggle, sliders = [])
    {
        for (const [sliderName, input] of Object.entries(this.inputs.sliders[sceneObjectName])) {
            /**
             * If sliders is not empty, set only the sliders that are contained within the array
             * otherwise set all sliders to given value
             */
            if (sliders.length) {
                if (sliders.includes(sliderName)) {
                    input.slider.disabled = toggle;
                }
            } else {
                input.slider.disabled = toggle;
            }
        }
    }


    /**
     * Disables or enables all inputs
     * @param {boolean} toggle
     */
    toggleInputs(toggle)
    {
        const inputs = document.getElementsByTagName("input");
        for (let i = 0; i < inputs.length; i++) {
            inputs[i].disabled = toggle;
        }

        const selects = document.getElementsByTagName("select");
        for (let i = 0; i < selects.length; i++) {
            selects[i].disabled = toggle;
        }
    }


    /**
     * Inits necessary variables and stuff around WebGL (resizing, culling, etc.), sets background color
     * @param {boolean} enableScissor
     */
    prepareGl(enableScissor = true)
    {
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.CULL_FACE);
        if (enableScissor) {
            this.gl.enable(this.gl.SCISSOR_TEST);
        } else {
            this.gl.disable(this.gl.SCISSOR_TEST);
        }
    }


    /**
     * Main function of program, passes parsed data to WebGL and handles drawing scene
     */
    render()
    {
        this.prepareGl();

        /** On the upper half of canvas draw view from the camera */
        twgl.resizeCanvasToDisplaySize(this.gl.canvas);
        const {width, height} = this.gl.canvas;
        const halfHeight = height / 2;
        const effectiveHeight = this.gl.canvas.clientHeight / 2;

        this.gl.viewport(0, halfHeight, width, halfHeight);
        this.gl.scissor(0, halfHeight, width, halfHeight);
        this.gl.clearColor(0.7, 0.7, 0.7, 1.0);

        this.mesh.move();
        this.handleKeyboardInputs();
        this.renderCameraView(this.camera, effectiveHeight);

        /** On the lower half of canvas draw view from selected light field camera */
        this.gl.viewport(0, 0, width, halfHeight);
        this.gl.scissor(0, 0, width, halfHeight);
        this.gl.clearColor(1.0, 1.0, 1.0, 1.0);

        /** Proceed to draw only if user has selected a camera */
        const lfCamera = this.lightField.selectedCamera;
        if (lfCamera) {
            this.renderCameraView(lfCamera, effectiveHeight);
        }
    }


    /**
     * Takes care of camera movement using keyboard input
     */
    handleKeyboardInputs()
    {
        const cameraSpeed = 0.5;
        const helperVector = vec3.create();
        const cameraFrontScaled = vec3.create();
        const cameraFrontCrossNormScaled = vec3.create();

        vec3.scale(cameraFrontScaled, this.camera.cameraFront, cameraSpeed);
        vec3.cross(cameraFrontCrossNormScaled, this.camera.cameraFront, this.camera.cameraUp);
        vec3.normalize(cameraFrontCrossNormScaled, cameraFrontCrossNormScaled);
        vec3.scale(cameraFrontCrossNormScaled, cameraFrontCrossNormScaled, cameraSpeed);

        if (this.inputs.keys["87"]) {
            vec3.add(helperVector, this.camera.position, cameraFrontScaled);
            this.camera.position = helperVector;
        }
        if (this.inputs.keys["83"]) {
            vec3.subtract(helperVector, this.camera.position, cameraFrontScaled);
            this.camera.position = helperVector;
        }
        if (this.inputs.keys["65"]) {
            vec3.subtract(helperVector, this.camera.position, cameraFrontCrossNormScaled);
            this.camera.position = helperVector;
        }
        if (this.inputs.keys["68"]) {
            vec3.add(helperVector, this.camera.position, cameraFrontCrossNormScaled);
            this.camera.position = helperVector;
        }
    }


    /**
     * Draws view from given camera
     * @param {Camera} camera
     * @param {number} height
     */
    renderCameraView(camera, height)
    {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.useProgram(this.mainProgramInfo.program);

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

        const fieldOfView = glMatrix.toRadian(60),
            aspect = this.gl.canvas.clientWidth / height,
            zNear = 1,
            zFar = 5000;

        /** Matrix logic around camera */
        camera.setPerspective(fieldOfView, aspect, zNear, zFar)
            .move();
        /** We need to make camera look in its direction and draw the light field representation */
        if (!(camera instanceof LightFieldCamera)) {
            const meshDirection = vec3.create();
            vec3.subtract(meshDirection, this.mesh.position, this.mesh.centerOffset);
            const cameraTarget = this.inputs.checkboxes.camera.cameraLookAt.checked
                ? meshDirection
                : camera.direction;
            camera.lookAt(cameraTarget);

            /**
             * Iterate over cameras and draw them with the simple shaders
             * @param {LightFieldCamera} lfCamera
             */
            const lfCameraRenderCallback = (lfCamera) => {
                twgl.setUniforms(this.secondaryProgramInfo, {
                    u_worldViewProjection: this.camera.getWorldViewProjectionMatrix(lfCamera.positionMatrix),
                    u_color: lfCamera.selected ? [1, 0, 0, 1] : [0, 0, 0, 1]
                });
                twgl.setBuffersAndAttributes(this.gl, this.secondaryProgramInfo, this.lfCameraBufferInfo);
                twgl.drawBufferInfo(this.gl, this.lfCameraBufferInfo, this.gl.LINES);
            };
            this.gl.useProgram(this.secondaryProgramInfo.program);
            this.lightField.iterateCameras(lfCameraRenderCallback);
            this.gl.useProgram(this.mainProgramInfo.program);
        }

        /** Uniforms that are the same for all parts */
        const sharedUniforms = {
            u_worldViewProjection: camera.getWorldViewProjectionMatrix(this.mesh.meshMatrix),
            u_worldInverseTranspose: this.mesh.inverseTransposeMatrix,
            u_viewWorldPosition: camera.position,
            u_lightWorldPosition: lightPosition,
            u_lightColor: this.light.color
        };
        twgl.setUniforms(this.mainProgramInfo, sharedUniforms);

        /** Sets uniforms, attributes and calls method for drawing */
        for (const {bufferInfo, material} of this.objBufferInfo) {
            twgl.setUniforms(this.mainProgramInfo, {
                u_world: this.mesh.meshMatrix,
                ...material
            });
            twgl.setBuffersAndAttributes(this.gl, this.mainProgramInfo, bufferInfo);
            twgl.drawBufferInfo(this.gl, bufferInfo);
        }
    }


    /**
     * Iterates over all light field cameras, generates canvas screenshots, zips them and saves them on client side
     */
    async exportLightField()
    {
        const zipper = new JSZip();
        let fileNumber = 1;
        /** Create a new canvas that the light field will be rendered to, disable all inputs */
        const initialWidth = this.canvas.style.width;
        const initialHeight = this.canvas.style.height;
        this.canvas.style.width = (parseInt(this.inputs.numbers.lightField.resolutionWidth.value) + 6) + "px";
        this.canvas.style.height = (parseInt(this.inputs.numbers.lightField.resolutionHeight.value) + 6) + "px";
        document.getElementById("lfCanvasWrapper").appendChild(this.canvas);
        this.toggleInputs(true);

        /** Light field cameras need to be iterated asynchronously because JSZip zips files asynchronously */
        await this.lightField.iterateCamerasAsync((camera) => {
            this.prepareGl(false);
            twgl.resizeCanvasToDisplaySize(this.gl.canvas);
            this.gl.viewport(0, 0, this.canvas.width, this.gl.canvas.height);

            this.mesh.move();
            this.renderCameraView(camera, this.canvas.clientHeight);

            /** Return a promise which saves the screenshot */
            return new Promise((resolve) => {
                this.canvas.toBlob((blob) => {
                    zipper.file("IMG_" + fileNumber + ".png", blob, {base64: true});
                    fileNumber++;
                    resolve();
                });
            });
        });

        /** Save the zipped screenshots, enable inputs, remove the light field canvas and re-render scene */
        zipper.generateAsync({type: "blob"})
            .then((content) => {
                saveAs(content, "light_field.zip");
                this.toggleInputs(false);
                this.canvas.style.height = initialHeight;
                this.canvas.style.width = initialWidth;
                document.getElementById("mainCanvasWrapper").appendChild(this.canvas);
                this.render();
            });
    }


    /**
     * Iterates over all uploaded files and handles them according to their extension
     * @param {Object} files
     */
    handleFileUpload(files)
    {
        const filePromises = [];
        let objFiles = 0;
        let mtlFiles = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileName = file.name.split('.');
            const fileType = fileName[fileName.length - 1].toLowerCase();
            switch (fileType) {
                /**
                 * OBJ and MTL extensions parsing
                 * For each of these files create new Promise, which reads the file and resolves the promise on success
                 * Reject the promise if there's more than one file of either type or if the reading fails
                 */
                case "obj":
                    objFiles++;
                case "mtl":
                    if (fileType === "mtl") {
                        mtlFiles++;
                    }
                    filePromises.push(new Promise((resolve, reject) => {
                        if (mtlFiles >= 2 || objFiles >= 2) {
                            reject("Nahrajte prosím pouze 1 OBJ soubor a 1 MTL soubor společně se soubory textur.");
                        }

                        const fileReader = new FileReader();
                        fileReader.onload = (ev) => resolve(ev.target.result);
                        fileReader.onerror = (ev) => reject(ev.target.result);
                        fileReader.readAsText(file);
                    }));
                    break;

                /**
                 * All valid texture extensions
                 * Just save textures for further use when rendering
                 */
                case "jpg":
                case "png":
                case "gif":
                case "bmp":
                case "psd":
                case "tga":
                case "iff":
                case "tiff":
                case "pict":
                    filePromises.push(new Promise((resolve, reject) => {
                        const image = new Image();
                        const texture = Utils.create1PixelTexture(this.gl, [128, 192, 255, 255]);
                        const textureObject = {};
                        textureObject[file.name] = texture;

                        image.onload = () => {
                            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
                            this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
                            this.gl.texImage2D(
                                this.gl.TEXTURE_2D,
                                0,
                                this.gl.RGBA,
                                this.gl.RGBA,
                                this.gl.UNSIGNED_BYTE,
                                image
                            );

                            /** Check if the image is a power of 2 in both dimensions */
                            if (Utils.isPowerOf2(image.width) && Utils.isPowerOf2(image.height)) {
                                /** It's a power of 2, generate mips */
                                this.gl.generateMipmap(this.gl.TEXTURE_2D);
                            } else {
                                /** It's not a power of 2, turn of mips and set wrapping to clamp to edge */
                                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
                                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
                            }
                            resolve(textureObject);
                        };

                        const fileReader = new FileReader();
                        fileReader.onload = (ev) => image.src = ev.target.result;
                        fileReader.onerror = (ev) => reject(ev.target.result);
                        fileReader.readAsDataURL(file);
                    }));
                    break;
                default:
                    break;
            }
        }

        /** When all input files are read, pass them to ObjParser and re-render scene, alert on reject */
        Promise.all(filePromises).then((values) => {
            const objMtlText = values.filter((file) => typeof file === 'string').join("\n");
            const textures = values.filter((file) => typeof file === 'object');

            this.objParser.init();
            this.mesh = this.objParser.parseObj(objMtlText, textures);
            this.objBufferInfo = this.mesh.getBufferInfo(this.gl);
            for (const [sliderName, sliderObject] of Object.entries(this.inputs.sliders.mesh)) {
                sliderObject.slider.value = this.mesh[sliderName];
                sliderObject.sliderValue.innerHTML = this.mesh[sliderName].toFixed(1);
            }
            this.render();
        }, (reason) => alert(reason));
    }
}