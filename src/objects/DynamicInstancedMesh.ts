import {
  BufferAttribute,
  Color,
  ColorRepresentation,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  type BufferGeometry,
  type Material,
} from "three"

// ---------------------------------------------------------------------------
// Growth strategy
// ---------------------------------------------------------------------------

/**
 * Computes the next capacity given the current one and the minimum needed.
 * Receives `current` (≥ 0) and `needed` (> current), returns a value ≥ needed.
 */
export type GrowthStrategy = (current: number, needed: number) => number

/** Default strategy: double until we fit, minimum 8. */
export const doublingStrategy: GrowthStrategy = (current, needed) => {
  let next = Math.max(current, 8)
  while (next < needed) next *= 2
  return next
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface DynamicInstancedMeshOptions {
  /**
   * Number of instance slots to pre-allocate.
   * Avoids the first few reallocations when you already have a rough estimate.
   * @default 16
   */
  initialCapacity?: number

  /**
   * Strategy used to compute the next buffer capacity on overflow.
   * @default doublingStrategy
   */
  growthStrategy?: GrowthStrategy

  /**
   * When true, the mesh allocates a per-instance color attribute in addition
   * to the standard instanceMatrix.
   * @default false
   */
  enableColors?: boolean

  /**
   * Additional named float-per-instance attributes to allocate alongside
   * instanceMatrix. The record value is the number of components (1–4).
   *
   * @example
   * extraAttributes: { opacity: 1, customData: 4 }
   */
  extraAttributes?: Record<string, 1 | 2 | 3 | 4>
}

// ---------------------------------------------------------------------------
// DynamicInstancedMesh
// ---------------------------------------------------------------------------

/**
 * An {@link InstancedMesh} with unbounded, auto-growing instance storage.
 *
 * Three.js `InstancedMesh` requires a fixed `count` at construction time.
 * This subclass wraps the underlying `BufferAttribute`s and reallocates
 * them transparently whenever the current capacity is exceeded.
 *
 * Usage
 * -----
 * ```ts
 * const mesh = new DynamicInstancedMesh(geometry, material, {
 *   initialCapacity: 1024,
 *   enableColors: true,
 * });
 *
 * // Add instances one by one; reallocation is automatic.
 * const idx = mesh.addInstance(new Matrix4(), new Color("red"));
 *
 * // Remove by swapping the last live instance into the hole (O(1), order
 * // is not preserved).
 * mesh.removeInstance(idx);
 *
 * // Pre-grow the buffer when you know a burst is coming.
 * mesh.reserve(mesh.instanceCount + 500);
 * ```
 *
 * Dirty flags
 * -----------
 * After any mutation the affected attributes are marked `.needsUpdate = true`
 * automatically. You only have to call `mesh.instanceMatrix.needsUpdate = true`
 * yourself when you edit matrix entries in-place via `getMatrixAt / setMatrixAt`.
 */
export class DynamicInstancedMesh<
  GeometryType extends BufferGeometry = BufferGeometry,
  MaterialType extends Material | Material[] = Material | Material[]
> extends InstancedMesh<GeometryType, MaterialType> {
  // ------------------------------------------------------------------
  // Private state
  // ------------------------------------------------------------------

  /** Current allocated slot count (≥ instanceCount). */
  private _capacity: number

  /** Number of live instances. Mirrors InstancedMesh.count. */
  private _instanceCount: number = 0;

  private readonly _growthStrategy: GrowthStrategy
  private readonly _enableColors: boolean
  private readonly _extraAttributeItemSizes: ReadonlyMap<string, 1 | 2 | 3 | 4>

  // ------------------------------------------------------------------
  // Constructor
  // ------------------------------------------------------------------

  constructor(
    geometry: GeometryType,
    material: MaterialType,
    options: DynamicInstancedMeshOptions | number = {}
  ) {
    const {
      initialCapacity = 16,
      growthStrategy = doublingStrategy,
      enableColors = false,
      extraAttributes = {},
    } = typeof options === "number" ? { initialCapacity: options } : options

    // InstancedMesh requires count > 0 even if no instances are live yet.
    // We pass the initial capacity so Three.js allocates the right amount
    // of memory on the GPU side from the start.
    super(geometry, material, initialCapacity)

    // Immediately reflect that no instances are actually live.
    // `count` drives the draw call – keep it at 0 until instances are added.
    this.count = 0

    this._capacity = initialCapacity
    this._growthStrategy = growthStrategy
    this._enableColors = enableColors

    this._extraAttributeItemSizes = new Map(
      Object.entries(extraAttributes) as [string, 1 | 2 | 3 | 4][]
    )

    if (enableColors) {
      this.#allocateColorAttribute(initialCapacity)
    }

    for (const [name, itemSize] of this._extraAttributeItemSizes) {
      this.#allocateExtraAttribute(name, itemSize, initialCapacity)
    }
  }

  // ------------------------------------------------------------------
  // Public accessors
  // ------------------------------------------------------------------

  /** Number of live instances (read-only; write via add/remove). */
  get instanceCount(): number {
    return this._instanceCount
  }

  /** Currently allocated capacity (≥ instanceCount). */
  get capacity(): number {
    return this._capacity
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  static #setInstance_private = {
    color: new Color(),
  }
  /**
   * Appends a new instance at the end of the live range.
   */
  setInstanceAt(index: number, matrix: Matrix4, colorArg?: ColorRepresentation): number {
    if (index < 0)
      throw new RangeError(`DynamicInstancedMesh.setInstance: index ${index} must be non-negative.`)
    if (index >= this._instanceCount)
      throw new RangeError(`DynamicInstancedMesh.setInstance: index ${index} exceeds instance count ${this._instanceCount}.`)

    this.setMatrixAt(index, matrix)
    this.instanceMatrix.needsUpdate = true

    if (this.instanceColor) {
      const { color } = DynamicInstancedMesh.#setInstance_private
      this.#assertColors("addInstance")
      this.setColorAt(index, color.set(colorArg ?? 'white'))
      // instanceColor is created by setColorAt; mark dirty after first set.
      if (this.instanceColor)
        this.instanceColor.needsUpdate = true
    }

    return index
  }

  /**
   * Reserves the next instance index and increments the live count.
   * Use `setInstance` to populate the instance data for the reserved index.
   */
  reserveNextIndex(): number {
    const index = this._instanceCount
    this.#ensureCapacity(index + 1)
    this._instanceCount++
    this.count = this._instanceCount
    return index
  }

  /**
   * Appends a new instance at the end of the live range.
   */
  addInstance(matrix: Matrix4, colorArg?: ColorRepresentation): number {
    const index = this.reserveNextIndex()
    this.setInstanceAt(index, matrix, colorArg)
    return index
  }

  /**
   * Removes the instance at `index` by **swap-removing** with the last live
   * instance (O(1), does not preserve order).
   *
   * If you need stable indices, use `setMatrixAt` to zero-scale the instance
   * instead of removing it.
   *
   * @returns `true` if the removal caused a swap (i.e. index < last),
   *          `false` if the removed instance was already the last one.
   */
  removeInstance(index: number): boolean {
    this.#assertValidIndex(index, "removeInstance")

    const last = this._instanceCount - 1
    const didSwap = index < last

    if (didSwap) {
      // Copy the last instance into the freed slot.
      const tmp = new Matrix4()
      this.getMatrixAt(last, tmp)
      this.setMatrixAt(index, tmp)
      this.instanceMatrix.needsUpdate = true

      if (this._enableColors && this.instanceColor) {
        const c = new Color()
        this.getColorAt(last, c)
        this.setColorAt(index, c)
        this.instanceColor.needsUpdate = true
      }

      for (const [name, itemSize] of this._extraAttributeItemSizes) {
        this.#swapExtraAttribute(name, itemSize, index, last)
      }
    }

    this._instanceCount--
    this.count = this._instanceCount

    return didSwap
  }

  /**
   * Pre-allocates enough memory for at least `minCapacity` instances.
   * Useful before a batch-add to avoid repeated reallocations.
   * Has no effect if `minCapacity ≤ this.capacity`.
   */
  reserve(minCapacity: number): void {
    if (minCapacity > this._capacity) {
      this.#reallocate(minCapacity)
    }
  }

  /**
   * Resets the mesh to zero live instances.
   * Does **not** shrink the underlying buffers.
   */
  clear(): this {
    this._instanceCount = 0
    this.count = 0
    return this
  }

  /**
   * Sets per-instance data for an arbitrary extra attribute.
   *
   * @param name   Attribute name (must have been declared in `extraAttributes`).
   * @param index  Instance index.
   * @param values Array of floats matching the attribute's itemSize.
   */
  setExtraAt(name: string, index: number, values: ArrayLike<number>): void {
    this.#assertValidIndex(index, "setExtraAt")
    const attr = this.geometry.getAttribute(name) as BufferAttribute | undefined
    if (!attr) throw new Error(`DynamicInstancedMesh: no extra attribute "${name}"`)

    const offset = index * attr.itemSize
    for (let i = 0; i < attr.itemSize; i++) {
      attr.array[offset + i] = (values as number[])[i] ?? 0
    }
    attr.needsUpdate = true
  }

  /**
   * Reads per-instance data for an arbitrary extra attribute.
   *
   * @param name   Attribute name.
   * @param index  Instance index.
   * @param out    Output array (must be at least `itemSize` long).
   */
  getExtraAt(name: string, index: number, out: number[]): void {
    this.#assertValidIndex(index, "getExtraAt")
    const attr = this.geometry.getAttribute(name) as BufferAttribute | undefined
    if (!attr) throw new Error(`DynamicInstancedMesh: no extra attribute "${name}"`)

    const offset = index * attr.itemSize
    for (let i = 0; i < attr.itemSize; i++) {
      out[i] = attr.array[offset + i]
    }
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  #ensureCapacity(needed: number): void {
    if (needed > this._capacity) {
      const next = this._growthStrategy(this._capacity, needed)
      this.#reallocate(next)
    }
  }

  /**
   * Reallocates all managed attributes to `newCapacity` slots,
   * copying the live portion of each buffer.
   */
  #reallocate(newCapacity: number): void {
    const live = this._instanceCount

    // --- instanceMatrix ---
    const oldMatrix = this.instanceMatrix.array as Float32Array
    const newMatrix = new Float32Array(newCapacity * 16)
    newMatrix.set(oldMatrix.subarray(0, live * 16))
    this.instanceMatrix = new InstancedBufferAttribute(newMatrix, 16)
    this.instanceMatrix.needsUpdate = true

    // --- instanceColor ---
    if (this._enableColors) {
      this.#reallocateColorAttribute(newCapacity, live)
    }

    // --- extra attributes ---
    for (const [name, itemSize] of this._extraAttributeItemSizes) {
      this.#reallocateExtraAttribute(name, itemSize, newCapacity, live)
    }

    this._capacity = newCapacity
  }

  #allocateColorAttribute(capacity: number): void {
    // setColorAt lazily creates instanceColor on the first call with index 0.
    // We prime it here so subsequent setColorAt calls find the right array size.
    const array = new Float32Array(capacity * 3)
    this.instanceColor = new InstancedBufferAttribute(array, 3)
  }

  #reallocateColorAttribute(newCapacity: number, live: number): void {
    if (!this.instanceColor) {
      this.#allocateColorAttribute(newCapacity)
      return
    }
    const old = this.instanceColor.array as Float32Array
    const next = new Float32Array(newCapacity * 3)
    next.set(old.subarray(0, live * 3))
    this.instanceColor = new InstancedBufferAttribute(next, 3)
    this.instanceColor.needsUpdate = true
  }

  #allocateExtraAttribute(
    name: string,
    itemSize: 1 | 2 | 3 | 4,
    capacity: number
  ): void {
    const array = new Float32Array(capacity * itemSize)
    this.geometry.setAttribute(name, new InstancedBufferAttribute(array, itemSize))
  }

  #reallocateExtraAttribute(
    name: string,
    itemSize: 1 | 2 | 3 | 4,
    newCapacity: number,
    live: number
  ): void {
    const old = this.geometry.getAttribute(name) as BufferAttribute | undefined
    const next = new Float32Array(newCapacity * itemSize)
    if (old) next.set((old.array as Float32Array).subarray(0, live * itemSize))
    this.geometry.setAttribute(name, new BufferAttribute(next, itemSize));
    (this.geometry.getAttribute(name) as BufferAttribute).needsUpdate = true
  }

  #swapExtraAttribute(
    name: string,
    itemSize: number,
    dst: number,
    src: number
  ): void {
    const attr = this.geometry.getAttribute(name) as BufferAttribute | undefined
    if (!attr) return
    const arr = attr.array as Float32Array
    const dstOff = dst * itemSize
    const srcOff = src * itemSize
    for (let i = 0; i < itemSize; i++) arr[dstOff + i] = arr[srcOff + i]
    attr.needsUpdate = true
  }

  #assertColors(caller: string): void {
    if (!this._enableColors) {
      throw new Error(
        `DynamicInstancedMesh.${caller}: colors are disabled. ` +
        `Pass { enableColors: true } in the constructor options.`
      )
    }
  }

  #assertValidIndex(index: number, caller: string): void {
    if (index < 0 || index >= this._instanceCount) {
      throw new RangeError(
        `DynamicInstancedMesh.${caller}: index ${index} out of range ` +
        `[0, ${this._instanceCount}).`
      )
    }
  }
}
