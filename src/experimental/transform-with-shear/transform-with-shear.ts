import { Euler, Matrix4, Quaternion, Vector3 } from 'three'

import { composeMatrix, decomposeMatrix, fromTransformWithShearDeclaration, lerpTransforms } from './core'
import { TransformWithShearDeclaration, TransformWithShearLike } from './type'
import { lerpMatrixes, lerpTransforms as lerpTransformUtils } from './utils'

export class TransformWithShear implements TransformWithShearLike {
  static lerp = lerpTransformUtils
  static lerpMatrixes = lerpMatrixes
  static from(arg: Matrix4 | TransformWithShearDeclaration) {
    return (new this()).from(arg)
  }

  readonly position = new Vector3()
  readonly scale = new Vector3(1, 1, 1)
  readonly quaternion = new Quaternion()
  readonly shear = new Vector3()

  #rotation = <Euler | null>null
  #getRotation(): Euler {
    if (this.#rotation === null) {
      const rotation = new Euler().setFromQuaternion(this.quaternion)
      rotation._onChangeCallback = () => {
        this.quaternion.setFromEuler(rotation)
      }
      return this.#rotation = rotation
    }
    return this.#rotation
  }
  /**
   * The rotation as Euler angles (in radians).
   * 
   * Modifying the rotation will update the quaternion, and vice versa.
   * 
   * Note:
   * - The Euler instance is created on first access, and then cached (lazy init).
   */
  get rotation() { return this.#getRotation() }

  copy(other: TransformWithShearLike): this {
    this.position.copy(other.position)
    this.scale.copy(other.scale)
    this.quaternion.copy(other.quaternion)
    this.shear.copy(other.shear)
    return this
  }

  clone(): this {
    return (new (this.constructor as new () => this)).copy(this)
  }

  toMatrix(out = new Matrix4()): Matrix4 {
    composeMatrix(this, out)
    return out
  }

  from(arg: Matrix4 | TransformWithShearDeclaration): this {
    if (arg instanceof Matrix4) {
      decomposeMatrix(arg, this)
    } else {
      fromTransformWithShearDeclaration(arg, this)
    }
    return this
  }

  lerpTransforms(
    transformA: TransformWithShearLike,
    transformB: TransformWithShearLike,
    alpha: number,
  ): this {
    lerpTransforms(transformA, transformB, alpha, this)
    return this
  }

  lerp(other: TransformWithShearLike, alpha: number): this {
    lerpTransforms(this, other, alpha, this)
    return this
  }

  identity(): this {
    this.position.set(0, 0, 0)
    this.quaternion.set(0, 0, 0, 1)
    this.scale.set(1, 1, 1)
    this.shear.set(0, 0, 0)
    return this
  }

  isIdentity(tolerance = 1e-6): boolean {
    return this.position.lengthSq() <= tolerance
      && Math.abs(this.quaternion.x) <= tolerance
      && Math.abs(this.quaternion.y) <= tolerance
      && Math.abs(this.quaternion.z) <= tolerance
      && Math.abs(this.quaternion.w - 1) <= tolerance
      && Math.abs(this.scale.x - 1) <= tolerance
      && Math.abs(this.scale.y - 1) <= tolerance
      && Math.abs(this.scale.z - 1) <= tolerance
      && Math.abs(this.shear.x) <= tolerance
      && Math.abs(this.shear.y) <= tolerance
      && Math.abs(this.shear.z) <= tolerance
  }
}