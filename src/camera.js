import * as mat4 from 'gl-matrix/mat4';
import * as vec3 from 'gl-matrix/vec3';
import {glMatrix} from "gl-matrix";


/**
 * Class for handling logic around camera
 */
export default class Camera
{
    /** @type {number} */
    posX;

    /** @type {number} */
    posY;

    /** @type {number} */
    posZ;

    /** @type {number} */
    pitch;

    /** @type {number} */
    yaw;

    /** @type {vec3} */
    front;

    /** @type {vec3} */
    up;

    /** @type {mat4} */
    _matrix;

    /** @type {mat4} */
    _projectionMatrix;



    /**
     * Constructor creates camera matrix and sets initial position of the camera
     * @param {number} positionX
     * @param {number} positionY
     * @param {number} positionZ
     */
    constructor(positionX, positionY, positionZ)
    {
        this.posX = positionX;
        this.posY = positionY;
        this.posZ = positionZ;
        this.pitch = 0;
        this.yaw = -90;
        this.front = vec3.fromValues(0, 0, -1);
        this.up = vec3.fromValues(0, 1, 0);
        this._matrix = mat4.create();
    }


    /**
     * @returns {vec3} vec3 containing X, Y and Z positions of camera
     */
    get position() { return vec3.fromValues(this.posX, this.posY, this.posZ); }


    /**
     * @param {vec3} position
     */
    set position(position) { [this.posX, this.posY, this.posZ] = position; }


    /**
     * @returns {mat4}
     */
    get viewProjectionMatrix()
    {
        if (this._projectionMatrix === undefined) {
            throw new InvalidCameraStateException("Error: projection matrix must be set to get viewProjectionMatrix (use setPerspective)");
        }
        const viewProjectionMatrix = mat4.create();
        mat4.multiply(viewProjectionMatrix, this._projectionMatrix, this._matrix);
        return viewProjectionMatrix;
    }


    /**
     * @param {mat4} world
     */
    getWorldViewProjectionMatrix(world)
    {
        const worldViewProjectionMatrix = mat4.create();
        mat4.multiply(worldViewProjectionMatrix, this.viewProjectionMatrix, world);
        return worldViewProjectionMatrix;
    }


    /**
     * @returns {vec3}
     */
    get direction()
    {
        this.front = vec3.fromValues(
            Math.cos(glMatrix.toRadian(this.yaw)) * Math.cos(glMatrix.toRadian(this.pitch)),
            Math.sin(glMatrix.toRadian(this.pitch)),
            Math.sin(glMatrix.toRadian(this.yaw)) * Math.cos(glMatrix.toRadian(this.pitch))
        );
        vec3.normalize(this.front, this.front);
        const direction = vec3.create();
        vec3.add(direction, this.position, this.front);
        return direction;
    }


    /**
     * @param {number} fieldOfView
     * @param {number} aspect
     * @param {number} zNear
     * @param {number} zFar
     * @returns {Camera}
     */
    setPerspective(fieldOfView, aspect, zNear, zFar)
    {
        this._projectionMatrix = mat4.create();
        mat4.perspective(this._projectionMatrix, fieldOfView, aspect, zNear, zFar);
        return this;
    }


    /**
     * Makes camera look at given target
     * @param {vec3} target
     * @param {vec3} up
     * @returns {Camera}
     */
    lookAt(target = this.direction, up = this.up)
    {
        mat4.lookAt(this._matrix, this.position, target, up);
        return this;
    }


    /**
     * Applies translation to move camera around the scene
     * @param {vec3} position
     * @returns {Camera}
     */
    move(position = this.position)
    {
        this.position = position;
        this._matrix = mat4.create();
        mat4.translate(this._matrix, this._matrix, position);
        mat4.invert(this._matrix, this._matrix);
        return this;
    }
}



class InvalidCameraStateException extends Error
{
    constructor(message)
    {
        super(message);
        this.name = "InvalidCameraStateException";
    }
}