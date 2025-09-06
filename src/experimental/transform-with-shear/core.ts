import { Matrix4, Vector3 } from 'three'

import { fromEulerDeclaration, fromVector3Declaration, fromVector4Declaration } from '../../declaration'
import { TransformWithShearDeclaration, TransformWithShearLike } from './type'

const _m = new Matrix4()

/**
 * Compose a Matrix4 from a TransformWithShearLike
 * 
 * The order of transformations is: Scale, Shear, Rotation, Translation
 * 
 * Matrix = T * R * H * S
 * 
 * Where:
 * - T is the translation matrix
 * - R is the rotation matrix (from quaternion)
 * - H is the shear matrix
 * - S is the scale matrix
 */
export function composeMatrix(transform: TransformWithShearLike, out: Matrix4) {
  const {
    scale: { x: sx, y: sy, z: sz },
    shear: { x: shxy, y: shxz, z: shyz },
  } = transform

  // Apply rotation
  out.makeRotationFromQuaternion(transform.quaternion)

  // Apply shear
  out.multiply(_m.set(
    1, shxy, shxz, 0,
    0, 1, shyz, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ))

  // Apply scale
  out.elements[0] *= sx
  out.elements[1] *= sx
  out.elements[2] *= sx
  out.elements[4] *= sy
  out.elements[5] *= sy
  out.elements[6] *= sy
  out.elements[8] *= sz
  out.elements[9] *= sz
  out.elements[10] *= sz

  // Apply translation
  out.setPosition(transform.position)
}

const _c0 = new Vector3()
const _c1 = new Vector3()
const _c2 = new Vector3()
const _cr = new Vector3()
const _q0 = new Vector3()
const _q1 = new Vector3()
const _q2 = new Vector3()

/**
 * Decomposes a 4x4 matrix into its translation, rotation, scale, and shear components.
 * 
 * Written by adapting the almost-working algorithm from AI (claude).
 * 
 * Works with different matrix configurations, including those with shear and negative scaling (reflections)!!!
 * 
 * @param matrix The 4x4 matrix to decompose.
 * @param out The output object to store the decomposed components.
 */
export function decomposeMatrix(matrix: Matrix4, out: TransformWithShearLike) {
  const m = matrix.elements

  // Extract translation
  out.position.set(m[12], m[13], m[14])

  // Get column vectors
  _c0.set(m[0], m[1], m[2])
  _c1.set(m[4], m[5], m[6])
  _c2.set(m[8], m[9], m[10])

  // Check for reflection
  const det = _c0.dot(_cr.crossVectors(_c1, _c2))
  const sign = det < 0 ? -1 : 1

  // QR decomposition using Gram-Schmidt
  // Q will be orthonormal, R will be upper triangular

  // First column
  const scaleX = _c0.length()
  // const _q0 = _c0.clone().divideScalar(scaleX)
  _q0.copy(_c0).divideScalar(scaleX)

  // Second column  
  const r01 = _q0.dot(_c1)  // This is shear XY
  _q1
    .copy(_c1)
    .addScaledVector(_q0, -r01)
  const scaleY = _q1.length()
  _q1.divideScalar(scaleY)

  // Third column
  const r02 = _q0.dot(_c2)  // This is shear XZ
  const r12 = _q1.dot(_c2)  // This is shear YZ  
  _q2
    .copy(_c2)
    .addScaledVector(_q0, -r02)
    .addScaledVector(_q1, -r12)
  const scaleZ = _q2.length()
  _q2.divideScalar(scaleZ)

  // Handle reflection by negating first column
  if (sign < 0) {
    _q0.negate()
  }

  // Build rotation matrix from orthonormal columns
  out.quaternion.setFromRotationMatrix(_m.makeBasis(_q0, _q1, _q2))

  // Scale with reflection
  out.scale.set(sign * scaleX, scaleY, scaleZ)

  out.shear.set(
    // r01,
    // r02,
    // r12,
    sign * r01 / scaleY, // <--- (jnc) normalize to get actual shear factor
    sign * r02 / scaleZ, // <--- (jnc) normalize to get actual shear factor
    r12 / scaleZ, // <--- (jnc) normalize to get actual shear factor
  )
}

export function fromTransformWithShearDeclaration<T extends TransformWithShearLike>(
  arg: TransformWithShearDeclaration,
  out: T,
  {
    resetMissing = true,
  } = {}
): T {
  if (arg.position !== undefined) {
    fromVector3Declaration(arg.position, out.position)
  } else if (resetMissing) {
    out.position.set(0, 0, 0)
  }
  if (arg.quaternion !== undefined) {
    fromVector4Declaration(arg.quaternion, out.quaternion)
  } else if (arg.rotation !== undefined) {
    // Do not forget the euler case!
    out.quaternion.setFromEuler(fromEulerDeclaration(arg.rotation))
  } else if (resetMissing) {
    out.quaternion.set(0, 0, 0, 1)
  }
  if (arg.scale !== undefined) {
    fromVector3Declaration(arg.scale, out.scale)
  } else if (resetMissing) {
    out.scale.set(1, 1, 1)
  }
  if (arg.shear !== undefined) {
    fromVector3Declaration(arg.shear, out.shear)
  } else if (resetMissing) {
    out.shear.set(0, 0, 0)
  }
  return out
}

export function lerpTransforms(
  transformA: TransformWithShearLike,
  transformB: TransformWithShearLike,
  alpha: number,
  out: TransformWithShearLike,
): void {
  out.position.lerpVectors(transformA.position, transformB.position, alpha)
  out.quaternion.slerpQuaternions(transformA.quaternion, transformB.quaternion, alpha)
  out.scale.lerpVectors(transformA.scale, transformB.scale, alpha)
  out.shear.lerpVectors(transformA.shear, transformB.shear, alpha)
}
