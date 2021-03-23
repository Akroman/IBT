/**
 * Main fragment shader, used for rendering scene with both the normal camera and the light field cameras
 * @type {string}
 */
export const fragmentShader = `
    precision highp float;

    varying vec3 v_normal;
    varying vec3 v_surfaceToLight;
    varying vec3 v_surfaceToView;
    varying vec4 v_color;

    uniform vec3 u_diffuse;
    uniform vec3 u_ambient;
    uniform vec3 u_emissive;
    uniform vec3 u_specular;
    uniform float u_shininess;
    uniform float u_opacity;
    uniform vec3 u_ambientLight;
    uniform vec3 u_lightColor;

    void main() 
    {
        vec3 normal = normalize(v_normal);
        vec3 surfaceToLightDirection = normalize(v_surfaceToLight);
        vec3 surfaceToViewDirection = normalize(v_surfaceToView);
        vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewDirection);

        float light = dot(normal, surfaceToLightDirection);
        float specularLight = clamp(dot(normal, halfVector), 0.0, 1.0);
        
        vec3 effectiveDiffuse = u_diffuse * v_color.rgb;
        float effectiveOpacity = u_opacity * v_color.a;

        gl_FragColor = vec4(
            u_emissive + u_ambient * u_ambientLight + effectiveDiffuse * light + u_specular * pow(specularLight, u_shininess),
            effectiveOpacity
        );
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