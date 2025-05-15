import { BufferAttribute, BufferGeometry, ColorRepresentation, Group, Object3D, Points, PointsMaterial } from 'three'

import { fromTransformDeclarations, fromVector3Declaration, TransformDeclaration, Vector3Declaration } from '../../declaration'
import { ShaderForge } from '../../shader-forge'
import { SetTextOption, TextHelper } from '../text'
import { BaseManager } from './base'
import { LinesManager } from './lines'
import { _c0, _v0, Utils } from './shared'

class PointsManager extends BaseManager {
  static shapes = (() => {
    let i = 0
    return {
      'square': i++,
      'circle': i++,
      'ring': i++,
      'ring-thin': i++,
      'plus': i++,
      'plus-thin': i++,
      'plus-ultra-thin': i++,
      'cross': i++,
    }
  })()

  static createParts({
    pointCount: count = 10000,
  } = {}) {
    const geometry = new BufferGeometry()
    const attributes = {
      'position': new BufferAttribute(new Float32Array(count * 3), 3),
      'color': new BufferAttribute(new Float32Array(count * 3), 3),
      'aScale': new BufferAttribute(new Float32Array(count), 1),
      'aShape': new BufferAttribute(new Float32Array(count), 1),
    }
    for (const [name, attr] of Object.entries(attributes)) {
      geometry.setAttribute(name, attr)
    }
    const material = new PointsMaterial({ vertexColors: true })
    material.onBeforeCompile = shader => ShaderForge.with(shader)
      .varying({
        vShape: 'float',
      })
      .vertex.top(/* glsl */`
        attribute float aScale;
        attribute float aShape;
      `)
      .vertex.mainAfterAll(/* glsl */`
        gl_PointSize *= aScale;
        vShape = aShape;
      `)
      .fragment.top(/* glsl */`
        float sdBox(in vec2 p, in vec2 b) {
          vec2 d = abs(p) - b;
          return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
        }
      `)
      .fragment.after('color_fragment', /* glsl */`
        if (vShape == ${PointsManager.shapes['circle']}.0) {
          float d = distance(gl_PointCoord * 2.0, vec2(1.0));
          if (d > 1.0) discard;
        }

        if (vShape == ${PointsManager.shapes['ring']}.0) {
          float d = distance(gl_PointCoord * 2.0, vec2(1.0));
          if (d < 0.8 || d > 1.0) discard;
        }

        if (vShape == ${PointsManager.shapes['ring-thin']}.0) {
          float d = distance(gl_PointCoord * 2.0, vec2(1.0));
          if (d < 0.9 || d > 1.0) discard;
        }

        else if (vShape == ${PointsManager.shapes['plus']}.0) {
          float d0 = sdBox(gl_PointCoord * 2.0 - 1.0, vec2(1.0, 0.2));
          float d1 = sdBox(gl_PointCoord * 2.0 - 1.0, vec2(0.2, 1.0));
          if (d0 > 0.0 && d1 > 0.0) discard;
        }

        else if (vShape == ${PointsManager.shapes['plus-thin']}.0) {
          float d0 = sdBox(gl_PointCoord * 2.0 - 1.0, vec2(1.0, 0.1));
          float d1 = sdBox(gl_PointCoord * 2.0 - 1.0, vec2(0.1, 1.0));
          if (d0 > 0.0 && d1 > 0.0) discard;
        }

        else if (vShape == ${PointsManager.shapes['plus-ultra-thin']}.0) {
          float d0 = sdBox(gl_PointCoord * 2.0 - 1.0, vec2(1.0, 0.033));
          float d1 = sdBox(gl_PointCoord * 2.0 - 1.0, vec2(0.033, 1.0));
          if (d0 > 0.0 && d1 > 0.0) discard;
        }
        // diffuseColor.rgb *= vec3(gl_PointCoord, 1.0);
      `)
    const points = new Points(geometry, material)
    points.frustumCulled = false
    // points.geometry.setDrawRange(0, 0)
    return {
      count,
      geometry,
      attributes,
      points,
    }
  }

  state = { index: 0 }

  parts: ReturnType<typeof PointsManager.createParts>

  constructor(options?: Parameters<typeof PointsManager.createParts>[0]) {
    super()
    this.parts = PointsManager.createParts(options)
  }

  override applyTransform(...transforms: TransformDeclaration[]) {
    this.parts.geometry.applyMatrix4(fromTransformDeclarations(transforms))
  }

  clear() {
    this.state.index = 0
    this.parts.geometry.setDrawRange(0, 0)
  }

  onTop(renderOrder = 1000) {
    const { points } = this.parts
    if (renderOrder !== 0) {
      points.renderOrder = renderOrder
      points.material.depthTest = false
      points.material.depthWrite = false
      points.material.transparent = true
    } else {
      points.renderOrder = 0
      points.material.depthTest = true
      points.material.depthWrite = true
      points.material.transparent = false
    }
    return this
  }

