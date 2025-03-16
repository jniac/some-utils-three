import { BufferAttribute, BufferGeometry, Color, ColorRepresentation, Group, LineSegments, Object3D, Points, PointsMaterial, Vector3 } from 'three'

import { Rectangle, RectangleDeclaration } from 'some-utils-ts/math/geom/rectangle'

import { fromVector3Declaration, Vector3Declaration } from '../../declaration'
import { ShaderForge } from '../../shader-forge'
import { TextHelper } from '../text'

const _v0 = new Vector3()
const _v1 = new Vector3()
const _v2 = new Vector3()
const _c0 = new Color()

class PointsManager {
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

  static createParts(count: number) {
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

  constructor(count = 1000) {
    this.parts = PointsManager.createParts(count)
  }

  clear() {
    this.state.index = 0
    this.parts.geometry.setDrawRange(0, 0)
  }

  onTop(value = true) {
    const { points } = this.parts
    if (value) {
      points.renderOrder = 999
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
    size: argSize = .1,
    scale: argScale = 1,
    color: argColor = 'white' as ColorRepresentation,
    shape: argShape = 'square' as keyof typeof PointsManager.shapes,
  } = {}): this {
    const count = p.length
    const { index: i0 } = this.state
    const { position, color, aScale, aShape } = this.parts.attributes
    const { r, g, b } = _c0.set(argColor)
    const size = argScale * argSize
    const shape = PointsManager.shapes[argShape]
    for (let i1 = 0; i1 < count; i1++) {
      const { x, y, z } = fromVector3Declaration(p[i1], _v0)
      const i = i0 + i1
      position.setXYZ(i, x, y, z)
      color.setXYZ(i, r, g, b)
      aScale.setX(i, size)
      aShape.setX(i, shape)
    }

    this.state.index = i0 + count
    this.parts.geometry.setDrawRange(0, this.state.index)

    for (const attr of Object.values(this.parts.attributes)) {
      attr.needsUpdate = true
    }

    if (this.state.index > this.parts.count) {
      throw new Error('Not implemented!')
    }

    return this
  }

  point(p: Vector3Declaration, options?: Parameters<DebugHelper['points']>[1]) {
    return this.points([p], options)
  }
}

class LinesManager {
  static createParts(count: number) {
    const geometry = new BufferGeometry()
    const attributes = {
      'position': new BufferAttribute(new Float32Array(count * 3 * 2), 3),
      'color': new BufferAttribute(new Float32Array(count * 3 * 2), 3),
    }
    for (const [name, attr] of Object.entries(attributes)) {
      geometry.setAttribute(name, attr)
    }
    const material = new PointsMaterial({ vertexColors: true })
    const lines = new LineSegments(geometry, material)
    lines.frustumCulled = false
    return {
      count,
      geometry,
      attributes,
      lines,
    }
  }

  state = { index: 0 }

  parts: ReturnType<typeof LinesManager.createParts>

  constructor(count = 1000) {
    this.parts = LinesManager.createParts(count)
  }

  clear() {
    this.state.index = 0
    this.parts.geometry.setDrawRange(0, 0)
  }

  onTop(value = true) {
    const { lines } = this.parts
    if (value) {
      lines.renderOrder = 999
      lines.material.depthTest = false
      lines.material.depthWrite = false
      lines.material.transparent = true
    } else {
      lines.renderOrder = 0
      lines.material.depthTest = true
      lines.material.depthWrite = true
      lines.material.transparent = false
    }
    return this
  }

  static defaultOptions = {
    color: 'white' as ColorRepresentation,
  }

  segmentsArray(p: Float32Array, options?: Partial<typeof LinesManager.defaultOptions>) {
    const { position, color } = this.parts.attributes
    const { index } = this.state

    const { color: colorArg } = { ...LinesManager.defaultOptions, ...options }
    const { r, g, b } = _c0.set(colorArg)
    const count = p.length / 3

    position.array.set(p, index * 3)
    for (let i = 0; i < count; i++) {
      color.setXYZ(index + i, r, g, b)
    }

    this.state.index = index + count
    this.parts.geometry.setDrawRange(0, this.state.index)

    for (const attr of Object.values(this.parts.attributes)) {
      attr.needsUpdate = true
    }

    if (this.state.index > this.parts.count * 2) {
      throw new Error('Not implemented!')
    }

    return this
  }

  segments(p: Vector3Declaration[], options?: Partial<typeof LinesManager.defaultOptions>) {
    const count = p.length
    const array = new Float32Array(count * 3)
    for (let i1 = 0; i1 < count; i1++) {
      const { x, y, z } = fromVector3Declaration(p[i1], _v0)
      const i = i1 * 3
      array[i + 0] = x
      array[i + 1] = y
      array[i + 2] = z
    }
    return this.segmentsArray(array, options)
  }

