import { DynamicDrawUsage } from 'three'
import { describe, expect, it } from 'vitest'

import { VariableLineGeometry } from './VariableLineGeometry'
import { VariableLineMaterial } from './VariableLineMaterial'

describe('variable-width polyline', () => {
  it('preserves the shared endpoint width across adjacent segments', () => {
    const geometry = new VariableLineGeometry().setPositions(
      [0, 0, 0, 1, 2, 3, 4, 5, 6],
      [8, 70, 18],
    )
    expect(geometry.instanceCount).toBe(2)
    expect(geometry.index?.count).toBe(6)
    expect(geometry.getAttribute('instanceWidthEnd').getX(0)).toBe(70)
    expect(geometry.getAttribute('instanceWidthStart').getX(1)).toBe(70)
    expect(geometry.getAttribute('instanceStart').getZ(1)).toBe(3)
    geometry.dispose()
  })

  it('accepts empty paths, repeated points and zero widths, but rejects invalid input', () => {
    const geometry = new VariableLineGeometry()
    expect(geometry.instanceCount).toBe(0)
    geometry.setPositions([0, 0, 0, 0, 0, 0], [0, 20])
    expect(geometry.instanceCount).toBe(1)
    expect(() => geometry.setPositions([0, 0, 0], [-1])).toThrow()
    expect(() => geometry.setPositions([0, 0, 0], [])).toThrow()
    expect(() => geometry.setPositions([NaN, 0, 0], [1])).toThrow()
    geometry.setPositions([], [])
    expect(geometry.instanceCount).toBe(0)
    geometry.dispose()
  })

  it('constructs a ShaderMaterial and supports changing its width multiplier', () => {
    const material = new VariableLineMaterial({ linewidth: 2 })
    expect(material.linewidth).toBe(2)
    material.linewidth = 3
    expect(material.uniforms.linewidth.value).toBe(3)
    material.dispose()
  })
  it('updates each point once while retaining the buffer and attributes', () => {
    const geometry = new VariableLineGeometry(8)
    const start = geometry.getAttribute('instanceStart')
    const buffer = geometry.getAttribute('instanceWidthStart')
    let calls = 0
    let firstTarget: unknown
    const update = (index: number, target: import('three').Vector4) => {
      firstTarget ??= target
      expect(target).toBe(firstTarget)
      calls++
      target.set(index, index * 2, index * 3, index + 1)
    }
    geometry.updatePoints(5, update)
    geometry.updatePoints(3, update)
    expect(calls).toBe(8)
    expect(geometry.instanceCount).toBe(2)
    expect(geometry.capacity).toBe(8)
    expect(geometry.getAttribute('instanceStart')).toBe(start)
    expect(geometry.getAttribute('instanceWidthStart')).toBe(buffer)
    expect(geometry.getAttribute('instanceEnd').getX(1)).toBe(2)
    const data = (start as import('three').InterleavedBufferAttribute).data
    expect(data.usage).toBe(DynamicDrawUsage)
    expect(data.updateRanges).toEqual([{ start: 0, count: 16 }])
    geometry.updatePoints(0, update)
    expect(geometry.instanceCount).toBe(0)
    expect(geometry.capacity).toBe(8)
    geometry.dispose()
  })

  it('grows capacity only when necessary and releases the old GPU storage', () => {
    const geometry = new VariableLineGeometry(2)
    let disposals = 0
    geometry.addEventListener('dispose', () => {
      disposals++
    })
    geometry.reserve(1)
    expect(disposals).toBe(0)
    geometry.reserve(3)
    expect(geometry.capacity).toBe(4)
    expect(disposals).toBe(1)
    expect(() => geometry.updatePoints(-1, () => {})).toThrow()
    geometry.dispose()
  })

  it('switches between pixel and world widths without recompiling the shader', () => {
    const material = new VariableLineMaterial({ worldUnits: true })
    const version = material.version
    expect(material.worldUnits).toBe(true)
    material.worldUnits = false
    expect(material.uniforms.worldUnits.value).toBe(false)
    expect(material.version).toBe(version)
    material.dispose()
  })
})
