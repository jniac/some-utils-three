import { Camera, Euler, Quaternion, Vector2, Vector2Like, Vector3 } from 'three'

import { handleHtmlElementEvent } from 'some-utils-dom/handle/element-event'
import { handlePointer, PointerButton } from 'some-utils-dom/handle/pointer'
import { Animation } from 'some-utils-ts/animation'
import { calculateExponentialDecayLerpRatio } from 'some-utils-ts/math/misc/exponential-decay'
import { DestroyableInstance } from 'some-utils-ts/misc/destroy'

import { fromVector3Declaration, Vector3Declaration } from '../../declaration'
import { Vertigo, VertigoProps } from '../vertigo'

const _quaternion = new Quaternion()
const _vectorX = new Vector3()
const _vectorY = new Vector3()
const _vectorZ = new Vector3()

function _updateVectorXYZ(rotation: Euler) {
  _quaternion.setFromEuler(rotation)
  _vectorX.set(1, 0, 0).applyQuaternion(_quaternion)
  _vectorY.set(0, 1, 0).applyQuaternion(_quaternion)
  _vectorZ.crossVectors(_vectorX, _vectorY)
}

const controlInputs = [
  'shift',
  'alt',
  'control',
  'meta',
] as const

type ControlInput = typeof controlInputs[number]

type ControlInputString =
  | ''
  | `${ControlInput}`
  | `${ControlInput}+${ControlInput}`
  | `${ControlInput}+${ControlInput}+${ControlInput}`
  | `${ControlInput}+${ControlInput}+${ControlInput}+${ControlInput}`

function matchControlInput(
  object: { altKey: boolean, ctrlKey: boolean, shiftKey: boolean, metaKey: boolean },
  keys: ControlInput[],
) {
  return keys.every(key => (object as any)[`${key}Key`])
}

function parseInputs(inputs: string) {
  const parts = inputs.split('+')
  return parts.filter(part => {
    if (part === '') {
      return false
    }
    const ok = controlInputs.includes(part as ControlInput)
    if (!ok) {
      console.warn(`Invalid input: ${part}`)
    }
    return ok
  }) as ControlInput[]
}

/**
 * The VertigoControls allows to control a "Vertigo" camera from pointer / wheel 
 * input.
 * 
 * @example
 * const controls = new VertigoControls({
 *   size: 20,
 *   perspective: .5,
 * })
 * controls.initialize('canvas')
 * controls.start()
 */
export class VertigoControls extends DestroyableInstance {
  /**
   * The decay factor for the vertigo controls (expresses the missing part after 1 second).
   * 
   * Example:
   * - 0.123 means that 12.3% of the difference will be missing after 1 second.
   * 
   * Defaults to `.01` (1% missing after 1 second).
   */
  dampingDecayFactor = .0001

  /**
   * The "absolute" vertigo controls (used as a target for the damped vertigo controls).
   */
  vertigo = new Vertigo()

  /**
   * The damped vertigo controls (used for smooth camera movement).
   */
  dampedVertigo = new Vertigo()

  /**
   * The element to attach the pointer events to. Must be set through `initialize()`.
   */
  element!: HTMLElement

  inputConfig = {
    wheel: 'zoom' as 'zoom' | 'dolly',
  }

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

  panInputs: ControlInput[] = []
  parsePanInputs(inputs: string) {
    this.panInputs = parseInputs(inputs)
  }

  orbitInputs: ControlInput[] = []
  parseOrbitInputs(inputs: string) {
    this.orbitInputs = parseInputs(inputs)
  }

  constructor(props: VertigoProps = {}) {
    super()
    this.vertigo.set(props)
    this.dampedVertigo.set(props)
  }

  pan(x: number, y: number) {
    _updateVectorXYZ(this.vertigo.rotation)
    const z = 1 / this.vertigo.zoom
    this.vertigo.focus
      .addScaledVector(_vectorX, x * z)
      .addScaledVector(_vectorY, y * z)
  }

