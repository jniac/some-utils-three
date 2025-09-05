import { Matrix4, Quaternion, Vector3 } from 'three'

export type TransformLike = {
  /**
   * Position vector.
   */
  position: Vector3

  /**
   * Rotation as a quaternion.
   */
  rotation: Quaternion

  /**
   * Non-uniform scale factors along each axis.
   */
  scale: Vector3

  /**
   * Optional scale factor.
   * 
   * Useful for uniform scaling when combined with non-uniform scale (or not).
   */
  scaleFactor?: number

  /**
   * Optional shear components.
   * 
   * If undefined, no shear is applied.
   */
  shear?: Vector3
}

const zeroVector3 = new Vector3()
const tmpMatrix4 = new Matrix4()
const tmpMatrix4_0 = new Matrix4()
const tmpMatrix4_1 = new Matrix4()
const tmpMatrix4_2 = new Matrix4()
const tmpMatrix4_3 = new Matrix4()

export function lerpTransforms(
  transformA: TransformLike,
  transformB: TransformLike,
  alpha: number,
  out: TransformLike,
): void {
  out.position.lerpVectors(transformA.position, transformB.position, alpha)
  out.rotation.slerpQuaternions(transformA.rotation, transformB.rotation, alpha)
  out.scale.lerpVectors(transformA.scale, transformB.scale, alpha)
  if (transformA.shear || transformB.shear) {
    if (!out.shear)
      out.shear = new Vector3()
    out.shear.lerpVectors(transformA.shear ?? zeroVector3, transformB.shear ?? zeroVector3, alpha)
  } else {
    out.shear = undefined
  }
}


/**
 * Decompose a Matrix4 into position, rotation, scale, and shear components
 * Using QR decomposition approach
 */
export function decomposeMatrixWithShear(matrix: Matrix4, out: TransformLike): void {
  const m = matrix.elements

  // Extract translation
  out.position.set(m[12], m[13], m[14])

  // Extract 3x3 upper-left submatrix
  const M = new Matrix4().set(
    m[0], m[4], m[8], 0,
    m[1], m[5], m[9], 0,
    m[2], m[6], m[10], 0,
    0, 0, 0, 1
  )

  // Get column vectors
  const c0 = new Vector3(m[0], m[1], m[2])
  const c1 = new Vector3(m[4], m[5], m[6])
  const c2 = new Vector3(m[8], m[9], m[10])

  // Check for reflection
  const det = c0.dot(new Vector3().crossVectors(c1, c2))
  const sign = det < 0 ? -1 : 1

  // QR decomposition using Gram-Schmidt
  // Q will be orthonormal, R will be upper triangular

  // First column
  const scaleX = c0.length()
  const q0 = c0.clone().divideScalar(scaleX)

  // Second column  
  const xy = q0.dot(c1)
  const q1_unnorm = c1.clone().addScaledVector(q0, -xy)
  const scaleY = q1_unnorm.length()
  const q1 = q1_unnorm.divideScalar(scaleY)

  // Third column
  const xz = q0.dot(c2)
  const yz = q1.dot(c2)
  const q2_unnorm = c2.clone().addScaledVector(q0, -xz).addScaledVector(q1, -yz)
  const scaleZ = q2_unnorm.length()
  const q2 = q2_unnorm.divideScalar(scaleZ)

  // Handle reflection by negating first column
  if (sign < 0) {
    q0.negate()
  }

  // Build rotation matrix from orthonormal columns
  tmpMatrix4.makeBasis(q0, q1, q2)
  out.rotation.setFromRotationMatrix(tmpMatrix4)

  // Scale with reflection
  out.scale.set(sign * scaleX, scaleY, scaleZ)

  const hasShear = Math.abs(xy) > 1e-5 || Math.abs(xz) > 1e-5 || Math.abs(yz) > 1e-5
  if (hasShear) {
    if (!out.shear)
      out.shear = new Vector3()
    out.shear.set(xy, xz, yz)
  } else {
    out.shear = undefined
  }

  out.scaleFactor = undefined // Must be reset
}

/**
 * Compose a Matrix4 with the transform components
 * Order: T * R * H * S where H is shear matrix
 */
export function composeMatrixWithShear(
  params: TransformLike,
  out: Matrix4,
): void {
  const { position, rotation, scale, shear } = params

  // Build composite transformation matrix manually
  // Final matrix = T * R * H * S

  // 1. Scale matrix S
  const S = tmpMatrix4_0.makeScale(scale.x, scale.y, scale.z)

  // 2. Shear matrix H (upper triangular)
  const xy = shear?.x ?? 0
  const xz = shear?.y ?? 0
  const yz = shear?.z ?? 0
  const H = tmpMatrix4_1.set(
    1, xy, xz, 0,
    // 0, 1, yz, 0, // From original claude.ai code
    0, 1, yz / 2, 0, // <--- My modification to fix shear YZ
    0, 0, 1, 0,
    0, 0, 0, 1
  )

  // 3. Rotation matrix R
  const R = tmpMatrix4_2.makeRotationFromQuaternion(rotation)

  // 4. Translation matrix T
  const T = tmpMatrix4_3.makeTranslation(position.x, position.y, position.z)

  // Combine: result = T * R * H * S
  // Build from right to left: ((S * H) * R) * T
  out.copy(S)
  out.multiply(R)
  out.multiply(H)
  out.premultiply(T)
}