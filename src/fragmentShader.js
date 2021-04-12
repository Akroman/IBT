/**
 * Main fragment shader, used for rendering scene with both the normal camera and the light field cameras
 * @type {string}
 */
export const fragmentShader = `
    precision highp float;

    varying vec2 v_texcoord;
    varying vec3 v_tangent;
    varying vec3 v_normal;
    varying vec3 v_surfaceToLight;
    varying vec3 v_surfaceToView;
    varying vec4 v_color;

    uniform sampler2D u_normalMap;
    uniform sampler2D u_specularMap;
    uniform sampler2D u_diffuseMap;
    uniform vec3 u_diffuse;
    uniform vec3 u_ambient;
    uniform vec3 u_emissive;
    uniform vec3 u_specular;
    uniform vec3 u_ambientLight;
    uniform vec3 u_lightColor;
    uniform float u_shininess;
    uniform float u_opacity;

    void main() 
    {
        vec3 normal = normalize(v_normal);
        vec3 tangent = normalize(v_tangent);
        vec3 bitangent = normalize(cross(normal, tangent));
        
        mat3 tbn = mat3(tangent, bitangent, normal);
        normal = texture2D(u_normalMap, v_texcoord).rgb * 2. - 1.;
        normal = normalize(tbn * normal);
        
        vec3 surfaceToLightDirection = normalize(v_surfaceToLight);
        vec3 surfaceToViewDirection = normalize(v_surfaceToView);
        vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewDirection);

        float light = dot(normal, surfaceToLightDirection);
        float specularLight = 0.0;
        if (light > 0.0) {
            specularLight = clamp(dot(normal, halfVector), 0.0, 1.0);
        }
        vec4 specularMapColor = texture2D(u_specularMap, v_texcoord);
        vec3 effectiveSpecular = u_specular * specularMapColor.rgb * u_lightColor;
        
        vec4 diffuseMapColor = texture2D(u_diffuseMap, v_texcoord);
        vec3 effectiveDiffuse = u_diffuse * diffuseMapColor.rgb * v_color.rgb * u_lightColor;
        float effectiveOpacity = u_opacity * diffuseMapColor.a * v_color.a;

        gl_FragColor = vec4(
            u_emissive + u_ambient * u_ambientLight + effectiveDiffuse * light + effectiveSpecular * pow(specularLight, u_shininess),
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