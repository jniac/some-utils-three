import { Color, ColorRepresentation } from 'three'

const _color1 = new Color()
const _color2 = new Color()
const _color3 = new Color()

/**
 * Linearly interpolates between two colors.
 * 
 * Note:
 * - For best results, use colors in the sRGB color space.
 * - If the out parameter is not provided, an internal Color instance will be used, if you need to keep the result, provide your own Color instance or clone the result.
 */
export function lerpColors(color1: ColorRepresentation, color2: ColorRepresentation, alpha = .5, out = _color3) {
  if (typeof color1 === 'string') {
    color1 = color1.trim()
    if (color1.startsWith('#')) {
      // three.js does not support 8-digit hex colors, so we remove the alpha channel if present
      if (color1.length === 9) {
        color1 = color1.slice(0, 7)
      }
      if (color1.length === 5) {
        color1 = color1.slice(0, 4)
      }
    }
  }
  if (typeof color2 === 'string') {
    color2 = color2.trim()
    if (color2.startsWith('#')) {
      // three.js does not support 8-digit hex colors, so we remove the alpha channel if present
      if (color2.length === 9) {
        color2 = color2.slice(0, 7)
      }
      if (color2.length === 5) {
        color2 = color2.slice(0, 4)
      }
    }
  }
  _color1.set(color1)
  _color2.set(color2)
  return out.lerpColors(_color1, _color2, alpha)
}
