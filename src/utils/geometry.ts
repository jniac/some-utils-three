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
  for (let i = startIndex; i < end; i++) {
    const color = colors[i % colors.length]
    colorsAttribute.setXYZ(i, color.r, color.g, color.b)
  }

  colorsAttribute.needsUpdate = true
}

