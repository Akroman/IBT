import * as mat4 from 'gl-matrix/mat4';
import * as vec3 from 'gl-matrix/vec3';
import {glMatrix} from "gl-matrix";


/**
 * Class for handling logic around camera
 */
export default class Camera
{
    /**
     * Constructor creates camera matrix and sets initial position of the camera
     * @param {number} positionX
     * @param {number} positionY
     * @param {number} positionZ
     */
    constructor(positionX, positionY, positionZ)
    {
        this.cameraPosX = positionX;
        this.cameraPosY = positionY;
        this.cameraPosZ = positionZ;
        this.cameraPitch = 0;
        this.cameraYaw = 0;
        this.cameraMatrix = mat4.create();
    }


    /**
     * @returns {vec3} vec3 containing X, Y and Z positions of camera
     */
    get position() { return vec3.fromValues(this.cameraPosX, this.cameraPosY, this.cameraPosZ); }


    /**
     * @param {vec3} position
     */
    set position(position) { [this.cameraPosX, this.cameraPosY, this.cameraPosZ] = position; }


    /**
     * @returns {mat4}
     */
    get viewProjectionMatrix()
    {
        if (this.projectionMatrix === undefined) {
            throw new InvalidCameraStateException("Error: projection matrix must be set to get viewProjectionMatrix (use setPerspective)");
        }
        let viewProjectionMatrix = mat4.create();
        mat4.multiply(viewProjectionMatrix, this.projectionMatrix, this.cameraMatrix);
        return viewProjectionMatrix;
    }


    /**
     * @param {mat4} world
     */
    getWorldViewProjectionMatrix(world)
    {
        let worldViewProjectionMatrix = mat4.create();
        mat4.multiply(worldViewProjectionMatrix, this.viewProjectionMatrix, world);
        return worldViewProjectionMatrix;
    }


    /**
     * @param {mat4} world
     */
    getWorldInverseTransposeMatrix(world)
    {
        let worldInverseTransposeMatrix = mat4.create();
        mat4.invert(world, world);
        mat4.transpose(worldInverseTransposeMatrix, world);
        return worldInverseTransposeMatrix;
    }


    /**
     * @returns {vec3}
     */
    get direction()
    {
        let front = vec3.fromValues(
            Math.cos(glMatrix.toRadian(this.cameraYaw)) * Math.cos(glMatrix.toRadian(this.cameraPitch)),
            Math.sin(glMatrix.toRadian(this.cameraPitch)),
            Math.sin(glMatrix.toRadian(this.cameraYaw)) * Math.cos(glMatrix.toRadian(this.cameraPitch))
        );
        vec3.normalize(front, front);
        let direction = vec3.create();
        vec3.add(direction, this.position, front);
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
        this.projectionMatrix = mat4.create();
        mat4.perspective(this.projectionMatrix, fieldOfView, aspect, zNear, zFar);
        return this;
    }


    /**
     * Makes camera look at given target
     * @param {vec3} target
     * @param {vec3} up
     * @returns {Camera}
     */
    lookAt(target, up = vec3.fromValues(0, 1.0, 0))
    {
        mat4.lookAt(this.cameraMatrix, this.position, target, up);
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
        this.cameraMatrix = mat4.create();
        mat4.translate(this.cameraMatrix, this.cameraMatrix, position);
        mat4.invert(this.cameraMatrix, this.cameraMatrix);
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