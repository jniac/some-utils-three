import { describe, expect, test } from 'vitest'

import { World } from '../world'
import { WorldMetrics } from '../world-metrics'

describe('WorldMetrics', () => {
  test('converts voxel coordinates to region/chunk/voxel indexes and back', () => {
    const metrics = new WorldMetrics(4, 4, 4, 2, 2, 2, 8, 8, 8)
    const indexes = metrics.toIndexes(8, -1, 3)
    const position = metrics.fromIndexes(indexes.region, indexes.chunk, indexes.voxel)

    expect(position.toArray()).toEqual([8, -1, 3])
  })

  test('retrieves chunks by chunk coordinates across region boundaries', () => {
    const world = new World({
      metrics: new WorldMetrics(4, 4, 4, 2, 2, 2, 8, 8, 8),
    })
    const state = world.createVoxelState()
    state[0] = 1

    world.setVoxelState(8, 0, 0, state)
    world.setVoxelState(-1, 0, 0, state)

    expect(world.tryGetChunk(2, 0, 0)).toBe(world.tryGetSurroundingChunkAt(8, 0, 0))
    expect(world.tryGetChunk(-1, 0, 0)).toBe(world.tryGetSurroundingChunkAt(-1, 0, 0))
  })
})
