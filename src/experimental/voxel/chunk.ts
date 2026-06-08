import { Box3, Vector3, Vector3Like } from 'three'

import { Direction, directionVectors } from './core'
import { Face } from './face'
import { World } from './world'
import { WorldIndexes } from './world-metrics'

const _face = new Face(new Vector3(), 0)

export type VoxelState = Uint8Array
export type VoxelIsFullDelegate = (state: Uint8Array, byteOffset: number) => boolean

export const defaultVoxelIsFullDelegate: VoxelIsFullDelegate = (state, byteOffset) => state[byteOffset] !== 0

type WorldMountState = {
  world: World
  regionIndex: number
  chunkIndex: number
  worldPosition: Vector3
  adjacentChunksIndexes: readonly WorldIndexes[]
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
  readonly voxelState: Uint8Array

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
    this.voxelState = new Uint8Array(this.sizeXYZ * voxelStateByteSize)
  }

  mount(world: World, regionIndex: number, chunkIndex: number) {
    const worldPosition = world.metrics.fromIndexes(regionIndex, chunkIndex, 0)
    const adjacentChunksIndexes = world.metrics.getAdjacentChunkIndexes(regionIndex, chunkIndex)
    this.mountState = { world, regionIndex, chunkIndex, worldPosition, adjacentChunksIndexes }
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

  getVoxelStateOffsetAtIndex(index: number): number {
    if (index < 0 || index >= this.sizeXYZ) {
      throw new Error(`Index out of bounds: ${index}, size: ${this.sizeXYZ}`)
    }
    return index * this.voxelStateByteSize
  }

  getVoxelStateAtIndex(index: number, out?: Uint8Array): Uint8Array {
    const offset = this.getVoxelStateOffsetAtIndex(index)
    if (out) {
      out.set(this.voxelState.subarray(offset, offset + this.voxelStateByteSize))
      return out
    }
    return this.voxelState.subarray(offset, offset + this.voxelStateByteSize)
  }

  getVoxelStateAtCoordinates(x: number, y: number, z: number, out?: Uint8Array): Uint8Array {
    const index = this.getVoxelIndex(x, y, z)
    return this.getVoxelStateAtIndex(index, out)
  }

  setVoxelStateAtIndex(index: number, state: Uint8Array): boolean {
    const offset = this.getVoxelStateOffsetAtIndex(index)
    let hasChanged = false
    for (let i = 0; i < this.voxelStateByteSize; i++) {
      const byte = state[i] ?? 0
      if (byte !== this.voxelState[offset + i]) {
        this.voxelState[offset + i] = byte
        hasChanged = true
      }
    }
    return hasChanged
  }

  setVoxelStateAtCoordinates(x: number, y: number, z: number, state: Uint8Array): boolean {
    const index = this.getVoxelIndex(x, y, z)
    return this.setVoxelStateAtIndex(index, state)
  }

  isVoxelFullAtIndex(index: number, voxelIsFullDelegate = defaultVoxelIsFullDelegate): boolean {
    return voxelIsFullDelegate(this.voxelState, this.getVoxelStateOffsetAtIndex(index))
  }

  isVoxelFullAtCoordinates(x: number, y: number, z: number, voxelIsFullDelegate = defaultVoxelIsFullDelegate): boolean {
    const index = this.getVoxelIndex(x, y, z)
    return this.isVoxelFullAtIndex(index, voxelIsFullDelegate)
  }

  /**
   * Returns the voxel state at the given coordinates. Coordinates should be within
   * the bounds of the chunk [(0, 0, 0), (sizeX, sizeY, sizeZ)].
   */
  getVoxelIndex(x: number, y: number, z: number): number {
    const { sizeX, sizeY, sizeZ, sizeXY } = this
    if (x < 0 || x >= sizeX || y < 0 || y >= sizeY || z < 0 || z >= sizeZ) {
      throw new Error(`Coordinates out of bounds: ${x}, ${y}, ${z}, size: (${sizeX}, ${sizeY}, ${sizeZ})`)
    }
    return x + y * sizeX + z * sizeXY
  }

  /**
   * Handy method for getting voxel state with different argument patterns.
   * 
   * Notes:
   * - For performance reasons, and avoid unnecessary checks, use getVoxelStateAtIndex or getVoxelStateAtCoordinates when possible.
   */
  getVoxelState(
    ...args:
      | [number]
      | [Vector3Like]
      | [x: number, y: number, z: number]
  ): Uint8Array {
    if (args.length === 1) {
      const arg = args[0]
      if (typeof arg === 'number') {
        return this.getVoxelStateAtIndex(arg)
      }
      return this.getVoxelStateAtCoordinates(arg.x, arg.y, arg.z)
    }

    if (args.length === 3) {
      const [x, y, z] = args
      return this.getVoxelStateAtCoordinates(x, y, z)
    }

    throw new Error(`Invalid arguments: ${args}`)
  }

  /**
   * Handy method for setting voxel state with different argument patterns.
   * 
   * Notes:
   * - For performance reasons, and avoid unnecessary checks, use setVoxelStateAtIndex or setVoxelStateAtCoordinates when possible.
   */
  setVoxelState(index: number, state: Uint8Array): boolean
  setVoxelState(p: Vector3Like, state: Uint8Array): boolean
  setVoxelState(x: number, y: number, z: number, state: Uint8Array): boolean
  setVoxelState(
    ...args:
      | [index: number, state: Uint8Array]
      | [p: Vector3Like, state: Uint8Array]
      | [x: number, y: number, z: number, state: Uint8Array]
  ): boolean {
    if (args.length === 2) {
      const [arg1, state] = args
      if (typeof arg1 === 'number') {
        return this.setVoxelStateAtIndex(arg1, state)
      }
      return this.setVoxelStateAtCoordinates(arg1.x, arg1.y, arg1.z, state)
    }

    if (args.length === 4) {
      const [x, y, z, state] = args
      return this.setVoxelStateAtCoordinates(x, y, z, state)
    }

    throw new Error(`Invalid arguments: ${args}`)
  }

  *voxelStates() {
    const { sizeX, sizeXY, sizeY, sizeZ } = this
    const { voxelState, voxelStateByteSize } = this
    for (let z = 0; z < sizeZ; z++) {
      for (let y = 0; y < sizeY; y++) {
        for (let x = 0; x < sizeX; x++) {
          const index = x + y * sizeX + z * sizeXY
          const offset = index * voxelStateByteSize
          yield voxelState.subarray(offset, offset + voxelStateByteSize)
        }
      }
    }
  }

  computePlainVoxelCount(voxelIsFullDelegate = defaultVoxelIsFullDelegate) {
    let count = 0
    const { sizeXYZ, voxelState, voxelStateByteSize } = this
    for (let index = 0; index < sizeXYZ; index++) {
      if (voxelIsFullDelegate(voxelState, index * voxelStateByteSize)) {
        count++
      }
    }
    return count
  }

  computeBounds({
    voxelIsFullDelegate = defaultVoxelIsFullDelegate,
    out = new Box3(),
  } = {}) {
    out.makeEmpty()
    const { sizeX, sizeXY, sizeY, sizeZ, voxelState, voxelStateByteSize } = this
    for (let z = 0; z < sizeZ; z++) {
      for (let y = 0; y < sizeY; y++) {
        for (let x = 0; x < sizeX; x++) {
          const index = x + y * sizeX + z * sizeXY
          if (voxelIsFullDelegate(voxelState, index * voxelStateByteSize)) {
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
  tryGetVoxelState(p: Vector3Like): Uint8Array | null
  tryGetVoxelState(x: number, y: number, z: number): Uint8Array | null
  tryGetVoxelState(...args: [Vector3Like] | [x: number, y: number, z: number]): Uint8Array | null {
    const [x, y, z] = args.length === 1 ? [args[0].x, args[0].y, args[0].z] : args
    const { sizeX, sizeY, sizeZ } = this
    if (x < 0 || x >= sizeX || y < 0 || y >= sizeY || z < 0 || z >= sizeZ) {
      // TODO: Implement a lookup into neighboring chunks if worldConnection is set
      return null
    }
    return this.getVoxelState(x, y, z)
  }

  tryGetVoxelStateOffset(x: number, y: number, z: number): number | null {
    const { sizeX, sizeY, sizeZ } = this
    if (x < 0 || x >= sizeX || y < 0 || y >= sizeY || z < 0 || z >= sizeZ) {
      return null
    }
    return (x + y * sizeX + z * this.sizeXY) * this.voxelStateByteSize
  }

  /**
   * Generates all visible faces of the voxels in the chunk.
   * 
   * Notes:
   * - ⚠️ The yielded face object is reused for each iteration, so it should not be modified, nor stored.
   */
  *allVoxelFaces({
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
          const currentIsFull = voxelIsFullDelegate(voxelState, index * voxelStateByteSize)
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
                adjacentIsFull = voxelIsFullDelegate(voxelState, adjacentIndex * voxelStateByteSize)
              } else {
                if (!ignoreAdjacentChunks) {
                  const adjacentChunk = this.getAdjacentChunk(adjacentDirection)
                  if (adjacentChunk) {
                    const adjacentOffset = adjacentChunk.tryGetVoxelStateOffset(mod(nx, sizeX), mod(ny, sizeY), mod(nz, sizeZ))
                    adjacentIsFull = adjacentOffset === null
                      ? false
                      : voxelIsFullDelegate(adjacentChunk.voxelState, adjacentOffset)
                  }
                }
              }
              if (!adjacentIsFull) {
                _face.voxel.set(offx + x, offy + y, offz + z)
                _face.normalDirection = direction
                yield _face
              }
            }
          }
        }
      }
    }
  }

  /**
   * Generates all greedy boxes in the chunk.
   * 
   * Notes:
   * - ⚠️ The yielded box instance is reused for each iteration, so it should not be modified, nor stored.
   * - The boxes are represented as Box3 with integer min and max coordinates.
   * - The boxes are generated using a greedy algorithm, so they may not be optimal.
   * - The boxes are guaranteed to be non-overlapping.
   * - The boxes are generated in an arbitrary order.
   */
  *allGreedyBoxes({
    voxelIsFullDelegate = defaultVoxelIsFullDelegate,
  } = {}) {
    const { sizeX, sizeXY, sizeY, sizeZ, voxelState, voxelStateByteSize } = this
    const visited = new Uint8Array(this.sizeXYZ)

    const box = new Box3()
    for (let z = 0; z < sizeZ; z++) {
      for (let y = 0; y < sizeY; y++) {
        for (let x = 0; x < sizeX; x++) {
          const index = x + y * sizeX + z * sizeXY
          if (visited[index]) continue
          if (voxelIsFullDelegate(voxelState, index * voxelStateByteSize)) {
            let maxX = x, maxY = y, maxZ = z

            let canExpandX = true
            let canExpandY = true
            let canExpandZ = true

            while (canExpandX || canExpandY || canExpandZ) {

              // --- Try expand X ---
              if (canExpandX && maxX + 1 < sizeX) {
                let valid = true
                for (let j = y; j <= maxY && valid; j++) {
                  for (let k = z; k <= maxZ; k++) {
                    const idx = (maxX + 1) + j * sizeX + k * sizeXY
                    if (visited[idx]) { valid = false; break }
                    if (!voxelIsFullDelegate(voxelState, idx * voxelStateByteSize)) { valid = false; break }
                  }
                }
                if (valid) {
                  maxX++
                } else {
                  canExpandX = false
                }
              } else {
                canExpandX = false
              }

              // --- Try expand Y ---
              if (canExpandY && maxY + 1 < sizeY) {
                let valid = true
                for (let i = x; i <= maxX && valid; i++) {
                  for (let k = z; k <= maxZ; k++) {
                    const idx = i + (maxY + 1) * sizeX + k * sizeXY
                    if (visited[idx]) { valid = false; break }
                    if (!voxelIsFullDelegate(voxelState, idx * voxelStateByteSize)) { valid = false; break }
                  }
                }
                if (valid) {
                  maxY++
                } else {
                  canExpandY = false
                }
              } else {
                canExpandY = false
              }

              // --- Try expand Z ---
              if (canExpandZ && maxZ + 1 < sizeZ) {
                let valid = true
                for (let i = x; i <= maxX && valid; i++) {
                  for (let j = y; j <= maxY; j++) {
                    const idx = i + j * sizeX + (maxZ + 1) * sizeXY
                    if (visited[idx]) { valid = false; break }
                    if (!voxelIsFullDelegate(voxelState, idx * voxelStateByteSize)) { valid = false; break }
                  }
                }
                if (valid) {
                  maxZ++
                } else {
                  canExpandZ = false
                }
              } else {
                canExpandZ = false
              }
            }

            box.min.set(x, y, z)
            box.max.set(maxX + 1, maxY + 1, maxZ + 1)

            // Mark visited
            for (let k = box.min.z; k < box.max.z; k++) {
              for (let j = box.min.y; j < box.max.y; j++) {
                for (let i = box.min.x; i < box.max.x; i++) {
                  const idx = i + j * sizeX + k * sizeXY
                  visited[idx] = 1
                }
              }
            }

            yield box
          }
        }
      }
    }
  }
}
