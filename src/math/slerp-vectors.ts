import { Vector3 } from 'three'

const _v1 = new Vector3()
const _v2 = new Vector3()
const _normal = new Vector3()
const _out = new Vector3()

/**
 * Spherically interpolates between two vectors.
 *
 * Notes:
 * - The resulting vector is stored in the `out` parameter.
 * - If the out parameter is not provided, an internal vector is used. Clone it if you need to keep the result.
 * - If the vectors are very close, linear interpolation is used instead.
 */
export function slerpVectors(v1: Vector3, v2: Vector3, alpha: number, out = _out): Vector3 {
  _normal.crossVectors(v1, v2)
  if (_normal.lengthSq() < 1e-6) {
    // Vectors are parallel or anti-parallel
    _normal.set(1, 0, 0).cross(v1)
    if (_normal.lengthSq() < 1e-6) {
      _normal.set(0, 1, 0).cross(v1)
    }
  }

  const length1 = v1.length()
  const length2 = v2.length()

  _v1.copy(v1).divideScalar(length1)
  _v2.copy(v2).divideScalar(length2)
  const dot = _v1.dot(_v2)
  const angle = Math.acos(Math.min(Math.max(dot, -1), 1))

  if (Math.abs(angle) < 1e-6) {
    // Vectors are very close; use linear interpolation
    out.lerpVectors(v1, v2, alpha)
  } else {
    // const sinAngle = Math.sin(angle)
    // const factor1 = Math.sin((1 - alpha) * angle) / sinAngle
    // const factor2 = Math.sin(alpha * angle) / sinAngle

    // out.copy(_v1).multiplyScalar(factor1 * length1)
    // out.addScaledVector(_v2, factor2 * length2)

    _normal.normalize()

    const theta = angle * alpha
    const cosTheta = Math.cos(theta)
    const sinTheta = Math.sin(theta)

    out
      .copy(_v1).multiplyScalar(cosTheta) // v1 * cos(theta)
      .addScaledVector(_v2.copy(_normal).cross(_v1), sinTheta) // + (normal x v1) * sin(theta)
      .multiplyScalar((1 - alpha) * length1 + alpha * length2) // * interpolated length
  }

  return out
}