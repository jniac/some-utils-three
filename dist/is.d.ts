import { Euler, Matrix4, Mesh, Object3D, Sprite, Vector2, Vector3, Vector4 } from 'three';
/**
 * Safe type check for Vector3 (safer than `instanceof` which may fail with different versions of Three.js).
 */
export declare function isVector2(value: any): value is Vector2;
/**
 * Safe type check for Vector3 (safer than `instanceof` which may fail with different versions of Three.js).
 */
export declare function isVector3(value: any): value is Vector3;
/**
 * Safe type check for Vector3 (safer than `instanceof` which may fail with different versions of Three.js).
 */
export declare function isVector4(value: any): value is Vector4;
/**
 * Safe type check for Euler (safer than `instanceof` which may fail with different versions of Three.js).
 */
export declare function isEuler(value: any): value is Euler;
/**
 * Safe type check for Matrix4 (safer than `instanceof` which may fail with different versions of Three.js).
 */
export declare function isMatrix4(value: any): value is Matrix4;
/**
 * Safe type check for Object3D (safer than `instanceof` which may fail with different versions of Three.js).
 */
export declare function isObject3D(value: any): value is Object3D;
/**
 * Safe type check for Mesh (safer than `instanceof` which may fail with different versions of Three.js).
 */
export declare function isMesh(value: any): value is Mesh;
/**
 * Safe type check for Mesh (safer than `instanceof` which may fail with different versions of Three.js).
 */
export declare function isSprite(value: any): value is Sprite;
//# sourceMappingURL=is.d.ts.map