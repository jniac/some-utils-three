import { Object3D } from 'three';
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
declare const defaultAllDescendantsOptions: {
    /**
     * Whether to include the child object in the iteration.
     *
     * Defaults to `false`.
     */
    includeSelf: boolean;
};
export declare function allDescendantsOf(parent: Object3D, options?: Partial<typeof defaultAllDescendantsOptions>): Generator<Object3D>;
declare const defaultAllAncestorsOptions: {
    /**
     * Whether to include the child object in the iteration.
     *
     * Defaults to `false`.
     */
    includeSelf: boolean;
    /**
     * The root object to stop the iteration. If provided, the iteration will stop
     * when the root object is reached.
     *
     * Defaults to `null` which means no root object.
     */
    root: Object3D | null;
    /**
     * Whether to include the root object in the iteration.
     *
     * Defaults to `false`.
     */
    includeRoot: boolean;
};
export declare function allAncestorsOf(child: Object3D, options?: Partial<typeof defaultAllAncestorsOptions>): Generator<Object3D>;
export declare function queryDescendantsOf(parent: Object3D, query: (child: Object3D) => boolean, options?: Parameters<typeof allAncestorsOf>[1]): Generator<Object3D>;
export declare function queryAncestorsOf(child: Object3D, query: (parent: Object3D) => boolean, options?: Parameters<typeof allAncestorsOf>[1]): Generator<Object3D>;
export {};
//# sourceMappingURL=tree.d.ts.map