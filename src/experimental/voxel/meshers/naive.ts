import { BufferAttribute, BufferGeometry } from 'three'

import { VoxelSpaceFace } from '../VoxelSpaceFace'

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
}

const _position = new ResizableFloat32Array(256 * 3)
const _normal = new ResizableFloat32Array(256 * 3)

export function createNaiveVoxelGeometry(faces: Iterable<VoxelSpaceFace> | (() => Generator<VoxelSpaceFace>), {
  geometry = new BufferGeometry(),
} = {}) {
  const iterableFaces = typeof faces === 'function' ? faces() : faces

  const STRIDE_3 = 2 * 3 * 3 // 2 triangles * 3 vertices * 3 components

  let faceCount = 0
  for (const face of iterableFaces) {
    const size3 = faceCount * STRIDE_3
    _position.ensureSize(size3 + STRIDE_3)
    _normal.ensureSize(size3 + STRIDE_3)
    face.positionToArray(_position.array, size3)
    face.normalToArray(_normal.array, size3)
    faceCount++
  }

  geometry.setAttribute('position', new BufferAttribute(new Float32Array(_position.array.buffer, 0, faceCount * STRIDE_3), 3))
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(_normal.array.buffer, 0, faceCount * STRIDE_3), 3))

  return geometry
}