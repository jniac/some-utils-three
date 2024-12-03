import { Vector3, Vector3Like } from 'three'

import { directionVectors } from './core'
import { Face } from './face'
import { World } from './world'

/**
 * Represents a chunk of voxels.
 * 
 * Chunk are not necessarily cubes, they can have different sizes in each dimension.
 */
export class Chunk {
  readonly sizeX: number
  readonly sizeY: number
  readonly sizeZ: number
  readonly sizeXY: number
  readonly sizeXYZ: number
  readonly voxelStateByteSize: number
  readonly voxelState: ArrayBuffer

  worldConnection: [world: World, worldIndex: number] | null = null

  get size() { return this.getSize() }

  constructor(size: number | Vector3Like = 16, voxelStateByteSize = 4) {
    const [sizeX, sizeY, sizeZ] = typeof size === 'number' ? [size, size, size] : [size.x, size.y, size.z]
    this.sizeX = sizeX
    this.sizeY = sizeY
    this.sizeZ = sizeZ
    this.sizeXY = this.sizeX * this.sizeY
    this.sizeXYZ = this.sizeX * this.sizeY * this.sizeZ
    this.voxelStateByteSize = voxelStateByteSize
    this.voxelState = new ArrayBuffer(this.sizeXYZ * voxelStateByteSize)
  }

  getSize(out = new Vector3()) {
    return out.set(this.sizeX, this.sizeY, this.sizeZ)
  }

  getVoxelStateAtIndex(index: number): DataView {
    if (index < 0 || index >= this.sizeXYZ) {
      throw new Error(`Index out of bounds: ${index}, size: ${this.sizeXYZ}`)
    }
    return new DataView(this.voxelState, index * this.voxelStateByteSize, this.voxelStateByteSize)
  }

  /**
   * Returns the voxel state at the given coordinates. Coordinates should be within
   * the bounds of the chunk.
   */
  getVoxelState(p: Vector3Like): DataView
  getVoxelState(x: number, y: number, z: number): DataView
  getVoxelState(...args: [Vector3Like] | [x: number, y: number, z: number]): DataView {
    const [x, y, z] = args.length === 1 ? [args[0].x, args[0].y, args[0].z] : args
    const { sizeX, sizeY, sizeZ, sizeXY, voxelStateByteSize, voxelState } = this
    if (x < 0 || x >= sizeX || y < 0 || y >= sizeY || z < 0 || z >= sizeZ) {
      throw new Error(`Coordinates out of bounds: ${x}, ${y}, ${z}, size: (${sizeX}, ${sizeY}, ${sizeZ})`)
    }
    const index = x + y * sizeX + z * sizeXY
    return new DataView(voxelState, index * voxelStateByteSize, voxelStateByteSize)
  }

  /**
   * Returns the voxel state at the given coordinates. If the coordinates are out 
   * of bounds, returns null.
  */
  tryGetVoxelState(p: Vector3Like): DataView | null
  tryGetVoxelState(x: number, y: number, z: number): DataView | null
  tryGetVoxelState(...args: [Vector3Like] | [x: number, y: number, z: number]): DataView | null {
    const [x, y, z] = args.length === 1 ? [args[0].x, args[0].y, args[0].z] : args
    const { sizeX, sizeY, sizeZ, sizeXY, voxelStateByteSize, voxelState } = this
    if (x < 0 || x >= sizeX || y < 0 || y >= sizeY || z < 0 || z >= sizeZ) {
      // TODO: Implement a lookup into neighboring chunks if worldConnection is set
      return null
    }
    return this.getVoxelState(x, y, z)
  }

  *voxelFaces(isFullDelegate: (data: DataView) => boolean = data => data.getUint8(0) !== 0) {
    const { sizeX, sizeY, sizeZ } = this
    const face = new Face(new Vector3(), 0)
    for (let x = 0; x < sizeX; x++) {
      for (let y = 0; y < sizeY; y++) {
        for (let z = 0; z < sizeZ; z++) {
          const data = this.getVoxelState(x, y, z)!
          const currentIsFull = isFullDelegate(data)
          if (currentIsFull) {
            for (let direction = 0; direction < 6; direction++) {
              const v = directionVectors[direction]
              const neighborData = this.tryGetVoxelState(x + v.x, y + v.y, z + v.z)
              const neighborIsFull = neighborData ? isFullDelegate(neighborData) : false
              if (!neighborIsFull) {
                face.position.set(x, y, z)
                face.direction = direction
                yield face
              }
            }
          }
        }
      }
    }
  }
}
