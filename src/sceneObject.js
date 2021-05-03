/**
 * @author Matěj Hlávka
 * @module SceneObject
 */


import {mat4} from "gl-matrix";
import * as vec3 from "gl-matrix/cjs/vec3";


/**
 * Base class for all scene objects
 */
export default class SceneObject
{
    /** @type {number} */
    posX;

    /** @type {number} */
    posY;

    /** @type {number} */
    posZ;

    /** @type {mat4} */
    matrix;



    /**
     * @param {number} positionX
     * @param {number} positionY
     * @param {number} positionZ
     */
    constructor(positionX, positionY, positionZ)
    {
        this.posX = positionX;
        this.posY = positionY;
        this.posZ = positionZ;
        this.matrix = mat4.create();
    }


    /**
     * Creates matrix representing the object
     */
    createMatrix()
    {
        this.matrix = mat4.create();
        return this;
    }


    /**
     * @returns {vec3} vec3 containing X, Y and Z positions of camera
     */
    get position() { return vec3.fromValues(this.posX, this.posY, this.posZ); }


    /**
     * @param {vec3} position
     */
    set position(position) { [this.posX, this.posY, this.posZ] = position; }
}