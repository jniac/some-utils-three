import { Color, ColorRepresentation, Matrix4 } from 'three'

import { TransformDeclaration, fromTransformDeclaration } from '../declaration'

const _matrix4 = new Matrix4()
/**
 * Returns a matrix4 instance from the given transform declaration.
 * 
 * NOTE: 
 * - For performance reasons, by default the same matrix instance is returned. 
 * The value must be used immediately or copied / cloned if it needs to be stored.
 * - To get a new instance, pass a new matrix as the second argument.
 */
export function makeMatrix4(props: TransformDeclaration, out = _matrix4): Matrix4 {
  return fromTransformDeclaration(props, out)
}

const _color = new Color()
/**
 * Returns a color instance from the given color representation.
 * 
 * NOTE: 
 * - For performance reasons, by default the same color instance is returned.
 * The value must be used immediately or copied / cloned if it needs to be stored.
 * - To get a new instance, pass a new color as the second argument.
 */
export function makeColor(color: ColorRepresentation, out = _color): Color {
  return out.set(color)
}

