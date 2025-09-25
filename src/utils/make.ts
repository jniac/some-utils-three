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
 * - For performance reasons, by default the same color instance is returned.
 * The value must be used immediately or copied / cloned if it needs to be stored.
 * - To get a new instance, pass a new color as the second argument.
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
  }
  return out.set(color)
}

