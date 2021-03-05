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
     * @param {int} positionX
     * @param {int} positionY
     * @param {int} positionZ
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
     * @returns {mat4}
     */
    get viewMatrix() { return mat4.invert(this.cameraMatrix, this.cameraMatrix); }


    /**
     * @returns {mat4}
     */
    get viewProjectionMatrix()
    {
        if (this.projectionMatrix === undefined) {
            throw new InvalidCameraStateException("Error: projection matrix must be set to get viewProjectionMatrix (either use setPerspective or setOrthographic");
        }
        let viewProjectionMatrix = mat4.create();
        mat4.multiply(viewProjectionMatrix, this.projectionMatrix, this.viewMatrix);
        return viewProjectionMatrix;
    }


    /**
     * @returns {vec3}
     */
    get direction()
    {
        let frontVector = vec3.fromValues(
            Math.cos(glMatrix.toRadian(this.cameraYaw)) * Math.cos(glMatrix.toRadian(this.cameraPitch)),
            Math.sin(glMatrix.toRadian(this.cameraPitch)),
            Math.sin(glMatrix.toRadian(this.cameraYaw)) * Math.cos(glMatrix.toRadian(this.cameraPitch))
        );
        let lookAtVector = vec3.create();
        vec3.normalize(lookAtVector, frontVector);
        vec3.add(lookAtVector, lookAtVector, this.position);
        return lookAtVector;
    }


    /**
     * @param {int} fieldOfView
     * @param {int} aspect
     * @param {int} zNear
     * @param {int} zFar
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
    lookAt(target, up)
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
        [this.cameraPosX, this.cameraPosY, this.cameraPosZ] = position;
        mat4.translate(this.cameraMatrix, this.cameraMatrix, position);
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