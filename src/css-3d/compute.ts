import { Camera, Matrix4, Object3D, Vector3 } from 'three'

import { lerp } from 'some-utils-ts/math/basic'

/**
 * NOTE:
 * - Camera "height" (`1 / Math.atan(fov / 2)`) can be retrieved from the projection matrix!
 * - "isPerspective" can be deducted from the last matrix element.
 * 
 * References:
 * - [scratchapixel perspective projection](https://www.scratchapixel.com/lessons/3d-basic-rendering/perspective-and-orthographic-projection-matrix/building-basic-perspective-projection-matrix)
 * - [scratchapixel orthographic projection](https://www.scratchapixel.com/lessons/3d-basic-rendering/perspective-and-orthographic-projection-matrix/orthographic-projection-matrix)
 * 
 * @param camera The camera to compute the perspective from.
 * @param container The container element where the renderer is attached. Its height will be used to compute the perspective.
 */
export function computePerspective(camera: Camera, container: HTMLElement) {
  const isPerspective = camera.projectionMatrix.elements[15] === 0
  if (isPerspective) {
    const h = camera.projectionMatrix.elements[5]
    const perspective = container.clientHeight * h / 2
    return `${perspective}px`
  } else {
    return 'none'
  }
}

/*
  column-major                  (R)ight, (U)p, (F)orward, (T)ranslation
  indices               <->     vectors

  00 │ 04 │ 08 │ 12     <->     Rx │ Ux │ Fx │ Tx
  01 │ 05 │ 09 │ 13     <->     Ry │ Uy │ Fy │ Ty
  02 │ 06 │ 10 │ 14     <->     Rz │ Uz │ Fz │ Tz
  03 │ 07 │ 11 │ 15     <->      0 │  0 │  0 │  1
*/

const
  // (R)ight
  rx = 0,
  ry = 1,
  rz = 2,
  // (U)p
  ux = 4,
  uy = 5,
  uz = 6,
  // (F)orward
  fx = 8,
  fy = 9,
  fz = 10,
  // (T)ranslate
  tx = 12,
  ty = 13,
  tz = 14

const _matrix = new Matrix4()
const _vector1 = new Vector3()
const _vector2 = new Vector3()

function matrixResetRotation(matrix: Matrix4, resetScalar = 1) {
  const me = matrix.elements
  _vector1.set(me[rx], me[ry], me[rz])
  const r = _vector1.length()
  me[rx] = lerp(me[rx], r, resetScalar)
  me[ry] = lerp(me[ry], 0, resetScalar)
  me[rz] = lerp(me[rz], 0, resetScalar)
  _vector1.set(me[ux], me[uy], me[uz])
  const u = _vector1.length()
  me[ux] = lerp(me[ux], 0, resetScalar)
  me[uy] = lerp(me[uy], u, resetScalar)
  me[uz] = lerp(me[uz], 0, resetScalar)
  _vector1.set(me[fx], me[fy], me[fz])
  const f = _vector1.length()
  me[fx] = lerp(me[fx], 0, resetScalar)
  me[fy] = lerp(me[fy], 0, resetScalar)
  me[fz] = lerp(me[fz], f, resetScalar)
}

function matrixResetScale(matrix: Matrix4, scaleBase: number, resetScalar = 1) {
  const me = matrix.elements
  _vector1.set(me[rx], me[ry], me[rz])
  const r = lerp(1, scaleBase / _vector1.length(), resetScalar)
  me[rx] *= r
  me[ry] *= r
  me[rz] *= r
  _vector1.set(me[ux], me[uy], me[uz])
  const u = lerp(1, scaleBase / _vector1.length(), resetScalar)
  me[ux] *= u
  me[uy] *= u
  me[uz] *= u
  _vector1.set(me[fx], me[fy], me[fz])
  const f = lerp(1, scaleBase / _vector1.length(), resetScalar)
  me[fx] *= f
  me[fy] *= f
  me[fz] *= f
}

