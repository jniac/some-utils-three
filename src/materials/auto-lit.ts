import { Color, ColorRepresentation, MeshBasicMaterial, MeshBasicMaterialParameters, Vector3, WebGLProgramParametersWithUniforms } from 'three'

import { ShaderForge } from '../shader-forge'

const defaultOptions = {
  shadowColor: <ColorRepresentation>'#808080',
  luminosity: 1,
  rampPower: 1,
  onBeforeCompile: <((shader: WebGLProgramParametersWithUniforms) => void) | undefined>undefined,
}

// type Options = Partial<Omit<ShaderMaterialParameters, 'fragmentShader' | 'vertexShader'> & typeof defaultOptions>
type Options = Partial<typeof defaultOptions> & MeshBasicMaterialParameters

/**
 * A simple shader material that uses vertex colors and a simple lighting model.
 */
export class AutoLitMaterial extends MeshBasicMaterial {
  sunPosition: Vector3

  constructor(options?: Options) {
    const {
      rampPower,
      shadowColor,
      luminosity,
      onBeforeCompile,
      ...rest
    } = { ...defaultOptions, ...options }
    const uniforms = {
      uSunPosition: { value: new Vector3(0.5, 0.7, 0.3) },
      uShadowColor: { value: new Color(shadowColor) },
      uRampPower: { value: rampPower },
      uLuminosity: { value: luminosity },
    }
    super(rest)
    this.onBeforeCompile = shader => {
      ShaderForge.with(shader)
        .uniforms(uniforms)
        .varying({
          vAutoLitWorldNormal: 'vec3',
        })
        .vertex.mainAfterAll(/* glsl */`
          vAutoLitWorldNormal = mat3(modelMatrix) * normal;
          #ifdef USE_INSTANCING
            vAutoLitWorldNormal = mat3(instanceMatrix) * vAutoLitWorldNormal;
          #endif
        `)
        .fragment.after('map_fragment', /* glsl */`
          vec3 normal = normalize(vAutoLitWorldNormal);
          vec3 lightDirection = normalize(uSunPosition);
          float light = dot(normal, lightDirection) * 0.5 + 0.5;
          light = pow(light, uRampPower);
          diffuseColor.rgb *= mix(uShadowColor * uLuminosity, vec3(1.0), light);
        `)

      onBeforeCompile?.(shader)
    }

    this.sunPosition = uniforms.uSunPosition.value
  }

  // get color() { return this.uniforms.uColor.value }
}