  line(p0: Vector3Declaration, p1: Vector3Declaration, options?: Parameters<DebugHelper['segments']>[1]) {
    return this.segments([p0, p1], options)
  }

  polyline(p: Vector3Declaration[], options?: Parameters<DebugHelper['segments']>[1]) {
    const count = (p.length - 1) * 2
    const p2 = new Array(count)
    for (let i = 1; i < p.length; i++) {
      p2[i * 2 - 2] = p[i - 1]
      p2[i * 2 - 1] = p[i]
    }
    return this.segments(p2, options)
  }

  polygon(p: Vector3Declaration[], options?: Parameters<DebugHelper['segments']>[1]) {
    this.polyline(p, options)
    this.line(p[p.length - 1], p[0], options)
    return this
  }

  static boxDefaultOptions = {
    inset: 0,
  }
  static #box = { x0: 0, y0: 0, z0: 0, x1: 0, y1: 0, z1: 0 }
  static #solveBox(value: Parameters<DebugHelper['box']>[0]) {
    fromVector3Declaration(value.min, _v0)
    LinesManager.#box.x0 = _v0.x
    LinesManager.#box.y0 = _v0.y
    LinesManager.#box.z0 = _v0.z
    fromVector3Declaration(value.max, _v0)
    LinesManager.#box.x1 = _v0.x
    LinesManager.#box.y1 = _v0.y
    LinesManager.#box.z1 = _v0.z
  }
  box(value: { min: Vector3Declaration, max: Vector3Declaration }, options?: Partial<typeof LinesManager.boxDefaultOptions> & Parameters<DebugHelper['segments']>[1]) {
    LinesManager.#solveBox(value)
    const { inset } = { ...LinesManager.boxDefaultOptions, ...options }
    let { x0, y0, z0, x1, y1, z1 } = LinesManager.#box
    x0 += inset
    y0 += inset
    z0 += inset
    x1 -= inset
    y1 -= inset
    z1 -= inset
    return this.segments([
      // bottom
      { x: x0, y: y0, z: z0 },
      { x: x1, y: y0, z: z0 },
      { x: x1, y: y0, z: z0 },
      { x: x1, y: y1, z: z0 },
      { x: x1, y: y1, z: z0 },
      { x: x0, y: y1, z: z0 },
      { x: x0, y: y1, z: z0 },
      { x: x0, y: y0, z: z0 },
      // top
      { x: x0, y: y0, z: z1 },
      { x: x1, y: y0, z: z1 },
      { x: x1, y: y0, z: z1 },
      { x: x1, y: y1, z: z1 },
      { x: x1, y: y1, z: z1 },
      { x: x0, y: y1, z: z1 },
      { x: x0, y: y1, z: z1 },
      { x: x0, y: y0, z: z1 },
      // sides
      { x: x0, y: y0, z: z0 },
      { x: x0, y: y0, z: z1 },
      { x: x1, y: y0, z: z0 },
      { x: x1, y: y0, z: z1 },
      { x: x1, y: y1, z: z0 },
      { x: x1, y: y1, z: z1 },
      { x: x0, y: y1, z: z0 },
      { x: x0, y: y1, z: z1 },
    ], options)
  }

  static rectDefaultOptions = {
    inset: 0,
  }
  rect(value: RectangleDeclaration, options?: Partial<typeof LinesManager.rectDefaultOptions> & Parameters<DebugHelper['segments']>[1]) {
    let { minX, minY, maxX, maxY } = Rectangle.from(value)
    const { inset } = { ...LinesManager.rectDefaultOptions, ...options }
    minX += inset
    minY += inset
    maxX -= inset
    maxY -= inset
    return this.segments([
      { x: minX, y: minY, z: 0 },
      { x: maxX, y: minY, z: 0 },
      { x: maxX, y: minY, z: 0 },
      { x: maxX, y: maxY, z: 0 },
      { x: maxX, y: maxY, z: 0 },
      { x: minX, y: maxY, z: 0 },
      { x: minX, y: maxY, z: 0 },
      { x: minX, y: minY, z: 0 },
    ], options)
  }

  static circleQualityPresets = {
    'low': 12,
    'medium': 24,
    'high': 64,
    'ultra': 256,
  }

