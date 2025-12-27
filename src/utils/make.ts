import { Color, ColorRepresentation, Matrix4 } from 'three'

import { TransformDeclaration, fromTransformDeclaration } from '../declaration'

const _matrix4 = new Matrix4()
/**
 * Returns a matrix4 instance from the given transform declaration.
 * 
 * NOTE:
 * - If the `props` argument is `null`, it will return a matrix with all elements set to 0.
 * - For performance reasons, by default the same matrix instance is returned. 
 * The value must be used immediately or copied / cloned if it needs to be stored.
 * - To get a new instance, pass a new matrix as the second argument.
 */
export function makeMatrix4(props: TransformDeclaration | null, out = _matrix4): Matrix4 {
  if (props === null) {
    out.elements.fill(0)
    return out
  }
  return fromTransformDeclaration(props, out)
}

const _color = new Color()
/**
 * Returns a color instance from the given color representation.
 * 
 * NOTE: 
 * - For convenience, the string 'random' can be passed to get a random color.
 * - For convenience too, 8-digit hex colors are supported (the alpha channel is ignored).
 * - ⚠️ For performance reasons, by default the same color instance is returned.
 * The value must be used immediately or copied / cloned if it needs to be stored.
 * - 👉 To get a new instance, pass a new color as the second argument.
 */
export function makeColor(color: ColorRepresentation | 'random', out = _color): Color {
  if (color === 'random') {
    out.setHex(Math.floor(Math.random() * 0x1000000))
    return out
  }
  if (typeof color === 'string') {
    if (color.startsWith('#')) {
      // three.js does not support 8-digit hex colors, so we remove the alpha channel if present
      if (color.length === 9) {
        color = color.slice(0, 7)
      }
      if (color.length === 5) {
        color = color.slice(0, 4)
      }
    }
    if (color.startsWith('hsl(') && color.endsWith(')')) {
      // handle hsl colors manually because three.js does not support the modern CSS hsl syntax
      const parts = color.slice(4, -1).split(/[\s,]+/).map(p => p.trim().replace('%', ''))
      if (parts.length === 3) {
        const h = Number.parseFloat(parts[0]) / 360
        const s = Number.parseFloat(parts[1]) / 100
        const l = Number.parseFloat(parts[2]) / 100
        out.setHSL(h, s, l)
        return out
      }
    }
    if (color.startsWith('hsla(') && color.endsWith(')')) {
      // handle hsla colors manually because three.js does not support the modern CSS hsla syntax
      const parts = color.slice(5, -1).split(/[\s,]+/).map(p => p.trim().replace('%', ''))
      if (parts.length === 4) {
        const h = Number.parseFloat(parts[0]) / 360
        const s = Number.parseFloat(parts[1]) / 100
        const l = Number.parseFloat(parts[2]) / 100
        // const a = Number.parseFloat(parts[3]) / 100 // alpha channel is ignored
        out.setHSL(h, s, l)
        return out
      }
    }
  }
  return out.set(color)
}

/**
 * Safe version of `makeColor` that always returns a new Color instance (no need to clone).
 */
export function safeColor(color: ColorRepresentation | 'random', out = new Color()): Color {
  return makeColor(color, out)
}

