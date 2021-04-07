import LightFieldCamera from "./lightFieldCamera";
import {vec3} from "gl-matrix";
import Utils from "./utils";


/**
 * Class representing light field, contains 2D array of light field cameras
 */
export default class LightField
{
    /** @type {number} */
    #posX;

    /** @type {number} */
    #posY;

    /** @type {number} */
    #posZ;

    /** @type {number} */
    horizontalCamerasCount;

    /** @type {number} */
    verticalCamerasCount;

    /** @type {number} */
    horizontalCameraSpace;

    /** @type {number} */
    verticalCameraSpace;

    /** @type {[]} */
    #cameraArray;


    /**
     * Initializes light field with default values
     * @param {number} positionX
     * @param {number} positionY
     * @param {number} positionZ
     */
    constructor(positionX, positionY, positionZ)
    {
        this.#posX = positionX;
        this.#posY = positionY;
        this.#posZ = positionZ;
        this.horizontalCamerasCount = 8;
        this.verticalCamerasCount = 8;
        this.horizontalCameraSpace = 1.5;
        this.verticalCameraSpace = 1.5;
        this.#cameraArray = [];
    }


    /**
     * @returns {vec3}
     */
    get position() { return vec3.fromValues(this.#posX, this.#posY, this.#posZ); }


    /**
     * Initializes array of cameras
     * @param {number} horizontalCamerasCount
     * @param {number} verticalCamerasCount
     */
    initCameras(horizontalCamerasCount = this.horizontalCamerasCount, verticalCamerasCount = this.verticalCamerasCount)
    {
        const [selectedRow, selectedColumn] = !this.#cameraArray.length
            ? [0, 0]
            : this.selectedCameraIndex;

        this.#cameraArray = [];
        this.horizontalCamerasCount = horizontalCamerasCount;
        this.verticalCamerasCount = verticalCamerasCount;

        const zPosition = this.#posZ;
        let yPosition = this.#posY;
        let xPosition = this.#posX;
        const lightFieldCameraPosition = vec3.fromValues(xPosition, yPosition, zPosition);

        /** Iterate over given number of rows and columns and create light field cameras */
        for (let row = 0; row < verticalCamerasCount; row++) {
            this.#cameraArray[row] = [];
            for (let column = 0; column < horizontalCamerasCount; column++) {
                this.#cameraArray[row][column] = new LightFieldCamera(...lightFieldCameraPosition);
                xPosition += this.horizontalCameraSpace;
                vec3.set(lightFieldCameraPosition, xPosition, yPosition, zPosition);
            }
            xPosition = this.#posX;
            yPosition -= this.verticalCameraSpace;
            vec3.set(lightFieldCameraPosition, xPosition, yPosition, zPosition);
        }

        try {
            this.setSelectedCamera(selectedRow, selectedColumn);
        } catch (exception) {
            this.setSelectedCamera(0, 0);
        }
    }


    /**
     * Iterates over all light field cameras and passes them to the given callback
     * @param {function} callback
     */
    iterateCameras(callback)
    {
        let iterator = 1;
        for (let row = 0; row < this.verticalCamerasCount; row++) {
            for (let column = 0; column < this.horizontalCamerasCount; column++) {
                callback(this.getCamera(row, column), row, column, iterator);
                iterator++;
            }
        }
    }


    /**
     * Asynchronous version of iterateCameras
     * @param callback
     * @returns {Promise<void>}
     */
    async iterateCamerasAsync(callback)
    {
        for (let row = 0; row < this.verticalCamerasCount; row++) {
            for (let column = 0; column < this.horizontalCamerasCount; column++) {
                await callback(this.getCamera(row, column), row, column);
            }
        }
    }


    /**
     * @param {number} row
     * @param {number} column
     * @returns {LightFieldCamera}
     */
    getCamera(row, column)
    {
        if (!this.#cameraArray[row][column]) {
            throw new InvalidCameraIndexException("Invalid camera index");
        }
        return this.#cameraArray[row][column];
    }


    /**
     * @param {number} row
     * @param {number} column
     */
    setSelectedCamera(row, column)
    {
        if (this.selectedCamera) {
            this.selectedCamera.selected = false;
        }
        this.getCamera(row, column).selected = true;
        this.#updateCameraColors();
    }



    #updateCameraColors()
    {
        const cameraColor = [0, 0, 0, 255];
        /**
         * @param {LightFieldCamera} camera
         * @param {number} row
         * @param {number} column
         * @param {number} iterator
         */
        const cameraCallback = (camera, row, column, iterator) => {
            if (camera.selected) {
                camera.color = LightFieldCamera.SELECTED_COLOR;
            } else {
                if (iterator % 3 === 0) {
                    cameraColor[2]++;
                } else if (iterator % 3 === 1) {
                    cameraColor[0]++;
                } else {
                    cameraColor[1]++;
                }
                camera.color = [...cameraColor];
            }
        };
        this.iterateCameras(cameraCallback);
    }


    /**
     * @returns {LightFieldCamera}
     */
    get selectedCamera()
    {
        let selectedCamera = null;
        this.iterateCameras((camera) => {
            if (camera.selected) {
                selectedCamera = camera;
            }
        });
        return selectedCamera;
    }


    /**
     * Returns a pair representing index of selected camera in following order: [row, column]
     * @returns {[number]}
     */
    get selectedCameraIndex()
    {
        let index = [];
        this.iterateCameras((camera, row, column) => {
            if (camera.selected) {
                index.push(row, column);
            }
        });
        return index;
    }
}



class InvalidCameraIndexException extends Error
{
    constructor(message)
    {
        super(message);
        this.name = "InvalidCameraIndexException";
    }
}