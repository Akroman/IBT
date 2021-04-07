import {glMatrix, mat4, vec3} from "gl-matrix";
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
    /** @type {HTMLCanvasElement} */
    canvas;

    /** @type {WebGLRenderingContext} */
    gl;

    /** @type {ObjParser} */
    objParser;

    /** @type {Camera} */
    camera;

    /** @type {LightSource} */
    light;

    /** @type {LightField} */
    lightField;

    /** @type {Mesh} */
    mesh;

    /** @type {[Object]} */
    objBufferInfo;

    /** @type {BufferInfo} */
    lfCameraBufferInfo

    /** @type {ProgramInfo} */
    mainProgramInfo;

    /** @type {ProgramInfo} */
    secondaryProgramInfo;

    /** @type {Object} */
    inputs;

    /** @type {WebGLFramebuffer} */
    pickingFrameBuffer;

    /** @type {WebGLRenderbuffer} */
    pickingDepthBuffer;

    /** @type {WebGLTexture} */
    pickingTexture;

    /** @type {?number} */
    mouseX = null;

    /** @type {?number} */
    mouseY = null;



    /**
     * Constructor initializes necessary variables (WebGL context, ObjParser, program, camera and light field)
     */
    constructor()
    {
        this.canvas = document.querySelector("canvas");
        this.createGl();
        this.initPickingFrameBuffer();

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

        /** Main program using the regular shaders with textures and lights */
        this.mainProgramInfo = twgl.createProgramInfo(this.gl, [vertexShader, fragmentShader]);

        /** Second program using the simplified shaders without textures and lights */
        this.secondaryProgramInfo = twgl.createProgramInfo(this.gl, [simpleVertexShader, simpleFragmentShader]);
    }


    /**
     * Initializes necessary buffers and texture to handle picking
     */
    initPickingFrameBuffer()
    {
        /** Create a texture to render to */
        this.pickingTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.pickingTexture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        /** Create a depth renderbuffer */
        this.pickingDepthBuffer = this.gl.createRenderbuffer();
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.pickingDepthBuffer);

        /** Create and bind the framebuffer */
        this.pickingFrameBuffer = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.pickingFrameBuffer);

        /** Attach the texture as the first color attachment */
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.pickingTexture, 0);

        /** Make a depth buffer and the same size as the targetTexture */
        this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.pickingDepthBuffer);
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

        document.getElementById("resetCamera").onclick = () => {
            this.camera.position = vec3.fromValues(0, 0, 30);
            this.camera.pitch = 0;
            this.camera.yaw = -90;
        };
        document.getElementById("cameraLookAt").onclick = () => {
            const meshDirection = vec3.create();
            vec3.subtract(meshDirection, this.mesh.position, this.mesh.centerOffset);
            this.camera.lookAt(meshDirection);
            this.camera.pitch = Math.asin(-this.camera._matrix[11]);
            this.camera.yaw = Math.atan2(this.camera._matrix[7], this.camera._matrix[15]);
        };

        this.canvas.addEventListener("mousedown", (event) => {
            const rect = event.target.getBoundingClientRect();
            this.mouseX = event.clientX - rect.left;
            this.mouseY = event.clientY - rect.top;

            this.canvas.onmousemove = (ev) => {
                this.mouseX = null;
                this.mouseY = null;

                const sensitivity = 0.3;
                const previousScreenY = ev.screenY - ev.movementY;

                const xOffset = ev.movementX * sensitivity;
                const yOffset = (previousScreenY - ev.screenY) * sensitivity;

                this.camera.yaw += xOffset;
                this.camera.pitch += yOffset;

                if (this.camera.pitch > 89) {
                    this.camera.pitch = 89;
                } else if (this.camera.pitch < -89) {
                    this.camera.pitch = -89;
                }
            };
        });
        this.canvas.addEventListener("mouseup", (event) => {
            this.mouseX = null;
            this.mouseY = null;
            this.canvas.onmousemove = null;
        });
        this.canvas.addEventListener("keydown", (event) => {
            this.inputs.keys[event.keyCode] = true;
        });
        this.canvas.addEventListener("keyup", (event) => {
            this.inputs.keys[event.keyCode] = false;
        });

        this.inputs = {
            sliders: {
                light: {
                    posX: {
                        slider: document.getElementById("lightXPos"),
                        sliderValue: document.getElementById("lightXPosOut")
                    },
                    posY: {
                        slider: document.getElementById("lightYPos"),
                        sliderValue: document.getElementById("lightYPosOut")
                    },
                    posZ: {
                        slider: document.getElementById("lightZPos"),
                        sliderValue: document.getElementById("lightZPosOut")
                    },
                },

                mesh: {
                    posX: {
                        slider: document.getElementById("meshXPos"),
                        sliderValue: document.getElementById("meshXPosOut")
                    },
                    posY: {
                        slider: document.getElementById("meshYPos"),
                        sliderValue: document.getElementById("meshYPosOut")
                    },
                    posZ: {
                        slider: document.getElementById("meshZPos"),
                        sliderValue: document.getElementById("meshZPosOut")
                    },
                    rotX: {
                        slider: document.getElementById("meshXRot"),
                        sliderValue: document.getElementById("meshXRotOut")
                    },
                    rotY: {
                        slider: document.getElementById("meshYRot"),
                        sliderValue: document.getElementById("meshYRotOut")
                    },
                    rotZ: {
                        slider: document.getElementById("meshZRot"),
                        sliderValue: document.getElementById("meshZRotOut")
                    }
                }
            },

            numbers: {
                light: {
                    colorRed: document.getElementById("lightRedColor"),
                    colorGreen: document.getElementById("lightGreenColor"),
                    colorBlue: document.getElementById("lightBlueColor")
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
                    lookAt: document.getElementById("cameraLookAt")
                }
            },

            selects: {
                light: {
                    positionOptions: document.getElementById("lightPositionOptions")
                },

                lightField: {
                    cameraSelection: document.getElementById("lfCameraSelection")
                }
            },

            keys: {}
        }

        /** Cycles through all inputs and initializes them */
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
        if (selectName === "positionOptions" && sceneObjectName === "light") {
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
            };
        } else if (selectName === "cameraSelection" && sceneObjectName === "lightField") {
            this.lightField.setSelectedCamera(0, 0);
            this.updateLightFieldCameraSelection();
            input.onchange = function () {
                const rowAndColumn = this.value.split("_");
                const row = parseInt(rowAndColumn[0]);
                const column = parseInt(rowAndColumn[1]);
                renderer.lightField.setSelectedCamera(row, column);
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
        };
    }


    /**
     * Updates selection for viewed light field camera
     */
    updateLightFieldCameraSelection()
    {
        const [selectedRow, selectedColumn] = this.lightField.selectedCameraIndex;
        const optionsCount = this.inputs.selects.lightField.cameraSelection.length - 1;

        /** First remove all the options */
        for (let optionIndex = optionsCount; optionIndex >= 0; optionIndex--) {
            this.inputs.selects.lightField.cameraSelection.remove(optionIndex);
        }

        /** And then iterate over all the cameras and add the to the selection */
        this.lightField.iterateCameras((camera, row, column) => {
            const option = document.createElement("option");
            option.value = row + "_" + column;
            row++;
            column++;
            option.text = "Kamera: " + row + "-" + column;
            this.inputs.selects.lightField.cameraSelection.add(option);
        });
        this.inputs.selects.lightField.cameraSelection.value = selectedRow + "_" + selectedColumn;
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
     * Sets size of picking depth buffer
     */
    setPickingFramebufferAttachmentSizes()
    {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.pickingTexture);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA,
            this.gl.canvas.width,
            this.gl.canvas.height,
            0,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            null
        );

        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.pickingDepthBuffer);
        this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, this.gl.canvas.width, this.gl.canvas.height);
    }


    /**
     * Main function of program, passes parsed data to WebGL and handles drawing scene
     */
    render()
    {
        this.prepareGl();

        /** On the upper half of canvas draw view from the camera */
        twgl.resizeCanvasToDisplaySize(this.gl.canvas);
        this.setPickingFramebufferAttachmentSizes();
        const {width, height} = this.gl.canvas;
        const halfHeight = height / 2;
        const effectiveHeight = this.gl.canvas.clientHeight / 2;

        this.gl.viewport(0, halfHeight, width, halfHeight);
        this.gl.scissor(0, halfHeight, width, halfHeight);
        this.gl.clearColor(0.7, 0.7, 0.7, 1.0);

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
        requestAnimationFrame((timestamp) => this.render());
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

        vec3.scale(cameraFrontScaled, this.camera.front, cameraSpeed);
        vec3.cross(cameraFrontCrossNormScaled, this.camera.front, this.camera.up);
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
        switch (this.inputs.selects.light.positionOptions.value) {
            case "stickCamera":
                lightPosition = this.camera.position;
                break;
            case "stickLightField":
                lightPosition = this.lightField.selectedCamera.position;
                break;
            case "free":
                lightPosition = this.light.position;
                break;
        }

        this.mesh.move().rotate();
        const fieldOfView = glMatrix.toRadian(60),
            aspect = this.gl.canvas.clientWidth / height,
            zNear = 1,
            zFar = 5000;

        /** Matrix logic around camera */
        camera.setPerspective(fieldOfView, aspect, zNear, zFar)
            .move();
        /** We need to make camera look in its direction and draw the light field representation */
        if (!(camera instanceof LightFieldCamera)) {
            camera.lookAt();

            /**
             * Iterate over cameras and draw them with the simple shaders
             * @param {LightFieldCamera} lfCamera
             */
            const lfCameraRenderCallback = (lfCamera) => {
                twgl.setUniforms(this.secondaryProgramInfo, {
                    u_worldViewProjection: this.camera.getWorldViewProjectionMatrix(lfCamera.positionMatrix),
                    u_color: lfCamera.color.map((value) => Utils.convertRange(value, [0, 255], [0, 1]))
                });
                twgl.setBuffersAndAttributes(this.gl, this.secondaryProgramInfo, this.lfCameraBufferInfo);
                twgl.drawBufferInfo(this.gl, this.lfCameraBufferInfo, this.gl.LINES);
            };

            /** Draw to the picking texture */
            this.gl.useProgram(this.secondaryProgramInfo.program);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.pickingFrameBuffer);
            this.lightField.iterateCameras(lfCameraRenderCallback);
            if (this.mouseX !== null && this.mouseY !== null) {
                this.handlePicking();
            }

            /** Draw to the canvas */
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
            this.lightField.iterateCameras(lfCameraRenderCallback);
            this.gl.useProgram(this.mainProgramInfo.program);
        }

        /** Uniforms that are the same for all parts */
        const sharedUniforms = {
            u_worldViewProjection: camera.getWorldViewProjectionMatrix(this.mesh.matrix),
            u_worldInverseTranspose: this.mesh.inverseTransposeMatrix,
            u_viewWorldPosition: camera.position,
            u_lightWorldPosition: lightPosition,
            u_lightColor: this.light.color
        };
        twgl.setUniforms(this.mainProgramInfo, sharedUniforms);

        /** Sets uniforms, attributes and calls method for drawing */
        for (const {bufferInfo, material} of this.objBufferInfo) {
            twgl.setUniforms(this.mainProgramInfo, {
                u_world: this.mesh.matrix,
                ...material
            });
            twgl.setBuffersAndAttributes(this.gl, this.mainProgramInfo, bufferInfo);
            twgl.drawBufferInfo(this.gl, bufferInfo);
        }
    }


    /**
     * Takes care of selecting light field camera by simply clicking on it
     */
    handlePicking()
    {
        const pixelX = this.mouseX * this.gl.canvas.width / this.gl.canvas.clientWidth;
        const pixelY = this.gl.canvas.height - this.mouseY * this.gl.canvas.height / this.gl.canvas.clientHeight - 1;
        const data = new Uint8Array(4);
        this.gl.readPixels(
            pixelX,
            pixelY,
            1,
            1,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            data
        );

        /** Iterate over cameras and check, if selected camera should be changed */
        this.lightField.iterateCameras((camera, row, column) => {
            if (Utils.arrayEquals(data, camera.color)) {
                this.lightField.setSelectedCamera(row, column);
                this.inputs.selects.lightField.cameraSelection.value = row + "_" + column;
            }
        });
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
            });
    }


    /**
     * Iterates over all uploaded files and handles them according to their extension
     * @param {Object} files
     */
    handleFileUpload(files)
    {
        if (files.length === 0) {
            return;
        }
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
                                /** It's not a power of 2, turn off mips and set wrapping to clamp to edge */
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
        }, (reason) => alert(reason));
    }
}