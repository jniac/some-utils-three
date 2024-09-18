import { Euler, Matrix4, Object3D, Quaternion, Vector2, Vector3 } from 'three'

/**
 * Because readonly types are compatible with their mutable counterparts, we can use this type to handle both cases.
 */
type ReadonlyOrNot<T> = T | Readonly<T>

type Vector2DeclarationBase =
  | number
  | [x: number, y: number]
  | { x: number; y: number }
  | { width: number; height: number }

export type Vector2Declaration = ReadonlyOrNot<Vector2DeclarationBase>

type Vector3DeclarationBase =
  | number
  | [x: number, y: number, z?: number]
  | { x: number; y: number; z?: number }
  | { width: number; height: number; depth: number }

export type Vector3Declaration = ReadonlyOrNot<Vector3DeclarationBase>

export type AngleUnit = 'rad' | 'deg' | 'turn'
export type AngleDeclaration = number | `${number}` | `${number}${AngleUnit}`
const angleScalar: Record<AngleUnit, number> = {
  rad: 1,
  deg: Math.PI / 180,
  turn: Math.PI * 2,
}

function formatNumber(x: number, fractionDigits: number): string {
  return x
    .toFixed(fractionDigits)
    .replace(/\.([0-9]+[1-9])?0+$/, (m, m0) => m0?.length > 0 ? `.${m0}` : '')
}

export function solveAngleDeclaration(declaration: AngleDeclaration, defaultUnit: AngleUnit = 'rad'): number {
  let unit: AngleUnit = defaultUnit
  let value: number = 0
  if (typeof declaration === 'number') {
    value = declaration
  } else {
    const match = declaration.match(/^(-?[0-9.]+)(rad|deg|turn)$/)
    if (match) {
      value = Number.parseFloat(match[1])
      unit = match[2] as AngleUnit
    } else {
      value = Number.parseFloat(declaration)
    }
  }
  return value * angleScalar[unit]
}

export function toAngleDeclarationString(value: number, unit: AngleUnit = 'rad'): string {
  const fractionDigits = {
    rad: 3,
    deg: 1,
    turn: 4,
  }[unit]
  return `${formatNumber(value / angleScalar[unit], fractionDigits)}${unit}`
}

type EulerDeclarationArray = [x: AngleDeclaration, y: AngleDeclaration, z: AngleDeclaration, unit?: AngleUnit, order?: Euler['order']]
type EulerDeclarationObject = { x: AngleDeclaration; y: AngleDeclaration; z: AngleDeclaration; unit?: AngleUnit; order?: Euler['order'] }
type EulerDeclarationBase = EulerDeclarationArray | EulerDeclarationObject

export type EulerDeclaration = ReadonlyOrNot<EulerDeclarationBase>

export type TransformDeclaration = Partial<{
  x: number
  y: number
  z: number
  position: Vector3Declaration

  rotationX: number
  rotationY: number
  rotationZ: number
  rotation: EulerDeclaration
  rotationOrder: Euler['order']
  useDegree: boolean

  scale: Vector3Declaration
  scaleX: number
  scaleY: number
  scaleZ: number
  scaleScalar: number
}>

export function isVector2Declaration(arg: any): arg is Vector2Declaration {
  if (typeof arg === 'number') return true
  if (Array.isArray(arg)) return arg.length >= 2 && arg.length <= 3 && arg.every(v => typeof v === 'number')
  if (typeof arg === 'object') {
    if ('x' in arg && 'y' in arg) return true
    if ('width' in arg && 'height' in arg) return true
  }
  return false
}

export function solveVector2Declaration(arg: Vector2Declaration, out: Vector2 = new Vector2()): Vector2 {
  if (typeof arg === 'number') {
    return out.set(arg, arg)
  }
  if (Array.isArray(arg)) {
    const [x, y] = arg
    return out.set(x, y)
  }
  if ('width' in arg) {
    const { width, height } = arg
    return out.set(width, height)
  }
  const { x, y } = arg as { x: number; y: number }
  return out.set(x, y)
}

export function isVector3Declaration(arg: any): arg is Vector3Declaration {
  if (typeof arg === 'number') return true
  if (Array.isArray(arg)) return arg.length >= 2 && arg.length <= 3 && arg.every(v => typeof v === 'number')
  if (typeof arg === 'object') {
    if ('x' in arg && 'y' in arg) return true
    if ('width' in arg && 'height' in arg) return true
  }
  return false
}

export function solveVector3Declaration(arg: Vector3Declaration, out: Vector3 = new Vector3()): Vector3 {
  if (typeof arg === 'number') {
    return out.set(arg, arg, arg)
  }
  if (Array.isArray(arg)) {
    const [x, y, z = 0] = arg
    return out.set(x, y, z)
  }
  if ('width' in arg) {
    const { width, height, depth } = arg
    return out.set(width, height, depth)
  }
  const { x, y, z = 0 } = arg as { x: number; y: number; z?: number }
  return out.set(x, y, z)
}

export function toVector3Declaration(arg: Vector3Declaration): Vector3Declaration {
  const { x, y, z } = solveVector3Declaration(arg)
  return [x, y, z]
}

export function solveEulerDeclaration(arg: EulerDeclaration, out: Euler = new Euler()): Euler {
  if (arg instanceof Euler) {
    return out.copy(arg)
  }
  if (Array.isArray(arg)) {
    const [x, y, z, unit = 'rad', order = 'XYZ'] = arg
    return out.set(
      solveAngleDeclaration(x, unit),
      solveAngleDeclaration(y, unit),
      solveAngleDeclaration(z, unit),
      order)
  }
  const { x, y, z, order = 'XYZ', unit = 'rad' } = arg as EulerDeclarationObject
  return out.set(
    solveAngleDeclaration(x, unit),
    solveAngleDeclaration(y, unit),
    solveAngleDeclaration(z, unit),
    order)
}

export function toEulerDeclarationString(arg: EulerDeclaration, unit: AngleUnit = 'deg'): string {
  const { x, y, z, order } = solveEulerDeclaration(arg)
  const scalar = angleScalar[unit]

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

export const solveTransformDeclaration = (() => {
  const _position = new Vector3()
  const _rotation = new Euler()
  const _scale = new Vector3()
  const _quaternion = new Quaternion()

  function solveTransformDeclaration(props: TransformDeclaration, out: Matrix4): Matrix4
  function solveTransformDeclaration<T extends Object3D>(props: TransformDeclaration, out: T): T
  function solveTransformDeclaration(props: any, out: any): any {
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
      useDegree = false,

      scaleX = 1,
      scaleY = 1,
      scaleZ = 1,
      scaleScalar = 1,
      scale = { x: scaleX, y: scaleY, z: scaleZ },
    } = props

    if (useDegree) {
      const s = Math.PI / 180
      rotation.x *= s
      rotation.y *= s
      rotation.z *= s
    }

    if (out instanceof Matrix4) {
      solveVector3Declaration(position, _position)
      solveEulerDeclaration(rotation, _rotation)
      solveVector3Declaration(scale, _scale).multiplyScalar(scaleScalar)
      _quaternion.setFromEuler(_rotation)
      return out.compose(_position, _quaternion, _scale)
    }

    if (out instanceof Object3D) {
      solveVector3Declaration(position, out.position)
      solveEulerDeclaration(rotation, out.rotation)
      solveVector3Declaration(scale, out.scale).multiplyScalar(scaleScalar)
      return out
    }

    throw new Error('Invalid out argument')
  }
  return solveTransformDeclaration
})()

export function makeMatrix4(props: TransformDeclaration): Matrix4 {
  return solveTransformDeclaration(props, new Matrix4())
}
