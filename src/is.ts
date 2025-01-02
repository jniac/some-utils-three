import { Euler, Matrix4, Object3D, Vector2, Vector3, Vector4 } from 'three'

/**
 * Safe type check for Vector3 (safer than `instanceof` which may fail with different versions of Three.js).
 */
export function isVector2(value: any): value is Vector2 {
  return !!value.isVector2
}

/**
 * Safe type check for Vector3 (safer than `instanceof` which may fail with different versions of Three.js).
 */
export function isVector3(value: any): value is Vector3 {
  return !!value.isVector3
}

/**
 * Safe type check for Vector3 (safer than `instanceof` which may fail with different versions of Three.js).
 */
export function isVector4(value: any): value is Vector4 {
  return !!value.isVector4
}

/**
 * Safe type check for Euler (safer than `instanceof` which may fail with different versions of Three.js).
 */
export function isEuler(value: any): value is Euler {
  return !!value.isEuler
}

/**
 * Safe type check for Matrix4 (safer than `instanceof` which may fail with different versions of Three.js).
 */
export function isMatrix4(value: any): value is Matrix4 {
  return !!value.isMatrix4
}

/**
 * Safe type check for Object3D (safer than `instanceof` which may fail with different versions of Three.js).
 */
export function isObject3D(value: any): value is Object3D {
  return !!value.isObject3D
}

/**
 * Safe type check for Mesh (safer than `instanceof` which may fail with different versions of Three.js).
 */
export function isMesh(value: any): value is Object3D {
  return !!value.isMesh
}


