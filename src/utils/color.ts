import { Color, ColorRepresentation } from 'three'

const _color1 = new Color()
const _color2 = new Color()

/**
 * Linearly interpolates between two colors.
 * 
 * Note:
 * - For best results, use colors in the sRGB color space.
 * - If the out parameter is not provided, a new Color instance will be created.
 */
export function lerpColors(color1: ColorRepresentation, color2: ColorRepresentation, alpha = .5, out = new Color()) {
  _color1.set(color1)
  _color2.set(color2)
  return out.lerpColors(_color1, _color2, alpha)
}
