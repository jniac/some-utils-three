import { Vector2Like } from 'three'

/**
 * Because Three.js does not have a Matrix2 class completely implemented, this 
 * class provides a basic 2x2 matrix functionality.
 */
export class Matrix2 {
  a = 1
  b = 0
  c = 0
  d = 1

  /**
   * Arguments are given in row-major order:
   *
   * | a b |
   * | c d |
   */
  set(a: number, b: number, c: number, d: number): this {
    this.a = a
    this.b = b
    this.c = c
    this.d = d

    return this
  }

  copy(other: Matrix2): this {
    return this.set(other.a, other.b, other.c, other.d)
  }

  clone(): Matrix2 {
    return new Matrix2().copy(this)
  }

  identity(): this {
    return this.set(
      1, 0,
      0, 1,
    )
  }

  setBasis(u: Vector2Like, v: Vector2Like): this {
    return this.set(
      u.x, v.x,
      u.y, v.y,
    )
  }

  invert(): this {
    const { a, b, c, d } = this

    const determinant = a * d - b * c

    // Same behavior as Three.js matrices for a singular matrix.
    if (determinant === 0) {
      return this.set(0, 0, 0, 0)
    }

    const determinantInverse = 1 / determinant

    return this.set(
      d * determinantInverse,
      -b * determinantInverse,
      -c * determinantInverse,
      a * determinantInverse
    )
  }

  /**
   * this = this * other
   */
  multiply(other: Matrix2): this {
    return this.multiplyMatrices(this, other)
  }

  /**
   * this = other * this
   */
  premultiply(other: Matrix2): this {
    return this.multiplyMatrices(other, this)
  }

  /**
   * this = a * b
   */
  multiplyMatrices(a: Matrix2, b: Matrix2): this {
    const a11 = a.a
    const a12 = a.b
    const a21 = a.c
    const a22 = a.d

    const b11 = b.a
    const b12 = b.b
    const b21 = b.c
    const b22 = b.d

    return this.set(
      a11 * b11 + a12 * b21,
      a11 * b12 + a12 * b22,
      a21 * b11 + a22 * b21,
      a21 * b12 + a22 * b22
    )
  }

  /**
   * Applies this matrix to a 2D vector.
   * 
   * Notes:
   * - Mutates the input vector in place.
   * - Suitable for any object with `x` and `y` properties. Vector3 can be used, but the `z` component will be ignored.
   */
  applyTo<T extends { x: number, y: number }>(v: T): T {
    const x = v.x
    const y = v.y
    v.x = this.a * x + this.b * y
    v.y = this.c * x + this.d * y
    return v
  }
}
