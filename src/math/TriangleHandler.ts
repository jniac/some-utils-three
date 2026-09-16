import { BufferGeometry, Matrix4, Vector2, Vector3, Vector3Like } from 'three'

import { Matrix2 } from './Matrix2'

export class TriangleHandler {
  ax = 0
  ay = 0
  az = 0

  bx = 0
  by = 0
  bz = 0

  cx = 0
  cy = 0
  cz = 0

  fromGeometry(geometry: BufferGeometry, triangleIndex: number): this {
    const position = geometry.attributes.position
    let i0: number, i1: number, i2: number

    if (geometry.index) {
      i0 = geometry.index.getX(triangleIndex * 3 + 0)
      i1 = geometry.index.getX(triangleIndex * 3 + 1)
      i2 = geometry.index.getX(triangleIndex * 3 + 2)
    } else {
      i0 = triangleIndex * 3 + 0
      i1 = triangleIndex * 3 + 1
      i2 = triangleIndex * 3 + 2
    }

    this.ax = position.getX(i0)
    this.ay = position.getY(i0)
    this.az = position.getZ(i0)

    this.bx = position.getX(i1)
    this.by = position.getY(i1)
    this.bz = position.getZ(i1)

    this.cx = position.getX(i2)
    this.cy = position.getY(i2)
    this.cz = position.getZ(i2)

    return this
  }

  uv(outU = new Vector3(), outV = new Vector3()): [Vector3, Vector3] {
    const { ax, ay, az, bx, by, bz, cx, cy, cz } = this
    return [
      outU.set(bx - ax, by - ay, bz - az),
      outV.set(cx - ax, cy - ay, cz - az),
    ]
  }

  uvAngle() {
    const { ax, ay, az, bx, by, bz, cx, cy, cz } = this

    const ux = bx - ax, uy = by - ay, uz = bz - az
    const vx = cx - ax, vy = cy - ay, vz = cz - az

    const uLen = Math.sqrt(ux * ux + uy * uy + uz * uz)
    const vLen = Math.sqrt(vx * vx + vy * vy + vz * vz)

    const dotProduct = ux * vx + uy * vy + uz * vz
    const cosAngle = dotProduct / (uLen * vLen)

    return Math.acos(cosAngle)
  }

  /**
   * Builds a matrix that maps barycentric direction coefficients to a rectified
   * 2D representation of the triangle plane.
   *
   * In barycentric space, a direction `(u, v)` represents the 3D vector:
   *
   *     u * AB + v * AC
   *
   * Because `AB` and `AC` are generally neither orthogonal nor unit-length,
   * uniformly distributed angles in barycentric space do not produce uniformly
   * distributed directions on the triangle.
   *
   * This matrix embeds the triangle basis into a Euclidean 2D space by placing
   * `AB` on the positive X axis while preserving the lengths and angle of both
   * basis vectors:
   *
   *     AB' = (|AB|, 0)
   *     AC' = (|AC| cos(theta), |AC| sin(theta))
   *
   * Its inverse can therefore convert uniformly sampled 2D directions, such as
   * `(cos(angle), sin(angle))`, into barycentric direction coefficients suitable
   * for walking across a mesh.
   */
  barycentricToRectifiedMatrix(out = new Matrix2()): Matrix2 {
    const { ax, ay, az, bx, by, bz, cx, cy, cz } = this

    const ux = bx - ax, uy = by - ay, uz = bz - az
    const vx = cx - ax, vy = cy - ay, vz = cz - az

    const uLen = Math.sqrt(ux * ux + uy * uy + uz * uz)
    const vLen = Math.sqrt(vx * vx + vy * vy + vz * vz)

    const dotProduct = ux * vx + uy * vy + uz * vz
    const cosAngle = dotProduct / (uLen * vLen)
    const safeCosAngle = Math.max(-1, Math.min(1, cosAngle)) // Clamp to avoid NaN due to floating point errors

    out.set(
      uLen, vLen * safeCosAngle,
      0, vLen * Math.sqrt(1 - safeCosAngle * safeCosAngle),
    )
    return out
  }

  /**
   * Builds a matrix that maps rectified 2D directions back to barycentric direction coefficients.
   */
  rectifiedToBarycentricMatrix(out = new Matrix2()): Matrix2 {
    return this.barycentricToRectifiedMatrix(out).invert()
  }

