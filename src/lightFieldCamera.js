import Camera from "./camera";
import * as twgl from 'twgl.js';
import {mat4} from "gl-matrix";


/**
 * Class representing single camera in a light field
 */
export default class LightFieldCamera extends Camera
{
    /**
     * @param {number} positionX
     * @param {number} positionY
     * @param {number} positionZ
     */
    constructor(positionX, positionY, positionZ)
    {
        super(positionX, positionY, positionZ);
        this.selected = false;
    }


    /**
     * Method to get buffer info for a camera
     * @param {WebGLRenderingContext} gl
     * @param {number} scale
     * @returns {BufferInfo}
     */
    static getBufferInfo(gl, scale = 1)
    {
        const positions = [
            -1, -1, 1,  // Cube vertices
             1, -1, 1,
            -1,  1, 1,
             1,  1, 1,
            -1, -1, 3,
             1, -1, 3,
            -1,  1, 3,
             1,  1, 3,
             0,  0, 1,  // Cone tip
        ];
        const indices = [
            0, 1, 1, 3, 3, 2, 2, 0, // Cube indices
            4, 5, 5, 7, 7, 6, 6, 4,
            0, 4, 1, 5, 3, 7, 2, 6,
        ];
        /** Add cone segments */
        const numSegments = 6;
        const coneBaseIndex = positions.length / 3;
        const coneTipIndex = coneBaseIndex - 1;
        for (let i = 0; i < numSegments; ++i) {
            const u = i / numSegments;
            const angle = u * Math.PI * 2;
            const x = Math.cos(angle);
            const y = Math.sin(angle);
            positions.push(x, y, 0);
            /** Line from tip to edge */
            indices.push(coneTipIndex, coneBaseIndex + i);
            /** Line from point on edge to next point on edge */
            indices.push(coneBaseIndex + i, coneBaseIndex + (i + 1) % numSegments);
        }
        positions.forEach((v, ndx) => {
            positions[ndx] *= scale;
        });
        return twgl.createBufferInfoFromArrays(gl, {
            position: positions,
            indices
        });
    }


    /**
     * @returns {mat4}
     */
    get positionMatrix()
    {
        let matrix = mat4.create();
        mat4.translate(matrix, matrix, this.position);
        return matrix;
    }
}