import { BufferGeometry, ColorRepresentation, Group, Matrix4, Object3D, Vector3 } from 'three'

import { Rectangle } from 'some-utils-ts/math/geom/rectangle'

import { fromVector3Declaration, TransformDeclaration, Vector3Declaration } from '../../declaration'
import { SetTextOption, TextHelper } from '../text'
import { BaseManager } from './base'
import { LinesManager } from './lines'
import { PointsManager } from './points'
import { _v0 } from './shared'

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

  override setTransformMatrix(matrix: Matrix4): this {
    this.parts.textHelper.setTransformMatrix(matrix)
    return this
  }

  override resetTransformMatrix(): this {
    this.parts.textHelper.resetTransformMatrix()
    return this
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

type RectanglePointsOptions = LinePointsOptions & {
  center?: boolean | Partial<typeof defaultLinePointsOptions>
  corners?: boolean | Partial<typeof defaultLinePointsOptions>
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
    const pointsManager = new PointsManager({ ...options?.points })
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

  userData = { helper: true }

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

  line(
    p0: Vector3Declaration,
    p1: Vector3Declaration,
    options?: Parameters<LinesManager['line']>[2] & LinePointsOptions,
  ): this {
    this.parts.linesManager.line(p0, p1, options)
    if (options?.points) {
      this.points([p0, p1], { ...defaultLinePointsOptions, color: options.color, ...(options.points === true ? {} : options.points) })
    }
    return this
  }

  axes(...args: Parameters<LinesManager['axes']>): this {
    this.parts.linesManager.axes(...args)
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
    boxArg?: Parameters<LinesManager['box']>[0],
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

  rect(
    rectArg: Parameters<LinesManager['rect']>[0],
    options?: Parameters<LinesManager['rect']>[1] & RectanglePointsOptions,
  ): this {
    this.parts.linesManager.rect(rectArg, options)
    const {
      points,
      center = points,
      corners = points,
    } = options ?? {}
    if (corners || center) {
      const rect = Rectangle.from(rectArg)

      if (rect.hasNaN())
        return this

      if (center) {
        this.parts.pointsManager.point(rect.center, { color: options?.color, ...options, ...(options?.center === true ? {} : options?.center) })
      }
      if (corners) {
        const { minX, minY, maxX, maxY } = rect
        const corners: [number, number][] = [
          [minX, minY],
          [maxX, minY],
          [maxX, maxY],
          [minX, maxY],
        ]
        this.parts.pointsManager.points(corners, { color: options?.color, ...options, ...(options?.corners === true ? {} : options?.corners) })
      }
    }
    return this
  }

  rects(
    rectsArg: Parameters<LinesManager['rects']>[0],
    options?: Parameters<LinesManager['rects']>[1] & RectanglePointsOptions,
  ): this {
    this.parts.linesManager.rects(rectsArg, options)
    return this
  }

  static #debugTriangle_private = {
    A: new Vector3(),
    B: new Vector3(),
    C: new Vector3(),
    A2: new Vector3(),
    B2: new Vector3(),
    C2: new Vector3(),
    AB: new Vector3(),
    AC: new Vector3(),
    tangent: new Vector3(),
    bitangent: new Vector3(),
    p0: new Vector3(),
    p1: new Vector3(),
    p2: new Vector3(),
    normal: new Vector3(),
    center: new Vector3(),
  }
  static debugTriangle_defaultOptions = {
    color: '#f0f',
    arrowSize: .05,
    shrinkFactor: .975,
    text: undefined as string | number | undefined,
  }
  debugTriangle(
    triArg: [Vector3Declaration, Vector3Declaration, Vector3Declaration] | [geometry: BufferGeometry, triangleIndex: number],
    options?: Partial<typeof DebugHelper.debugTriangle_defaultOptions>,
  ): this {
    const { A, B, C, A2, B2, C2, AB, AC, tangent, bitangent, p0, p1, p2, normal, center } = DebugHelper.#debugTriangle_private

    if (triArg.length === 3) {
      const [aArg, bArg, cArg] = triArg
      fromVector3Declaration(aArg, A)
      fromVector3Declaration(bArg, B)
      fromVector3Declaration(cArg, C)
    } else {
      const [geometry, triangleIndex] = triArg
      let i0, i1, i2
      if (geometry.index) {
        const indexAttr = geometry.index!
        i0 = indexAttr.getX(triangleIndex * 3)
        i1 = indexAttr.getX(triangleIndex * 3 + 1)
        i2 = indexAttr.getX(triangleIndex * 3 + 2)
      } else {
        i0 = triangleIndex * 3
        i1 = triangleIndex * 3 + 1
        i2 = triangleIndex * 3 + 2
      }
      const array = geometry.getAttribute('position').array as Float32Array
      A.fromArray(array, i0 * 3)
      B.fromArray(array, i1 * 3)
      C.fromArray(array, i2 * 3)
    }

    AB.subVectors(B, A)
    AC.subVectors(C, A)
    normal.crossVectors(AB, AC)
    const normalLength = normal.length()
    const area = normalLength * .5
    const size = Math.sqrt(area)
    if (normalLength === 0)
      throw new Error('❌ Unhandled. DebugHelper.debugTriangle: Degenerate triangle with zero area')
    normal.divideScalar(normalLength || 1)
    center.addVectors(A, B).add(C).divideScalar(3)

    const {
      color,
      arrowSize,
      shrinkFactor,
      text,
    } = { ...DebugHelper.debugTriangle_defaultOptions, ...options }

    A2.copy(A).addScaledVector(tangent.subVectors(center, A), 1 - shrinkFactor)
    B2.copy(B).addScaledVector(tangent.subVectors(center, B), 1 - shrinkFactor)
    C2.copy(C).addScaledVector(tangent.subVectors(center, C), 1 - shrinkFactor)

    this.point(center, { color, size: size * .05, shape: 'circle' })
    this.point(A, { color, size: size * .12, shape: 'ring' })
    this.segments([A, A2, B, B2, C, C2], { color })
    this.polygon([A2, B2, C2], { color })

    const points = [A, B, C]
    for (let i = 0; i < 3; i++) {
      const P0 = points[i]
      const P1 = points[(i + 1) % 3]
      tangent.subVectors(P1, P0)
      bitangent.crossVectors(normal, tangent).normalize().multiplyScalar(size)
      p0.copy(P0).addScaledVector(tangent, .5).addScaledVector(bitangent, .05)
      p1.copy(p0).addScaledVector(tangent, arrowSize)
      p2.copy(p0).addScaledVector(bitangent, .05)
      p0.addScaledVector(tangent, -arrowSize)
      this.polyline([p0, p1, p2], { color })
      for (let j = 0; j < i; j++) {
        p1.addScaledVector(tangent, -arrowSize * .33)
        p2.addScaledVector(tangent, -arrowSize * .33)
        this.line(p1, p2, { color })
      }
    }

    A.addScaledVector(p0.subVectors(center, A), .1)
    p0.copy(A).addScaledVector(AB, .1)
    p1.copy(A).addScaledVector(AC, .1)
    this.line(A, p0, { color })
    this.line(A, p1, { color })

    if (text !== undefined) {
      this.text(center, String(text), { size: size * .5, color, offset: [0, size * .1, 0] })
    }

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

  setTransformMatrix(matrix: Matrix4): this {
    this.parts.pointsManager.setTransformMatrix(matrix)
    this.parts.linesManager.setTransformMatrix(matrix)
    this.parts.textsManager.setTransformMatrix(matrix)
    return this
  }

  resetTransformMatrix(): this {
    this.parts.pointsManager.resetTransformMatrix()
    this.parts.linesManager.resetTransformMatrix()
    this.parts.textsManager.resetTransformMatrix()
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

