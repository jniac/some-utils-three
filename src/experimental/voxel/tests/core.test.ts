import { Vector3 } from 'three'
import { describe, expect, test } from 'vitest'

import { crossDirection as crossDirections, directions, directionVectors, vectorToDirection } from '../core'

describe('Core tests', () => {
  test('direction should cross correctly', () => {
    for (const a of directions) {
      for (const b of directions) {
        const u = directionVectors[a]
        const v = directionVectors[b]
        const w = new Vector3().crossVectors(u, v)
        const expectedDir = vectorToDirection(w)
        expect(expectedDir).toBe(crossDirections(a, b))
      }
    }
  })
})
