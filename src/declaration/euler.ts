import { Euler, EulerOrder } from 'three'

import {
  AngleDeclaration,
  angleScalars,
  AngleUnit,
  fromAngleDeclaration,
  isAngleUnit
} from 'some-utils-ts/declaration'
import { isEuler } from '../is'

type ReadonlyOrNot<T> = T | Readonly<T>

type EulerDeclarationArray =
  | [x: AngleDeclaration, y: AngleDeclaration, z: AngleDeclaration, order?: Euler['order']]
  | [x: AngleDeclaration, y: AngleDeclaration, z: AngleDeclaration, order: Euler['order'], unit: AngleUnit]
  | [x: AngleDeclaration, y: AngleDeclaration, z: AngleDeclaration, unit: AngleUnit]
type EulerDeclarationObject = { x: AngleDeclaration; y: AngleDeclaration; z: AngleDeclaration; unit?: AngleUnit; order?: Euler['order'] }
// type EulerDeclarationString = `${AngleDeclaration}, ${AngleDeclaration}, ${AngleDeclaration}${'' | `, ${Euler['order']}`}` // Too heavy for TS
type EulerDeclarationBase = EulerDeclarationArray | EulerDeclarationObject | string

type EulerDeclaration = ReadonlyOrNot<EulerDeclarationBase>

function isEulerOrder(arg: any): arg is Euler['order'] {
  return typeof arg === 'string' && /^(XYZ|XZY|YXZ|YZX|ZXY|ZYX)$/.test(arg)
}

const defaultFromEulerDeclarationOptions = { defaultOrder: <EulerOrder>'XYZ' }
type FromEulerDeclarationOptions = typeof defaultFromEulerDeclarationOptions

function formatNumber(x: number, fractionDigits: number): string {
  return x
    .toFixed(fractionDigits)
    .replace(/\.([0-9]+[1-9])?0+$/, (_, m0) => m0?.length > 0 ? `.${m0}` : '')
}

function fromEulerDeclarationString(str: string, options: FromEulerDeclarationOptions, out: Euler = new Euler()): Euler {
  str = str.replace(/\s+\/\s+/g, '/').trim()
  const array = str.split(',').map(x => x.trim())
  const [xAngle, yAngle = '', zAngle = '', orderOption] = array as [string, string?, string?, string?]
  if (array.length === 1 && /\s/.test(str)) {
    console.warn('Detected a single string with spaces, treating it as an Euler declaration string. Commas are expected to separate values.')
    return fromEulerDeclarationString(str.replace(/\s/, ','), options, out)
  }
  const x = fromAngleDeclaration(xAngle as AngleDeclaration) || 0
  const y = fromAngleDeclaration(yAngle as AngleDeclaration) || 0
  const z = fromAngleDeclaration(zAngle as AngleDeclaration) || 0
  const order = isEulerOrder(orderOption) ? orderOption : options.defaultOrder
  return out.set(x, y, z, order)
}

function fromEulerDeclaration(arg: EulerDeclaration, out?: Euler): Euler
function fromEulerDeclaration(arg: EulerDeclaration, options: FromEulerDeclarationOptions, out?: Euler): Euler
function fromEulerDeclaration(...args: any[]): Euler {
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
  const [arg, options, out] = parseArgs()

  if (typeof arg === 'string') {
    return fromEulerDeclarationString(arg, options, out)
  }

  if (isEuler(arg)) {
    return out.copy(arg)
  }

  const { defaultOrder } = options
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

export {
  EulerDeclaration,
  fromEulerDeclaration,
  isEulerOrder
}