export function computeFrontFacing(camera: Camera, object: Object3D) {
  _vector1.set(camera.matrixWorld.elements[8], camera.matrixWorld.elements[9], camera.matrixWorld.elements[10])
  _vector2.set(object.matrixWorld.elements[8], object.matrixWorld.elements[9], object.matrixWorld.elements[10])
  return _vector1.dot(_vector2) > 0
}

export function computeZIndex(camera: Camera, object: Object3D) {
  _vector1.set(camera.matrixWorld.elements[12], camera.matrixWorld.elements[13], camera.matrixWorld.elements[14])
  _vector2.set(object.matrixWorld.elements[12], object.matrixWorld.elements[13], object.matrixWorld.elements[14])
  const z = _vector1.distanceTo(_vector2)
  return Math.round(1e4 / (1 + z)).toString()
}

/**
 * Compute the matrix3d CSS property for an object in 3D space.
 * 
 * Usage:
 * ```
 * wrapper.style.perspective = computePerspective(camera, three.renderer.domElement)
 * 
 * div.style.position = 'absolute'
 * div.style.left = '50%'
 * div.style.top = '50%'
 * 
 * div.style.transform = computeMatrix3d(camera, plane, three.renderer.domElement)
 * div.style.zIndex = computeZIndex(camera, plane)
 * ```
 * 
 * @param camera The camera to compute the matrix from.
 * @param object The object to compute the matrix from.
 * @param container The container element where the renderer is attached. Its height will be used to scale the matrix.
 * @param pixelPerUnit The number of pixels (DOM) per unit (3D space). Defaults to 100.
 * @param resetRotation The scalar to reset the rotation of the object. Defaults to 0.
 * @param resetScale The scalar to reset the scale of the object. Defaults to 0.
 * @param leftHanded Whether the matrix should be computed for a left-handed coordinate system. Defaults to false.
 */
export function computeMatrix3d(
  camera: Camera,
  object: Object3D,
  container: HTMLElement,
  pixelPerUnit: number = 100,
  resetRotation: number = 0,
  resetScale: number = 0,
  leftHanded: boolean = false,
) {
  const h = camera.projectionMatrix.elements[5]
  const scalar = container.clientHeight * h / 2
  const coreScalar = scalar / pixelPerUnit

  _matrix.multiplyMatrices(camera.matrixWorldInverse, object.matrixWorld)

  const me = _matrix.elements

  // Flip (rotation 180°) the matrix over the X axis (before getting multplied by the camera matrix). 
  me[ux] *= -1
  me[uy] *= -1
  me[uz] *= -1
  me[fx] *= -1
  me[fy] *= -1
  me[fz] *= -1

  // Save "z" distance to camera.
  const z = me[tz]

  // Camera offset.
  me[tz] += leftHanded ? -1 : 1

  // Scale matrix.
  me[rx] *= coreScalar
  me[ry] *= coreScalar
  me[rz] *= coreScalar
  me[ux] *= coreScalar
  me[uy] *= coreScalar
  me[uz] *= coreScalar
  me[fx] *= coreScalar
  me[fy] *= coreScalar
  me[fz] *= coreScalar
  me[tx] *= scalar
  me[ty] *= scalar
  me[tz] *= scalar

  // Flip the Y-axis (because on a html document, y is going down).
  me[ry] *= -1
  me[uy] *= -1
  me[fy] *= -1
  me[ty] *= -1

  if (leftHanded) {
    // Flip the Z-axis (because on a html document, z is going to the user).
    me[rz] *= -1
    me[uz] *= -1
    me[fz] *= -1
    me[tz] *= -1
  }

  if (resetRotation > 0) {
    matrixResetRotation(_matrix, resetRotation)
  }

  if (resetScale > 0) {
    matrixResetScale(_matrix, leftHanded ? z : -z, resetScale)
  }

  return `translate(-50%, -50%) matrix3d(${_matrix.elements.join(',')})`
}