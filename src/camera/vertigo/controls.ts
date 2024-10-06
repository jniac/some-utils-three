import { Camera, Quaternion, Vector3 } from 'three'

import { handlePointer, PointerButton } from 'some-utils-dom/handle/pointer'

import { handleHtmlElementEvent } from 'some-utils-dom/handle/element-event'
import { DestroyableInstance } from 'some-utils-ts/misc/destroy'
import { Vertigo, VertigoProps } from '../vertigo'

const _quaternion = new Quaternion()
const _vector0 = new Vector3()
const _vector1 = new Vector3()

export class VertigoControls extends DestroyableInstance {
  vertigo = new Vertigo()

  constructor(props: VertigoProps = {}) {
    super()
    this.vertigo.set(props)
  }

  pan(x: number, y: number) {
    const z = 1 / this.vertigo.zoom
    _quaternion.setFromEuler(this.vertigo.rotation)
    _vector0.set(z, 0, 0).applyQuaternion(_quaternion)
    _vector1.set(0, z, 0).applyQuaternion(_quaternion)

    this.vertigo.focus
      .addScaledVector(_vector0, x)
      .addScaledVector(_vector1, y)
  }

  rotate(pitch: number, yaw: number) {
    this.vertigo.rotation.x += pitch
    this.vertigo.rotation.y += yaw
  }

  private *doInitialize(element: HTMLElement = document.body) {
    yield handleHtmlElementEvent(element, {
      contextmenu: event => {
        event.preventDefault()
      },
    })
    yield handlePointer(element, {
      dragButton: ~0,
      onDrag: info => {
        switch (info.button) {
          case PointerButton.Left: {
            this.rotate(info.delta.y * -.01, info.delta.x * -.01)
            break
          }
          case PointerButton.Right: {
            this.pan(info.delta.x * -.025, info.delta.y * .025)
            break
          }
        }
      },
      onWheel: info => {
        this.vertigo.zoom *= 1 - info.delta.y * .001
      },
    })
  }

  initialize(...args: Parameters<VertigoControls['doInitialize']>): this {
    this.collect(this.doInitialize(...args))
    return this
  }

  update(camera: Camera, aspect: number) {
    this.vertigo.apply(camera, aspect)
  }
}