import { Object3D } from 'three'

import { applyTransform, TransformProps } from './tranform'

export function addTo<T extends Object3D>(child: T, parent: Object3D, transformProps?: TransformProps): T {
  parent.add(child)
  applyTransform(child, transformProps)
  return child
}

export function isChildOf(child: Object3D, parent: Object3D): boolean {
  let current = child
  while (current.parent) {
    if (current.parent === parent) {
      return true
    }
    current = current.parent
  }
  return false
}

export function isParentOf(parent: Object3D, child: Object3D): boolean {
  return isChildOf(child, parent)
}
