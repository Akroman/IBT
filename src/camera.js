/**
 * @author Matěj Hlávka
 * @module Camera
 */


import * as mat4 from 'gl-matrix/mat4';
import * as vec3 from 'gl-matrix/vec3';
import {glMatrix} from "gl-matrix";
import SceneObject from "./sceneObject";


/**
 * Class for handling logic around camera
 * @extends SceneObject
 */
export default class Camera extends SceneObject
{
    /**
     * @type {vec3}
     * @static
     * @constant
     */
    static defaultPosition = vec3.fromValues(0, 0, 30);

    /**
     * @type {number}
     * @static
     * @constant
     */
    static defaultPitch = 0;

    /**
     * @type {number}
     * @static
     * @constant
     */
    static defaultYaw = -90;

    /** @type {number} */
    pitch;

    /** @type {number} */
    yaw;

    /** @type {vec3} */
    front;

    /** @type {vec3} */
    up;

    /** @type {mat4} */
    _projectionMatrix;



    /**
     * @param {number} positionX
     * @param {number} positionY
     * @param {number} positionZ
     */
    constructor(positionX, positionY, positionZ)
    {
        super(positionX, positionY, positionZ);
        this.pitch = Camera.defaultPitch;
        this.yaw = Camera.defaultYaw;
        this.front = vec3.fromValues(0, 0, -1);
        this.up = vec3.fromValues(0, 1, 0);
    }


    /**
     * @returns {mat4}
     */
    get viewProjectionMatrix()
    {
        if (this._projectionMatrix === undefined) {
            throw new InvalidCameraStateException("Error: projection matrix must be set to get viewProjectionMatrix (use setPerspective)");
        }
        const viewProjectionMatrix = mat4.create();
        mat4.multiply(viewProjectionMatrix, this._projectionMatrix, this.matrix);
        return viewProjectionMatrix;
    }


    /**
     * @param {mat4} world
     * @returns {mat4}
     */
    getWorldViewProjectionMatrix(world)
    {
        const worldViewProjectionMatrix = mat4.create();
        mat4.multiply(worldViewProjectionMatrix, this.viewProjectionMatrix, world);
        return worldViewProjectionMatrix;
    }


    /**
     * Creates direction vector that camera is looking at from pitch and yaw values
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
        mat4.lookAt(this.matrix, this.position, target, up);
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
        mat4.translate(this.matrix, this.matrix, position);
        mat4.invert(this.matrix, this.matrix);
        return this;
    }
}


/**
 * Class representing exception when camera operations are handled in wrong order
 * eg. camera is set to perspective before creating projection matrix
 */
class InvalidCameraStateException extends Error
{
    constructor(message)
    {
        super(message);
        this.name = "InvalidCameraStateException";
    }
}