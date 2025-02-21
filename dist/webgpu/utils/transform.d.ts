import { Euler, Object3D, Vector3 } from 'three/webgpu';
import { AngleDeclaration, AngleUnit, EulerDeclaration, Vector3Declaration } from '../declaration';
declare const defaultTransform: {
    position: Vector3;
    rotation: Euler;
    scale: Vector3;
    visible: boolean;
};
export type Transform = typeof defaultTransform;
declare const defaultTransformProps: {
    x: number;
    y: number;
    z: number;
    rotationX: AngleDeclaration;
    rotationY: AngleDeclaration;
    rotationZ: AngleDeclaration;
    rotationOrder: Euler["order"];
    rotationUnit: AngleUnit;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
    scaleScalar: number;
    /**
     * If defined, the object will be moved as if the pivot was at the origin.
     *
     * NOTE: The pivot is expressed in the object's local space.
     *
     * Defaults to `undefined`.
     */
    pivot: Vector3Declaration | undefined;
    /**
     * Applies only if defined.
     *
     * Defaults to `undefined`.
     */
    visible: boolean | undefined;
    /**
     * Applies only if defined.
     *
     * Defaults to `undefined`.
     */
    name: string | undefined;
    /**
     * Applies only if defined.
     *
     * Defaults to `undefined`.
     */
    parent: Object3D | undefined;
    /**
     * If defined, all the properties will be copied to the object's `userData`.
     *
     * Defaults to `undefined`.
     */
    userData: Record<string, any> | undefined;
};
export type TransformProps = Partial<typeof defaultTransformProps & {
    position: Vector3 | Vector3Declaration;
    rotation: Euler | EulerDeclaration;
    scale: Vector3 | Vector3Declaration;
}>;
export declare function applyTransform<T extends Object3D = Object3D>(target: T, props?: TransformProps): T;
export declare function getTransform(target: Object3D): Transform;
export {};
