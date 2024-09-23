import { Euler, Object3D, Vector3 } from 'three'

import { AngleDeclaration, AngleUnit, EulerDeclaration, fromEulerDeclaration, fromVector3Declaration, Vector3Declaration } from '../declaration'

const defaultTransform = {
  position: new Vector3(0, 0, 0),
  rotation: new Euler(0, 0, 0, 'XYZ'),
  scale: new Vector3(1, 1, 1),
  visible: true,
}

export type Transform = typeof defaultTransform

const defaultTransformProps = {
  x: 0,
  y: 0,
  z: 0,

  rotationX: <AngleDeclaration>0,
  rotationY: <AngleDeclaration>0,
  rotationZ: <AngleDeclaration>0,
  rotationOrder: <Euler['order']>'XYZ',
  rotationUnit: <AngleUnit>'rad',

  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
  scaleScalar: 1,

  visible: true,
}

export type TransformProps = Partial<typeof defaultTransformProps & {
  position: Vector3 | Vector3Declaration
  rotation: Euler | EulerDeclaration
  scale: Vector3 | Vector3Declaration
}>

export function applyTransform<T extends Object3D = Object3D>(target: T, props?: TransformProps): T {
  const {
    x,
    y,
    z,
    position = new Vector3(x, y, z),

    rotationX,
    rotationY,
    rotationZ,
    rotationOrder,
    rotationUnit,
    rotation,

    scaleX,
    scaleY,
    scaleZ,
    scaleScalar,
    scale = new Vector3(scaleX, scaleY, scaleZ).multiplyScalar(scaleScalar),

    visible,
  } = { ...defaultTransformProps, ...props }

  fromVector3Declaration(position, target.position)
  fromEulerDeclaration(rotation ?? [rotationX, rotationY, rotationZ, rotationUnit, rotationOrder], target.rotation)
  fromVector3Declaration(scale, target.scale)

  target.visible = visible

  return target
}

export function getTransform(target: Object3D): Transform {
  return {
    position: target.position.clone(),
    rotation: target.rotation.clone(),
    scale: target.scale.clone(),
    visible: target.visible,
  }
}
