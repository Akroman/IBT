import SceneObject from "./sceneObject";
import Utils from "./utils";


/**
 * Class representing source of light in the scene
 */
export default class LightSource extends SceneObject
{
    /** @type {[number]}
    color;



    /**
     * @param {int} positionX
     * @param {int} positionY
     * @param {int} positionZ
     */
    constructor(positionX, positionY, positionZ)
    {
        super(positionX, positionY, positionZ);
        this.color = [255, 255, 255];
    }


    /**
     * @returns {[number]}
     */
    get scaledColor()
    {
        return this.color.map((value) => Utils.convertRange(value, [0, 255], [0, 1]));
    }
}