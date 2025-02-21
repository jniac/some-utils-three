/**
 * Safe type check for Vector3 (safer than `instanceof` which may fail with different versions of Three.js).
 */
export function isVector2(value) {
    return !!value.isVector2;
}
/**
 * Safe type check for Vector3 (safer than `instanceof` which may fail with different versions of Three.js).
 */
export function isVector3(value) {
    return !!value.isVector3;
}
/**
 * Safe type check for Vector3 (safer than `instanceof` which may fail with different versions of Three.js).
 */
export function isVector4(value) {
    return !!value.isVector4;
}
/**
 * Safe type check for Euler (safer than `instanceof` which may fail with different versions of Three.js).
 */
export function isEuler(value) {
    return !!value.isEuler;
}
/**
 * Safe type check for Matrix4 (safer than `instanceof` which may fail with different versions of Three.js).
 */
export function isMatrix4(value) {
    return !!value.isMatrix4;
}
/**
 * Safe type check for Object3D (safer than `instanceof` which may fail with different versions of Three.js).
 */
export function isObject3D(value) {
    return !!value.isObject3D;
}
/**
 * Safe type check for Mesh (safer than `instanceof` which may fail with different versions of Three.js).
 */
export function isMesh(value) {
    return !!value.isMesh;
}
/**
 * Safe type check for Mesh (safer than `instanceof` which may fail with different versions of Three.js).
 */
export function isSprite(value) {
    return !!value.isSprite;
}
