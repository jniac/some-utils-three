import { Euler, Matrix4, Object3D, Vector2, Vector3 } from 'three';
/**
 * Because readonly types are compatible with their mutable counterparts, we can use this type to handle both cases.
 */
type ReadonlyOrNot<T> = T | Readonly<T>;
type Vector2DeclarationBase = number | [x: number, y: number] | {
    x: number;
    y: number;
} | {
    width: number;
    height: number;
};
export type Vector2Declaration = ReadonlyOrNot<Vector2DeclarationBase>;
type Vector3DeclarationBase = number | [x: number, y: number, z?: number] | {
    x: number;
    y: number;
    z?: number;
} | {
    width: number;
    height: number;
    depth: number;
};
export type Vector3Declaration = ReadonlyOrNot<Vector3DeclarationBase>;
type EulerDeclarationBase = [x: number, y: number, z: number, order?: Euler['order']] | {
    x: number;
    y: number;
    z: number;
    order?: Euler['order'];
    useDegree?: boolean;
};
export type EulerDeclaration = ReadonlyOrNot<EulerDeclarationBase>;
export type TransformDeclaration = Partial<{
    x: number;
    y: number;
    z: number;
    position: Vector3Declaration;
    rotationX: number;
    rotationY: number;
    rotationZ: number;
    rotation: EulerDeclaration;
    rotationOrder: Euler['order'];
    useDegree: boolean;
    scale: Vector3Declaration;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
    scaleScalar: number;
}>;
export declare function isVector2Declaration(arg: any): arg is Vector2Declaration;
export declare function solveVector2Declaration(arg: Vector2Declaration, out?: Vector2): Vector2;
export declare function isVector3Declaration(arg: any): arg is Vector3Declaration;
export declare function solveVector3Declaration(arg: Vector3Declaration, out?: Vector3): Vector3;
export declare function solveEulerDeclaration(arg: EulerDeclaration, out?: Euler): Euler;
export declare const solveTransformDeclaration: {
    (props: TransformDeclaration, out: Matrix4): Matrix4;
    <T extends Object3D>(props: TransformDeclaration, out: T): T;
};
export {};
