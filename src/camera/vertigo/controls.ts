import { Camera, Euler, Quaternion, Vector2, Vector2Like, Vector3 } from 'three'

import { handleHtmlElementEvent } from 'some-utils-dom/handle/element-event'
import { handlePointer, PointerButton } from 'some-utils-dom/handle/pointer'
import { Animation } from 'some-utils-ts/animation'
import { DestroyableInstance } from 'some-utils-ts/misc/destroy'

import { fromVector3Declaration, Vector3Declaration } from '../../declaration'
import { Vertigo, VertigoProps } from '../vertigo'

const _quaternion = new Quaternion()
const _vectorX = new Vector3()
const _vectorY = new Vector3()

function _updateVectorXY(rotation: Euler) {
  _quaternion.setFromEuler(rotation)
  _vectorX.set(1, 0, 0).applyQuaternion(_quaternion)
  _vectorY.set(0, 1, 0).applyQuaternion(_quaternion)
}

export class VertigoControls extends DestroyableInstance {
  vertigo = new Vertigo()

  actions = {
    togglePerspective: () => {
      const perspective = this.vertigo.perspective > .5 ? 0 : 1
      Animation
        .tween({
          target: [this.vertigo, 'perspective'],
          to: { perspective },
          duration: 1,
          ease: 'inOut3',
        })
    },
    focus: (focusPosition: Vector3Declaration) => {
      Animation
        .tween({
          target: this.vertigo.focus,
          to: fromVector3Declaration(focusPosition),
          duration: 1,
          ease: 'inOut3',
        })
    },
    rotate: (pitch: number, yaw: number, roll: number) => {
      const qStart = new Quaternion().setFromEuler(this.vertigo.rotation)
      const qEnd = new Quaternion().setFromEuler(new Euler(pitch, yaw, roll, 'YXZ'))
      const q = new Quaternion()
      Animation
        .during({
          target: [this.vertigo, 'rotation'],
          duration: 1,
        })
        .onUpdate(({ progress }) => {
          q.slerpQuaternions(qStart, qEnd, Animation.ease('inOut3')(progress))
          this.vertigo.rotation.setFromQuaternion(q)
        })
    },
    positiveXAlign: () => {
      this.actions.rotate(0, Math.PI / 2, 0)
    },
    negativeXAlign: () => {
      this.actions.rotate(0, -Math.PI / 2, 0)
    },
    positiveYAlign: () => {
      this.actions.rotate(-Math.PI / 2, 0, 0)
    },
    negativeYAlign: () => {
      this.actions.rotate(Math.PI / 2, 0, 0)
    },
    positiveZAlign: () => {
      this.actions.rotate(0, 0, 0)
    },
    negativeZAlign: () => {
      this.actions.rotate(0, Math.PI, 0)
    },
  }

  constructor(props: VertigoProps = {}) {
    super()
    this.vertigo.set(props)
  }

  pan(x: number, y: number) {
    _updateVectorXY(this.vertigo.rotation)
    const z = 1 / this.vertigo.zoom
    this.vertigo.focus
      .addScaledVector(_vectorX, x * z)
      .addScaledVector(_vectorY, y * z)
  }

  rotate(pitch: number, yaw: number) {
    this.vertigo.rotation.x += pitch
    this.vertigo.rotation.y += yaw
  }

  zoomAt(newZoom: number, vertigoRelativePointer: Vector2Like) {
    const currentWidth = this.vertigo.size.x / this.vertigo.zoom
    const currentHeight = this.vertigo.size.y / this.vertigo.zoom
    const newWidth = this.vertigo.size.x / newZoom
    const newHeight = this.vertigo.size.y / newZoom
    const diffWidth = newWidth - currentWidth
    const diffHeight = newHeight - currentHeight

    _updateVectorXY(this.vertigo.rotation)
    const { x, y } = vertigoRelativePointer
    this.vertigo.focus
      .addScaledVector(_vectorX, diffWidth * -x)
      .addScaledVector(_vectorY, diffHeight * -y)

    this.vertigo.zoom = newZoom
  }

  private *doInitialize(element: HTMLElement = document.body) {
    yield handleHtmlElementEvent(element, {
      contextmenu: event => {
        event.preventDefault()
      },
    })

    const pointer = new Vector2()
    yield handlePointer(element, {
      onChange: info => {
        const rect = element.getBoundingClientRect()
        const x = (info.localPosition.x - rect.x) / rect.width * 2 - 1
        const y = -((info.localPosition.y - rect.y) / rect.height * 2 - 1)
        pointer.set(x / 2, y / 2).multiply(this.vertigo.computedNdcScalar)
      },
      dragButton: ~0,
      onDrag: info => {
        switch (info.button) {
          case PointerButton.Left: {
            this.rotate(info.delta.y * -.01, info.delta.x * -.01)
            break
          }
          case PointerButton.Right: {
            this.pan(info.delta.x * -.005, info.delta.y * .005)
            break
          }
        }
      },
      wheelPreventDefault: true,
      onWheel: info => {
        const newZoom = this.vertigo.zoom * (1 - info.delta.y * .001)
        if (info.event.altKey) {
          this.zoomAt(newZoom, pointer)
        } else {
          this.zoomAt(newZoom, { x: 0, y: 0 })
        }
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