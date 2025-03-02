import { Euler, EulerOrder, Matrix4, Object3D, Quaternion, Vector2, Vector3, Vector4 } from 'three'

import * as agnostic from 'some-utils-ts/declaration'
import {
  AngleDeclaration,
  AngleUnit,
  Vector2Declaration,
  Vector3Declaration,
  Vector4Declaration,
  angleScalars,
  fromAngleDeclaration,
} from 'some-utils-ts/declaration'

import { isEuler, isMatrix4, isObject3D } from './is'

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

/**
 * Because readonly types are not compatible with their mutable counterparts, we can use this type to handle both cases.
 */
type ReadonlyOrNot<T> = T | Readonly<T>

function formatNumber(x: number, fractionDigits: number): string {
  return x
    .toFixed(fractionDigits)
    .replace(/\.([0-9]+[1-9])?0+$/, (_, m0) => m0?.length > 0 ? `.${m0}` : '')
}

type EulerDeclarationArray =
  | [x: AngleDeclaration, y: AngleDeclaration, z: AngleDeclaration, order?: Euler['order']]
  | [x: AngleDeclaration, y: AngleDeclaration, z: AngleDeclaration, order: Euler['order'], unit: AngleUnit]
  | [x: AngleDeclaration, y: AngleDeclaration, z: AngleDeclaration, unit: AngleUnit]
type EulerDeclarationObject = { x: AngleDeclaration; y: AngleDeclaration; z: AngleDeclaration; unit?: AngleUnit; order?: Euler['order'] }
type EulerDeclarationBase = EulerDeclarationArray | EulerDeclarationObject

export type EulerDeclaration = ReadonlyOrNot<EulerDeclarationBase>

function isAngleUnit(arg: any): arg is AngleUnit {
  return typeof arg === 'string' && /^(rad|deg|turn)$/.test(arg)
}

function isEulerOrder(arg: any): arg is Euler['order'] {
  return typeof arg === 'string' && /^(XYZ|XZY|YXZ|YZX|ZXY|ZYX)$/.test(arg)
}

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

export function fromVector2Declaration(arg: Vector2Declaration, out: Vector2 = new Vector2()): Vector2 {
  return agnostic.fromVector2Declaration(arg, out)
}

export function fromVector3Declaration(arg: Vector3Declaration, out: Vector3 = new Vector3()): Vector3 {
  return agnostic.fromVector3Declaration(arg, out)
}

export function fromVector4Declaration(arg: Vector4Declaration, out: Vector4 = new Vector4()): Vector4 {
  return agnostic.fromVector4Declaration(arg, out)
}

const defaultFromEulerDeclarationOptions = { defaultOrder: <EulerOrder>'XYZ' }
type FromEulerDeclarationOptions = typeof defaultFromEulerDeclarationOptions
export function fromEulerDeclaration(arg: EulerDeclaration, out?: Euler): Euler
export function fromEulerDeclaration(arg: EulerDeclaration, options: FromEulerDeclarationOptions, out?: Euler): Euler
export function fromEulerDeclaration(...args: any[]): Euler {
  const parseArgs = () => {
    if (args.length === 1)
      return [args[0], defaultFromEulerDeclarationOptions, new Euler()] as [EulerDeclaration, FromEulerDeclarationOptions, Euler]

    if (args.length === 2) {
      return isEuler(args[1])
        ? [args[0], defaultFromEulerDeclarationOptions, args[1]] as [EulerDeclaration, FromEulerDeclarationOptions, Euler]
        : [args[0], args[1], new Euler()] as [EulerDeclaration, FromEulerDeclarationOptions, Euler]
    }

    if (args.length === 3)
      return args as [EulerDeclaration, FromEulerDeclarationOptions, Euler]

    throw new Error('Invalid number of arguments')
  }
  const [arg, { defaultOrder }, out] = parseArgs()

  if (isEuler(arg)) {
    return out.copy(arg)
  }

  if (Array.isArray(arg)) {
    const [x, y, z, arg0, arg1] = arg
    const unit = isAngleUnit(arg0) ? arg0 : isAngleUnit(arg1) ? arg1 : 'rad'
    const order = isEulerOrder(arg0) ? arg0 : isEulerOrder(arg1) ? arg1 : defaultOrder
    return out.set(
      fromAngleDeclaration(x, unit),
      fromAngleDeclaration(y, unit),
      fromAngleDeclaration(z, unit),
      order)
  }

  const { x, y, z, order = defaultOrder, unit = 'rad' } = arg as EulerDeclarationObject
  return out.set(
    fromAngleDeclaration(x, unit),
    fromAngleDeclaration(y, unit),
    fromAngleDeclaration(z, unit),
    order)
}

export function toEulerDeclarationString(arg: EulerDeclaration, unit: AngleUnit = 'deg'): string {
  const { x, y, z, order } = fromEulerDeclaration(arg)
  const scalar = angleScalars[unit]

  const fd = {
    rad: 3,
    deg: 1,
    turn: 4,
  }[unit]

  const xStr = formatNumber(x / scalar, fd)
  const yStr = formatNumber(y / scalar, fd)
  const zStr = formatNumber(z / scalar, fd)

  return `[${xStr}, ${yStr}, ${zStr}, '${unit}', '${order}']`
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

