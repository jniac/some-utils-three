'use client'
import { Color, ColorRepresentation, ShaderMaterial, ShaderMaterialParameters, Vector3 } from 'three'

const vertexShader = /* glsl */ `
varying vec3 vWorldNormal;
varying vec3 vColor;

void main() {
  vWorldNormal = mat3(modelMatrix) * normal;
  vColor = color;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */ `
varying vec3 vWorldNormal;
varying vec3 vColor;

uniform vec3 uSunPosition;
uniform vec3 uColor;

void main() {
  vec3 lightDirection = normalize(uSunPosition);
  float light = dot(vWorldNormal, lightDirection) * 0.5 + 0.5;
  light = pow(light, 2.0);
  light = mix(0.1, 1.0, light);
  gl_FragColor = vec4(vColor * uColor * light, 1.0);
}
`

const defaultOptions = {
  vertexColors: true,
  color: <ColorRepresentation>'white',
}

type Options = Partial<Omit<ShaderMaterialParameters, 'fragmentShader' | 'vertexShader'> & typeof defaultOptions>

/**
 * A simple shader material that uses vertex colors and a simple lighting model.
 */
export class AutoLitMaterial extends ShaderMaterial {
  sunPosition: Vector3

  constructor(options?: Options) {
    const {
      color,
      vertexColors,
      ...rest
    } = { ...defaultOptions, ...options }
    super({
      ...rest,
      uniforms: {
        uColor: { value: new Color(color) },
        uSunPosition: { value: new Vector3(0.5, 0.7, 0.3) },
      },
      vertexColors,
      vertexShader,
      fragmentShader,
    })

    this.sunPosition = this.uniforms.uSunPosition.value
  }
}
