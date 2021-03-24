/**
 * Main vertex shader, used for rendering scene with both the normal camera and the light field cameras
 * @type {string}
 */
export const vertexShader = `
    attribute vec4 position;
    attribute vec4 color;
    attribute vec3 normal;
    attribute vec3 tangent;
    attribute vec2 texcoord;

    uniform vec3 u_lightWorldPosition;
    uniform vec3 u_viewWorldPosition;
    uniform mat4 u_world;
    uniform mat4 u_worldViewProjection;
    uniform mat4 u_worldInverseTranspose;

    varying vec2 v_texcoord;
    varying vec3 v_tangent;
    varying vec3 v_normal;
    varying vec3 v_surfaceToLight;
    varying vec3 v_surfaceToView;
    varying vec4 v_color;

    void main() 
    {
        /** Multiply the position by the matrix */
        gl_Position = u_worldViewProjection * position;

        /** Orient the normals and pass to the fragment shader */
        mat3 normalMat = mat3(u_worldInverseTranspose);
        v_normal = normalize(normalMat * normal);
        v_tangent = normalize(normalMat * tangent);

        /** Compute the world position of the surface */
        vec3 surfaceWorldPosition = (u_world * position).xyz;

        /** 
         * Compute the vector of the surface to the light
         * And pass it to the fragment shader  
         */
        v_surfaceToLight = u_lightWorldPosition - surfaceWorldPosition;
        v_surfaceToView = u_viewWorldPosition - surfaceWorldPosition;
        v_color = color;
        v_texcoord = texcoord;
    }
`;


/**
 * Vertex shader without lights and textures, used for rendering light field as viewed from the normal camera
 * (there is no need to project light or textures onto the cameras)
 * @type {string}
 */
export const simpleVertexShader = `
    attribute vec4 position;

    uniform mat4 u_worldViewProjection;

    void main() 
    {
        /** Multiply the position by the matrix */
        gl_Position = u_worldViewProjection * position;
    }
`;