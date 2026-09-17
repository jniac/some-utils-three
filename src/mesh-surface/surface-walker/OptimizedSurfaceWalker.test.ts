import { BoxGeometry, PlaneGeometry, TorusKnotGeometry, Vector3 } from 'three'
import { describe, expect, test } from 'vitest'

import { OptimizedSurfaceWalker } from './OptimizedSurfaceWalker'
import { SurfaceWalker } from './SurfaceWalker'
import { WalkStatus } from './types'

const directions = [
  { x: 1, y: 0.37 },
  { x: -0.42, y: 1 },
  { x: 0.31, y: -1 },
  { x: -1, y: -0.23 },
]

describe('OptimizedSurfaceWalker', () => {
  test.each([
    ['plane', new PlaneGeometry(10, 10, 10, 10), 110],
    ['box', new BoxGeometry(4, 4, 4, 4, 4, 4), 85],
    ['torus knot', new TorusKnotGeometry(2, 0.5, 64, 8), 240],
  ])('matches SurfaceWalker on a %s', (_name, geometry, triangleIndex) => {
    const reference = new SurfaceWalker().fromGeometry(geometry)
    const optimized = new OptimizedSurfaceWalker().fromGeometry(geometry)
    const referencePosition = new Vector3()
    const optimizedPosition = new Vector3()

    for (const direction of directions) {
      const start = { triangleIndex, x: 1 / 3, y: 1 / 3 }
      const expected = reference.walk(
        start.triangleIndex,
        [start.x, start.y],
        [direction.x, direction.y],
        { maxDistance: 0.75 }
      )
      const actual = optimized.walk(start, direction, { maxDistance: 0.75 })

      expected.getFinalPosition(referencePosition)
      optimized.surfacePointToPosition(actual.point, optimizedPosition)

      expect(actual.status).toBe(WalkStatus.MaxDistance)
      expect(optimizedPosition.distanceTo(referencePosition)).toBeLessThan(1e-9)
    }
  })

  test('records paths only when requested and can reuse its result', () => {
    const walker = new OptimizedSurfaceWalker().fromGeometry(
      new PlaneGeometry(10, 10, 10, 10)
    )
    const start = { triangleIndex: 110, x: 1 / 3, y: 1 / 3 }
    const direction = { x: 1, y: 0.37 }
    const result = walker.walk(start, direction, { maxDistance: 1 })

    expect(result.path).toBeUndefined()

    const reused = walker.walk(
      start,
      direction,
      { maxDistance: 1, recordPath: true },
      result,
    )

    expect(reused).toBe(result)
    expect(reused.path?.length).toBeGreaterThan(0)
  })
})
