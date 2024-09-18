'use client'
import { ShaderMaterial, ShaderMaterialParameters, Vector3 } from 'three'

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

void main() {
  vec3 lightDirection = normalize(uSunPosition);
  float light = dot(vWorldNormal, lightDirection) * 0.5 + 0.5;
  light = pow(light, 2.0);
  light = mix(0.1, 1.0, light);
  gl_FragColor = vec4(vColor * light, 1.0);
}
`

/**
 * A simple shader material that uses vertex colors and a simple lighting model.
 */
export class AutoLitMaterial extends ShaderMaterial {
  sunPosition: Vector3

  constructor(options?: Partial<Omit<ShaderMaterialParameters, 'fragmentShader' | 'vertexShader'>>) {
    const {
      vertexColors = true,
      ...rest
    } = options ?? {}
    super({
      ...rest,
      uniforms: {
        uSunPosition: { value: new Vector3(0.5, 0.7, 0.3) },
      },
      vertexColors,
      vertexShader,
      fragmentShader,
    })

    this.sunPosition = this.uniforms.uSunPosition.value
  }
}
