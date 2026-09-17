import { PlaneGeometry, Vector3 } from 'three'
import { describe, expect, test } from 'vitest'

import { SurfaceWalker } from '../surface-walker'
import { PoissonDiscSurfaceSampler } from './PoissonDiscSurfaceSampler'

function createRandom(seed: number): () => number {
  return () => {
    seed = Math.imul(seed, 1664525) + 1013904223 | 0
    return (seed >>> 0) / 0x100000000
  }
}

describe('PoissonDiscSurfaceSampler', () => {
  test('populates samples while preserving the minimum 3D distance', () => {
    const radius = 0.5
    const maxCount = 50
    const walker = new SurfaceWalker().fromGeometry(
      new PlaneGeometry(10, 10, 10, 10)
    )
    const sampler = new PoissonDiscSurfaceSampler(walker, {
      radius,
      maxCount,
      maxAttempts: 30,
      random: createRandom(12345),
    })
      .start({ triangleIndex: 110, u: 1 / 3, v: 1 / 3 })
      .sampleAll()

    expect(sampler.samples.length).toBeGreaterThan(1)
    expect(sampler.samples.length).toBeLessThanOrEqual(maxCount)

    const a = new Vector3()
    const b = new Vector3()
    for (let i = 0; i < sampler.samples.length; i++) {
      walker.surfacePointToPosition(sampler.samples[i], a)
      for (let j = i + 1; j < sampler.samples.length; j++) {
        walker.surfacePointToPosition(sampler.samples[j], b)
        expect(a.distanceTo(b)).toBeGreaterThanOrEqual(radius - 1e-9)
      }
    }
  })
})
