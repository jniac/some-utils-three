import {
  Color,
  DynamicDrawUsage,
  Float32BufferAttribute,
  InstancedBufferGeometry,
  InstancedInterleavedBuffer,
  InterleavedBufferAttribute,
  Vector4,
} from 'three'

/**
 * Mutate target with xyz and full width in w. Called once per point.
 */
export type VariableLinePointDelegate = (
  index: number,
  point: Vector4,
  color: Color,
) => void

/**
 * Reusable interleaved storage for a variable-width polyline.
 */
export class VariableLineGeometry extends InstancedBufferGeometry {
  #buffer?: InstancedInterleavedBuffer
  #point = new Vector4()
  #color = new Color()
  #colors?: InstancedInterleavedBuffer
  #vertexColors = false

  constructor(segmentCapacity = 0, { vertexColors = false } = {}) {
    super()
    this.setIndex([0, 1, 2, 2, 1, 3])
    this.setAttribute(
      'position',
      new Float32BufferAttribute([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0], 3),
    )
    this.instanceCount = 0
    this.#vertexColors = vertexColors
    this.reserve(segmentCapacity)
  }

  get capacity(): number {
    return this.#buffer?.count ?? 0
  }

  /** Allocate color storage once, before animation. Colors default to linear white. */
  enableVertexColors(): this {
    if (this.#vertexColors) return this
    this.#vertexColors = true
    if (this.capacity > 0) this.#allocateColors()
    return this
  }

  #allocateColors(): void {
    const array = new Float32Array(this.capacity * 6).fill(1)
    if (this.#colors) array.set(this.#colors.array)
    this.#colors = new InstancedInterleavedBuffer(array, 6).setUsage(
      DynamicDrawUsage,
    )
    this.setAttribute(
      'instanceColorStart',
      new InterleavedBufferAttribute(this.#colors, 3, 0),
    )
    this.setAttribute(
      'instanceColorEnd',
      new InterleavedBufferAttribute(this.#colors, 3, 3),
    )
  }

  /** Reserve segments up front to avoid allocation during animation. */
  reserve(segmentCapacity: number): this {
    if (!Number.isSafeInteger(segmentCapacity) || segmentCapacity < 0) {
      throw new Error('Expected a nonnegative integer segment capacity')
    }

    if (segmentCapacity <= this.capacity) return this

    const data = new Float32Array(
      Math.max(segmentCapacity, this.capacity * 2) * 8,
    )

    if (this.#buffer) {
      data.set(this.#buffer.array)
      // Release old GPU buffers before replacing attributes (WebGL cannot resize them).
      this.dispose()
    }
    const buffer = new InstancedInterleavedBuffer(data, 8)
    buffer.setUsage(DynamicDrawUsage)
    this.#buffer = buffer
    if (this.#vertexColors) this.#allocateColors()

    this.setAttribute(
      'instanceStart',
      new InterleavedBufferAttribute(buffer, 3, 0),
    )
    this.setAttribute(
      'instanceEnd',
      new InterleavedBufferAttribute(buffer, 3, 3),
    )
    this.setAttribute(
      'instanceWidthStart',
      new InterleavedBufferAttribute(buffer, 1, 6),
    )
    this.setAttribute(
      'instanceWidthEnd',
      new InterleavedBufferAttribute(buffer, 1, 7),
    )

    return this
  }

  /** No temporary arrays; target is reused and must not be retained by the callback. */
  updatePoints(pointCount: number, delegate: VariableLinePointDelegate): this {
    if (!Number.isSafeInteger(pointCount) || pointCount < 0) {
      throw new Error('Expected a nonnegative integer point count')
    }
    const count = Math.max(0, pointCount - 1)
    this.reserve(count)
    // Hide partial results if a delegate throws or returns invalid data.
    this.instanceCount = 0
    for (let i = 0; i < pointCount; i++) {
      const point = this.#point
      const color = this.#color.setRGB(1, 1, 1)
      delegate(i, point, color)
      if (
        this.#colors &&
        (!Number.isFinite(color.r) ||
          !Number.isFinite(color.g) ||
          !Number.isFinite(color.b))
      ) {
        throw new Error('Colors must be finite')
      }

      let { x, y, z, w } = point

      if (Number.isNaN(x)) x = 0
      if (Number.isNaN(y)) y = 0
      if (Number.isNaN(z)) z = 0
      if (Number.isNaN(w)) w = 0

      const pointIsNotOk =
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(z) ||
        !Number.isFinite(w) ||
        w < 0

      if (pointIsNotOk)
        throw new Error(
          `Positions must be finite and widths finite and nonnegative (${x}, ${y}, ${z}, ${w})`,
        )

      if (count === 0) continue

      if (this.#colors) {
        const colors = this.#colors.array
        if (i > 0) {
          const offset = (i - 1) * 6 + 3
          colors[offset] = color.r
          colors[offset + 1] = color.g
          colors[offset + 2] = color.b
        }
        if (i < count) {
          const offset = i * 6
          colors[offset] = color.r
          colors[offset + 1] = color.g
          colors[offset + 2] = color.b
        }
      }
      const data = this.#buffer!.array
      if (i > 0) {
        const offset = (i - 1) * 8
        data[offset + 3] = x
        data[offset + 4] = y
        data[offset + 5] = z
        data[offset + 7] = w
      }
      if (i < count) {
        const offset = i * 8
        data[offset] = x
        data[offset + 1] = y
        data[offset + 2] = z
        data[offset + 6] = w
      }
    }

    this.instanceCount = count

    if (this.#buffer && count > 0) {
      this.#buffer.clearUpdateRanges()
      this.#buffer.addUpdateRange(0, count * 8)
      this.#buffer.needsUpdate = true
    }

    if (this.#colors && count > 0) {
      this.#colors.clearUpdateRanges()
      this.#colors.addUpdateRange(0, count * 6)
      this.#colors.needsUpdate = true
    }
    return this
  }

  setPositions(positions: ArrayLike<number>, widths: ArrayLike<number>): this {
    if (positions.length % 3 !== 0 || widths.length !== positions.length / 3)
      throw new Error('Expected xyz positions and one width per point')

    return this.updatePoints(widths.length, (i, point) => {
      point.set(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2],
        widths[i],
      )
    })
  }
}
