/**
 * @author Matěj Hlávka
 * @module Utils
 */


/**
 * Class containing various static helper methods
 */
export default class Utils
{
    /**
     * Converts value from one range to another
     * @param {number} value Value to be converted from one range to another
     * @param {number[]} fromRange Array of two numbers - minimum and maximum (range, that the number is currently in)
     * @param {number[]} toRange Array of two numbers - minimum and maximum (range, that the number is to be converted to)
     * @returns {number} Value converted from range fromRange to range toRange
     */
    static convertRange(value, fromRange, toRange)
    {
        return (value - fromRange[0]) * (toRange[1] - toRange[0]) / (fromRange[1] - fromRange[0]) + toRange[0];
    }


    /**
     * @param {number} value
     * @returns {boolean}
     */
    static isPowerOf2(value)
    {
        return (value & (value - 1)) === 0;
    }


    /**
     * Creates texture from supplied pixel
     * @param {WebGLRenderingContext} gl
     * @param {number[]} pixel
     * @returns {WebGLTexture}
     */
    static create1PixelTexture(gl, pixel)
    {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            1,
            1,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array(pixel)
        );
        return texture;
    }


    /**
     * Checks if all items in two arrays are equal
     * @param {Array} firstArray
     * @param {Array} secondArray
     * @return {boolean}
     */
    static arrayEquals(firstArray, secondArray)
    {
        return firstArray.length === secondArray.length
            && firstArray.every((val, index) => val === secondArray[index]);
    }


    /**
     * Creates pair of light field progress bar container and light field progress bar
     * @return {HTMLDivElement[]}
     */
    static createLightFieldProgressBar()
    {
        const progressBarContainer = document.createElement("div")
        progressBarContainer.className = "progress";
        progressBarContainer.id = "lightFieldProgressBarContainer";

        const progressBar = document.createElement("div");
        progressBar.className = "progress-bar bg-secondary";
        progressBar.id = "lightFieldProgressBar";
        progressBar.style.width = "0";

        progressBarContainer.appendChild(progressBar);
        document.getElementById("lightFieldProgressContainer").appendChild(progressBarContainer);
        return [progressBarContainer, progressBar];
    }


    /**
     * Converts hexadecimal string color to array representing RGB color
     * @param hex
     * @return {number[]|null}
     */
    static hexToRgb(hex)
    {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : null;
    }


    /**
     * Converts RGB color to string hexadecimal representation of the color
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @return {string}
     */
    static rgbToHex(r, g, b)
    {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
}