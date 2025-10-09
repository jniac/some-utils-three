import { Color, ColorRepresentation } from 'three'

function parseHexString(color: string) {
  if (color.startsWith('#'))
    color = color.substring(1)

  // #rgb
  if (color.length === 3) {
    const r = parseInt(color[1], 16) / 15
    const g = parseInt(color[2], 16) / 15
    const b = parseInt(color[3], 16) / 15
    return { r, g, b, a: 1 }
  }

  // #rgba
  if (color.length === 4) {
    const r = parseInt(color[1], 16) / 15
    const g = parseInt(color[2], 16) / 15
    const b = parseInt(color[3], 16) / 15
    const a = parseInt(color[4], 16) / 15
    return { r, g, b, a }
  }

  // #rrggbb
  if (color.length === 6) {
    const r = parseInt(color.slice(1, 3), 16) / 255
    const g = parseInt(color.slice(3, 5), 16) / 255
    const b = parseInt(color.slice(5, 7), 16) / 255
    return { r, g, b, a: 1 }
  }

  // #rrggbbaa
  if (color.length === 8) {
    const r = parseInt(color.slice(1, 3), 16) / 255
    const g = parseInt(color.slice(3, 5), 16) / 255
    const b = parseInt(color.slice(5, 7), 16) / 255
    const a = parseInt(color.slice(7, 9), 16) / 255
    return { r, g, b, a }
  }

  throw new Error('Invalid hex format.')
}

const _color = new Color()
export function vec3(arg: ColorRepresentation) {
  if (typeof arg === 'string') {
    if (arg.startsWith('#')) {
      const { r, g, b } = parseHexString(arg)
      return `vec3(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)})`
    }
  }
  const { r, g, b } = _color.set(arg)
  return /* glsl */`vec3(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)})`
}

export function vec4(arg: string): string {
  if (arg.startsWith('#')) {
    const { r, g, b, a } = parseHexString(arg)
    return /* glsl */`vec4(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)}, ${a.toFixed(3)})`
  }
  throw new Error('Invalid vec4 format.')
}
