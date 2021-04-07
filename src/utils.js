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
     * @param {[number]} pixel
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


    static arrayEquals(firstArray, secondArray)
    {
        return firstArray.length === secondArray.length
            && firstArray.every((val, index) => val === secondArray[index]);
    }
}