  uCrossV(out = new Vector3()) {
    const { ax, ay, az, bx, by, bz, cx, cy, cz } = this
    const ux = bx - ax, uy = by - ay, uz = bz - az
    const vx = cx - ax, vy = cy - ay, vz = cz - az
    return out.set(
      uy * vz - uz * vy,
      uz * vx - ux * vz,
      ux * vy - uy * vx,
    )
  }

  normal(out = new Vector3()) {
    return this.uCrossV(out).normalize()
  }

  localToWorldMatrix(out = new Matrix4()) {
    const { ax, ay, az, bx, by, bz, cx, cy, cz } = this

    const ux = bx - ax, uy = by - ay, uz = bz - az
    const vx = cx - ax, vy = cy - ay, vz = cz - az

    const nx = uy * vz - uz * vy
    const ny = uz * vx - ux * vz
    const nz = ux * vy - uy * vx

    out.set(
      ux, vx, nx, ax,
      uy, vy, ny, ay,
      uz, vz, nz, az,
      0, 0, 0, 1,
    )

    return out
  }

  worldToLocalMatrix(out = new Matrix4()) {
    return this.localToWorldMatrix(out).invert()
  }

  pointToLocal(point: Vector3Like, out = new Vector3()) {
    return this.#toLocal(
      point.x - this.ax,
      point.y - this.ay,
      point.z - this.az,
      out,
    )
  }

  pointToWorld(point: Vector3Like, out = new Vector3()) {
    this.#toWorld(point, out)
    out.x += this.ax
    out.y += this.ay
    out.z += this.az
    return out
  }

  vectorToLocal(vector: Vector3Like, out = new Vector3()) {
    return this.#toLocal(vector.x, vector.y, vector.z, out)
  }

  vectorToWorld(vector: Vector3Like, out = new Vector3()) {
    return this.#toWorld(vector, out)
  }

  localDirection(angle: number, out = new Vector3()) {
    const x = Math.cos(angle)
    const y = Math.sin(angle)
    out.set(x, y, 0)
    return out
  }

  angleToRectifiedBarycentricDirection(angle: number, out = new Vector3()) {
    const v = new Vector2(Math.cos(angle), Math.sin(angle))
    const m = this.rectifiedToBarycentricMatrix()
    m.applyTo(v)
    return out.set(v.x, v.y, 0)
  }

  /**
   * What a name! This function returns a converter function that takes an angle in radians and outputs a 3D vector representing the corresponding barycentric direction coefficients in the triangle's local space. The converter uses the rectified-to-barycentric matrix to transform the 2D direction into barycentric coordinates.
   */
  createAngleToRectifiedBarycentricDirectionConverter(): (angle: number, out?: Vector3) => Vector3 {
    const m = this.rectifiedToBarycentricMatrix()
    const v = new Vector2()
    const _out = new Vector3()
    return (angle: number, out = _out) => {
      v.set(Math.cos(angle), Math.sin(angle))
      m.applyTo(v)
      return out.set(v.x, v.y, 0)
    }
  }

  #toLocal(x: number, y: number, z: number, out: Vector3) {
    const { ax, ay, az, bx, by, bz, cx, cy, cz } = this

    const ux = bx - ax, uy = by - ay, uz = bz - az
    const vx = cx - ax, vy = cy - ay, vz = cz - az

    const nx = uy * vz - uz * vy
    const ny = uz * vx - ux * vz
    const nz = ux * vy - uy * vx

    const abSq = ux * ux + uy * uy + uz * uz
    const abAc = ux * vx + uy * vy + uz * vz
    const acSq = vx * vx + vy * vy + vz * vz
    const xAb = x * ux + y * uy + z * uz
    const xAc = x * vx + y * vy + z * vz
    const determinant = abSq * acSq - abAc * abAc

    return out.set(
      (acSq * xAb - abAc * xAc) / determinant,
      (abSq * xAc - abAc * xAb) / determinant,
      (x * nx + y * ny + z * nz) / determinant,
    )
  }

  #toWorld(vector: Vector3Like, out: Vector3) {
    const { ax, ay, az, bx, by, bz, cx, cy, cz } = this

    const ux = bx - ax, uy = by - ay, uz = bz - az
    const vx = cx - ax, vy = cy - ay, vz = cz - az

    const nx = uy * vz - uz * vy
    const ny = uz * vx - ux * vz
    const nz = ux * vy - uy * vx

    const { x, y, z } = vector
    return out.set(
      x * ux + y * vx + z * nx,
      x * uy + y * vy + z * ny,
      x * uz + y * vz + z * nz,
    )
  }
}
