import { Camera, Quaternion, Vector3 } from 'three'

import { handlePointer } from 'some-utils-dom/handle/pointer'

import { Vertigo, VertigoProps } from '../vertigo'

const _quaternion = new Quaternion()
const _vector0 = new Vector3()
const _vector1 = new Vector3()

export class VertigoControls {
  vertigo = new Vertigo()

  constructor(props: VertigoProps = {}) {
    this.vertigo.set(props)
  }

  pan(x: number, y: number) {
    const z = this.vertigo.zoom
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

  init(element: HTMLElement = document.body) {
    handlePointer(element, {
      dragButton: ~0,
      onDrag: info => {
        if (info.button === 0) {
          this.rotate(info.delta.y * -.01, info.delta.x * -.01)
        } else {
          this.pan(info.delta.x * -.01, info.delta.y * .01)
        }
      },
      onWheel: info => {
        this.vertigo.zoom *= 1 + info.delta.y * .001
      },
    })

  }

  update(camera: Camera, aspect: number) {
    this.vertigo.apply(camera, aspect)
  }
}