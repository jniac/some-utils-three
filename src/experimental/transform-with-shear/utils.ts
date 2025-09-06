import { Matrix4 } from 'three'

import { composeMatrix, lerpTransforms as coreLerpTransforms, decomposeMatrix, fromTransformWithShearDeclaration } from './core'
import { createTransformWithShearLike, TransformWithShearDeclaration, TransformWithShearLike } from './type'

const _m = new Matrix4()
const _t0 = createTransformWithShearLike()
const _t1 = createTransformWithShearLike()
const _t2 = createTransformWithShearLike()

/**
 * Linearly interpolates between two Matrix4 objects using TransformWithShear 
 * (preserving the rotation during interpolation).
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
 * Linearly interpolates between two TransformWithShearDeclaration objects.
 *
 * Note:
 * - The out parameter is reused between calls, so if you need to keep the value,
 *   make sure to clone it immediately (unless you provide your own out).
 */
export function lerpTransforms<T extends TransformWithShearLike>(
  tA: TransformWithShearDeclaration,
  tB: TransformWithShearDeclaration,
  alpha: number,
  out: T,
): T {
  fromTransformWithShearDeclaration(tA, _t0)
  fromTransformWithShearDeclaration(tB, _t1)
  coreLerpTransforms(_t0, _t1, alpha, out)
  return out
}
