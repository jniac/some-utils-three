import { Vector2, Vector3, Vector4 } from 'three'

import * as agnostic from 'some-utils-ts/declaration'
import {
  Vector2Declaration,
  Vector3Declaration,
  Vector4Declaration
} from 'some-utils-ts/declaration'


function fromVector2Declaration(arg: Vector2Declaration, out: Vector2 = new Vector2()): Vector2 {
  return agnostic.fromVector2Declaration(arg, out)
}

function fromVector3Declaration(arg: Vector3Declaration, out: Vector3 = new Vector3()): Vector3 {
  return agnostic.fromVector3Declaration(arg, out)
}

function fromVector4Declaration(arg: Vector4Declaration, out: Vector4 = new Vector4()): Vector4 {
  return agnostic.fromVector4Declaration(arg, out)
}

export {
  fromVector2Declaration,
  fromVector3Declaration,
  fromVector4Declaration
}
