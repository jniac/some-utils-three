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
    expect(() => geometry.setPositions([NaN, 0, 0], [1])).not.toThrow()
    geometry.setPositions([], [])
    expect(geometry.instanceCount).toBe(0)
    geometry.dispose()
  })

  it('constructs a ShaderMaterial and supports changing its width multiplier', () => {
    const material = new VariableLineMaterial({ linewidth: 2 })
    expect(material.linewidth).toBe(2)
    material.linewidth = 3
    expect(material.uniforms.uLinewidth.value).toBe(3)
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

  it('switches between pixel and world widths by changing the WORLD_UNITS define', () => {
    const material = new VariableLineMaterial({ worldUnits: true })
    const version = material.version
    expect(material.worldUnits).toBe(true)
    material.worldUnits = false
    expect(material.defines.WORLD_UNITS).toBeUndefined()
    expect(material.depthMaterial.defines?.WORLD_UNITS).toBeUndefined()
    expect(material.version).toBeGreaterThan(version)
    material.dispose()
  })
  it('writes reusable endpoint colors and preserves them when capacity grows', () => {
    const geometry = new VariableLineGeometry(2, true)
    let targetColor: unknown
    geometry.updatePoints(3, (i, point, color) => {
      point.set(i, 0, 0, 1)
      targetColor ??= color
      expect(color).toBe(targetColor)
      color.setRGB(i / 2, 0.2, 1)
    })
    const colors = geometry.getAttribute('instanceColorStart')
    expect(colors.getX(1)).toBe(0.5)
    expect(geometry.getAttribute('instanceColorEnd').getX(0)).toBe(0.5)
    geometry.updatePoints(3, (i, point, color) => {
      point.set(i, 0, 0, 1)
      color.setRGB(0.2, 0.3, 0.4)
    })
    expect(geometry.getAttribute('instanceColorStart')).toBe(colors)
    geometry.reserve(5)
    expect(geometry.getAttribute('instanceColorEnd').getZ(1)).toBeCloseTo(0.4)
    geometry.dispose()
  })

  it('keeps colors optional and selects feature-specific shader programs', () => {
    const geometry = new VariableLineGeometry(4)
    expect(geometry.getAttribute('instanceColorStart')).toBeUndefined()
    geometry.enableVertexColors()
    expect(geometry.getAttribute('instanceColorStart').getX(0)).toBe(1)
    const material = new VariableLineMaterial({
      vertexColors: true,
      worldPosition: true,
      shadows: true,
    })
    expect(material.vertexColors).toBe(true)
    expect(material.defines.USE_WORLD_POSITION).toBe('')
    expect(material.lights).toBe(true)
    material.worldPosition = false
    material.shadows = false
    material.setVertexColors(false)
    expect(material.defines.USE_WORLD_POSITION).toBeUndefined()
    expect(material.defines.LINE_RECEIVE_SHADOWS).toBeUndefined()
    expect(material.vertexColors).toBe(false)
    expect(material.lights).toBe(false)
    let disposed = 0
    material.depthMaterial.addEventListener('dispose', () => disposed++)
    material.distanceMaterial.addEventListener('dispose', () => disposed++)
    material.dispose()
    expect(disposed).toBe(2)
    geometry.dispose()
  })
})
