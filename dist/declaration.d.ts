import { Euler, Matrix4, Object3D, Vector2, Vector3, Vector4 } from 'three';
import { AngleDeclaration, Vector2Declaration, Vector3Declaration, Vector4Declaration } from 'some-utils-ts/declaration';
import { EulerDeclaration } from './declaration/euler';
export * from './declaration/euler';
export * from './declaration/vector';
export * from './is';
export type { AngleDeclaration, AngleUnit, Vector2Declaration, Vector3Declaration, Vector4Declaration } from 'some-utils-ts/declaration';
export { fromAngleDeclaration, isVector2Declaration, isVector3Declaration, isVector4Declaration, toAngleDeclarationString, toVector2Declaration, toVector3Declaration, toVector4Declaration } from 'some-utils-ts/declaration';
export type TransformDeclaration = Partial<{
    x: number;
    y: number;
    z: number;
    position: Vector3Declaration;
    rotationX: AngleDeclaration;
    rotationY: AngleDeclaration;
    rotationZ: AngleDeclaration;
    rotation: EulerDeclaration;
    rotationOrder: Euler['order'];
    scale: Vector3Declaration;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
    scaleScalar: number;
}>;
export declare function fromVector2Declaration(arg: Vector2Declaration, out?: Vector2): Vector2;
export declare function fromVector3Declaration(arg: Vector3Declaration, out?: Vector3): Vector3;
export declare function fromVector4Declaration(arg: Vector4Declaration, out?: Vector4): Vector4;
export declare const fromTransformDeclaration: {
    (props: TransformDeclaration, out: Matrix4): Matrix4;
    <T extends Object3D>(props: TransformDeclaration, out: T): T;
};
/**
 * Combines multiple transform declarations into a single matrix.
 *
 * NOTE: The returned matrix, if not provided, is reused for performance reasons.
 * Clone it if you need to keep it for later use.
 */
export declare function fromTransformDeclarations(transforms: TransformDeclaration[], out?: Matrix4): Matrix4;
//# sourceMappingURL=declaration.d.ts.map