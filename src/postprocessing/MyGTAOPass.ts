import { Mesh, Object3D } from 'three'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'

/**
 * A custom GTAOPass that hides certain objects during the AO pass based on their material properties or userData.
 * 
 * Objects that will be hidden during the AO pass:
 * - Any object with `userData.ignoreAO` set to true.
 * - Any Mesh that has a material which is either transparent or wireframe.
 * - Any object explicitly added to the `objectsToHide` set via the `addObjectToHide` method.
 */
export class MyGTAOPass extends GTAOPass {
  static mustBeHidden(object: Object3D): boolean {
    if (object.userData.ignoreAO) {
      return true
    }
    if (object instanceof Mesh) {
      if (object.material) {
        if (Array.isArray(object.material)) {
          return object.material.some(m => m.transparent || m.wireframe)
        } else {
          return object.material.transparent || object.material.wireframe
        }
      }
    }
    return false
  }

  #hiddenObjects = new Map<Object3D, { wasVisible: boolean }>()
  #objectsToHide = new Set<Object3D>()

  addObjectToHide(object: Object3D) {
    this.#objectsToHide.add(object)
  }

  removeObjectToHide(object: Object3D) {
    this.#objectsToHide.delete(object)
  }

  #beforeRender() {
    this.scene.traverse(child => {
      if (child instanceof Mesh) {
        if (MyGTAOPass.mustBeHidden(child)) {
          this.#hiddenObjects.set(child, { wasVisible: child.visible })
          child.visible = false
        }
      }
    })

    for (const object of this.#objectsToHide) {
      // Note: We might have already hidden this object in the previous loop, but that's fine.
      this.#hiddenObjects.set(object, { wasVisible: object.visible })
      object.visible = false
    }
  }

  #afterRender() {
    for (const [object, { wasVisible }] of this.#hiddenObjects) {
      object.visible = wasVisible
    }
    this.#hiddenObjects.clear()
  }

  override render(...args: Parameters<GTAOPass['render']>): void {
    this.#beforeRender()
    super.render(...args)
    this.#afterRender()
  }
}
