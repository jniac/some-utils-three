import { Box3, Vector3, Vector3Like } from 'three'

import { Direction, directionVectors } from './core'
import { Face } from './face'
import { World } from './world'
import { WorldIndexes } from './world-metrics'

const _face = new Face(new Vector3(), 0)

export const defaultVoxelIsFullDelegate = (data: DataView) => data.getUint8(0) !== 0

type WorldMountState = {
  world: World
  superChunkIndex: number
  chunkIndex: number
  position: Vector3
  adjacentChunksIndexes: WorldIndexes[]
}

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

  get size() { return this.getSize() }

  mountState: WorldMountState | null = null

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

  mount(world: World, superChunkIndex: number, chunkIndex: number) {
    const position = world.metrics.fromIndexes(superChunkIndex, chunkIndex, 0)
    const adjacentChunksIndexes = world.metrics.getAdjacentChunkIndexes(superChunkIndex, chunkIndex)
    this.mountState = { world, superChunkIndex, chunkIndex, position, adjacentChunksIndexes }
  }

  unmount() {
    this.mountState = null
  }

  getAdjacentChunk(direction: Direction): Chunk | null {
    const { mountState } = this
    if (!mountState) {
      return null
    }
    const { world, adjacentChunksIndexes } = mountState
    const chunkIndexes = adjacentChunksIndexes[direction]
    return world.tryGetChunkByIndexes(chunkIndexes)
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
   * the bounds of the chunk [(0, 0, 0), (sizeX, sizeY, sizeZ)].
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

  *voxelStates() {
    const { sizeX, sizeXY, sizeY, sizeZ } = this
    const { voxelState, voxelStateByteSize } = this
    for (let z = 0; z < sizeZ; z++) {
      for (let y = 0; y < sizeY; y++) {
        for (let x = 0; x < sizeX; x++) {
          const index = x + y * sizeX + z * sizeXY
          yield new DataView(voxelState, index * voxelStateByteSize, voxelStateByteSize)
        }
      }
    }
  }

  computeBounds({
    voxelIsFullDelegate = <(data: DataView) => boolean>(data => data.getUint8(0) !== 0),
    out = new Box3(),
  } = {}) {
    out.makeEmpty()
    const { sizeX, sizeXY, sizeY, sizeZ, voxelState, voxelStateByteSize } = this
    for (let z = 0; z < sizeZ; z++) {
      for (let y = 0; y < sizeY; y++) {
        for (let x = 0; x < sizeX; x++) {
          const index = x + y * sizeX + z * sizeXY
          const data = new DataView(voxelState, index * voxelStateByteSize, voxelStateByteSize)
          if (voxelIsFullDelegate(data)) {
            out.expandByPoint(new Vector3(x, y, z))
          }
        }
      }
    }
    return out
  }

  /**
   * Returns the voxel state at the given coordinates. If the coordinates are out 
   * of bounds, returns null.
  */
  tryGetVoxelState(p: Vector3Like): DataView | null
  tryGetVoxelState(x: number, y: number, z: number): DataView | null
  tryGetVoxelState(...args: [Vector3Like] | [x: number, y: number, z: number]): DataView | null {
    const [x, y, z] = args.length === 1 ? [args[0].x, args[0].y, args[0].z] : args
    const { sizeX, sizeY, sizeZ } = this
    if (x < 0 || x >= sizeX || y < 0 || y >= sizeY || z < 0 || z >= sizeZ) {
      // TODO: Implement a lookup into neighboring chunks if worldConnection is set
      return null
    }
    return this.getVoxelState(x, y, z)
  }

  /**
   * NOTE: the face object is reused for each iteration, so it should not be modified, nor stored.
   */
  *voxelFaces({
    offset: { x: offx, y: offy, z: offz } = <Vector3Like>{ x: 0, y: 0, z: 0 },
    voxelIsFullDelegate = defaultVoxelIsFullDelegate,
    /**
     * If true, adjacent chunks will be ignored when checking if a face is visible.
     * 
     * Useful when you want to render a single chunk in isolation.
     * 
     * Defaults to false.
     */
    ignoreAdjacentChunks = false,
  } = {}) {
    const mod = (n: number, m: number) => n < 0 ? m + n : n >= m ? n - m : n
    const { sizeX, sizeXY, sizeY, sizeZ, voxelState, voxelStateByteSize } = this
    for (let z = 0; z < sizeZ; z++) {
      for (let y = 0; y < sizeY; y++) {
        for (let x = 0; x < sizeX; x++) {
          const index = x + y * sizeX + z * sizeXY
          const data = new DataView(voxelState, index * voxelStateByteSize, voxelStateByteSize)
          const currentIsFull = voxelIsFullDelegate(data)
          if (currentIsFull) {
            for (let direction = 0; direction < 6; direction++) {
              const v = directionVectors[direction]
              const nx = x + v.x, ny = y + v.y, nz = z + v.z
              const adjacentDirection =
                nx < 0 || nx >= sizeX || ny < 0 || ny >= sizeY || nz < 0 || nz >= sizeZ
                  ? direction
                  : null
              let adjacentIsFull = false
              if (adjacentDirection === null) {
                const adjacentIndex = nx + ny * sizeX + nz * sizeXY
                const adjacentData = new DataView(voxelState, adjacentIndex * voxelStateByteSize, voxelStateByteSize)
                adjacentIsFull = voxelIsFullDelegate(adjacentData)
              } else {
                if (!ignoreAdjacentChunks) {
                  const adjacentData = this.getAdjacentChunk(adjacentDirection)
                    ?.getVoxelState(mod(nx, sizeX), mod(ny, sizeY), mod(nz, sizeZ)) ?? null
                  adjacentIsFull = adjacentData ? voxelIsFullDelegate(adjacentData) : false
                }
              }
              if (!adjacentIsFull) {
                _face.position.set(offx + x, offy + y, offz + z)
                _face.direction = direction
                yield _face
              }
            }
          }
        }
      }
    }
  }
}
