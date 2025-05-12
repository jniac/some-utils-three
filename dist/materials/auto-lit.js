import { MeshBasicMaterial, Vector3 } from 'three';
import { ShaderForge } from '../shader-forge.js';
const defaultOptions = {
    luminosity: .5,
};
/**
 * A simple shader material that uses vertex colors and a simple lighting model.
 */
export class AutoLitMaterial extends MeshBasicMaterial {
    sunPosition;
    constructor(options) {
        const { luminosity, ...rest } = { ...defaultOptions, ...options };
        const uniforms = {
            uSunPosition: { value: new Vector3(0.5, 0.7, 0.3) },
            uLuminosity: { value: luminosity },
        };
        super(rest);
        this.onBeforeCompile = shader => {
            ShaderForge.with(shader)
                .uniforms(uniforms)
                .varying({
                vWorldNormal: 'vec3',
            })
                .vertex.mainAfterAll(/* glsl */ `
          vWorldNormal = mat3(modelMatrix) * normal;
      `)
                .fragment.after('map_fragment', /* glsl */ `
        vec3 lightDirection = normalize(uSunPosition);
        float light = dot(vWorldNormal, lightDirection) * 0.5 + 0.5;
        light = pow(light, 2.0);
        light = mix(uLuminosity, 1.0, light);
        diffuseColor *= light;
      `);
        };
        this.sunPosition = uniforms.uSunPosition.value;
    }
}
//# sourceMappingURL=auto-lit.js.map