  circle({
    center = 0 as Vector3Declaration,
    axis = 'z' as Vector3Declaration,
    radius = 1,
    quality = 'medium' as keyof typeof LinesManager.circleQualityPresets,
    segments = undefined as number | undefined,
  } = {}, options?: Parameters<DebugHelper['segments']>[1]) {
    segments ??= LinesManager.circleQualityPresets[quality]
    const { x, y, z } = fromVector3Declaration(center, _v0)
    fromVector3Declaration(axis, _v0)
      .normalize()
    _v1
      .set(_v0.y, _v0.z, _v0.x) // permute to have a non-parallel vector
      .cross(_v0)
      .normalize()
    _v2
      .crossVectors(_v0, _v1)
    const array = new Float32Array(segments * 3 * 2)
    for (let i = 0; i < segments; i++) {
      const a0 = i / segments * Math.PI * 2
      const a1 = (i + 1) / segments * Math.PI * 2
      const x0 = Math.cos(a0) * radius
      const y0 = Math.sin(a0) * radius
      const x1 = Math.cos(a1) * radius
      const y1 = Math.sin(a1) * radius
      const i6 = i * 6
      array[i6 + 0] = x + x0 * _v1.x + y0 * _v2.x
      array[i6 + 1] = y + x0 * _v1.y + y0 * _v2.y
      array[i6 + 2] = z + x0 * _v1.z + y0 * _v2.z
      array[i6 + 3] = x + x1 * _v1.x + y1 * _v2.x
      array[i6 + 4] = y + x1 * _v1.y + y1 * _v2.y
      array[i6 + 5] = z + x1 * _v1.z + y1 * _v2.z
    }
    this.segmentsArray(array, options)
    return this
  }
}

class TextsManager {
  static createParts(count: number) {
    const textHelper = new TextHelper({
      textCount: count,
    })
    return {
      count,
      textHelper,
    }
  }

  state = { index: 0 }

  parts: ReturnType<typeof TextsManager.createParts>

  constructor(count = 1000) {
    this.parts = TextsManager.createParts(count)
  }

  clear() {
    this.state.index = 0
    this.parts.textHelper.clearAllText()
  }

  texts(points: Vector3Declaration[], {
    texts = ((i: number) => i.toString()) as ((i: number) => string) | string[],
    color = 'white' as ColorRepresentation,
    size = 1,
    backgroundColor = undefined as ColorRepresentation | undefined,
  } = {}) {
    let index = this.state.index
    const textDelegate = typeof texts === 'function'
      ? texts
      : (i: number) => texts[i % texts.length]
    for (const p of points) {
      const { x, y, z } = fromVector3Declaration(p, _v0)
      this.parts.textHelper.setTextAt(index, textDelegate(index), {
        x, y, z,
        size,
        color,
        backgroundColor,
        backgroundOpacity: backgroundColor ? 1 : 0,
      })
      index++
    }
    this.state.index = index
    return this
  }

  text(p: Vector3Declaration, text: string, options: Omit<Parameters<TextsManager['texts']>[1], 'texts'>) {
    return this.texts([p], { ...options, texts: [text] })
  }
}

const defaultLinePointsOptions = {
  color: undefined as ColorRepresentation | undefined,
  size: .1,
  shape: 'square' as keyof typeof PointsManager.shapes,
}
type LinePointsOptions = {
  points?: boolean | Partial<typeof defaultLinePointsOptions>
}

class DebugHelper extends Group {
  parts = (() => {
    const pointsManager = new PointsManager()
    this.add(pointsManager.parts.points)

    const linesManager = new LinesManager()
    this.add(linesManager.parts.lines)

    const textsManager = new TextsManager()
    this.add(textsManager.parts.textHelper)

    return {
      pointsManager,
      linesManager,
      textsManager,
    }
  })()

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
    data: Parameters<LinesManager['polygon']>[0],
    options?: Parameters<LinesManager['polygon']>[1] & LinePointsOptions,
  ): this {
    this.parts.linesManager.polygon(data, options)
    if (options?.points) {
      this.points(data, { ...defaultLinePointsOptions, color: options.color, ...(options.points === true ? {} : options.points) })
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

  box(...args: Parameters<LinesManager['box']>): this {
    this.parts.linesManager.box(...args)
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

  texts(...args: Parameters<TextsManager['texts']>): this {
    this.parts.textsManager.texts(...args)
    return this
  }

  text(...args: Parameters<TextsManager['text']>): this {
    this.parts.textsManager.text(...args)
    return this
  }

  clear(): this {
    this.onTop(false)
    this.parts.pointsManager.clear()
    this.parts.linesManager.clear()
    this.parts.textsManager.clear()
    return this
  }

  onTop(value = true): this {
    this.parts.pointsManager.onTop(value)
    this.parts.linesManager.onTop(value)
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

