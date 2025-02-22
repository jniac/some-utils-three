import { Object3D } from 'three'

import { isObject3D } from '../is'
import { applyTransform, TransformProps } from './transform'

type SetupParentOrTransformProps = Object3D | TransformProps | null
type SetupCallback<T extends Object3D> = (instance: T) => void

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
export function setup<T extends Object3D>(
  child: T,
  transformProps?: SetupParentOrTransformProps,
  callback?: SetupCallback<T>,
): T {
  if (transformProps) {
    if (isObject3D(transformProps)) {
      transformProps.add(child)
    } else {
      applyTransform(child, transformProps)
    }
  }
  callback?.(child)
  return child
}

/**
 * Backward compatibility
 * 
 * @deprecated Use `setup` instead
 */
export const addTo = setup

export function isDescendantOf(child: Object3D, parent: Object3D): boolean {
  let current = child
  while (current.parent) {
    if (current.parent === parent) {
      return true
    }
    current = current.parent
  }
  return false
}

export function isAncestorOf(parent: Object3D, child: Object3D): boolean {
  return isDescendantOf(child, parent)
}

const defaultAllDescendantsOptions = {
  /**
   * Whether to include the child object in the iteration.
   * 
   * Defaults to `false`.
   */
  includeSelf: false,
}
export function* allDescendantsOf(parent: Object3D, options?: Partial<typeof defaultAllDescendantsOptions>): Generator<Object3D> {
  const { includeSelf } = { ...defaultAllDescendantsOptions, ...options }
  if (includeSelf) {
    yield parent
  }
  for (const child of parent.children) {
    yield* allDescendantsOf(child, { includeSelf: true })
  }
}

const defaultAllAncestorsOptions = {
  /**
   * Whether to include the child object in the iteration.
   * 
   * Defaults to `false`.
   */
  includeSelf: false,
  /**
   * The root object to stop the iteration. If provided, the iteration will stop
   * when the root object is reached.
   * 
   * Defaults to `null` which means no root object.
   */
  root: null as Object3D | null,
  /**
   * Whether to include the root object in the iteration.
   * 
   * Defaults to `false`.
   */
  includeRoot: false,
}
export function* allAncestorsOf(child: Object3D, options?: Partial<typeof defaultAllAncestorsOptions>): Generator<Object3D> {
  const { includeSelf, root, includeRoot } = { ...defaultAllAncestorsOptions, ...options }
  let current = child
  if (includeSelf) {
    yield current
  }
  while (current.parent) {
    yield current.parent
    current = current.parent

    if (root && current === root) {
      if (includeRoot) {
        yield current
      }
      break
    }
  }
}

export function* queryDescendantsOf(parent: Object3D, query: (child: Object3D) => boolean, options?: Parameters<typeof allAncestorsOf>[1]): Generator<Object3D> {
  for (const child of allDescendantsOf(parent, options)) {
    if (query(child)) {
      yield child
    }
  }
}

export function* queryAncestorsOf(child: Object3D, query: (parent: Object3D) => boolean, options?: Parameters<typeof allAncestorsOf>[1]): Generator<Object3D> {
  for (const parent of allAncestorsOf(child, options)) {
    if (query(parent)) {
      yield parent
    }
  }
}
