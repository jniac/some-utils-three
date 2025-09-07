import { Matrix4 } from 'three'

import { composeMatrix, lerpTransforms as coreLerpTransforms, decomposeMatrix, fromTransformDeclaration } from './core'
import { createTransformLike, TransformDeclaration, TransformLike } from './type'

const _m = new Matrix4()
const _t0 = createTransformLike()
const _t1 = createTransformLike()
const _t2 = createTransformLike()

/**
 * Linearly interpolates between two Matrix4 objects using transform-with-shear 
 * solution (preserving the rotation during interpolation).
 *
 * Note:
 * - The out parameter is reused between calls, so if you need to keep the value,
 *   make sure to clone it immediately (unless you provide your own out).
 */
export function lerpMatrixes(
  mA: Matrix4,
  mB: Matrix4,
  alpha: number,
  out = _m,
): Matrix4 {
  decomposeMatrix(mA, _t0)
  decomposeMatrix(mB, _t1)
  coreLerpTransforms(_t0, _t1, alpha, _t2)
  composeMatrix(_t2, out)
  return out
}

/**
 * Linearly interpolates between two TransformDeclaration objects.
 *
 * Note:
 * - The out parameter is reused between calls, so if you need to keep the value,
 *   make sure to clone it immediately (unless you provide your own out).
 */
export function lerpTransforms<T extends TransformLike>(
  tA: TransformDeclaration,
  tB: TransformDeclaration,
  alpha: number,
  out: T,
): T {
  fromTransformDeclaration(tA, _t0)
  fromTransformDeclaration(tB, _t1)
  coreLerpTransforms(_t0, _t1, alpha, out)
  return out
}
