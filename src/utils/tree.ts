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

export function* allDescendantsOf(parent: Object3D, {
  includeSelf = false,
} = {}): Generator<Object3D> {
  if (includeSelf) {
    yield parent
  }
  for (const child of parent.children) {
    yield* allDescendantsOf(child, { includeSelf: true })
  }
}

export function* allAncestorsOf(child: Object3D, {
  includeSelf = false,
} = {}): Generator<Object3D> {
  let current = child
  if (includeSelf) {
    yield current
  }
  while (current.parent) {
    yield current.parent
    current = current.parent
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
