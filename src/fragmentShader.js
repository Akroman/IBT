/**
 * Main fragment shader, used for rendering scene with both the normal camera and the light field cameras
 * @type {string}
 */
export const fragmentShader = `
    precision mediump float;

    varying vec3 v_normal;
    varying vec3 v_surfaceToLight;
    varying vec3 v_surfaceToView;
    varying vec4 v_color;

    uniform float u_shininess;
    uniform vec3 u_lightColor;

    void main() 
    {
        vec3 normal = normalize(v_normal);
        vec3 surfaceToLightDirection = normalize(v_surfaceToLight);
        vec3 surfaceToViewDirection = normalize(v_surfaceToView);
        vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewDirection);

        float light = dot(normal, surfaceToLightDirection);
        float specular = 0.0;
        if (light > 0.0) {
            specular = pow(dot(normal, halfVector), u_shininess);
        }
        gl_FragColor = v_color;
        gl_FragColor.rgb *= light * u_lightColor;
        gl_FragColor.rgb += specular * u_lightColor;
    }
`;


/**
 * Fragment shader without lights or textures, used for rendering light field as viewed from the normal camera
 * (there is no need to project light or textures onto the cameras)
 * @type {string}
 */
export const simpleFragmentShader = `
    precision mediump float;

    uniform vec4 u_color;

    void main() 
    {
        gl_FragColor = u_color;
    }
`;