  dolly(delta: number) {
    _updateVectorXYZ(this.vertigo.rotation)
    const zoomFactor = 1 / this.vertigo.zoom
    this.vertigo.focus.addScaledVector(_vectorZ, delta * zoomFactor)
  }

  orbit(pitch: number, yaw: number) {
    this.vertigo.rotation.x += pitch
    this.vertigo.rotation.y += yaw
  }

  /**
   * @deprecated Use `orbit()` instead.
   */
  rotate(...args: Parameters<VertigoControls['orbit']>) {
    this.orbit(...args)
  }

  zoomAt(newZoom: number, ndc: Vector2Like) {
    this.vertigo.update(this.dampedVertigo.state.aspect)
    const currentWidth = this.vertigo.state.realSize.x
    const currentHeight = this.vertigo.state.realSize.y
    const newWidth = this.vertigo.state.realSize.x / (newZoom / this.vertigo.zoom)
    const newHeight = this.vertigo.state.realSize.y / (newZoom / this.vertigo.zoom)
    const diffWidth = newWidth - currentWidth
    const diffHeight = newHeight - currentHeight

    _updateVectorXYZ(this.vertigo.rotation)
    const { x, y } = ndc
    this.vertigo.focus
      .addScaledVector(_vectorX, .5 * diffWidth * -x)
      .addScaledVector(_vectorY, .5 * diffHeight * -y)

    this.vertigo.zoom = newZoom
  }

  initialize(element: HTMLElement | string = document.body): this {
    if (typeof element === 'string')
      element = document.querySelector(element) as HTMLElement

    if (!(element instanceof HTMLElement))
      throw new Error(`Invalid element: ${element}`)

    this.element = element
    return this
  }

  /**
   * @param element The element to attach the pointer events to is the one provided by `initialize()` by default. But you can provide a different one here.
   */
  private *doStart(element: HTMLElement = this.element ?? document.body) {
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
        pointer.set(x, y)
      },
      dragButton: ~0,
      onDrag: info => {
        const s = info.altKey ? .2 : info.shiftKey ? 5 : 1
        switch (info.button) {
          case PointerButton.Left: {
            if (matchControlInput(info, this.orbitInputs)) {
              this.orbit(info.delta.y * -.01 * s, info.delta.x * -.01 * s)
            }
            break
          }
          case PointerButton.Right: {
            if (matchControlInput(info, this.panInputs)) {
              this.pan(info.delta.x * -.025 * s, info.delta.y * .025 * s)
            }
            break
          }
        }
      },
      wheelPreventDefault: true,
      onWheel: info => {
        switch (this.inputConfig.wheel) {
          case 'zoom': {
            const newZoom = this.vertigo.zoom * (1 - info.delta.y * .001)
            if (info.event.altKey) {
              this.zoomAt(newZoom, pointer)
            } else {
              this.zoomAt(newZoom, { x: 0, y: 0 })
            }
            break
          }
          case 'dolly': {
            this.dolly(info.delta.y * .01)
            break
          }
        }
      },
    })
  }

  started = false

  start(...args: Parameters<typeof this.doStart>): this {
    if (this.started === false) {
      this.started = true
      this.collect(this.doStart(...args))
    }
    return this
  }

  stop() {
    if (this.started) {
      this.started = false
      this.destroy()
    }
  }

  toggle(start = !this.started) {
    if (start) {
      this.start()
    } else {
      this.stop()
    }
  }

  update(camera: Camera, aspect: number, deltaTime = 1 / 60) {
    const t = calculateExponentialDecayLerpRatio(this.dampingDecayFactor, deltaTime)
    this.dampedVertigo
      .lerp(this.vertigo, t)
      .apply(camera, aspect)
  }
}

export type {
  ControlInput as VertigoControlInput,
  ControlInputString as VertigoControlInputString
}
