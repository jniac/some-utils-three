import { Vector3Declaration } from 'some-utils-ts/declaration'
import { Euler, Vector3 } from 'three'
import { EulerDeclaration, fromEulerDeclaration, fromVector3Declaration } from '../declaration'
import { TransformLike } from './core'

export type TransformDeclaration = Partial<{
  position: Vector3Declaration
  euler: EulerDeclaration
  scale: Vector3Declaration
  scaleFactor: number
  shear: Vector3Declaration
}>

const defaultTransformDeclaration = {
  position: { x: 0, y: 0, z: 0 },
  euler: { x: 0, y: 0, z: 0, order: 'XYZ' as const },
  scale: { x: 1, y: 1, z: 1 },
  scaleFactor: 1,
  shear: { x: 0, y: 0, z: 0 },
}

const tmpEuler = new Euler()

export function fromTransformDeclaration<T extends TransformLike>(arg: Partial<TransformDeclaration>, out: T): T {
  const {
    position,
    euler,
    scale,
    scaleFactor,
    shear,
  } = { ...defaultTransformDeclaration, ...arg }
  fromVector3Declaration(position, out.position)
  fromEulerDeclaration(euler, tmpEuler)
  out.rotation.setFromEuler(tmpEuler)
  fromVector3Declaration(scale, out.scale)
  out.scaleFactor = scaleFactor
  if (arg.shear !== undefined) {
    if (out.shear === undefined)
      out.shear = new Vector3()
    fromVector3Declaration(shear, out.shear)
  }
  return out
}