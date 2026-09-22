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
  lighting?: boolean
  normalMode?: 'flat' | 'capsule'
  shadowBillboard?: 'light' | 'camera'
  /** Positive normalized-depth bias, applied only when receiving shadows. */
  shadowReceiveBias?: number
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
    lighting = shadows,
    normalMode = 'flat',
    shadowBillboard = 'light',
    shadowReceiveBias = 0.01,
  }: VariableLineMaterialParameters = {}) {
    super({
      uniforms: {
        ...UniformsUtils.clone(UniformsLib.lights),
        uDiffuse: { value: new Color(color) },
        uLinewidth: { value: linewidth },
        uPixelRatio: { value: 1 },
        uOpacity: { value: opacity },
        uShadowReceiveBias: { value: shadowReceiveBias },
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
      depthWrite: true,
    })
    this.shadowSide = DoubleSide
    Object.assign(this.defaultAttributeValues, {
      instanceColorStart: [1, 1, 1],
      instanceColorEnd: [1, 1, 1],
    })
    this.worldUnits = worldUnits
    this.worldPosition = worldPosition
    this.shadowReceiveBias = shadowReceiveBias
    this.normalMode = normalMode
    this.lighting = lighting
    this.shadows = shadows
    this.shadowBillboard = shadowBillboard
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

  get normalMode(): 'flat' | 'capsule' {
    return 'USE_CAPSULE_NORMAL' in this.defines ? 'capsule' : 'flat'
  }
  set normalMode(value: 'flat' | 'capsule') {
    if (value !== 'flat' && value !== 'capsule')
      throw new Error('Expected flat or capsule')
    this.#setDefine('USE_CAPSULE_NORMAL', value === 'capsule')
  }

  get lighting(): boolean {
    return 'USE_LIGHTING' in this.defines
  }
  set lighting(value: boolean) {
    this.#setDefine('USE_LIGHTING', value)
    this.lights = value || this.shadows
  }

  get shadows(): boolean {
    return 'LINE_RECEIVE_SHADOWS' in this.defines
  }
  set shadows(value: boolean) {
    this.#setDefine('LINE_RECEIVE_SHADOWS', value)
    this.lights = value || this.lighting
  }

  get shadowBillboard(): 'light' | 'camera' {
    return 'SHADOW_BILLBOARD_LIGHT' in this.defines ? 'light' : 'camera'
  }
  set shadowBillboard(value: 'light' | 'camera') {
    if (value !== 'light' && value !== 'camera')
      throw new Error('Expected light or camera')
    this.#setDefine('SHADOW_BILLBOARD_LIGHT', value === 'light')
    if (this.depthMaterial) this.syncShadowDefines()
  }

  get shadowReceiveBias(): number {
    return this.uniforms.uShadowReceiveBias.value
  }
  set shadowReceiveBias(value: number) {
    if (!Number.isFinite(value) || value < 0)
      throw new Error('Expected a finite nonnegative bias')
    this.uniforms.uShadowReceiveBias.value = value
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
      const lightBillboard = this.shadowBillboard === 'light'
      if ('SHADOW_BILLBOARD_LIGHT' in material.defines !== lightBillboard) {
        if (lightBillboard) material.defines.SHADOW_BILLBOARD_LIGHT = ''
        else delete material.defines.SHADOW_BILLBOARD_LIGHT
        material.needsUpdate = true
      }
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
