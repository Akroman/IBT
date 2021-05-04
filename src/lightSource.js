/**
 * @author Matěj Hlávka
 * @module LightSource
 */


import SceneObject from "./sceneObject";
import Utils from "./utils";
import * as vec3 from 'gl-matrix/vec3';


/**
 * Class representing source of light in the scene
 * @extends SceneObject
 */
export default class LightSource extends SceneObject
{
    /**
     * @type {vec3}
     * @static
     * @constant
     */
    static defaultPosition = vec3.fromValues(0, 0, 30);

    /** @type {number[]} */
    color;



    /**
     * @param {number} positionX
     * @param {number} positionY
     * @param {number} positionZ
     */
    constructor(positionX, positionY, positionZ)
    {
        super(positionX, positionY, positionZ);
        this.color = [255, 255, 255];
    }


    /**
     * @returns {number[]}
     */
    get scaledColor()
    {
        return this.color.map((value) => Utils.convertRange(value, [0, 255], [0, 1]));
    }
}