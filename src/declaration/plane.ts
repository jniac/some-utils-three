import { isVector3Declaration, Vector3Declaration } from 'some-utils-ts/declaration'
import { Plane, Vector3 } from 'three'
import { fromVector3Declaration, isPlane } from '../declaration'

type NormalDeclaration =
  | `${'+' | '-'}${'x' | 'y' | 'z'}`
  | Vector3Declaration

function isNormalDeclaration(arg: any): arg is NormalDeclaration {
  return (
    (typeof arg === 'string' && /^[+-][xyz]$/.test(arg))
    || isVector3Declaration(arg)
  )
}

function fromNormalDeclaration(arg: NormalDeclaration, out: Vector3 = new Vector3()): Vector3 {
  if (isVector3Declaration(arg)) {
    return fromVector3Declaration(arg, out)
  } else if (typeof arg === 'string') {
    const [sign, axe] = arg
    const value = sign === '+' ? 1 : -1
    switch (axe) {
      case 'x': return out.set(value, 0, 0)
      case 'y': return out.set(0, value, 0)
      case 'z': return out.set(0, 0, value)
      default: throw new Error(`Invalid normal declaration: ${arg}`)
    }
  } else {
    throw new Error('Invalid normal declaration')
  }
}

type PlaneDeclaration =
  | Plane
  | NormalDeclaration // "normal only"
  | [NormalDeclaration, Vector3Declaration]

function isPlaneDeclaration(arg: any): arg is PlaneDeclaration {
  if (isPlane(arg)) {
    return true
  }
  if (Array.isArray(arg) && arg.length === 2) {
    return isNormalDeclaration(arg[0]) && isVector3Declaration(arg[1])
  }
  return isNormalDeclaration(arg)
}

const normal = new Vector3(), point = new Vector3()
function fromPlaneDeclaration(arg: any, out: Plane = new Plane()): Plane {
  normal.set(0, 0, 1)
  point.set(0, 0, 0)

  const normalLength = normal.length()

  if (isNormalDeclaration(arg)) {
    // PlaneDeclaration is "normal only"
    fromNormalDeclaration(arg, normal)
  }

  else if (Array.isArray(arg)) {
    // PlaneDeclaration is [normal, point]
    if (arg.length !== 2)
      throw new Error('Invalid plane declaration: expected an array of length 2')

    fromNormalDeclaration(arg[0], normal)
    fromVector3Declaration(arg[1], point)
  }

  if (normalLength === 0)
    throw new Error('Invalid plane normal: zero vector')

  return out.setFromNormalAndCoplanarPoint(normal.divideScalar(normalLength), point)
}

export {
  fromNormalDeclaration,
  fromPlaneDeclaration,
  isNormalDeclaration,
  isPlaneDeclaration,
  NormalDeclaration,
  PlaneDeclaration
}
