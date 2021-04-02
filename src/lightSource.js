import {vec3} from "gl-matrix";


/**
 * Class representing source of light in the scene
 */
export default class LightSource
{
    /** @type {number} */
    posX;

    /** @type {number} */
    posY;

    /** @type {number} */
    posZ;



    /**
     * @param {int} positionX
     * @param {int} positionY
     * @param {int} positionZ
     */
    constructor(positionX, positionY, positionZ)
    {
        this.posX = positionX;
        this.posY = positionY;
        this.posZ = positionZ;
        this.colorRed = 1;
        this.colorGreen = 1;
        this.colorBlue = 1;
    }


    /**
     * @returns {vec3}
     */
    get position() { return vec3.fromValues(this.posX, this.posY, this.posZ); }


    /**
     * @param {vec3} position
     */
    set position(position) { [this.posX, this.posY, this.posZ] = position; }


    /**
     * @returns {vec3}
     */
    get color()
    {
        const color = vec3.fromValues(this.colorRed, this.colorGreen, this.colorBlue);
        vec3.normalize(color, color);
        return color;
    }
}