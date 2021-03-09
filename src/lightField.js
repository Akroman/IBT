import LightFieldCamera from "./lightFieldCamera";
import {vec3} from "gl-matrix";


/**
 * Class representing light field, contains 2D array of light field cameras
 */
export default class LightField
{
    /**
     * Initializes light field with default values
     * @param {number} positionX
     * @param {number} positionY
     * @param {number} positionZ
     */
    constructor(positionX, positionY, positionZ)
    {
        this.lightFieldPosX = positionX;
        this.lightFieldPosY = positionY;
        this.lightFieldPosZ = positionZ;
        this.horizontalCamerasCount = 8;
        this.verticalCamerasCount = 8;
        this.distanceBetweenCameras = 1.5;
        this.cameraArray = [];
    }


    /**
     * @returns {vec3}
     */
    get position() { return vec3.fromValues(this.lightFieldPosX, this.lightFieldPosY, this.lightFieldPosZ); }


    /**
     * Initializes array of cameras
     * @param {number} horizontalCamerasCount
     * @param {number} verticalCamerasCount
     */
    initCameras(horizontalCamerasCount = this.horizontalCamerasCount, verticalCamerasCount = this.verticalCamerasCount)
    {
        this.cameraArray = [];
        this.horizontalCamerasCount = horizontalCamerasCount;
        this.verticalCamerasCount = verticalCamerasCount;

        const initialXPosition = this.lightFieldPosX;
        let xPosition = initialXPosition;
        let yPosition = this.lightFieldPosY;
        const zPosition = this.lightFieldPosZ;
        let lightFieldCameraPosition = vec3.fromValues(
            initialXPosition,
            yPosition,
            this.lightFieldPosZ
        );

        for (let row = 0; row < horizontalCamerasCount; row++) {
            this.cameraArray[row] = [];
            for (let column = 0; column < verticalCamerasCount; column++) {
                this.cameraArray[row][column] = new LightFieldCamera(...lightFieldCameraPosition);
                xPosition += this.distanceBetweenCameras;
                vec3.set(lightFieldCameraPosition, xPosition, yPosition, zPosition);
            }
            xPosition = initialXPosition;
            yPosition -= this.distanceBetweenCameras;
            vec3.set(lightFieldCameraPosition, xPosition, yPosition, zPosition);
        }
    }


    /**
     * Updates position of whole light field and all the light field cameras
     * @param {string} positionName
     * @param {number} value
     */
    updatePosition(positionName, value)
    {
        const coordinateType = positionName.slice(-1);
        this.iterateCameras(camera => camera['cameraPos' + coordinateType] += value - this[positionName]);
        this[positionName] = value;
    }


    /**
     * Iterates over all light field cameras and passes them to the given callback
     * @param {function} callback
     */
    iterateCameras(callback)
    {
        for (let row = 0; row < this.horizontalCamerasCount; row++) {
            for (let column = 0; column < this.verticalCamerasCount; column++) {
                callback(this.getCamera(row, column), row, column);
            }
        }
    }


    /**
     * @param {number} row
     * @param {number} column
     * @returns {LightFieldCamera}
     */
    getCamera(row, column) { return this.cameraArray[row][column]; }


    /**
     * @param {number} row
     * @param {number} column
     */
    setSelectedCamera(row, column)
    {
        this.selectedCamera.selected = false;
        this.getCamera(row, column).selected = true;
    }


    /**
     * @returns {LightFieldCamera}
     */
    get selectedCamera()
    {
        let selectedCamera;
        this.iterateCameras((camera) => {
            if (camera.selected) {
                selectedCamera = camera;
            }
        });
        return selectedCamera;
    }
}