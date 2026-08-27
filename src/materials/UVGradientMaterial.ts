import { Color, ColorRepresentation, MeshBasicMaterial, MeshBasicMaterialParameters, Vector4 } from 'three'

import { ShaderForge } from 'some-utils-three/shader-forge'
import { AngleDeclaration, fromAngleDeclaration } from 'some-utils-ts/declaration'
import { glsl_easings } from 'some-utils-ts/glsl/easings'

/**
 * A material that creates a gradient based on UV coordinates, with customizable colors, angle, and easing function.
 * 
 * Notes:
 * - Currently the gradient length is fixed to 1.0, even if the angle is not horizontal or vertical.
 */
export class UVGradientMaterial extends MeshBasicMaterial {
  static defaultParams = {
    color1: <ColorRepresentation>'#fc0',
    color2: <ColorRepresentation>'#30f',
    angle: <AngleDeclaration>0,
    /**
     * The power of the gradient easing function. Higher values make the gradient more abrupt.
     */
    power: 1.5,
    /**
     * The inflection point of the gradient easing function. A value of 0.5 means the gradient is symmetric, while values closer to 0 or 1 make the gradient more skewed.
     */
    inflection: 0.5,
    /**
     * The scale of the gradient. A value of 1 means the gradient spans the entire UV space, while values less than 1 make the gradient more compact.
     */
    scale: 1,
    direction: <'horizontal' | 'vertical' | undefined>undefined,
  }

  uniforms = {
    uColor1: { value: new Color() },
    uColor2: { value: new Color() },
    uParams: { value: new Vector4() },
    uAngle: { value: 0 },
  }

  constructor(params?: Partial<typeof UVGradientMaterial.defaultParams> & MeshBasicMaterialParameters) {
    const { color1, color2, angle, direction, power, inflection, scale, ...superParams } = { ...UVGradientMaterial.defaultParams, ...params }
    super(superParams)
    this.uniforms.uColor1.value.set(color1)
    this.uniforms.uColor2.value.set(color2)
    this.uniforms.uAngle.value =
      direction !== undefined
        ? (direction === 'horizontal' ? 0 : -Math.PI / 2)
        : fromAngleDeclaration(angle)
    this.uniforms.uParams.value.set(power, inflection, scale, 0)
    this.onBeforeCompile = shader => ShaderForge.with(shader)
      .defines('USE_UV')
      .uniforms(this.uniforms)
      .fragment.top(glsl_easings)
      .fragment.after('color_fragment', /* glsl */`
        vec2 uv = vUv - 0.5;
        float angle = uAngle;
        float cosA = cos(angle);
        float sinA = sin(angle);
        uv = vec2(
          uv.x * cosA - uv.y * sinA,
          uv.x * sinA + uv.y * cosA
        );
        float power = uParams.x;
        float inflection = uParams.y;
        float scale = uParams.z;
        uv /= scale;
        float alpha = uv.x + 0.5;
        vec3 gradientColor = mix(uColor1, uColor2, easeInOut(alpha, power, inflection));
        diffuseColor.rgb *= gradientColor;
      `)
  }
}