import { Vector3Like } from 'three'

const float64 = new Float64Array(1)
const uint32 = new Uint32Array(float64.buffer)

function mixFloat64(hash: number, value: number): number {
  // Object.is(-0, 0) is false, but -0 === 0 is true. Normalize both values so
  // the hash remains consistent with Vector3HashMap's equality function.
  float64[0] = value === 0 ? 0 : value
  hash = Math.imul(hash ^ uint32[0], 16777619)
  hash = Math.imul(hash ^ uint32[1], 16777619)
  return hash
}

export class HashMap<Key, Value> {
  #internal: {
    clone: (key: Key) => Key
    hash: (key: Key) => number
    equals: (a: Key, b: Key) => boolean
    map: Map<number, Array<{ key: Key; value: Value }>>
    size: number
  }

  get size() {
    return this.#internal.size
  }

  constructor(parameters: {
    hash: (key: Key) => number,
    equals: (a: Key, b: Key) => boolean,
    clone: (key: Key) => Key,
  }) {
    const { hash, equals, clone } = parameters
    if (!hash || !equals || !clone) {
      throw new Error('HashMap requires hash, equals, and clone functions')
    }
    this.#internal = {
      hash,
      equals,
      clone,
      map: new Map(),
      size: 0,
    }
  }

  hasKey(key: Key): boolean {
    const hash = this.#internal.hash(key)
    const bucket = this.#internal.map.get(hash)
    if (bucket) {
      for (const entry of bucket) {
        if (this.#internal.equals(entry.key, key)) {
          return true
        }
      }
    }
    return false
  }

  get(key: Key): Value | undefined {
    const hash = this.#internal.hash(key)
    const bucket = this.#internal.map.get(hash)
    if (bucket) {
      for (const entry of bucket) {
        if (this.#internal.equals(entry.key, key)) {
          return entry.value
        }
      }
    }
    return undefined
  }

  set(key: Key, value: Value): this {
    key = this.#internal.clone(key)
    const hash = this.#internal.hash(key)
    let bucket = this.#internal.map.get(hash)

    if (!bucket) {
      bucket = []
      this.#internal.map.set(hash, bucket)
    }

    // Check if the key already exists in the bucket
    for (const entry of bucket) {
      if (this.#internal.equals(entry.key, key)) {
        entry.value = value
        return this
      }
    }

    // If the key does not exist, add a new entry to the bucket
    bucket.push({ key, value })
    this.#internal.size++

    return this
  }

  *keys() {
    for (const bucket of this.#internal.map.values()) {
      for (const entry of bucket) {
        yield entry.key
      }
    }
  }

  *entries() {
    for (const bucket of this.#internal.map.values()) {
      for (const entry of bucket) {
        yield [entry.key, entry.value] as [Key, Value]
      }
    }
  }
}

export class Vector3HashMap<Value> extends HashMap<Vector3Like, Value> {
  constructor() {
    super({
      hash: ({ x, y, z }) => {
        let hash = 2166136261
        hash = mixFloat64(hash, x)
        hash = mixFloat64(hash, y)
        hash = mixFloat64(hash, z)
        return hash >>> 0
      },
      equals: (v1, v2) => {
        return v1.x === v2.x && v1.y === v2.y && v1.z === v2.z
      },
      clone: ({ x, y, z }) => {
        return { x, y, z }
      },
    })
  }
}

export class SpatialHashGrid3<Value> extends HashMap<Vector3Like, Value> {
  constructor(cellSize: number) {
    if (!Number.isFinite(cellSize) || cellSize <= 0) {
      throw new Error('SpatialHashGrid3 requires a finite cellSize greater than 0')
    }

    super({
      hash: ({ x, y, z }) => {
        const ix = Math.floor(x / cellSize)
        const iy = Math.floor(y / cellSize)
        const iz = Math.floor(z / cellSize)
        return (
          Math.imul(ix, 73856093) ^
          Math.imul(iy, 19349663) ^
          Math.imul(iz, 83492791)
        ) >>> 0
      },
      equals: (v1, v2) => {
        const ix1 = Math.floor(v1.x / cellSize)
        const iy1 = Math.floor(v1.y / cellSize)
        const iz1 = Math.floor(v1.z / cellSize)
        const ix2 = Math.floor(v2.x / cellSize)
        const iy2 = Math.floor(v2.y / cellSize)
        const iz2 = Math.floor(v2.z / cellSize)
        return ix1 === ix2 && iy1 === iy2 && iz1 === iz2
      },
      clone: v => {
        const x = Math.floor(v.x / cellSize) * cellSize
        const y = Math.floor(v.y / cellSize) * cellSize
        const z = Math.floor(v.z / cellSize) * cellSize
        return { x, y, z }
      },
    })
  }
}

export class HashMapArray<Key, Value> extends HashMap<Key, Value[]> {
  add(key: Key, value: Value): this {
    let array = this.get(key)
    if (!array) {
      array = []
      this.set(key, array)
    }
    array.push(value)
    return this
  }
}