  points(p: Vector3Declaration[], {
    key = undefined as any,
    size: argSize = .1,
    scale: argScale = 1,
    color: argColor = 'white' as ColorRepresentation,
    shape: argShape = 'square' as keyof typeof PointsManager.shapes,
  } = {}): this {
    const { transformMatrix } = this

    const useKey = key !== undefined
    const count = p.length

    const { index: i0 } = useKey
      ? this.ensureKeyEntry(key, this.state.index, count)
      : this.state

    const { position, color, aScale, aShape } = this.parts.attributes
    const { r, g, b } = _c0.set(argColor)
    const size = argScale * argSize
    const shape = PointsManager.shapes[argShape]
    for (let i1 = 0; i1 < count; i1++) {
      const { x, y, z } = fromVector3Declaration(p[i1], _v0).applyMatrix4(transformMatrix)
      const i = i0 + i1
      position.setXYZ(i, x, y, z)
      color.setXYZ(i, r, g, b)
      aScale.setX(i, size)
      aShape.setX(i, shape)
    }

    this.state.index = useKey
      ? Math.max(this.state.index, i0 + count) // ensure the index is always increasing
      : i0 + count
    this.parts.geometry.setDrawRange(0, this.state.index)

    for (const attr of Object.values(this.parts.attributes)) {
      attr.needsUpdate = true
    }

    if (this.state.index > this.parts.count) {
      throw new Error('Overflow Handling Not implemented')
    }

    return this
  }

  box(value: Parameters<typeof Utils.box>[0], options?: Parameters<PointsManager['points']>[1]) {
    const { boxPoints } = Utils.box(value)
    return this.points(boxPoints, options)
  }

  point(p: Vector3Declaration, options?: Parameters<PointsManager['points']>[1]) {
    return this.points([p], options)
  }
}

const DEFAULT_TEXT_COUNT = 2000

class TextsManager extends BaseManager {
  static createParts(options?: ConstructorParameters<typeof TextHelper>[0]) {
    const textHelper = new TextHelper({
      textCount: DEFAULT_TEXT_COUNT,
      ...options,
    })
    return {
      count: textHelper.count,
      textHelper,
    }
  }

  state = { index: 0 }

  parts: ReturnType<typeof TextsManager.createParts>

  constructor(options?: Parameters<typeof TextsManager.createParts>[0]) {
    super()
    this.parts = TextsManager.createParts(options)
  }

  override applyTransform(...transforms: TransformDeclaration[]) {
    this.parts.textHelper.applyTransform(...transforms)
  }

  clear() {
    this.state.index = 0
    this.parts.textHelper.clearAllText()
    return this
  }

  onTop(renderOrder = 1000) {
    this.parts.textHelper.onTop(renderOrder)
    return this
  }

  static textDefaults = {
    texts: ((i: number) => i.toString()) as ((i: number) => string) | string[],
  }
  texts(
    points: Vector3Declaration[],
    options?: Partial<typeof TextsManager.textDefaults> & SetTextOption,
  ) {
    let index = this.state.index
    const { texts, ...rest } = { ...TextsManager.textDefaults, ...options }
    const textDelegate = typeof texts === 'function'
      ? texts
      : (i: number) => texts[i % texts.length]
    let i = 0
    for (const p of points) {
      const { x, y, z } = fromVector3Declaration(p, _v0)
      this.parts.textHelper.setTextAt(index, textDelegate(i), {
        ...rest,
        x, y, z,
      })
      index++
      i++
    }
    this.state.index = index
    return this
  }

  text(p: Vector3Declaration, text: string, options?: SetTextOption) {
    return this.texts([p], { ...options, texts: [text] })
  }

  textAt(index: number, text: string, options?: SetTextOption) {
    this.parts.textHelper.setTextAt(index, text, { ...options })
    return this
  }
}

const defaultLinePointsOptions = {
  color: undefined as ColorRepresentation | undefined,
  size: .1,
  shape: 'square' as keyof typeof PointsManager.shapes,
  scale: 1,
}
type LinePointsOptions = {
  points?: boolean | Partial<typeof defaultLinePointsOptions>
}

class DebugHelper extends Group {
  static createParts(instance: DebugHelper, options?: Partial<{
    nodeMaterial: boolean,
    texts: ConstructorParameters<typeof TextsManager>[0],
    lines: ConstructorParameters<typeof LinesManager>[0],
    points: ConstructorParameters<typeof PointsManager>[0],
  }>) {
    const { nodeMaterial } = options ?? {}
    const pointsManager = new PointsManager(options?.points)
    instance.add(pointsManager.parts.points)

    const linesManager = new LinesManager({ nodeMaterial, ...options?.lines })
    instance.add(linesManager.parts.lines)

    const textsManager = new TextsManager({ nodeMaterial, ...options?.texts })
    instance.add(textsManager.parts.textHelper)

    return {
      pointsManager,
      linesManager,
      textsManager,
    }
  }

