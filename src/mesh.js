import * as twgl from "twgl.js";
import {mat4, vec3} from "gl-matrix";


/**
 * Class representing parsed object from objParser
 */
export default class Mesh
{
    /**
     * @param {[Object]} geometries
     * @param {[Object]} materialLibs
     */
    constructor(geometries, materialLibs)
    {
        this.meshPosX = 0;
        this.meshPosY = 0;
        this.meshPosZ = 0;
        this.geometries = geometries;
        this.materialLibs = materialLibs;
        this.meshMatrix = mat4.create();
        this.center();
    }


    /**
     * @returns {vec3}
     */
    get position() { return vec3.fromValues(this.meshPosX, this.meshPosY, this.meshPosZ); }


    /**
     * @param {vec3} position
     */
    set position(position) { [this.meshPosX, this.meshPosY, this.meshPosZ] = position; }


    /**
     * @returns {mat4}
     */
    get inverseTransposeMatrix()
    {
        let worldInverseTransposeMatrix = mat4.create();
        mat4.invert(worldInverseTransposeMatrix, this.meshMatrix);
        mat4.transpose(worldInverseTransposeMatrix, worldInverseTransposeMatrix);
        return worldInverseTransposeMatrix;
    }


    /**
     * Moves mesh to the center of world space
     */
    center()
    {
        const extents = this.geometriesExtents;
        let range = vec3.create(),
            objOffset = vec3.create();

        vec3.subtract(range, extents.max, extents.min);
        vec3.scale(range, range, 0.5);
        vec3.add(range, range, extents.min);
        vec3.scale(objOffset, range, -1);

        this.position = objOffset;
    }


    /**
     * Moves mesh to the given position
     * @param {vec3} position
     */
    move(position = this.position)
    {
        this.position = position;
        console.log(this.position);
        mat4.translate(this.meshMatrix, this.meshMatrix, position);
    }


    /**
     * Gets maximum and minimum positions from an array of positions
     * @param {[]} positions
     */
    getExtents(positions)
    {
        const min = positions.slice(0, 3);
        const max = positions.slice(0, 3);
        for (let positionsIndex = 3; positionsIndex < positions.length; positionsIndex += 3) {
            for (let positionVertexIterator = 0; positionVertexIterator < 3; positionVertexIterator++) {
                const vertex = positions[positionsIndex + positionVertexIterator];
                min[positionVertexIterator] = Math.min(vertex, min[positionVertexIterator]);
                max[positionVertexIterator] = Math.max(vertex, max[positionVertexIterator]);
            }
        }
        return {min, max};
    }


    /**
     * Loops over all geometries and gets extents for all the parts
     */
    get geometriesExtents()
    {
        return this.geometries.reduce(({min, max}, {data}) => {
            const minMax = this.getExtents(data.position);
            return {
                min: min.map((min, index) => Math.min(minMax.min[index], min)),
                max: max.map((max, index) => Math.max(minMax.max[index], max))
            };
        }, {
            min: Array(3).fill(Number.POSITIVE_INFINITY),
            max: Array(3).fill(Number.NEGATIVE_INFINITY)
        });
    }


    /**
     * Iterates over geometries and maps colors
     * @param gl
     * @returns {BufferInfo[]}
     */
    getBufferInfo(gl)
    {
        return this.geometries.map(({data}) => {
            if (data.color) {
                if (data.position.length === data.color.length) {
                    data.color = {
                        numComponents: 3,
                        data: data.color
                    };
                }
            } else {
                data.color = {value: [0, 0.7, 0, 1]};
            }

            return twgl.createBufferInfoFromArrays(gl, data);
        });
    }
}