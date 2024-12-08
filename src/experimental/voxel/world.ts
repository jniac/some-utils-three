import { Box3, Vector3, Vector3Like } from 'three'

import { Chunk, defaultVoxelIsFullDelegate } from './chunk'
import { WorldIndexes, WorldMetrics } from './world-metrics'

function isDataViewZeroed(dataView: DataView) {
  for (let i = 0; i < dataView.byteLength; i++) {
    if (dataView.getUint8(i) !== 0) {
      return false
    }
  }
  return true
}

const defaultWorldProps = {
  metrics: new WorldMetrics(16, 16, 16, 1024, 1024, 1024, 1024, 1024, 1024),
  voxelStateByteSize: 4,
}

export class World {
  metrics: WorldMetrics
  voxelStateByteSize: number

  superChunks = new Map<number, Map<number, Chunk>>()

  emptyVoxelState: DataView

  constructor(props?: Partial<typeof defaultWorldProps>) {
    const {
      metrics,
      voxelStateByteSize,
    } = { ...defaultWorldProps, ...props }

    this.metrics = metrics.clone()
    this.voxelStateByteSize = voxelStateByteSize
    this.emptyVoxelState = new DataView(new ArrayBuffer(voxelStateByteSize))
  }

  computeChunkCount() {
    let count = 0
    for (const superChunk of this.superChunks.values()) {
      count += superChunk.size
    }
    return count
  }

  *enumerateChunks() {
    for (const [superChunkIndex, superChunk] of this.superChunks) {
      for (const [chunkIndex, chunk] of superChunk) {
        yield { superChunkIndex, chunkIndex, chunk }
      }
    }
  }

  computeVoxelBounds({
    voxelIsFullDelegate = <(data: DataView) => boolean>(data => data.getUint8(0) !== 0),
    out = new Box3(),
  } = {}) {
    out.makeEmpty()
    const chunkPosition = new Vector3()
    const chunkBox3 = new Box3()
    for (const { superChunkIndex, chunkIndex, chunk } of this.enumerateChunks()) {
      this.metrics.fromIndexes(superChunkIndex, chunkIndex, 0, chunkPosition)
      chunk.computeBounds({ voxelIsFullDelegate, out: chunkBox3 })
      chunkBox3.min.add(chunkPosition)
      chunkBox3.max.add(chunkPosition)
      out.union(chunkBox3)
    }
    return out
  }

  computeChunkBounds({
    out = new Box3(),
  } = {}) {
    out.makeEmpty()
    const chunkPosition = new Vector3()
    for (const { superChunkIndex, chunkIndex } of this.enumerateChunks()) {
      this.metrics.fromIndexes(superChunkIndex, chunkIndex, 0, chunkPosition)
      out.expandByPoint(chunkPosition)
    }
    out.max.x += this.metrics.chunkSizeX - 1
    out.max.y += this.metrics.chunkSizeY - 1
    out.max.z += this.metrics.chunkSizeZ - 1
    return out
  }

  /**
   * Returns the chunk at the given "chunk" coordinates. If the chunk does not exist,
   * null is returned.
   * 
   * NOTE: To get the "surrounding" chunk of a position, use {@link tryGetSurroundingChunkAt}. 
   */
  tryGetChunk(p: Vector3Like): Chunk | null
  tryGetChunk(x: number, y: number, z: number): Chunk | null
  tryGetChunk(...args: [Vector3Like] | [x: number, y: number, z: number]): Chunk | null {
    let [x, y, z] = args.length === 1 ? [args[0].x, args[0].y, args[0].z] : args

    const {
      chunkSizeX,
      chunkSizeY,
      chunkSizeZ,
      superChunkSizeX,
      superChunkSizeY,
      superChunkSizeZ,
      superChunkSizeXY,
    } = this.metrics

    const superChunkIndexX = Math.floor(x / chunkSizeX)
    const superChunkIndexY = Math.floor(y / chunkSizeY)
    const superChunkIndexZ = Math.floor(z / chunkSizeZ)

    const superChunkIndex = this.metrics.computeSuperChunkIndex(superChunkIndexX, superChunkIndexY, superChunkIndexZ)

    const superChunk = this.superChunks.get(superChunkIndex)
    if (!superChunk)
      return null

    const localXInSuperChunk = x - superChunkIndexX * superChunkSizeX
    const localYInSuperChunk = y - superChunkIndexY * superChunkSizeY
    const localZInSuperChunk = z - superChunkIndexZ * superChunkSizeZ
    const chunkIndexX =
      + localXInSuperChunk
      + localYInSuperChunk * superChunkSizeX
      + localZInSuperChunk * superChunkSizeXY

    return superChunk.get(chunkIndexX) ?? null
  }

