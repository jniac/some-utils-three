import { Euler, Matrix3, Object3D, Vector3 } from 'three/webgpu'

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

  // Extra:
  /**
   * If defined, the object will be moved as if the pivot was at the origin.
   * 
   * NOTE: The pivot is expressed in the object's local space.
   * 
   * Defaults to `undefined`.
   */
  pivot: <Vector3Declaration | undefined>undefined,
  /**
   * Applies only if defined.
   * 
   * Defaults to `undefined`.
   */
  visible: <boolean | undefined>undefined,
  /**
   * Applies only if defined.
   * 
   * Defaults to `undefined`.
   */
  name: <string | undefined>undefined,
  /**
   * Applies only if defined.
   * 
   * Defaults to `undefined`.
   */
  parent: <Object3D | undefined>undefined,
}

export type TransformProps = Partial<typeof defaultTransformProps & {
  position: Vector3 | Vector3Declaration
  rotation: Euler | EulerDeclaration
  scale: Vector3 | Vector3Declaration
}>

const _matrix3 = new Matrix3()
const _vector3 = new Vector3()

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

    pivot,

    visible,
    name,
    parent,
  } = { ...defaultTransformProps, ...props }

  fromVector3Declaration(position, target.position)
  fromEulerDeclaration(rotation ?? [rotationX, rotationY, rotationZ, rotationOrder, rotationUnit], target.rotation)
  fromVector3Declaration(scale, target.scale)

  if (pivot !== undefined) {
    target.updateMatrix()
    _matrix3.setFromMatrix4(target.matrix)
    fromVector3Declaration(pivot, _vector3).applyMatrix3(_matrix3)
    target.position.sub(_vector3)
  }

  if (visible !== undefined) {
    target.visible = visible
  }

  if (name !== undefined) {
    target.name = name
  }

  if (parent !== undefined) {
    if (parent !== target.parent) {
      if (parent === null) {
        target.removeFromParent()
      } else {
        parent.add(target)
      }
    }
  }

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
