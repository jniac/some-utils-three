import { Matrix4, Vector3 } from 'three'

import { fromTransformDeclaration, TransformDeclaration, } from '../declaration'

const m = new Matrix4()

export function getMinus(size = 1, transform?: TransformDeclaration): Vector3[] {
  const hs = size / 2

  const points = [
    new Vector3(-hs, 0, 0),
    new Vector3(+hs, 0, 0),
  ]

  fromTransformDeclaration(transform ?? {}, m)
  for (const v of points)
    v.applyMatrix4(m)

  return points
}

export function getPlus(size = 1, transform?: TransformDeclaration): Vector3[] {
  const hs = size / 2

  const points = [
    new Vector3(-hs, 0, 0),
    new Vector3(+hs, 0, 0),

    new Vector3(0, -hs, 0),
    new Vector3(0, +hs, 0),
  ]

  fromTransformDeclaration(transform ?? {}, m)
  for (const v of points)
    v.applyMatrix4(m)

  return points
}

export function getX(size = 1, transform?: TransformDeclaration): Vector3[] {
  const hs = size / 2
  fromTransformDeclaration(transform ?? {}, m)
  return [
    new Vector3(-hs, -hs, 0),
    new Vector3(+hs, +hs, 0),

    new Vector3(+hs, -hs, 0),
    new Vector3(-hs, +hs, 0),
  ]
    .map(v => v.applyMatrix4(m))
}

export function getPlusX(size = 1, transform?: TransformDeclaration): Vector3[] {
  const points = [
    ...getPlus(size / 2, { x: -size * .375 }),
    ...getX(size, { x: size * .375 }),
  ]

  fromTransformDeclaration(transform ?? {}, m)
  for (const v of points)
    v.applyMatrix4(m)

  return points
}

export function getMinusX(size = 1, transform?: TransformDeclaration): Vector3[] {
  const points = [
    ...getMinus(size / 2, { x: -size * .375 }),
    ...getX(size, { x: size * .375 }),
  ]

  fromTransformDeclaration(transform ?? {}, m)
  for (const v of points)
    v.applyMatrix4(m)

  return points
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

export function getPlusY(size = 1, transform?: TransformDeclaration): Vector3[] {
  const points = [
    ...getPlus(size / 2, { x: -size * .375 }),
    ...getY(size, { x: size * .375 }),
  ]

  fromTransformDeclaration(transform ?? {}, m)
  for (const v of points)
    v.applyMatrix4(m)

  return points
}

export function getMinusY(size = 1, transform?: TransformDeclaration): Vector3[] {
  const points = [
    ...getMinus(size / 2, { x: -size * .375 }),
    ...getY(size, { x: size * .375 }),
  ]

  fromTransformDeclaration(transform ?? {}, m)
  for (const v of points)
    v.applyMatrix4(m)

  return points
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

export function getPlusZ(size = 1, transform?: TransformDeclaration): Vector3[] {
  const points = [
    ...getPlus(size / 2, { x: -size * .375 }),
    ...getZ(size, { x: size * .375 }),
  ]

  fromTransformDeclaration(transform ?? {}, m)
  for (const v of points)
    v.applyMatrix4(m)

  return points
}

export function getMinusZ(size = 1, transform?: TransformDeclaration): Vector3[] {
  const points = [
    ...getMinus(size / 2, { x: -size * .375 }),
    ...getZ(size, { x: size * .375 }),
  ]

  fromTransformDeclaration(transform ?? {}, m)
  for (const v of points)
    v.applyMatrix4(m)

  return points
}
