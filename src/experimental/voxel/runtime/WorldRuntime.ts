import { Box3, Vector3, Vector3Like } from 'three'

import { Direction } from '../core'
import { World } from '../world'
import { WorldIndexes } from '../world-metrics'
import { ActiveZone } from './active-zone'
import { ChunkRuntime, WorldPhysicsAdapter, WorldRendererAdapter } from './adapters'
import { ChunkKey, createChunkKey } from './chunk-key'

type WorldRuntimeOptions = {
  world: World
  renderer?: WorldRendererAdapter | null
  physics?: WorldPhysicsAdapter | null
}

type DirtyTarget = {
  mesh?: boolean
  physics?: boolean
}

type CardinalDirection =
  | Direction.R
  | Direction.L
  | Direction.U
  | Direction.D
  | Direction.F
  | Direction.B

const _chunkOrigin = new Vector3()

export class WorldRuntime {
  readonly world: World
  renderer: WorldRendererAdapter | null
  physics: WorldPhysicsAdapter | null

  readonly activeZones = new Map<string, ActiveZone>()
  readonly mountedChunks = new Map<ChunkKey, ChunkRuntime>()
  readonly dirtyChunks = new Set<ChunkKey>()

  constructor({ world, renderer = null, physics = null }: WorldRuntimeOptions) {
    this.world = world
    this.renderer = renderer
    this.physics = physics
  }

  setActiveZone(id: string, zone: ActiveZone): this {
    this.activeZones.set(id, zone)
    return this
  }

  deleteActiveZone(id: string): boolean {
    return this.activeZones.delete(id)
  }

  clearActiveZones(): void {
    this.activeZones.clear()
  }

  setVoxelState(x: number, y: number, z: number, state: Uint8Array): boolean
  setVoxelState(position: Vector3, state: Uint8Array): boolean
  setVoxelState(...args: [x: number, y: number, z: number, state: Uint8Array] | [position: Vector3, state: Uint8Array]): boolean {
    const [x, y, z, state] = args.length === 2
      ? [args[0].x, args[0].y, args[0].z, args[1]]
      : args
    const indexes = this.world.metrics.toIndexes(x, y, z)
    const changed = this.world.setVoxelState(x, y, z, state)

    if (!changed)
      return false

    this.#markChunkDirty(indexes.region, indexes.chunk)
    this.#markBoundaryNeighborsDirty(x, y, z, indexes)

    return true
  }

  #markChunkDirty(regionIndex: number, chunkIndex: number, target: DirtyTarget = { mesh: true, physics: true }): void {
    const key = createChunkKey(regionIndex, chunkIndex)
    this.dirtyChunks.add(key)

