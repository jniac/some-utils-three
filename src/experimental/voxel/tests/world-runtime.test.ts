import { Box3, Sphere, Vector3 } from 'three'
import { describe, expect, test } from 'vitest'

import { WorldRuntime } from '../runtime'
import { ChunkRuntime, WorldRendererAdapter } from '../runtime/adapters'
import { World } from '../world'
import { WorldMetrics } from '../world-metrics'

function createTestWorld() {
  const world = new World({
    metrics: new WorldMetrics(4, 4, 4, 2, 2, 2, 8, 8, 8),
  })
  const state = world.createVoxelState('solid')
  world.setVoxelState(0, 0, 0, state)
  world.setVoxelState(4, 0, 0, state)
  return { world, state }
}

describe('WorldRuntime', () => {
  test('finds a chunk when the entire box lies inside it', () => {
    const { world } = createTestWorld()
    const runtime = new WorldRuntime({ world })
    runtime.setActiveZone('small', {
      type: 'box', bounds: new Box3(new Vector3(.1, .1, .1), new Vector3(.9, .9, .9)),
    })
    expect([...runtime.computeWantedChunkKeys()]).toEqual([createChunkKeyFromVoxelPosition(world, 0, 0, 0)])
  })

  test('includes chunks intersecting the upper side of a sphere', () => {
    const { world } = createTestWorld()
    const runtime = new WorldRuntime({ world })
    runtime.setActiveZone('small', {
      type: 'sphere', sphere: new Sphere(new Vector3(3.9, 1, 1), .2),
    })
    expect(runtime.computeWantedChunkKeys()).toEqual(new Set([
      createChunkKeyFromVoxelPosition(world, 0, 0, 0), createChunkKeyFromVoxelPosition(world, 4, 0, 0),
    ]))
  })

  test('mounts existing chunks intersecting active zones', () => {
    const { world } = createTestWorld()
    const mounted: string[] = []
    const renderer: WorldRendererAdapter = {
      mountChunk(runtime) {
        mounted.push(runtime.key)
        return runtime.key
      },
      updateChunk(_runtime, handle) {
        return handle
      },
      unmountChunk() { },
    }
    const runtime = new WorldRuntime({ world, renderer })

    runtime.setActiveZone('test', {
      type: 'box',
      bounds: new Box3(new Vector3(-1, -1, -1), new Vector3(8, 1, 1)),
    })
    runtime.update()

    expect(runtime.mountedChunks.size).toBe(2)
    expect(mounted).toHaveLength(2)
  })

  test('marks changed chunks dirty and rebuilds mounted runtime chunks', () => {
    const { world, state } = createTestWorld()
    const updated: ChunkRuntime[] = []
    const renderer: WorldRendererAdapter = {
      mountChunk(runtime) {
        return runtime.key
      },
      updateChunk(runtime, handle) {
        updated.push(runtime)
        return handle
      },
      unmountChunk() { },
    }
    const runtime = new WorldRuntime({ world, renderer })

    runtime.setActiveZone('test', {
      type: 'box',
      bounds: new Box3(new Vector3(-1, -1, -1), new Vector3(8, 1, 1)),
    })
    runtime.update()
    runtime.setVoxelState(1, 0, 0, state)
    runtime.update()

    expect(updated).toHaveLength(1)
    expect(updated[0]!.dirtyMesh).toBe(false)
  })

  test('mounts only chunks intersecting sphere active zones', () => {
    const { world, state } = createTestWorld()
    world.setVoxelState(4, 4, 4, state)

    const runtime = new WorldRuntime({ world })
    runtime.setActiveZone('test', {
      type: 'sphere',
      sphere: new Sphere(new Vector3(0, 0, 0), 5),
    })

    const wanted = runtime.computeWantedChunkKeys()

    expect(wanted.size).toBe(2)
    expect([...wanted]).not.toContain(createChunkKeyFromVoxelPosition(world, 4, 4, 4))
  })
})

function createChunkKeyFromVoxelPosition(world: World, x: number, y: number, z: number): string {
  const indexes = world.metrics.toIndexes(x, y, z)
  return `${indexes.region}:${indexes.chunk}`
}
