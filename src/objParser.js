/**
 * Class for parsing data from .obj files
 */
export default class ObjParser
{
    /**
     * Constructor initializes all arrays and variables that hold parsed values from .obj file
     */
    constructor()
    {
        this.objPositions = [[0, 0, 0]];
        this.objTexcoords = [[0, 0]];
        this.objNormals = [[0, 0, 0]];
        this.objColors = [[0, 0, 0]];
        this.objVertexData = [
            this.objPositions,
            this.objTexcoords,
            this.objNormals,
            this.objColors
        ];
        this.webglVertexData = [
            [],   // positions
            [],   // texcoords
            [],   // normals
            []    // colors
        ];

        this.geometries = [];
        this.materialLibs = [];
        this.material = 'default';
        this.object = 'default';
    }


    /**
     * Main function of this class, returns object with data ready to be passed for WebGL
     * @param {string} objText
     * @returns {object} Object with data for WebGL
     */
    parseObj(objText)
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
            const parts = line.split(/\s+/).slice(1);
            this.addObjData(keyword, parts, unparsedArguments);
        }

        /** Cycle through geometry data and remove any empty elements (eg. remove empty texcoords, etc.) */
        for (const geometry of this.geometries) {
            geometry.data = Object.fromEntries(Object.entries(geometry.data).filter(([, array]) => array.length > 0));
        }

        return {
            geometries: this.geometries,
            materialLibs: this.materialLibs,
            extents: this.geometriesExtents
        };
    }


    /**
     * Takes care of parsing single lines of .obj file
     * @param {string} keyword - keyword from the line beginning
     * @param {array} data - array containing elements from rest of the line (after the keyword)
     * @param {string} unparsedArguments - string containing rest of the line (after the keyword), this is used only for materials or objects
     */
    addObjData(keyword, data, unparsedArguments)
    {
        switch (keyword) {
            case 'v':
                if (data.length > 3) {
                    this.objPositions.push(data.slice(0, 3).map(parseFloat));
                    this.objColors.push(data.slice(3).map(parseFloat));
                } else {
                    this.objPositions.push(data.map(parseFloat));
                }
                break;
            case 'vn':
                this.objNormals.push(data.map(parseFloat));
                break;
            case 'vt':
                this.objTexcoords.push(data.map(parseFloat));
                break;
            case 'f':
                this.setGeometry();
                const trianglesCount = data.length - 2;
                for (let triangle = 0; triangle < trianglesCount; triangle++) {
                    this.addVertex(data[0]);
                    this.addVertex(data[triangle + 1]);
                    this.addVertex(data[triangle + 2]);
                }
                break;
            case 'usemtl':
                this.material = unparsedArguments;
                this.newGeometry();
                break;
            case 'mtllib':
                this.materialLibs.push(unparsedArguments);
                this.newGeometry();
                break;
            case 'o':
                this.object = unparsedArguments;
                break;
            default:

        }
    }


    /**
     * @param {string} vertex
     */
    addVertex(vertex)
    {
        const parts = vertex.split('/');
        parts.forEach((objIndex, i) => {
            if (!objIndex) {
                return;
            }

            objIndex = parseInt(objIndex);
            const index = objIndex + (objIndex >= 0 ? 0 : this.objVertexData[i].length);
            this.webglVertexData[i].push(...this.objVertexData[i][index]);

            if (i === 0 && this.objColors.length > 1) {
                this.geometry.data.color.push(...this.objColors[index]);
            }
        });
    }


    /**
     * Resets geometry, gets called everytime the parser runs into mtllib or usemtl keyword
     */
    newGeometry()
    {
        if (this.geometry !== undefined && this.geometry.data.position.length) {
            this.geometry = undefined;
        }
    }


    /**
     * Initializes geometry, parser calls this function everytime it runs into an f keyword, because there might be .obj files without usemtl keyword
     * Geometry holds object name, material name and data object, which consists of positions, texcoord and normals
     */
    setGeometry()
    {
        if (!this.geometry) {
            const position = [];
            const texcoord = [];
            const normal = [];
            const color = [];
            this.webglVertexData = [
                position,
                texcoord,
                normal,
                color
            ];
            this.geometry = {
                object: this.object,
                material: this.material,
                data: {
                    position,
                    texcoord,
                    normal,
                    color
                }
            };
            this.geometries.push(this.geometry);
        }
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
     * Loops over all geometries that are currently held in the parser and gets extents for all the parts
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
}