import { Vector3 } from 'three'
import { directionVectors } from './core'
import { Face } from './face'
import { World } from './world'

export class Chunk {
  readonly size: number
  readonly size2: number
  readonly size3: number
  readonly voxelStateByteSize: number
  readonly voxelState: ArrayBuffer

  worldConnection: [world: World, worldIndex: number] | null = null

  constructor(size = 16, voxelStateByteSize = 4) {
    this.size = size
    this.size2 = size * size
    this.size3 = size * size * size
    this.voxelStateByteSize = voxelStateByteSize
    this.voxelState = new ArrayBuffer((size ** 3) * voxelStateByteSize)
  }

  /**
   * Returns the voxel state at the given coordinates. Coordinates should be within
   * the bounds of the chunk.
   */
  getVoxelState(x: number, y: number, z: number): DataView {
    const { size, size2, size3, voxelStateByteSize, voxelState } = this
    const index = x + y * size + z * size2
    return new DataView(voxelState, index * voxelStateByteSize, voxelStateByteSize)
  }

  /**
   * Returns the voxel state at the given coordinates. If the coordinates are out 
   * of bounds, returns null.
   */
  tryGetVoxelState(x: number, y: number, z: number): DataView | null {
    const { size } = this
    if (x < 0 || x >= size || y < 0 || y >= size || z < 0 || z >= size) {
      // TODO: Implement a lookup into neighboring chunks if worldConnection is set
      return null
    }
    return this.getVoxelState(x, y, z)
  }

  *voxelFaces(isFullDelegate: (data: DataView) => boolean = data => data.getUint8(0) !== 0) {
    const { size } = this
    const face = new Face(new Vector3(), 0)
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        for (let z = 0; z < size; z++) {
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