  parts: ReturnType<typeof DebugHelper.createParts>

  constructor(options?: Parameters<typeof DebugHelper.createParts>[1]) {
    super()
    this.parts = DebugHelper.createParts(this, options)
  }

  points(...args: Parameters<PointsManager['points']>): this {
    this.parts.pointsManager.points(...args)
    return this
  }

  point(...args: Parameters<PointsManager['point']>): this {
    this.parts.pointsManager.point(...args)
    return this
  }

  segments(...args: Parameters<LinesManager['segments']>): this {
    this.parts.linesManager.segments(...args)
    return this
  }

  line(...args: Parameters<LinesManager['line']>): this {
    this.parts.linesManager.line(...args)
    return this
  }

  polyline(
    data: Parameters<LinesManager['polyline']>[0],
    options?: Parameters<LinesManager['polyline']>[1] & LinePointsOptions,
  ): this {
    this.parts.linesManager.polyline(data, options)
    if (options?.points) {
      this.points(data, { ...defaultLinePointsOptions, color: options.color, ...(options.points === true ? {} : options.points) })
    }
    return this
  }

  polylines(
    data: Parameters<DebugHelper['polyline']>[0][],
    options?: Parameters<DebugHelper['polyline']>[1],
  ): this {
    for (const d of data) {
      this.polyline(d, options)
    }
    return this
  }

  polygon(
    polygonArg: Parameters<LinesManager['polygon']>[0],
    options?: Parameters<LinesManager['polygon']>[1] & LinePointsOptions,
  ): this {
    this.parts.linesManager.polygon(polygonArg, options)
    if (options?.points) {
      this.points(polygonArg, { ...defaultLinePointsOptions, color: options.color, ...(options.points === true ? {} : options.points) })
    }
    return this
  }

  polygons(
    data: Parameters<DebugHelper['polygon']>[0][],
    options?: Parameters<DebugHelper['polygon']>[1],
  ): this {
    for (const d of data) {
      this.polygon(d, options)
    }
    return this
  }

  box(
    boxArg: Parameters<LinesManager['box']>[0],
    options?: Parameters<LinesManager['box']>[1] & LinePointsOptions,
  ): this {
    this.parts.linesManager.box(boxArg, options)
    if (options?.points) {
      this.parts.pointsManager.box(boxArg, { ...defaultLinePointsOptions, color: options.color, ...(options.points === true ? {} : options.points) })
    }
    return this
  }

  circle(...args: Parameters<LinesManager['circle']>): this {
    this.parts.linesManager.circle(...args)
    return this
  }

  rect(...args: Parameters<LinesManager['rect']>): this {
    this.parts.linesManager.rect(...args)
    return this
  }

  regularGrid(...args: Parameters<LinesManager['regularGrid']>): this {
    this.parts.linesManager.regularGrid(...args)
    return this
  }

  texts(...args: Parameters<TextsManager['texts']>): this {
    this.parts.textsManager.texts(...args)
    return this
  }

  text(...args: Parameters<TextsManager['text']>): this {
    this.parts.textsManager.text(...args)
    return this
  }

  textAt(...args: Parameters<TextsManager['textAt']>): this {
    this.parts.textsManager.textAt(...args)
    return this
  }

  applyTransform(...transforms: TransformDeclaration[]): this {
    this.parts.pointsManager.applyTransform(...transforms)
    this.parts.linesManager.applyTransform(...transforms)
    this.parts.textsManager.applyTransform(...transforms)
    return this
  }

  clear(): this {
    this.parts.pointsManager.clear()
    this.parts.linesManager.clear()
    this.parts.textsManager.clear()
    return this
  }

  onTop(renderOrder = 1000): this {
    this.renderOrder = renderOrder
    this.parts.pointsManager.onTop(renderOrder)
    this.parts.linesManager.onTop(renderOrder)
    this.parts.textsManager.onTop(renderOrder)
    return this
  }

  globalExpose(name = 'debugHelper'): this {
    Object.assign(globalThis, { [name]: this })
    return this
  }

  addTo(parent: Object3D | null): this {
    if (parent) {
      parent.add(this)
    } else {
      this.removeFromParent()
    }
    return this
  }
}

/**
 * Static instance of DebugHelper for convenience. Can be used as a global debug draw.
 */
const debugHelper = new DebugHelper()

export {
  debugHelper,
  DebugHelper
}

