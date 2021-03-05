/**
 *
 */
import {vec3} from "gl-matrix";

export default class LightSource
{
    /**
     * @param {int} positionX
     * @param {int} positionY
     * @param {int} positionZ
     */
    constructor(positionX, positionY, positionZ)
    {
        this.lightPosX = positionX;
        this.lightPosY = positionY;
        this.lightPosZ = positionZ;
        this.lightColorRed = 1;
        this.lightColorGreen = 1;
        this.lightColorBlue = 1;
    }


    /**
     * @returns {vec3}
     */
    get position() { return vec3.fromValues(this.lightPosX, this.lightPosY, this.lightPosZ); }


    /**
     * @param {vec3} position
     */
    set position(position) { [this.lightPosX, this.lightPosY, this.lightPosZ] = position; }


    /**
     * @returns {vec3}
     */
    get color()
    {
        let color = vec3.fromValues(this.lightColorRed, this.lightColorGreen, this.lightColorBlue);
        vec3.normalize(color, color);
        return color;
    }
}