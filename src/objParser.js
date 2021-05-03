/**
 * @author Matěj Hlávka
 * @module ObjParser
 */


import Mesh from "./mesh";
import Utils from "./utils";


/**
 * Class for parsing data from .obj files
 */
export default class ObjParser
{
    /**
     * @type {WebGLRenderingContext}
     * @private
     */
    #gl;

    /**
     * @type {Array.<number[]>}
     * @private
     */
    #objPositions;

    /**
     * @type {Array.<number[]>}
     * @private
     */
    #objTexcoords;

    /**
     * @type {Array.<number[]>}
     * @private
     */
    #objNormals;

    /**
     * @type {Array.<number[]>}
     * @private
     */
    #objColors;

    /**
     * @type {Array.<Array.<number[]>>}
     * @private
     */
    #objVertexData;

    /**
     * @type {Array.<number[]>}
     * @private
     */
    #webglVertexData;

    /**
     * @type {Object}
     * @private
     */
    #geometry;

    /**
     * @type {Object[]}
     * @private
     */
    #geometries;

    /**
     * @type {string[]}
     * @private
     */
    #materialLibs;

    /**
     * @type {string}
     * @private
     */
    #material;

    /**
     * @type {Object}
     * @private
     */
    #materialObject;

    /**
     * @type {Object}
     * @private
     */
    #materials;

    /**
     * @type {string}
     * @private
     */
    #object;



    /**
     * Constructor initializes all arrays and variables that hold parsed values from .obj file
     * @param {WebGLRenderingContext} gl
     */
    constructor(gl)
    {
        this.#gl = gl;
        this.init();
    }


