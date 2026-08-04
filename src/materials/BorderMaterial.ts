import { BufferGeometry, Camera, Group, MeshBasicMaterial, MeshBasicMaterialParameters, Object3D, PlaneGeometry, Scene, Vector2, Vector4, WebGLRenderer } from 'three'

import { glsl_sdf2d } from 'some-utils-ts/glsl/sdf-2d'

import { fromVector2Declaration, fromVector4Declaration, Vector2Declaration, Vector4Declaration } from '../declaration'
import { ShaderForge } from '../shader-forge'

/**
 * A material that renders a border around a plane using SDF (Signed Distance Field) technique.
 * 
 * Features:
 * - Anti-aliased borders
 * - Configurable padding and border radius
 * - Adjustable inner and outer opacity
 * - Clip depth offset to avoid z-fighting
 * 
 * Notes:
 * - The "resolution" uniform is automatically updated in the onBeforeRender method.
 * - If the geometry is a PlaneGeometry, the "planeSize" uniform is automatically updated based on the geometry's width and height.
 */
export class BorderMaterial extends MeshBasicMaterial {
  static defaultParameters = {
    /** 
     * Plane size (used for calculating the SDF)
     */
    planeSize: <Vector2Declaration>1,
    /** 
     * Padding: top | right | bottom | left  (CSS-like padding order)
     */
    padding: <Vector4Declaration>0,
    /** 
     * Border radius: top-left | top-right | bottom-right | bottom-left (CSS-like border-radius order)
     */
    borderRadius: <Vector4Declaration>.1,
    /** 
     * Clip depth offset (helpful for avoiding z-fighting)
     */
    clipDepthOffset: 0,
    /**
     * Outer alpha (the alpha value outside the border)
     */
    outerOpacity: 0,
    /**
     * Inner alpha (the alpha value inside the border)
     */
    innerOpacity: 1,
    /**
     * Border (antialiased) alignment (0 = inside, 0.5 = center, 1 = outside)
     */
    borderAlign: .5,
  }

  #uniforms = {
    uResolution: { value: new Vector2(1, 1) },
    uPlaneSize: { value: new Vector2(1, 1) },
    uPadding: { value: new Vector4(.1, .1, .1, .1) },
    uBorderRadius: { value: new Vector4(.1, .1, .1, .1) },
    uParams: { value: new Vector4(0, 0, 0, 0) }, // x = outerAlpha, y = innerAlpha, z = unused, w = unused
    uClipDepthOffset: { value: 0 },
  }

  get resolution() { return this.#uniforms.uResolution.value }
  get planeSize() { return this.#uniforms.uPlaneSize.value }
  get padding() { return this.#uniforms.uPadding.value }
  get borderRadius() { return this.#uniforms.uBorderRadius.value }
  get clipDepthOffset() { return this.#uniforms.uClipDepthOffset.value }
  set clipDepthOffset(value: number) { this.#uniforms.uClipDepthOffset.value = value }
  get outerOpacity() { return this.#uniforms.uParams.value.x }
  set outerOpacity(value: number) { this.#uniforms.uParams.value.x = value }
  get innerOpacity() { return this.#uniforms.uParams.value.y }
  set innerOpacity(value: number) { this.#uniforms.uParams.value.y = value }

  constructor(params?: MeshBasicMaterialParameters & Partial<typeof BorderMaterial.defaultParameters>) {
    const {
      planeSize,
      padding,
      borderRadius,
      clipDepthOffset,
      innerOpacity,
      outerOpacity,
      borderAlign,
      ...superParams
    } = { ...BorderMaterial.defaultParameters, ...params }
    super({
      transparent: true,
      // alphaTest: 0.15,
      ...superParams,
    })

    fromVector2Declaration(planeSize, this.#uniforms.uPlaneSize.value)
    fromVector4Declaration(padding, this.#uniforms.uPadding.value)
    fromVector4Declaration(borderRadius, this.#uniforms.uBorderRadius.value)
    this.clipDepthOffset = clipDepthOffset
    this.#uniforms.uParams.value.x = outerOpacity
    this.#uniforms.uParams.value.y = innerOpacity
    this.#uniforms.uParams.value.z = borderAlign

    this.onBeforeCompile = shader => ShaderForge.with(shader)
      .uniforms(this.#uniforms)
      .defines('USE_UV')
      .vertex.mainAfterAll(/* glsl */ `
        gl_Position.z += -uClipDepthOffset;
      `)
      .fragment.top(glsl_sdf2d)
      .fragment.after('map_fragment', /* glsl */ `
        // pd.x = top
        // pd.y = right
        // pd.z = bottom
        // pd.w = left

        // br.x = top-left
        // br.y = top-right
        // br.z = bottom-right
        // br.w = bottom-left

        vec2 p = (vUv - 0.5) * uPlaneSize - (uPadding.wz - uPadding.yx) * 0.5;
        vec2 bounds = uPlaneSize - uPadding.wz - uPadding.yx;
        float d = sdRoundedBox(p, bounds * 0.5, uBorderRadius.yzxw);
        float thickness = 1.0 * length(uPlaneSize / uResolution);
        d += thickness * (1.0 - uParams.z); // border alignment
        float inner = 1.0 - smoothstep(0.0, thickness, d);
        diffuseColor.a *= mix(uParams.x, uParams.y, inner);
      `)
  }

  static #now = Date.now()
  customProgramCacheKey(): string {
    return `BorderMaterial-${BorderMaterial.#now}`
  }

  onBeforeRender(renderer: WebGLRenderer, scene: Scene, camera: Camera, geometry: BufferGeometry, object: Object3D, group: Group): void {
    renderer.getSize(this.#uniforms.uResolution.value)

    if (geometry instanceof PlaneGeometry) {
      this.#uniforms.uPlaneSize.value.x = geometry.parameters.width * object.scale.x
      this.#uniforms.uPlaneSize.value.y = geometry.parameters.height * object.scale.y
    }
  }
}