  /**
   * Returns the "surrounding" chunk of the given position. If the chunk does not 
   * exist, null is returned.
   */
  tryGetSurroundingChunkAt(x: number, y: number, z: number): Chunk | null
  tryGetSurroundingChunkAt(p: Vector3Like): Chunk | null
  tryGetSurroundingChunkAt(...args: [Vector3Like] | [x: number, y: number, z: number]): Chunk | null {
    const [x, y, z] = args.length === 1 ? [args[0].x, args[0].y, args[0].z] : args

    const indexes = this.metrics.toIndexes(x, y, z)

    return this.tryGetChunkByIndexes(indexes)
  }

  tryGetChunkByIndexes(superChunkIndex: number, chunkIndex: number, voxelIndex?: number): Chunk | null
  tryGetChunkByIndexes(indexes: WorldIndexes): Chunk | null
  tryGetChunkByIndexes(...args: any[]): Chunk | null {
    const [superChunkIndex, chunkIndex] = args.length === 1 ? [args[0].superChunk, args[0].chunk] : args

    const superChunk = this.superChunks.get(superChunkIndex)
    if (!superChunk)
      return null

    return superChunk.get(chunkIndex) ?? null
  }

  /**
   * Returns the voxel state at the given coordinates. Coordinates should be within
   * the bounds of the chunk.
   */
  getVoxelState(p: Vector3Like): DataView
  getVoxelState(x: number, y: number, z: number): DataView
  getVoxelState(...args: [Vector3Like] | [x: number, y: number, z: number]): DataView {
    const [x, y, z] = args.length === 1 ? [args[0].x, args[0].y, args[0].z] : args

    const indexes = this.metrics.toIndexes(x, y, z)

    const superChunk = this.superChunks.get(indexes.x)
    if (!superChunk)
      return this.emptyVoxelState

    const chunk = superChunk.get(indexes.y)
    if (!chunk)
      return this.emptyVoxelState

    return chunk.getVoxelStateAtIndex(indexes.z)
  }

  setVoxelState(p: Vector3Like, state: DataView): boolean
  setVoxelState(x: number, y: number, z: number, state: DataView): boolean
  setVoxelState(...args: [Vector3Like, DataView] | [x: number, y: number, z: number, state: DataView]): boolean {
    const [x, y, z, state] = args.length === 2 ? [args[0].x, args[0].y, args[0].z, args[1]] : args

    const stateIsZero = isDataViewZeroed(state)

    const indexes = this.metrics.toIndexes(x, y, z)

    const { superChunks, voxelStateByteSize } = this

    let superChunk = superChunks.get(indexes.superChunk)
    if (!superChunk) {
      if (stateIsZero)
        return false // No need to create a new chunk if the state is zero

      superChunk = new Map<number, Chunk>()
      superChunks.set(indexes.superChunk, superChunk)
    }

    let chunk = superChunk.get(indexes.chunk)
    if (!chunk) {
      if (stateIsZero)
        return false // No need to create a new chunk if the state is zero

      chunk = new Chunk(this.metrics.chunkSize, voxelStateByteSize)
      chunk.mount(this, indexes.superChunk, indexes.chunk)
      superChunk.set(indexes.chunk, chunk)
    }

    const existingState = chunk.getVoxelStateAtIndex(indexes.voxel)
    let hasChanged = false
    for (let i = 0; i < voxelStateByteSize; i++) {
      const byte = state.getUint8(i)
      if (byte !== existingState.getUint8(i)) {
        existingState.setUint8(i, byte)
        hasChanged = true
      }
    }

    return hasChanged
  }

  /**
   * Enumerates all voxel faces of the chunks that intersect with the given bounds.
   */
  *chunkVoxelFaces(bounds: Box3, {
    voxelIsFullDelegate = defaultVoxelIsFullDelegate,
  } = {}) {
    const { chunkSize, chunkSizeX, chunkSizeY, chunkSizeZ } = this.metrics
    const { x: minChunkX, y: minChunkY, z: minChunkZ } = bounds.min
      .clone()
      .divide(chunkSize)
      .floor()
    const { x: maxChunkX, y: maxChunkY, z: maxChunkZ } = bounds.max
      .clone()
      .divide(chunkSize)
      .ceil()
    const offset = new Vector3()
    for (let z = minChunkZ; z < maxChunkZ; z++) {
      for (let y = minChunkY; y < maxChunkY; y++) {
        for (let x = minChunkX; x < maxChunkX; x++) {
          const chunk = this.tryGetChunk(x, y, z)
          if (chunk) {
            offset.set(x * chunkSizeX, y * chunkSizeY, z * chunkSizeZ)
            yield* chunk.voxelFaces({ offset, voxelIsFullDelegate })
          }
        }
      }
    }
  }
}

