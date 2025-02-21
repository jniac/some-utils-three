import { isObject3D } from '../is.js';
import { applyTransform } from './transform.js';
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
export function setup(child, transformProps, callback) {
    if (transformProps) {
        if (isObject3D(transformProps)) {
            transformProps.add(child);
        }
        else {
            applyTransform(child, transformProps);
        }
    }
    callback?.(child);
    return child;
}
/**
 * Backward compatibility
 *
 * @deprecated Use `setup` instead
 */
export const addTo = setup;
export function isDescendantOf(child, parent) {
    let current = child;
    while (current.parent) {
        if (current.parent === parent) {
            return true;
        }
        current = current.parent;
    }
    return false;
}
export function isAncestorOf(parent, child) {
    return isDescendantOf(child, parent);
}
export function* allDescendantsOf(parent, { includeSelf = false, } = {}) {
    if (includeSelf) {
        yield parent;
    }
    for (const child of parent.children) {
        yield* allDescendantsOf(child, { includeSelf: true });
    }
}
export function* allAncestorsOf(child, { includeSelf = false, } = {}) {
    let current = child;
    if (includeSelf) {
        yield current;
    }
    while (current.parent) {
        yield current.parent;
        current = current.parent;
    }
}
export function* queryDescendantsOf(parent, query, options) {
    for (const child of allDescendantsOf(parent, options)) {
        if (query(child)) {
            yield child;
        }
    }
}
export function* queryAncestorsOf(child, query, options) {
    for (const parent of allAncestorsOf(child, options)) {
        if (query(parent)) {
            yield parent;
        }
    }
}
