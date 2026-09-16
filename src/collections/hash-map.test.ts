import { describe, expect, test } from 'vitest'

import {
  HashMap,
  HashMapArray,
  SpatialHashGrid3,
  Vector3HashMap,
} from './hash-map'

type Key = { id: number }

const createHashMap = (hash = (key: Key) => key.id) => new HashMap<Key, string>({
  hash,
  equals: (a, b) => a.id === b.id,
  clone: key => ({ ...key }),
})

describe('HashMap', () => {
  test('stores, retrieves and replaces values', () => {
    const map = createHashMap()

    map.set({ id: 1 }, 'one')
    map.set({ id: 2 }, 'two')

    expect(map.size).toBe(2)
    expect(map.hasKey({ id: 1 })).toBe(true)
    expect(map.hasKey({ id: 3 })).toBe(false)
    expect(map.get({ id: 1 })).toBe('one')
    expect(map.get({ id: 3 })).toBeUndefined()

    map.set({ id: 1 }, 'updated')

    expect(map.size).toBe(2)
    expect(map.get({ id: 1 })).toBe('updated')
  })

  test('resolves hash collisions using key equality', () => {
    const map = createHashMap(() => 0)

    map.set({ id: 1 }, 'one')
    map.set({ id: 2 }, 'two')

    expect(map.size).toBe(2)
    expect(map.get({ id: 1 })).toBe('one')
    expect(map.get({ id: 2 })).toBe('two')
  })

  test('clones inserted keys', () => {
    const map = createHashMap()
    const key = { id: 1 }

    map.set(key, 'one')
    key.id = 2

    expect(map.get({ id: 1 })).toBe('one')
    expect(map.get({ id: 2 })).toBeUndefined()
    expect([...map.keys()]).toEqual([{ id: 1 }])
    expect([...map.entries()]).toEqual([[{ id: 1 }, 'one']])
  })
})

describe('Vector3HashMap', () => {
  test('uses exact vector coordinates as keys', () => {
    const map = new Vector3HashMap<string>()

    map.set({ x: 0.1, y: 0.2, z: 0.3 }, 'a')
    map.set({ x: 0.9, y: 0.8, z: 0.7 }, 'b')

    expect(map.size).toBe(2)
    expect(map.get({ x: 0.1, y: 0.2, z: 0.3 })).toBe('a')
    expect(map.get({ x: 0.9, y: 0.8, z: 0.7 })).toBe('b')
    expect(map.get({ x: 0.1, y: 0.2, z: 0.4 })).toBeUndefined()
  })

  test('treats positive and negative zero as the same key', () => {
    const map = new Vector3HashMap<string>()

    map.set({ x: 0, y: -0, z: 0 }, 'first')
    map.set({ x: -0, y: 0, z: -0 }, 'updated')

    expect(map.size).toBe(1)
    expect(map.get({ x: 0, y: 0, z: 0 })).toBe('updated')
  })
})

describe('SpatialHashGrid3', () => {
  test.each([0, -1, Infinity, -Infinity, NaN])(
    'rejects the invalid cell size %s',
    cellSize => {
      expect(() => new SpatialHashGrid3(cellSize)).toThrow(
        'SpatialHashGrid3 requires a finite cellSize greater than 0'
      )
    }
  )

  test('treats positions in the same cell as the same key', () => {
    const grid = new SpatialHashGrid3<string>(2)

    grid.set({ x: 0.1, y: 1.9, z: 0.5 }, 'first')
    grid.set({ x: 1.9, y: 0.1, z: 1.5 }, 'updated')

    expect(grid.size).toBe(1)
    expect(grid.get({ x: 1, y: 1, z: 1 })).toBe('updated')
    expect([...grid.keys()]).toEqual([{ x: 0, y: 0, z: 0 }])
  })

  test('distinguishes adjacent cells, including negative coordinates', () => {
    const grid = new SpatialHashGrid3<string>(2)

    grid.set({ x: -0.1, y: 0, z: 0 }, 'negative')
    grid.set({ x: 0, y: 0, z: 0 }, 'origin')
    grid.set({ x: 2, y: 0, z: 0 }, 'positive')

    expect(grid.size).toBe(3)
    expect(grid.get({ x: -2, y: 1, z: 1 })).toBe('negative')
    expect(grid.get({ x: 1.99, y: 1, z: 1 })).toBe('origin')
    expect(grid.get({ x: 3.99, y: 1, z: 1 })).toBe('positive')
  })
})

describe('HashMapArray', () => {
  test('collects multiple values under an equal key', () => {
    const map = new HashMapArray<Key, string>({
      hash: () => 0,
      equals: (a, b) => a.id === b.id,
      clone: key => ({ ...key }),
    })

    map.add({ id: 1 }, 'a')
    map.add({ id: 1 }, 'b')
    map.add({ id: 2 }, 'c')

    expect(map.size).toBe(2)
    expect(map.get({ id: 1 })).toEqual(['a', 'b'])
    expect(map.get({ id: 2 })).toEqual(['c'])
  })
})
