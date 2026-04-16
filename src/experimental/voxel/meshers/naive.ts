import { Box3, BufferAttribute, BufferGeometry } from 'three'

import { Face } from '../face'

class ResizableFloat32Array {
  array = new Float32Array(0)
  constructor(initialSize = 0) {
    this.ensureSize(initialSize)
  }
  ensureSize(size: number) {
    if (this.array.length < size) {
      const p = Math.ceil(Math.log(size) / Math.log(2))
      const newSize = 1 << p
      const newArray = new Float32Array(newSize)
      newArray.set(this.array)
      this.array = newArray
    }
    return this.array
  }
  copy(length: number) {
    return new Float32Array(this.array.buffer, 0, length).slice() // slice to copy the array (otherwise it's a view)
  }
}

const _position = new ResizableFloat32Array(256 * 3)
const _normal = new ResizableFloat32Array(256 * 3)

export function createNaiveVoxelGeometry(faces: Iterable<Face> | (() => Generator<Face>), {
  geometry = new BufferGeometry(),
} = {}) {
  const iterableFaces = typeof faces === 'function' ? faces() : faces

  const FACE_STRIDE = 2 * 3 * 3 // 2 triangles * 3 vertices * 3 components

  _position.array.fill(0)
  _normal.array.fill(0)

  geometry.boundingBox ??= new Box3()
  const { min, max } = geometry.boundingBox
  min.set(Infinity, Infinity, Infinity)
  max.set(-Infinity, -Infinity, -Infinity)

  let faceCount = 0
  for (const face of iterableFaces) {
    const size = faceCount * FACE_STRIDE
    _position.ensureSize(size + FACE_STRIDE)
    _normal.ensureSize(size + FACE_STRIDE)
    face.positionToArray(_position.array, size)

    for (let i = 0; i < FACE_STRIDE; i += 3) {
      const x = _position.array[size + i]
      const y = _position.array[size + i + 1]
      const z = _position.array[size + i + 2]
      if (x < min.x) min.x = x
      if (y < min.y) min.y = y
      if (z < min.z) min.z = z
      if (x > max.x) max.x = x
      if (y > max.y) max.y = y
      if (z > max.z) max.z = z
    }

    face.normalToArray(_normal.array, size)
    faceCount++
  }

  if (faceCount === 0) {
    // Empty geometry
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(9), 3))
    geometry.setAttribute('normal', new BufferAttribute(new Float32Array(9), 3))
  } else {
    geometry.setAttribute('position', new BufferAttribute(_position.copy(faceCount * FACE_STRIDE), 3))
    geometry.setAttribute('normal', new BufferAttribute(_normal.copy(faceCount * FACE_STRIDE), 3))
  }

  return geometry
}