    const runtime = this.mountedChunks.get(key)
    if (runtime) {
      runtime.dirtyMesh ||= target.mesh !== false
      runtime.dirtyPhysics ||= target.physics !== false
    }
  }

  update(): void {
    this.updateMountedChunks()
    this.rebuildDirtyChunks()
  }

  updateMountedChunks(): void {
    const wanted = this.computeWantedChunkKeys()

    for (const key of [...this.mountedChunks.keys()]) {
      if (!wanted.has(key)) {
        this.#unmountChunk(key)
      }
    }

    for (const key of wanted) {
      if (!this.mountedChunks.has(key)) {
        this.#mountChunk(key)
      }
    }
  }

  rebuildDirtyChunks(): void {
    for (const key of [...this.dirtyChunks]) {
      const runtime = this.mountedChunks.get(key)
      if (!runtime)
        continue

      if (runtime.dirtyMesh && this.renderer) {
        runtime.renderHandle = this.renderer.updateChunk(runtime, runtime.renderHandle)
        runtime.dirtyMesh = false
      }

      if (runtime.dirtyPhysics && this.physics) {
        runtime.physicsHandle = this.physics.updateChunk(runtime, runtime.physicsHandle)
        runtime.dirtyPhysics = false
      }

      if (!runtime.dirtyMesh && !runtime.dirtyPhysics) {
        this.dirtyChunks.delete(key)
      }
    }
  }

  *enumerateMountedChunks(): Iterable<ChunkRuntime> {
    yield* this.mountedChunks.values()
  }

  computeWantedChunkKeys(out = new Set<ChunkKey>()): Set<ChunkKey> {
    out.clear()

    for (const zone of this.activeZones.values()) {
      switch (zone.type) {
        case 'box':
          this.#addChunksIntersectingBounds(zone.bounds, out)
          break
        case 'sphere':
          this.#addChunksIntersectingSphere(zone.sphere.center, zone.sphere.radius, out)
          break
        case 'agent-sphere':
          this.#addChunksIntersectingSphere(zone.agent.position, zone.radius, out)
          break
      }
    }

    return out
  }

  #addChunksIntersectingBounds(bounds: Box3, out: Set<ChunkKey>): void {
    const { chunkSizeX, chunkSizeY, chunkSizeZ } = this.world.metrics

    const minChunkX = Math.floor(bounds.min.x / chunkSizeX)
    const minChunkY = Math.floor(bounds.min.y / chunkSizeY)
    const minChunkZ = Math.floor(bounds.min.z / chunkSizeZ)
    const maxChunkX = Math.floor(bounds.max.x / chunkSizeX)
    const maxChunkY = Math.floor(bounds.max.y / chunkSizeY)
    const maxChunkZ = Math.floor(bounds.max.z / chunkSizeZ)

    for (let z = minChunkZ; z < maxChunkZ; z++) {
      for (let y = minChunkY; y < maxChunkY; y++) {
        for (let x = minChunkX; x < maxChunkX; x++) {
          this.#addExistingChunkFromChunkCoordinates(x, y, z, out)
        }
      }
    }
  }

  #addChunksIntersectingSphere(center: Vector3Like, radius: number, out: Set<ChunkKey>): void {
    const { chunkSizeX, chunkSizeY, chunkSizeZ } = this.world.metrics

    const minChunkX = Math.floor((center.x - radius) / chunkSizeX)
    const minChunkY = Math.floor((center.y - radius) / chunkSizeY)
    const minChunkZ = Math.floor((center.z - radius) / chunkSizeZ)
    const maxChunkX = Math.floor((center.x + radius) / chunkSizeX)
    const maxChunkY = Math.floor((center.y + radius) / chunkSizeY)
    const maxChunkZ = Math.floor((center.z + radius) / chunkSizeZ)
    const radiusSq = radius * radius

    for (let z = minChunkZ; z < maxChunkZ; z++) {
      const chunkMinZ = z * chunkSizeZ
      const chunkMaxZ = chunkMinZ + chunkSizeZ
      const dz = distanceToRange(center.z, chunkMinZ, chunkMaxZ)

      for (let y = minChunkY; y < maxChunkY; y++) {
        const chunkMinY = y * chunkSizeY
        const chunkMaxY = chunkMinY + chunkSizeY
        const dy = distanceToRange(center.y, chunkMinY, chunkMaxY)

        for (let x = minChunkX; x < maxChunkX; x++) {
          const chunkMinX = x * chunkSizeX
          const chunkMaxX = chunkMinX + chunkSizeX
          const dx = distanceToRange(center.x, chunkMinX, chunkMaxX)

          if (dx * dx + dy * dy + dz * dz <= radiusSq) {
            this.#addExistingChunkFromChunkCoordinates(x, y, z, out)
          }
        }
      }
    }
  }

  #addExistingChunkFromChunkCoordinates(x: number, y: number, z: number, out: Set<ChunkKey>): void {
    const indexes = this.#tryGetIndexesFromChunkCoordinates(x, y, z)
    if (!indexes)
      return

    if (this.world.tryGetChunkByIndexes(indexes)) {
      out.add(createChunkKey(indexes.region, indexes.chunk))
    }
  }

  #mountChunk(key: ChunkKey): void {
    const [regionIndex, chunkIndex] = parseChunkKey(key)
    const chunk = this.world.tryGetChunkByIndexes(regionIndex, chunkIndex)
    if (!chunk)
      return

    const runtime: ChunkRuntime = {
      key,
      regionIndex,
      chunkIndex,
      chunk,
      dirtyMesh: false,
      dirtyPhysics: false,
      renderHandle: null,
      physicsHandle: null,
    }

    runtime.renderHandle = this.renderer?.mountChunk(runtime) ?? null
    runtime.physicsHandle = this.physics?.mountChunk(runtime) ?? null
    this.mountedChunks.set(key, runtime)
  }

  #unmountChunk(key: ChunkKey): void {
    const runtime = this.mountedChunks.get(key)
    if (!runtime)
      return

    if (runtime.renderHandle && this.renderer) {
      this.renderer.unmountChunk(runtime.renderHandle, runtime)
    }
    if (runtime.physicsHandle && this.physics) {
      this.physics.unmountChunk(runtime.physicsHandle, runtime)
    }

    this.mountedChunks.delete(key)
  }

  #tryGetIndexesFromChunkCoordinates(x: number, y: number, z: number): WorldIndexes | null {
    const { chunkSizeX, chunkSizeY, chunkSizeZ } = this.world.metrics
    try {
      return this.world.metrics.toIndexes(
        x * chunkSizeX,
        y * chunkSizeY,
        z * chunkSizeZ,
      )
    } catch {
      return null
    }
  }

  #markBoundaryNeighborsDirty(x: number, y: number, z: number, indexes: WorldIndexes): void {
    const metrics = this.world.metrics
    const origin = metrics.fromIndexes(indexes.region, indexes.chunk, 0, _chunkOrigin)
    const localX = x - origin.x
    const localY = y - origin.y
    const localZ = z - origin.z

    const directions: CardinalDirection[] = []
    if (localX === 0) directions.push(Direction.L)
    if (localX === metrics.chunkSizeX - 1) directions.push(Direction.R)
    if (localY === 0) directions.push(Direction.D)
    if (localY === metrics.chunkSizeY - 1) directions.push(Direction.U)
    if (localZ === 0) directions.push(Direction.B)
    if (localZ === metrics.chunkSizeZ - 1) directions.push(Direction.F)

    if (directions.length === 0)
      return

    try {
      const adjacent = metrics.getAdjacentChunkIndexes(indexes.region, indexes.chunk)
      for (const direction of directions) {
        const neighbor = adjacent[direction]
        this.#markChunkDirty(neighbor.region, neighbor.chunk)
      }
    } catch {
      // World boundary: there is no valid neighbor to mark dirty.
    }
  }
}

function parseChunkKey(key: ChunkKey): [regionIndex: number, chunkIndex: number] {
  const [regionIndex, chunkIndex] = key.split(':').map(Number)
  return [regionIndex!, chunkIndex!]
}

function distanceToRange(value: number, min: number, max: number): number {
  if (value < min)
    return min - value
  if (value > max)
    return value - max
  return 0
}