    /**
     * Initiates all class variables to default values
     */
    init()
    {
        this.#objPositions = [[0, 0, 0]];
        this.#objTexcoords = [[0, 0]];
        this.#objNormals = [[0, 0, 0]];
        this.#objColors = [[0, 0, 0]];
        this.#objVertexData = [
            this.#objPositions,
            this.#objTexcoords,
            this.#objNormals,
            this.#objColors
        ];
        this.#webglVertexData = [
            [],   // positions
            [],   // texcoords
            [],   // normals
            []    // colors
        ];

        this.#newGeometry();
        this.#geometries = [];
        this.#materialLibs = [];
        this.#material = 'default';
        this.#materialObject = {};
        this.#materials = {
            default: {
                u_diffuse: [1, 1, 1],
                u_ambient: [0, 0, 0],
                u_specular: [1, 1, 1],
                u_shininess: 400,
                u_opacity: 1,
                u_diffuseMap: Utils.create1PixelTexture(this.#gl, [255, 255, 255, 255]),
                u_specularMap: Utils.create1PixelTexture(this.#gl, [255, 255, 255, 255]),
                u_normalMap: Utils.create1PixelTexture(this.#gl, [127, 127, 255, 0])
            }
        };
        this.#object = 'default';
    }


    /**
     * Main function of this class, returns object with data ready to be passed for WebGL
     * @param {string} objText
     * @param {Object[]} textures
     * @returns {Mesh}
     */
    parseObj(objText, textures = [])
    {
        const keywordRegex = /(\w*)(?: )*(.*)/;
        /** Split text by new lines and iterate over the array */
        const lines = objText.split('\n');
        for (const line of lines) {
            /** Skip comments and empty lines */
            if (line === '' || line.startsWith('#')) {
                continue;
            }

            /** Check if line matches regex, if not, continue */
            const match = keywordRegex.exec(line);
            if (!match) {
                continue;
            }
            const [, keyword, unparsedArguments] = match;
            const parts = line.split(/\s+/).slice(1).filter((value ) => value !== "");
            this.#addObjData(keyword, parts, unparsedArguments);
        }

        /** Cycle through geometry data and remove any empty elements (eg. remove empty texcoords, etc.) */
        for (const geometry of this.#geometries) {
            geometry.data = Object.fromEntries(Object.entries(geometry.data).filter(([, array]) => array.length > 0));
        }

        const textureNames = textures.map((textureObject) => Object.keys(textureObject)[0]);
        for (const material of Object.values(this.#materials)) {
            /** First iterate over all maps and find appropriate texture in textures */
            Object.entries(material)
                .filter(([key]) => key.endsWith("Map"))
                .filter(([key, fileName]) => textureNames.includes(fileName))
                .forEach(([key, fileName]) => {
                    material[key] = textures.filter((textureObject) => textureObject[fileName])[0][fileName];
                });

            /** Then iterate over the maps again and fill in default texture for those that don't have any texture assigned */
            Object.entries(material)
                .filter(([key]) => key.endsWith("Map"))
                .filter(([key, fileName]) => !textureNames.includes(fileName) && !(fileName instanceof WebGLTexture))
                .forEach(([key]) => {
                    material[key] = this.#materials.default[key];
                });
        }

        return new Mesh(this.#geometries, this.#materialLibs, this.#materials);
    }


    /**
     * Takes care of parsing single lines of .obj file
     * @param {string} keyword - keyword from the line beginning
     * @param {array} data - array containing elements from rest of the line (after the keyword)
     * @param {string} unparsedArguments - string containing rest of the line (after the keyword), this is used only for materials or objects
     */
    #addObjData(keyword, data, unparsedArguments)
    {
        switch (keyword) {
            /** Keywords from .obj files */
            case 'v':
                if (data.length > 3) {
                    this.#objPositions.push(data.slice(0, 3).map(parseFloat));
                    this.#objColors.push(data.slice(3).map(parseFloat));
                } else {
                    this.#objPositions.push(data.map(parseFloat));
                }
                break;
            case 'vn':
                this.#objNormals.push(data.map(parseFloat));
                break;
            case 'vt':
                if (data.length === 2) {
                    this.#objTexcoords.push(data.map(parseFloat));
                }
                break;
            case 'f':
                this.#setGeometry();
                const trianglesCount = data.length - 2;
                for (let triangle = 0; triangle < trianglesCount; triangle++) {
                    this.#addVertex(data[0]);
                    this.#addVertex(data[triangle + 1]);
                    this.#addVertex(data[triangle + 2]);
                }
                break;
            case 'usemtl':
                this.#material = unparsedArguments;
                this.#newGeometry();
                break;
            case 'mtllib':
                this.#materialLibs.push(unparsedArguments);
                this.#newGeometry();
                break;
            case 'o':
                this.#object = unparsedArguments;
                this.#newGeometry();
                break;

            /** Keywords from .mtl files */
            case 'newmtl':
                this.#materialObject = JSON.parse(JSON.stringify(this.#materials.default));
                this.#materials[unparsedArguments] = this.#materialObject;
                break;
            case 'Ns':
                this.#materialObject.u_shininess = parseFloat(data[0]);
                break;
            case 'Ka':
                this.#materialObject.u_ambient = data.map(parseFloat);
                break;
            case 'Kd':
                this.#materialObject.u_diffuse = data.map(parseFloat);
                break;
            case 'Ks':
                this.#materialObject.u_specular = data.map(parseFloat);
                break;
            case 'Ke':
                this.#materialObject.u_emissive = data.map(parseFloat);
                break;
            case 'Ni':
                this.#materialObject.u_opticalDensity = parseFloat(data[0]);
                break;
            case 'd':
                this.#materialObject.u_opacity = parseFloat(data[0]);
                break;
            case 'illum':
                this.#materialObject.u_illum = parseInt(data[0]);
                break;
            case 'map_Kd':
                this.#materialObject.u_diffuseMap = data[data.length - 1];
                break;
            case 'map_Ns':
                this.#materialObject.u_specularMap = data[data.length - 1];
                break;
            case 'mapBump':
                this.#materialObject.u_normalMap = data[data.length - 1];
                break;
            default:
                break;
        }
    }


    /**
     * @param {string} vertex
     */
    #addVertex(vertex)
    {
        vertex.split('/')
            .filter((value) => value !== "")
            .forEach((objIndex, i) => {
                objIndex = parseInt(objIndex);
                const index = objIndex + (objIndex >= 0 ? 0 : this.#objVertexData[i].length);
                this.#webglVertexData[i].push(...this.#objVertexData[i][index]);
                if (i === 0 && this.#objColors.length > 1) {
                    this.#geometry.data.color.push(...this.#objColors[index]);
                }
            });
    }


    /**
     * Resets geometry, gets called everytime the parser runs into mtllib or usemtl keyword
     */
    #newGeometry()
    {
        if (this.#geometry !== undefined && this.#geometry.data.position.length) {
            this.#geometry = undefined;
        }
    }


    /**
     * Initializes geometry, parser calls this function everytime it runs into an f keyword, because there might be .obj files without usemtl keyword
     * Geometry holds object name, material name and data object, which consists of positions, texcoord and normals
     */
    #setGeometry()
    {
        if (!this.#geometry) {
            const position = [];
            const texcoord = [];
            const normal = [];
            const color = [];
            this.#webglVertexData = [
                position,
                texcoord,
                normal,
                color
            ];
            this.#geometry = {
                object: this.#object,
                material: this.#material,
                data: {
                    position,
                    texcoord,
                    normal,
                    color
                }
            };
            this.#geometries.push(this.#geometry);
        }
    }
}