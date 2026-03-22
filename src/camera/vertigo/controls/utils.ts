import { Camera, Object3D, Raycaster, Vector2, Vector2Like } from 'three'

const _raycaster = new Raycaster()
const _pointer = new Vector2()

export function findIntersection(pointer: Vector2Like, camera: Camera, root: Object3D) {
  _pointer.set(pointer.x, pointer.y)
  _raycaster.setFromCamera(_pointer, camera)
  const queue = [root]
  while (queue.length > 0) {
    const object = queue.shift()!
    const intersects = _raycaster.intersectObject(object, false)
    if (intersects.length > 0) {
      return intersects[0]
    }
    for (const child of object.children) {
      if (child.userData.helper)
        continue
      queue.push(child)
    }
  }
  return null
}
