import { Euler, Matrix4, Object3D, Quaternion, Vector2, Vector3, Vector4 } from 'three'

import * as agnostic from 'some-utils-ts/declaration'
import {
  AngleDeclaration,
  Vector2Declaration,
  Vector3Declaration,
  Vector4Declaration
} from 'some-utils-ts/declaration'

import { Vector4Like } from 'some-utils-ts/types'
import { EulerDeclaration, fromEulerDeclaration } from './declaration/euler'
import { isMatrix4, isObject3D } from './is'

export * from './declaration/euler'
export * from './declaration/plane'
export * from './declaration/vector'
export * from './is'

export type {
  AngleDeclaration,
  AngleUnit,
  Vector2Declaration,
  Vector3Declaration,
  Vector4Declaration
} from 'some-utils-ts/declaration'

export {
  fromAngleDeclaration,
  isVector2Declaration,
  isVector3Declaration,
  isVector4Declaration,
  toAngleDeclarationString,
  toVector2Declaration,
  toVector3Declaration,
  toVector4Declaration
} from 'some-utils-ts/declaration'

export type TransformDeclaration = Partial<{
  x: number
  y: number
  z: number
  position: Vector3Declaration

  rotationX: AngleDeclaration
  rotationY: AngleDeclaration
  rotationZ: AngleDeclaration
  rotation: EulerDeclaration
  rotationOrder: Euler['order']

  scale: Vector3Declaration
  scaleX: number
  scaleY: number
  scaleZ: number
  scaleScalar: number
}>

export function fromVector2Declaration(arg: Partial<Vector2Declaration>, out: Vector2 = new Vector2()): Vector2 {
  return agnostic.fromVector2Declaration(arg, out)
}

export function fromVector3Declaration(arg: Partial<Vector3Declaration>, out: Vector3 = new Vector3()): Vector3 {
  return agnostic.fromVector3Declaration(arg, out)
}

export function fromVector4Declaration<T extends Vector4Like>(arg: Partial<Vector4Declaration>, out?: T): T {
  // @ts-ignore
  out ??= new Vector4() as T
  return agnostic.fromVector4Declaration(arg, out)
}

export const fromTransformDeclaration = (() => {
  const _position = new Vector3()
  const _rotation = new Euler()
  const _scale = new Vector3()
  const _quaternion = new Quaternion()

  function fromTransformDeclaration(props: TransformDeclaration, out: Matrix4): Matrix4
  function fromTransformDeclaration<T extends Object3D>(props: TransformDeclaration, out: T): T
  function fromTransformDeclaration(props: TransformDeclaration, out: any): any {
    const {
      x = 0,
      y = 0,
      z = 0,
      position = { x, y, z },

      rotationX = 0,
      rotationY = 0,
      rotationZ = 0,
      rotationOrder = 'XYZ',
      rotation = { x: rotationX, y: rotationY, z: rotationZ, order: rotationOrder },

      scaleX = 1,
      scaleY = 1,
      scaleZ = 1,
      scaleScalar = 1,
      scale = { x: scaleX, y: scaleY, z: scaleZ },
    } = props

    if (isMatrix4(out)) {
      fromVector3Declaration(position, _position)
      fromEulerDeclaration(rotation, _rotation)
      fromVector3Declaration(scale, _scale).multiplyScalar(scaleScalar)
      _quaternion.setFromEuler(_rotation)
      return out.compose(_position, _quaternion, _scale)
    }

    if (isObject3D(out)) {
      fromVector3Declaration(position, out.position)
      fromEulerDeclaration(rotation, out.rotation)
      fromVector3Declaration(scale, out.scale).multiplyScalar(scaleScalar)
      return out
    }

    throw new Error('Invalid out argument')
  }
  return fromTransformDeclaration
})()

const _m0 = new Matrix4()
const _m1 = new Matrix4()
/**
 * Combines multiple transform declarations into a single matrix.
 * 
 * NOTE: The returned matrix, if not provided, is reused for performance reasons.
 * Clone it if you need to keep it for later use.
 */
export function fromTransformDeclarations(transforms: TransformDeclaration[], out = _m0): Matrix4 {
  out.identity()

  const iterator = transforms[Symbol.iterator]()
  const first = iterator.next()

  if (first.done)
    return out // Return identity matrix if no transforms

  fromTransformDeclaration(first.value, out)

  for (let entry = iterator.next(); !entry.done; entry = iterator.next()) {
    fromTransformDeclaration(entry.value, _m1)
    out.multiply(_m1)
  }

  return out
}

