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
  voxelStateByteSize: 4, // Enough for 32 bits of data per voxel, which should be sufficient for most use cases
}

export class World {
  metrics: WorldMetrics
  voxelStateByteSize: number

  regions = new Map<number, Map<number, Chunk>>()

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

  /**
   * Creates a new voxel state. 
   * 
   * Notes:
   * - The state can be initialized with an array of u32 values or an ArrayBuffer. 
   * - If no data is provided, the state will be initialized with zeros.
   */
  createVoxelState(...args: number[] | [data: ArrayBufferLike]): DataView {
    const state = new DataView(new ArrayBuffer(this.voxelStateByteSize))
    if (args.length === 1 && args[0] instanceof ArrayBuffer) {
      new Uint8Array(state.buffer).set(new Uint8Array(args[0]))
    } else if (args.length > 0) {
      (args as number[]).forEach((value, index) => {
        state.setUint32(index, value)
      })
    }
    return state
  }

  voxelStateToString(state: DataView) {
    let str = ''
    for (let i = 0; i < state.byteLength; i++) {
      str += state.getUint8(i).toString(16).padStart(2, '0')
    }
    return str
  }

  computeChunkCount() {
    let count = 0
    for (const region of this.regions.values()) {
      count += region.size
    }
    return count
  }

  computePlainVoxelCount(
    voxelIsFullDelegate = <(data: DataView) => boolean>(data => data.getUint8(0) !== 0)
  ) {
    let count = 0
    for (const region of this.regions.values()) {
      for (const chunk of region.values()) {
        for (const state of chunk.voxelStates()) {
          if (voxelIsFullDelegate(state)) {
            count++
          }
        }
      }
    }
    return count
  }

  static ChunkIteration = class {
    constructor(
      /**
       * The index of the chunk iteration, starting from 0.
       */
      public i: number,
      /**
       * The index of the region containing the chunk.
       */
      public regionIndex: number,
      /**
       * The index of the chunk within the region.
       */
      public chunkIndex: number,
      /**
       * The chunk instance.
       */
      public chunk: Chunk,
    ) { }
  };

  *enumerateChunks(): Iterable<InstanceType<typeof World.ChunkIteration>> {
    let i = 0
    for (const [regionIndex, region] of this.regions) {
      for (const [chunkIndex, chunk] of region) {
        yield new World.ChunkIteration(i++, regionIndex, chunkIndex, chunk)
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
    for (const { regionIndex, chunkIndex, chunk } of this.enumerateChunks()) {
      this.metrics.fromIndexes(regionIndex, chunkIndex, 0, chunkPosition)
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
    for (const { regionIndex, chunkIndex } of this.enumerateChunks()) {
      this.metrics.fromIndexes(regionIndex, chunkIndex, 0, chunkPosition)
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
    const [x, y, z] = args.length === 1 ? [args[0].x, args[0].y, args[0].z] : args

    const {
      regionSizeX,
      regionSizeY,
      regionSizeZ,
      regionSizeXY,
    } = this.metrics

    const regionIndexX = Math.floor(x / regionSizeX)
    const regionIndexY = Math.floor(y / regionSizeY)
    const regionIndexZ = Math.floor(z / regionSizeZ)

    const regionIndex = this.metrics.computeRegionIndex(regionIndexX, regionIndexY, regionIndexZ)

    const region = this.regions.get(regionIndex)
    if (!region)
      return null

    const localXInRegion = x - regionIndexX * regionSizeX
    const localYInRegion = y - regionIndexY * regionSizeY
    const localZInRegion = z - regionIndexZ * regionSizeZ
    const chunkIndex =
      + localXInRegion
      + localYInRegion * regionSizeX
      + localZInRegion * regionSizeXY

    return region.get(chunkIndex) ?? null
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

  tryGetChunkByIndexes(regionIndex: number, chunkIndex: number, voxelIndex?: number): Chunk | null
  tryGetChunkByIndexes(indexes: WorldIndexes): Chunk | null
  tryGetChunkByIndexes(...args: any[]): Chunk | null {
    const [regionIndex, chunkIndex] = args.length === 1 ? [args[0].region, args[0].chunk] : args

    const region = this.regions.get(regionIndex)
    if (!region)
      return null

    return region.get(chunkIndex) ?? null
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

    const region = this.regions.get(indexes.region)
    if (!region)
      return this.emptyVoxelState

    const chunk = region.get(indexes.chunk)
    if (!chunk)
      return this.emptyVoxelState

    return chunk.getVoxelStateAtIndex(indexes.voxel)
  }

  setVoxelState(p: Vector3Like, state: DataView): boolean
  setVoxelState(x: number, y: number, z: number, state: DataView): boolean
  setVoxelState(...args: [Vector3Like, DataView] | [x: number, y: number, z: number, state: DataView]): boolean {
    const [x, y, z, state] = args.length === 2 ? [args[0].x, args[0].y, args[0].z, args[1]] : args

    const stateIsZero = isDataViewZeroed(state)

    const indexes = this.metrics.toIndexes(x, y, z)

    const { regions, voxelStateByteSize } = this

    let region = regions.get(indexes.region)
    if (!region) {
      if (stateIsZero)
        return false // No need to create a new chunk if the state is zero

      region = new Map<number, Chunk>()
      regions.set(indexes.region, region)
    }

    let chunk = region.get(indexes.chunk)
    if (!chunk) {
      if (stateIsZero)
        return false // No need to create a new chunk if the state is zero

      chunk = new Chunk(this.metrics.chunkSize, voxelStateByteSize)
      chunk.mount(this, indexes.region, indexes.chunk)
      region.set(indexes.chunk, chunk)
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
            yield* chunk.allVoxelFaces({ offset, voxelIsFullDelegate })
          }
        }
      }
    }
  }
}
