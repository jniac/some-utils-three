import { bufferAttribute, varying } from 'three/tsl'
import { LineBasicNodeMaterial } from 'three/webgpu'

import { Vector3Declaration } from 'some-utils-ts/declaration'
import { Rectangle, RectangleDeclaration } from 'some-utils-ts/math/geom/rectangle'
import { OneOrMany } from 'some-utils-ts/types'
import { fromOneOrMany } from 'some-utils-ts/types/utils'
import { BufferAttribute, BufferGeometry, ColorRepresentation, LineBasicMaterial, LineSegments } from 'three'

import { TransformDeclaration, fromTransformDeclarations, fromVector3Declaration } from '../../declaration'
import { ShaderForge } from '../../shader-forge'

import { BaseManager } from './base'
import { Utils, _c0, _v0, _v1, _v2, _v3, _v4, _v5, _v6 } from './shared'

type PositionDeclaration = 'end' | 'start' | 'middle' | number

function fromOptionsDeclaration(arg: PositionDeclaration) {
  if (typeof arg === 'number') {
    return arg
  }
  switch (arg) {
    case 'end':
      return 1
    case 'start':
      return 0
    case 'middle':
      return .5
    default:
      throw new Error(`Invalid arrow position: ${arg}`)
  }
}

const defaultArrowOptions = {
  /**
   * Arrow size in world units.
   */
  size: .1,
  /**
   * If true, the arrow size is proportional to the segment length.
   */
  proportionalSize: false,
  /**
   * Arrow position in the segment.
   * - `start`: at the start of the segment
   * - `end`: at the end of the segment
   * - `middle`: at the middle of the segment
   * - `number`: at a specific position in the segment (0 to 1)
   */
  position: <OneOrMany<PositionDeclaration>>'middle',
  /**
   * Skip arrow if the segment is too small.
   */
  skip: <undefined | true | 'less-than-size' | number>undefined,
  /**
   * Type of the arrow. Useful for visualization.
   * - `single`: single arrow ">"
   * - `double`: double arro ">>"
   * - `triple`: triple arrow ">>>"
   */
  type: <'single' | 'double' | 'triple'>'single',
  /**
   * Global scale of the arrow (not taken into account for the skip option, applied after).
   */
  scale: 1,
}

type ArrowOptions = Partial<typeof defaultArrowOptions>
type ArrowOptionsArg = boolean | OneOrMany<ArrowOptions>

const defaultLineOptions = {
  /**
   * If a "key" is provided, the new segments will replace the previous ones with 
   * the same key.
   * 
   * This is useful to update some segments while keeping the others as they are.
   * 
   * Note: the count of segments must be the same as the previous ones. 
   */
  key: undefined as any,
  /**
   * Line color.
   */
  color: undefined as undefined | ColorRepresentation,
  /**
   * Line opacity.
   */
  opacity: 1,
  /**
   * Arrow options.
   */
  arrow: <ArrowOptionsArg>false,
}

type LineOptions = Partial<typeof defaultLineOptions>

