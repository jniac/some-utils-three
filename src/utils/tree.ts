import { Object3D } from 'three'

import { applyTransform, TransformProps } from './tranform'

export function addTo<T extends Object3D>(
  child: T,
  parent: Object3D,
  transformProps?: TransformProps | null,
  callback?: (instance: T) => void,
): T {
  parent.add(child)
  if (transformProps) {
    applyTransform(child, transformProps)
  }
  callback?.(child)
  return child
}

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
