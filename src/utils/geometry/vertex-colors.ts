import { BufferAttribute, BufferGeometry, ColorRepresentation } from 'three'

import { makeColor } from '../make'

/**
 * Sets vertex colors for a BufferGeometry.
 * 
 * If the geometry already has a 'color' attribute, it will be updated, otherwise a new one will be created.
 */
export function setVertexColors(
  geometry: BufferGeometry,
  colorsArg: ColorRepresentation | ColorRepresentation[],
  startIndex = 0,
  endIndex = -1,
): BufferGeometry {
  const colors = Array.isArray(colorsArg)
    ? colorsArg.map(c => makeColor(c))
    : [makeColor(colorsArg)]

  const count = geometry.attributes.position.count

  function create(count: number) {
    const colorsAttribute = new BufferAttribute(new Float32Array(count * 3), 3)
    geometry.setAttribute('color', colorsAttribute)
    return colorsAttribute
  }

  const colorsAttribute = geometry.attributes.color ?? create(count)

  const end = endIndex < 0 ? count : endIndex
  if (colors.length === 1) {
    const { r, g, b } = colors[0]
    for (let i = startIndex; i < end; i++) {
      colorsAttribute.setXYZ(i, r, g, b)
    }
  } else {
    for (let i = startIndex; i < end; i++) {
      const { r, g, b } = colors[i % colors.length]
      colorsAttribute.setXYZ(i, r, g, b)
    }
  }

  colorsAttribute.needsUpdate = true

  return geometry
}

export function setVertexColorsByGroup(
  geometry: BufferGeometry,
  colorsArg: ColorRepresentation | ColorRepresentation[] | ((groupIndex: number, groupCount: number) => ColorRepresentation),
): BufferGeometry {
  const count = geometry.attributes.position.count

  function create(count: number) {
    const colorsAttribute = new BufferAttribute(new Float32Array(count * 3), 3)
    geometry.setAttribute('color', colorsAttribute)
    return colorsAttribute
  }

  const colorsAttribute = geometry.attributes.color ?? create(count)
  const index = geometry.index

  for (let i = 0; i < geometry.groups.length; i++) {
    const group = geometry.groups[i]
    const { r, g, b } = typeof colorsArg === 'function'
      ? makeColor(colorsArg(i, geometry.groups.length))
      : Array.isArray(colorsArg)
        ? makeColor(colorsArg[i % colorsArg.length])
        : makeColor(colorsArg)

    const end = group.start + group.count
    if (index) {
      for (let j = group.start; j < end; j++)
        colorsAttribute.setXYZ(index.getX(j), r, g, b)
    } else {
      for (let j = group.start; j < end; j++)
        colorsAttribute.setXYZ(j, r, g, b)
    }
  }

  colorsAttribute.needsUpdate = true

  return geometry
}
