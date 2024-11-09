import { BufferAttribute, BufferGeometry, Color, ColorRepresentation } from 'three'

export function setvertexColors(geometry: BufferGeometry, colorsArg: ColorRepresentation | ColorRepresentation[], startIndex = 0, endIndex = -1) {
  const colors = Array.isArray(colorsArg)
    ? colorsArg.map(c => new Color(c))
    : [new Color(colorsArg)]

  const count = geometry.attributes.position.count

  function create() {
    const colorsAttribute = new BufferAttribute(new Float32Array(count * 3), 3)
    geometry.setAttribute('color', colorsAttribute)
    return colorsAttribute
  }

  const colorsAttribute = geometry.attributes.color ?? create()

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
}

