import { Object3D } from 'three/webgpu';
import { TransformProps } from './transform';
type SetupParentOrTransformProps = Object3D | TransformProps | null;
type SetupCallback<T extends Object3D> = (instance: T) => void;
/**
 * Convenient method to setup an Object3D instance. Apply transform props and
 * add to parent if needed. For further customization, a callback can be provided.
 *
 * Usage:
 * ```ts
 * class MyObject extends Group {
 *   myMesh1 = setup(new Mesh(geometry, material), this)
 *   myMesh2 = setup(new Mesh(geometry, material), { parent: this, position: [1, 0, 0] })
 * }
 * ```
 */
export declare function setup<T extends Object3D>(child: T, transformProps?: SetupParentOrTransformProps, callback?: SetupCallback<T>): T;
/**
 * Backward compatibility
 *
 * @deprecated Use `setup` instead
 */
export declare const addTo: typeof setup;
export declare function isDescendantOf(child: Object3D, parent: Object3D): boolean;
export declare function isAncestorOf(parent: Object3D, child: Object3D): boolean;
export declare function allDescendantsOf(parent: Object3D, { includeSelf, }?: {
    includeSelf?: boolean | undefined;
}): Generator<Object3D>;
export declare function allAncestorsOf(child: Object3D, { includeSelf, }?: {
    includeSelf?: boolean | undefined;
}): Generator<Object3D>;
export declare function queryDescendantsOf(parent: Object3D, query: (child: Object3D) => boolean, options?: Parameters<typeof allAncestorsOf>[1]): Generator<Object3D>;
export declare function queryAncestorsOf(child: Object3D, query: (parent: Object3D) => boolean, options?: Parameters<typeof allAncestorsOf>[1]): Generator<Object3D>;
export {};
