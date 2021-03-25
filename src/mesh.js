import * as twgl from "twgl.js";
import {mat4, vec2, vec3} from "gl-matrix";


/**
 * Class representing parsed object from objParser
 */
export default class Mesh
{
    /**
     * @param {[Object]} geometries
     * @param {[String]} materialLibs
     * @param {Object} materials
     */
    constructor(geometries, materialLibs, materials)
    {
        this.meshPosX = 0;
        this.meshPosY = 0;
        this.meshPosZ = 0;
        this.geometries = geometries;
        this.materials = materials;
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
        const worldInverseTransposeMatrix = mat4.create();
        mat4.invert(worldInverseTransposeMatrix, this.meshMatrix);
        mat4.transpose(worldInverseTransposeMatrix, worldInverseTransposeMatrix);
        return worldInverseTransposeMatrix;
    }


    /**
     * Calculates offset vector to get center of the object
     * @returns {vec3}
     */
    get centerOffset()
    {
        const extents = this.geometriesExtents;
        const range = vec3.create(),
            objOffset = vec3.create();

        vec3.subtract(range, extents.max, extents.min);
        vec3.scale(range, range, 0.5);
        vec3.add(range, range, extents.min);
        vec3.scale(objOffset, range, -1);
        return objOffset;
    }


    /**
     * Moves mesh to the center of world space
     */
    center() { this.position = this.centerOffset; }


    /**
     * Moves mesh to the given position
     * @param {vec3} position
     */
    move(position = this.position)
    {
        this.position = position;
        this.meshMatrix = mat4.create();
        mat4.translate(this.meshMatrix, this.meshMatrix, position);
    }


    /**
     * Gets maximum and minimum positions from an array of positions
     * @param {[]} positions
     * @returns {Object}
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
     * @returns {Object}
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
     * @returns {Object}
     */
    getBufferInfo(gl)
    {
        return this.geometries.map(({material, data}) => {
            if (data.color) {
                if (data.position.length === data.color.length) {
                    data.color = {
                        numComponents: 3,
                        data: data.color
                    };
                }
            } else {
                data.color = {value: [1, 1, 1, 1]};
            }

            data.tangent = data.texcoord && data.normal
                ? this.generateTangents(data.position, data.texcoord)
                : { value: [1, 0, 0] };
            data.texcoord ??= { value: [0, 0] };
            data.normal ??= { value: [0, 0, 1] };

            return {
                material: this.materials[material] ?? this.materials.default,
                bufferInfo: twgl.createBufferInfoFromArrays(gl, data)
            };
        });
    }


    /**
     * @param {[number]} positions
     * @returns {function(): *}
     */
    createUnindexedIterator(positions)
    {
        let ndx = 0;
        const fn = () => ndx++;
        fn.reset = () => { ndx = 0; };
        fn.numElements = positions.length / 3;
        return fn;
    }


    /**
     *
     * @param {[number]} position
     * @param {[number]} texcoord
     * @returns {[number]}
     */
    generateTangents(position, texcoord)
    {
        const getNextIndex = this.createUnindexedIterator(position);
        const numFaceVerts = getNextIndex.numElements;
        const numFaces = numFaceVerts / 3;

        const tangents = [];
        for (let i = 0; i < numFaces; i++) {
            const n1 = getNextIndex();
            const n2 = getNextIndex();
            const n3 = getNextIndex();

            const p1 = vec3.fromValues(...position.slice(n1 * 3, n1 * 3 + 3));
            const p2 = vec3.fromValues(...position.slice(n2 * 3, n2 * 3 + 3));
            const p3 = vec3.fromValues(...position.slice(n3 * 3, n3 * 3 + 3));

            const uv1 = vec2.fromValues(...texcoord.slice(n1 * 2, n1 * 2 + 2));
            const uv2 = vec2.fromValues(...texcoord.slice(n2 * 2, n2 * 2 + 2));
            const uv3 = vec2.fromValues(...texcoord.slice(n3 * 2, n3 * 2 + 2));

            const dp12 = vec3.create(),
                dp13 = vec3.create(),
                duv12 = vec2.create(),
                duv13 = vec2.create();

            vec3.subtract(dp12, p2, p1);
            vec3.subtract(dp13, p3, p1);

            vec2.subtract(duv12, uv2, uv1);
            vec2.subtract(duv13, uv3, uv1);

            const f = 1.0 / (duv12[0] * duv13[1] - duv13[0] * duv12[1]);
            const dp12Scale = vec3.create(),
                dp13Scale = vec3.create();
            vec3.scale(dp12Scale, dp12, duv13[1]);
            vec3.scale(dp13Scale, dp13, duv12[1]);
            vec3.subtract(dp12Scale, dp12Scale, dp13Scale);
            vec3.scale(dp12Scale, dp12Scale, f);
            vec3.normalize(dp12Scale, dp12Scale);

            const tangent = Number.isFinite(f)
                ? dp12Scale
                : [1, 0, 0];

            tangents.push(...tangent, ...tangent, ...tangent);
        }

        return tangents;
    }
}