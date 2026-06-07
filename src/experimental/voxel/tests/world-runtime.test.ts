import { Box3, Vector3 } from 'three'
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
})

