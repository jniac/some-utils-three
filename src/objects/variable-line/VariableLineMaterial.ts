import {
  Color,
  ColorRepresentation,
  DoubleSide,
  Matrix4,
  MeshDepthMaterial,
  MeshDistanceMaterial,
  RGBADepthPacking,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector2,
} from 'three'

import { fragmentShader, vertexShader } from './shaders'

export interface VariableLineMaterialParameters {
  color?: ColorRepresentation
  linewidth?: number
  opacity?: number
  worldUnits?: boolean
  vertexColors?: boolean
  worldPosition?: boolean
  /** Compile the receiving-shadow path. Also set line.receiveShadow = true. */
  shadows?: boolean
}

/** Camera-facing capsules. Optional shader paths use three.js-style defines. */
export class VariableLineMaterial extends ShaderMaterial {
  readonly depthMaterial = new MeshDepthMaterial({
    depthPacking: RGBADepthPacking,
  })
  readonly distanceMaterial = new MeshDistanceMaterial()

  constructor({
    color = 'white',
    linewidth = 1,
    opacity = 1,
    worldUnits = false,
    vertexColors = false,
    worldPosition = false,
    shadows = false,
  }: VariableLineMaterialParameters = {}) {
    super({
      uniforms: {
        ...UniformsUtils.clone(UniformsLib.lights),
        uDiffuse: { value: new Color(color) },
        uLinewidth: { value: linewidth },
        uPixelRatio: { value: 1 },
        uOpacity: { value: opacity },
        uResolution: { value: new Vector2(1, 1) },
        uCameraView: { value: new Matrix4() },
        uCameraProjection: { value: new Matrix4() },
        uCameraProjectionInverse: { value: new Matrix4() },
        uCameraWorld: { value: new Matrix4() },
      },
      defines: {},
      vertexShader,
      fragmentShader,
      vertexColors,
      transparent: true,
      depthWrite: false,
    })
    this.shadowSide = DoubleSide
    Object.assign(this.defaultAttributeValues, {
      instanceColorStart: [1, 1, 1],
      instanceColorEnd: [1, 1, 1],
    })
    this.worldUnits = worldUnits
    this.worldPosition = worldPosition
    this.shadows = shadows
    for (const [material, pass] of [
      [this.depthMaterial, 'LINE_DEPTH_PASS'],
      [this.distanceMaterial, 'LINE_DISTANCE_PASS'],
    ] as const) {
      material.defines = { LINE_SHADOW_PASS: '', [pass]: '' }
      material.onBeforeCompile = (shader) => {
        // Share live uniform objects; animation needs no shadow-material copying.
        Object.assign(shader.uniforms, this.uniforms)
        shader.vertexShader = vertexShader
        shader.fragmentShader = fragmentShader
      }
      material.customProgramCacheKey = () => `variable-line-${pass}-v1`
    }
    this.syncShadowDefines()
  }

  #setDefine(name: string, enabled: boolean): void {
    if (name in this.defines === enabled) return
    if (enabled) this.defines[name] = ''
    else delete this.defines[name]
    this.needsUpdate = true
  }

  get worldUnits(): boolean {
    return 'WORLD_UNITS' in this.defines
  }
  set worldUnits(value: boolean) {
    this.#setDefine('WORLD_UNITS', value)
    if (this.depthMaterial) this.syncShadowDefines()
  }

  get worldPosition(): boolean {
    return 'USE_WORLD_POSITION' in this.defines
  }
  set worldPosition(value: boolean) {
    this.#setDefine('USE_WORLD_POSITION', value)
  }

  get shadows(): boolean {
    return this.lights
  }
  set shadows(value: boolean) {
    if (this.lights === value) return
    this.lights = value
    // The renderer owns USE_SHADOWMAP. This opt-in removes shadow code entirely.
    this.#setDefine('LINE_RECEIVE_SHADOWS', value)
    this.needsUpdate = true
  }

  setVertexColors(value: boolean): this {
    if (this.vertexColors !== value) {
      this.vertexColors = value
      this.needsUpdate = true
    }
    return this
  }

  get linewidth(): number {
    return this.uniforms.uLinewidth?.value ?? 1
  }
  set linewidth(value: number) {
    // ShaderMaterial's constructor sets linewidth before uniforms are installed.
    if (this.uniforms.uLinewidth) this.uniforms.uLinewidth.value = value
  }

  syncShadowDefines(): void {
    for (const material of [this.depthMaterial, this.distanceMaterial]) {
      material.defines ??= {}
      if ('WORLD_UNITS' in material.defines !== this.worldUnits) {
        if (this.worldUnits) material.defines.WORLD_UNITS = ''
        else delete material.defines.WORLD_UNITS
        material.needsUpdate = true
      }
    }
  }

  override dispose(): void {
    this.depthMaterial.dispose()
    this.distanceMaterial.dispose()
    super.dispose()
  }
}