function computeArrowPoints(segments: Float32Array, arrowOptions?: ArrowOptionsArg): Float32Array {
  if (arrowOptions === false || arrowOptions === undefined)
    return new Float32Array()

  const arrowOptionsArray = Array.isArray(arrowOptions)
    ? arrowOptions
    : [arrowOptions === true ? {} : arrowOptions]

  let arrowPerSegmentMax = 0
  for (const arrowOption of arrowOptionsArray) {
    const type = arrowOption?.type ?? defaultArrowOptions.type
    const position = arrowOption?.position ?? defaultArrowOptions.position
    arrowPerSegmentMax += (Array.isArray(position) ? position.length : 1) * (type === 'triple' ? 3 : type === 'double' ? 2 : 1)
  }

  const segmentCounts = segments.length / 3 / 2
  const arrowCountMax = segmentCounts * arrowPerSegmentMax

  // Preallocate the arrow points array not taking into account the skip option
  const arrowPointsPool = new Float32Array(arrowCountMax * 4 * 3)

  const P0 = _v0 // start point
  const P1 = _v1 // end point
  const V = _v2 // end - start
  const D = _v3 // direction ((end - start) normalized)
  const N = _v4 // normal
  const M = _v5 // point on the segment
  const P = _v6 // temporary point

  let arrowIndex = 0
  for (let i = 0; i < segmentCounts; i++) {
    const i6 = i * 6
    P0.set(segments[i6 + 0], segments[i6 + 1], segments[i6 + 2])
    P1.set(segments[i6 + 3], segments[i6 + 4], segments[i6 + 5])
    V.subVectors(P1, P0)
    const lengthSq = V.lengthSq()

    for (const arrowOption of arrowOptionsArray) {
      const {
        size = defaultArrowOptions.size,
        proportionalSize = defaultArrowOptions.proportionalSize,
        position = defaultArrowOptions.position,
        skip = defaultArrowOptions.skip,
        type = defaultArrowOptions.type,
        scale = defaultArrowOptions.scale,
      } = arrowOption ?? {}

      if (skip !== undefined) {
        if (skip === true || skip === 'less-than-size') {
          if (lengthSq < size * size) {
            continue
          }
        } else if (typeof skip === 'number') {
          if (lengthSq < skip * skip) {
            continue
          }
        }
      }

      const length = Math.sqrt(lengthSq)
      const s = (proportionalSize ? length : 1) * size * scale
      D.copy(V).divideScalar(length)

      // Normal based on the smallest component of the direction
      const ax = Math.abs(D.x)
      const ay = Math.abs(D.y)
      const az = Math.abs(D.z)
      if (ax >= az && ay >= az) {
        N.set(D.y, -D.x, 0).normalize()
      } else if (ay >= ax) {
        N.set(D.z, 0, -D.x).normalize()
      } else {
        N.set(0, D.z, -D.y).normalize()
      }

      for (const p of fromOneOrMany(position)) {
        const repeatCount =
          type === 'triple' ? 3 :
            type === 'double' ? 2 :
              1

        for (let j = 0; j < repeatCount; j++) {
          let t = fromOptionsDeclaration(p)

          // adjust t from repeat option
          if (repeatCount > 1)
            t += (j / (repeatCount - 1) - t) * size / length * .8

          M.lerpVectors(P0, P1, t)

          M
            .toArray(arrowPointsPool, (arrowIndex * 4 + 0) * 3)
          P
            .copy(M)
            .addScaledVector(D, -s)
            .addScaledVector(N, -s)
            .toArray(arrowPointsPool, (arrowIndex * 4 + 1) * 3)
          M
            .toArray(arrowPointsPool, (arrowIndex * 4 + 2) * 3)
          P
            .copy(M)
            .addScaledVector(D, -s)
            .addScaledVector(N, s)
            .toArray(arrowPointsPool, (arrowIndex * 4 + 3) * 3)

          arrowIndex++
        }
      }
    }
  }

  // Option 1: return only the used part of the array
  // return new Float32Array(
  //   arrowPointsPool.buffer,
  //   0,
  //   arrowIndex * 4 * 3)

  // Option 2: return the whole array, safer for the user because "skip" is not 
  // taken into account
  return arrowPointsPool
}

const DEFAULT_LINE_COUNT = 20000

