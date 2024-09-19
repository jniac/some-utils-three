import { Object3D } from 'three'

import { applyTransform, TransformProps } from './tranform'

export function addTo<T extends Object3D>(child: T, parent: Object3D, transformProps?: TransformProps): T {
  parent.add(child)
  applyTransform(child, transformProps)
  return child
}
