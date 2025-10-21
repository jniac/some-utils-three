import { Matrix4, Vector3 } from 'three'

import { fromTransformDeclaration, TransformDeclaration, } from '../declaration'

const m = new Matrix4()

export function getX(size = 1, transform?: TransformDeclaration): Vector3[] {
  const hs = size / 2
  fromTransformDeclaration(transform ?? {}, m)
  return [
    new Vector3(-hs, -hs, 0).applyMatrix4(m),
    new Vector3(+hs, +hs, 0).applyMatrix4(m),

    new Vector3(+hs, -hs, 0).applyMatrix4(m),
    new Vector3(-hs, +hs, 0).applyMatrix4(m),
  ]
}

export function getY(size = 1, transform?: TransformDeclaration): Vector3[] {
  const hs = size / 2
  fromTransformDeclaration(transform ?? {}, m)
  return [
    new Vector3(-hs, +hs, 0).applyMatrix4(m),
    new Vector3(0, 0, 0).applyMatrix4(m),

    new Vector3(0, 0, 0).applyMatrix4(m),
    new Vector3(+hs, +hs, 0).applyMatrix4(m),

    new Vector3(0, 0, 0).applyMatrix4(m),
    new Vector3(0, -hs, 0).applyMatrix4(m),
  ]
}

export function getZ(size = 1, transform?: TransformDeclaration): Vector3[] {
  const hs = size / 2
  fromTransformDeclaration(transform ?? {}, m)
  return [
    new Vector3(-hs, +hs, 0).applyMatrix4(m),
    new Vector3(+hs, +hs, 0).applyMatrix4(m),

    new Vector3(+hs, +hs, 0).applyMatrix4(m),
    new Vector3(-hs, -hs, 0).applyMatrix4(m),

    new Vector3(-hs, -hs, 0).applyMatrix4(m),
    new Vector3(+hs, -hs, 0).applyMatrix4(m),
  ]
}