export class LinesManager extends BaseManager {
  static createParts({
    nodeMaterial = false,
    lineCount: count = DEFAULT_LINE_COUNT,
    defaultColor = <ColorRepresentation>'white',
    defaultOpacity = 1,
  } = {}) {
    const geometry = new BufferGeometry()
    const attributes = {
      'position': new BufferAttribute(new Float32Array(count * 3 * 2), 3),
      'color': new BufferAttribute(new Float32Array(count * 3 * 2), 3),
      'aOpacity': new BufferAttribute(new Float32Array(count * 2), 1),
    }
    for (const [name, attr] of Object.entries(attributes)) {
      geometry.setAttribute(name, attr)
    }
    const createLineMaterial = () => {
      const material = new LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
      })
      material.onBeforeCompile = shader => ShaderForge.with(shader)
        .varying({
          vOpacity: 'float',
        })
        .vertex.top(/* glsl */ `
          attribute float aOpacity;
        `)
        .vertex.mainAfterAll(/* glsl */ `
          vOpacity = aOpacity;
        `)
        .fragment.after('color_fragment', /* glsl */ `
          diffuseColor.a *= vOpacity;
        `)
      return material
    }
    const createLineNodeMaterial = () => {
      const material = new LineBasicNodeMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
      })
      const aOpacity = bufferAttribute(attributes.aOpacity, 'float', 1, 0)
      material.opacityNode = varying(aOpacity)
      return material
    }
    const material = nodeMaterial
      ? createLineNodeMaterial()
      : createLineMaterial()
    const lines = new LineSegments(geometry, material)
    lines.frustumCulled = false
    return {
      count,
      defaults: {
        color: defaultColor,
        opacity: defaultOpacity,
      },
      geometry,
      attributes,
      lines,
    }
  }

  state = { index: 0 };

  parts: ReturnType<typeof LinesManager.createParts>

  constructor(options?: Parameters<typeof LinesManager.createParts>[0]) {
    super()
    this.parts = LinesManager.createParts(options)
  }

  override applyTransform(...transforms: TransformDeclaration[]) {
    this.parts.geometry.applyMatrix4(fromTransformDeclarations(transforms))
  }

  clear(): this {
    super.clear()
    this.state.index = 0
    this.parts.geometry.setDrawRange(0, 0)
    return this
  }

  onTop(renderOrder = 1000) {
    const { lines } = this.parts
    if (renderOrder !== 0) {
      lines.renderOrder = renderOrder
      lines.material.depthTest = false
      lines.material.depthWrite = false
    } else {
      lines.renderOrder = 0
      lines.material.depthTest = true
      lines.material.depthWrite = true
    }
    return this
  }

  #update(checkNaN = false) {
    this.parts.geometry.setDrawRange(0, this.state.index)

    for (const attr of Object.values(this.parts.attributes)) {
      attr.needsUpdate = true
    }

    if (this.state.index > this.parts.count * 2) {
      throw new Error('Not implemented!')
    }

    if (checkNaN) {
      for (const attr of Object.values(this.parts.attributes)) {
        if (attr.array.some(v => isNaN(v))) {
          console.log(attr.array.findIndex(v => isNaN(v)))
          debugger
        }
      }
    }
  }

  segmentsArray(array: Float32Array, options?: LineOptions) {
    const { position, color, aOpacity } = this.parts.attributes

    const {
      key,
      color: colorArg,
      opacity: opacityArg,
    } = {
      ...defaultLineOptions,
      ...this.parts.defaults,
      ...options,
    }
    const { r, g, b } = _c0.set(colorArg)
    const segCount = array.length / 3

    const arrowPoints = computeArrowPoints(array, options?.arrow)
    const arrowCount = arrowPoints.length / 3

    const count = segCount + arrowCount

    const useKey = key !== undefined
    const { index } = useKey
      ? this.ensureKeyEntry(key, this.state.index, segCount) // From the key
      : this.state

    if (index + count > this.parts.count) {
      console.log('Overflow Handling Not implemented', index + count, this.parts.count)
      throw new Error('Overflow Handling Not implemented')
    }

    this.state.index = Math.max(this.state.index, index + count)

    {
      // The line's part (easy)
      const i0 = index
      const { transformMatrix } = this
      for (let i = 0; i < segCount; i++) {
        _v0
          .fromArray(array, i * 3)
          .applyMatrix4(transformMatrix)
          .toArray(position.array, (i0 + i) * 3)
        color.setXYZ(i0 + i, r, g, b)
        aOpacity.setX(i0 + i, opacityArg)
      }
    }

    {
      // The arrow's part (easy)
      const i0 = index + segCount
      for (let i = 0; i < arrowCount; i++) {
        _v0
          .fromArray(arrowPoints, i * 3)
          .applyMatrix4(this.transformMatrix)
          .toArray(position.array, (i0 + i) * 3)
        color.setXYZ(i0 + i, r, g, b)
        aOpacity.setX(i0 + i, opacityArg)
      }
    }

    this.#update()

    return this
  }

  segments(p: Vector3Declaration[], options?: LineOptions) {
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

  line(p0: Vector3Declaration, p1: Vector3Declaration, options?: LineOptions) {
    return this.segments([p0, p1], options)
  }

  axes(p: Vector3Declaration, { size = 1 } = {}) {
    const { x, y, z } = fromVector3Declaration(p, _v0)
    return this
      .segmentsArray(new Float32Array([x, y, z, x + size, y, z]), { color: '#ff0033' })
      .segmentsArray(new Float32Array([x, y, z, x, y + size, z]), { color: '#00ff33' })
      .segmentsArray(new Float32Array([x, y, z, x, y, z + size]), { color: '#0033ff' })
  }

  polyline(p: Vector3Declaration[], options?: LineOptions) {
    if (p.length < 2)
      return this

    const count = (p.length - 1) * 2
    const p2 = new Array(count)
    for (let i = 1; i < p.length; i++) {
      p2[i * 2 - 2] = p[i - 1]
      p2[i * 2 - 1] = p[i]
    }

    return this.segments(p2, options)
  }

  polygon(p: Vector3Declaration[], options?: LineOptions) {
    if (p.length < 2)
      return this

    this.polyline(p, options)
    this.line(p[p.length - 1], p[0], options)
    return this
  }

  box(value?: Parameters<typeof Utils.box>[0], options?: LineOptions) {
    const [p0, p1, p2, p3, p4, p5, p6, p7] = Utils.box(value).boxPoints
    return this.segmentsArray(new Float32Array([
      p0.x, p0.y, p0.z,
      p1.x, p1.y, p1.z,
      p1.x, p1.y, p1.z,
      p2.x, p2.y, p2.z,
      p2.x, p2.y, p2.z,
      p3.x, p3.y, p3.z,
      p3.x, p3.y, p3.z,
      p0.x, p0.y, p0.z,
      p4.x, p4.y, p4.z,
      p5.x, p5.y, p5.z,
      p5.x, p5.y, p5.z,
      p6.x, p6.y, p6.z,
      p6.x, p6.y, p6.z,
      p7.x, p7.y, p7.z,
      p7.x, p7.y, p7.z,
      p4.x, p4.y, p4.z,
      p0.x, p0.y, p0.z,
      p4.x, p4.y, p4.z,
      p1.x, p1.y, p1.z,
      p5.x, p5.y, p5.z,
      p2.x, p2.y, p2.z,
      p6.x, p6.y, p6.z,
      p3.x, p3.y, p3.z,
      p7.x, p7.y, p7.z,
    ]), options)
  }

  static rectDefaultOptions = {
    inset: 0,
    triple: <undefined | number>undefined,
    diagonals: <undefined | boolean | { inset: number }>undefined,
  };
  rect(value: RectangleDeclaration, options?: Partial<typeof LinesManager.rectDefaultOptions> & LineOptions) {
    let { minX, minY, maxX, maxY } = Rectangle.from(value)
    const { inset, triple, diagonals } = { ...LinesManager.rectDefaultOptions, ...options }
    minX += inset
    minY += inset
    maxX -= inset
    maxY -= inset
    if (diagonals) {
      const diagInset = typeof diagonals === 'object' ? diagonals.inset : 0
      let dx = 0, dy = 0
      if (diagInset !== 0) {
        const length = Math.hypot(maxX - minX, maxY - minY)
        dx = (diagInset * (maxX - minX)) / length
        dy = (diagInset * (maxY - minY)) / length
      }
      this.segments([
        { x: minX + dx, y: minY + dy, z: 0 },
        { x: maxX - dx, y: maxY - dy, z: 0 },
        { x: maxX - dx, y: minY + dy, z: 0 },
        { x: minX + dx, y: maxY - dy, z: 0 },
      ], options)
      // this.segments([
      //   { x: minX, y: minY, z: 0 },
      //   { x: maxX, y: maxY, z: 0 },
      //   { x: maxX, y: minY, z: 0 },
      //   { x: minX, y: maxY, z: 0 },
      // ], options)
    }
    if (triple) {
      const t = triple
      this.segments([
        { x: minX + t, y: minY + t, z: 0 },
        { x: maxX - t, y: minY + t, z: 0 },
        { x: maxX - t, y: minY + t, z: 0 },
        { x: maxX - t, y: maxY - t, z: 0 },
        { x: maxX - t, y: maxY - t, z: 0 },
        { x: minX + t, y: maxY - t, z: 0 },
        { x: minX + t, y: maxY - t, z: 0 },
        { x: minX + t, y: minY + t, z: 0 },
      ], options)
      this.segments([
        { x: minX - t, y: minY - t, z: 0 },
        { x: maxX + t, y: minY - t, z: 0 },
        { x: maxX + t, y: minY - t, z: 0 },
        { x: maxX + t, y: maxY + t, z: 0 },
        { x: maxX + t, y: maxY + t, z: 0 },
        { x: minX - t, y: maxY + t, z: 0 },
        { x: minX - t, y: maxY + t, z: 0 },
        { x: minX - t, y: minY - t, z: 0 },
      ], options)
    }
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
    'low': 18,
    'medium': 36,
    'high': 64,
    'ultra': 256,
  };

  circle({
    center = 0 as Vector3Declaration, axis = 'z' as Vector3Declaration, radius = 1, quality = 'medium' as keyof typeof LinesManager.circleQualityPresets, segments = undefined as number | undefined,
  } = {}, options?: LineOptions) {
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

  static regularGridDefaults = {
    plane: 'xy' as 'xy' | 'xz' | 'yz',
    size: 100,
    subdivisions: [10, 2, 5],
    opacity: [.2, .05, .01] as number | number[],
    color: 'white' as ColorRepresentation | ColorRepresentation[],
  };
  regularGrid(options?: Partial<typeof LinesManager.regularGridDefaults>) {
    const {
      color: colorArg, opacity: opacityArg, plane, size, subdivisions,
    } = { ...LinesManager.regularGridDefaults, ...options }

    const subdivisionsCount = subdivisions.length
    const cumul = subdivisions.map((v, i) => subdivisions.slice(i).reduce((a, b) => a * b, 1))
    const count = cumul[0]
    const positions = new Float32Array((count + 1) * 2 * 2 * 3)
    const colors = new Float32Array((count + 1) * 2 * 2 * 3).fill(1)
    const aOpacity = new Float32Array((count + 1) * 2 * 2).fill(1)

    const colorArgArray = Array.isArray(colorArg) ? colorArg : [colorArg]
    const colorArray = subdivisions.map((_, i) => {
      const { r, g, b } = _c0.set(colorArgArray[Math.min(i, colorArgArray.length - 1)])
      return [r, g, b]
    })
    const opacityArgArray = Array.isArray(opacityArg) ? opacityArg : [opacityArg]
    const opacityArray = subdivisions.map((_, i) => {
      return opacityArgArray[Math.min(i, opacityArgArray.length - 1)]
    })

    for (let i = 0; i <= count; i++) {
      let j = subdivisionsCount - 1
      while (j > 0 && i % cumul[j] === 0) {
        j--
      }

      const [r, g, b] = colorArray[j]
      const o = opacityArray[j]

      const d = i / count * size
      const i12 = i * 12

      positions[i12 + 0] = -size / 2
      positions[i12 + 1] = -size / 2 + d
      positions[i12 + 2] = 0
      positions[i12 + 3] = size / 2
      positions[i12 + 4] = -size / 2 + d
      positions[i12 + 5] = 0

      positions[i12 + 6] = -size / 2 + d
      positions[i12 + 7] = -size / 2
      positions[i12 + 8] = 0
      positions[i12 + 9] = -size / 2 + d
      positions[i12 + 10] = size / 2
      positions[i12 + 11] = 0

      colors[i12 + 0] = r
      colors[i12 + 1] = g
      colors[i12 + 2] = b
      colors[i12 + 3] = r
      colors[i12 + 4] = g
      colors[i12 + 5] = b

      colors[i12 + 6] = r
      colors[i12 + 7] = g
      colors[i12 + 8] = b
      colors[i12 + 9] = r
      colors[i12 + 10] = g
      colors[i12 + 11] = b

      const i4 = i * 4
      aOpacity[i4 + 0] = o
      aOpacity[i4 + 1] = o
      aOpacity[i4 + 2] = o
      aOpacity[i4 + 3] = o
    }

    if (plane === 'xz') {
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 2] = positions[i + 1] // z = y
        positions[i + 1] = 0
      }
    } else if (plane === 'yz') {
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 2] = positions[i + 1] // z = y
        positions[i + 1] = positions[i + 0] // y = x
        positions[i + 0] = 0
      }
    }

    const { index } = this.state
    this.parts.attributes.position.array.set(positions, index * 3)
    this.parts.attributes.color.array.set(colors, index * 3)
    this.parts.attributes.aOpacity.array.set(aOpacity, index)

    this.state.index += (count + 1) * 2 * 2

    this.#update()

    return this
  }
}
