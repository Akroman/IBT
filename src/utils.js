export default class Utils
{
    /**
     * Converts value from one range to another
     * @param {number} value Value to be converted from one range to another
     * @param {[number]} fromRange Array of two numbers - minimum and maximum (range, that the number is currently in)
     * @param {[number]} toRange Array of two numbers - minimum and maximum (range, that the number is to be converted to)
     * @returns {number} Value converted from range fromRange to range toRange
     */
    static convertRange(value, fromRange, toRange)
    {
        return (value - fromRange[0]) * (toRange[1] - toRange[0]) / (fromRange[1] - fromRange[0]) + toRange[0];
    }


    /**
     * Creates canvas with given width and height
     * @param {number} width
     * @param {number} height
     * @returns {HTMLCanvasElement}
     */
    static createCanvas(width, height)
    {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }
}