import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { composeMatrixWithShear, decomposeMatrixWithShear, lerpTransforms, TransformLike } from './core'
import { fromTransformDeclaration, TransformDeclaration } from './declaration'

export class Transform implements TransformLike {
  static test(matrix: Matrix4) {
    const t = new Transform().from(matrix)
    const m2 = t.toMatrix(new Matrix4())
    console.log('original matrix:', ...matrix.elements)
    console.log('decomposed and recomposed matrix:', ...m2.elements)
    console.log('difference:', ...matrix.clone().multiply(m2.clone().invert()).elements)
    return t
  }

  readonly position = new Vector3()
  readonly rotation = new Quaternion()
  readonly scale = new Vector3(1, 1, 1)
  scaleFactor = 1

  /**
   * Shear factors along XY, XZ, YZ planes.
   * 
   * Optional, since most objects don't need shear.
   * 
   * Default to (0,0,0) when accessed if not set.
   */
  shear = <undefined | Vector3>undefined // xy, xz, yz

  /**
   * Optional Euler angles for editing convenience.
   */
  #euler = <undefined | Euler>undefined // in radians

  get euler() { return this.getEuler() }

  get shearSafe() {
    if (!this.shear)
      this.shear = new Vector3(0, 0, 0)
    return this.shear
  }

  copy(other: Transform): this {
    this.position.copy(other.position)
    this.rotation.copy(other.rotation)
    this.scale.copy(other.scale)
    this.scaleFactor = other.scaleFactor

    // shear is optional
    if (other.shear) {
      if (!this.shear)
        this.shear = new Vector3()
      this.shear.copy(other.shear)
    } else {
      this.shear = undefined
    }

    return this
  }

  clone() {
    return new Transform().copy(this)
  }

  from(arg: Matrix4 | TransformDeclaration): this {
    if (arg instanceof Matrix4) {
      decomposeMatrixWithShear(arg, this)
    } else {
      fromTransformDeclaration(arg, this)
    }
    return this
  }

  getEuler() {
    if (!this.#euler) {
      this.#euler = new Euler()
      this.#euler._onChangeCallback = () => {
        this.rotation.setFromEuler(this.#euler!)
      }
    }
    this.#euler.setFromQuaternion(this.rotation)
    return this.#euler
  }

  lerpTransforms(transformA: Transform, transformB: Transform, alpha: number): this {
    lerpTransforms(transformA, transformB, alpha, this)
    return this
  }

  lerp(other: Transform, alpha: number): this {
    lerpTransforms(this, other, alpha, this)
    return this
  }

  toMatrix(out = new Matrix4()): Matrix4 {
    composeMatrixWithShear(this, out)
    return out
  }
}
