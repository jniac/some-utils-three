import { Matrix4 } from 'three'
import { TransformWithShear } from './transform-with-shear'
import { TransformWithShearDeclaration } from './type'

const _m = new Matrix4()
const _t0 = new TransformWithShear()
const _t1 = new TransformWithShear()

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
  _t0
    .from(mA)
    .lerp(_t1.from(mB), alpha)
    .toMatrix(out)
  return out
}

/**
 * Linearly interpolates between two TransformWithShearDeclaration objects.
 *
 * Note:
 * - The out parameter is reused between calls, so if you need to keep the value,
 *   make sure to clone it immediately (unless you provide your own out).
 */
export function lerpTransforms(
  tA: TransformWithShearDeclaration,
  tB: TransformWithShearDeclaration,
  alpha: number,
  out = _t0
): TransformWithShear {
  return out.from(tA).lerp(_t1.from(tB), alpha)
}