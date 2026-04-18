import { Box3, BufferAttribute, BufferGeometry, Vector3 } from 'three'

import { Face } from '../face'
import { World } from '../world'

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
const _faceMin = new Vector3()
const _faceMax = new Vector3()

export function createNaiveVoxelGeometry(
  faces: Iterable<Face> | (() => Generator<Face>),
  {
    /**
     * An offset applied to the position of each vertex. 
     * 
     * Useful for chunk geometries, where each chunk's geometry can be created with a local position and then offset to the correct world position.
     */
    positionOffset = new Vector3(),
    /**
     * If provided, this geometry will be mutated and returned. Otherwise, a new geometry will be created.
     */
    geometry = new BufferGeometry(),
  } = {},
) {
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

    // Update position and normal arrays
    _position.ensureSize(size + FACE_STRIDE)
    _normal.ensureSize(size + FACE_STRIDE)
    face.positionToArray(_position.array, size, positionOffset)
    face.normalToArray(_normal.array, size)

    // Update bounding box
    face.min(_faceMin)
    face.max(_faceMax)
    if (_faceMin.x < min.x) min.x = _faceMin.x
    if (_faceMin.y < min.y) min.y = _faceMin.y
    if (_faceMin.z < min.z) min.z = _faceMin.z
    if (_faceMax.x > max.x) max.x = _faceMax.x
    if (_faceMax.y > max.y) max.y = _faceMax.y
    if (_faceMax.z > max.z) max.z = _faceMax.z

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

export function createNaiveChunkGeometries(world: World): BufferGeometry[] {
  const geometries: BufferGeometry[] = []

  for (const { chunk } of world.enumerateChunks()) {
    const { worldPosition } = chunk.mountState!
    const geometry = createNaiveVoxelGeometry(chunk.allVoxelFaces(), { positionOffset: worldPosition })
    geometries.push(geometry)
  }

  return geometries
}