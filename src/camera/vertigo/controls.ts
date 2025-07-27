import { Camera, Euler, Group, Plane, Quaternion, Ray, Vector2, Vector2Like, Vector3 } from 'three'

import { handleHtmlElementEvent } from 'some-utils-dom/handle/element-event'
import { handlePointer, PointerButton } from 'some-utils-dom/handle/pointer'
import { Animation } from 'some-utils-ts/animation'
import { intersectLineWithPlane } from 'some-utils-ts/math/geom/geom3'
import { calculateExponentialDecayLerpRatio } from 'some-utils-ts/math/misc/exponential-decay'
import { DestroyableInstance } from 'some-utils-ts/misc/destroy'
import { DestroyableObject } from 'some-utils-ts/types'

import { handleKeyboard } from 'some-utils-dom/handle/keyboard'
import { fromPlaneDeclaration, fromVector3Declaration, PlaneDeclaration, Vector3Declaration } from '../../declaration'
import { Vertigo, VertigoProps } from '../vertigo'
import { VertigoHelper } from './helper'

const _quaternion = new Quaternion()
const _vectorX = new Vector3()
const _vectorY = new Vector3()
const _vectorZ = new Vector3()
const _plane = new Plane()
const _ray = new Ray()

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
export class VertigoControls implements DestroyableObject {
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
   * If set, the focus plane will be used to constrain the focus point.
   * 
   * Useful for example to limit the focus point to a ground plane.
   */
  focusPlane = <PlaneDeclaration | null>null

  /**
   * The element to attach the pointer events to. Must be set through `initialize()`.
   */
  element!: HTMLElement

  /**
   * A group to hold helpers or other objects related to the vertigo controls.
   */
  group = new Group()

  #state = {
    secondaryActivationCount: 0,
    secondaryIsActive: false,
    secondaryVertigo: new Vertigo(),
    secondaryDampedVertigo: new Vertigo(),
    helper: null as VertigoHelper | null,

    startDestroyableInstance: new DestroyableInstance(),
  }

  get currentVertigo() {
    return this.#state.secondaryIsActive
      ? this.#state.secondaryVertigo
      : this.vertigo
  }

  get currentDampedVertigo() {
    return this.#state.secondaryIsActive
      ? this.#state.secondaryDampedVertigo
      : this.dampedVertigo
  }

  inputConfig = {
    wheel: 'zoom' as 'zoom' | 'dolly',
  }

  actions = {
    togglePerspective: () => {
      const perspective = this.currentVertigo.perspective > .5 ? 0 : 1
      Animation
        .tween({
          target: [this.currentVertigo, 'perspective'],
          to: { perspective },
          duration: 1,
          ease: 'inOut3',
        })
    },
    focus: (focusPosition: Vector3Declaration) => {
      Animation
        .tween({
          target: this.currentVertigo.focus,
          to: fromVector3Declaration(focusPosition),
          duration: 1,
          ease: 'inOut3',
        })
    },
    rotate: (pitch: number, yaw: number, roll: number) => {
      const qStart = new Quaternion().setFromEuler(this.currentVertigo.rotation)
      const qEnd = new Quaternion().setFromEuler(new Euler(pitch, yaw, roll, 'YXZ'))
      const q = new Quaternion()
      Animation
        .during({
          target: [this.currentVertigo, 'rotation'],
          duration: 1,
        })
        .onUpdate(({ progress }) => {
          q.slerpQuaternions(qStart, qEnd, Animation.ease('inOut3')(progress))
          this.currentVertigo.rotation.setFromQuaternion(q)
        })
    },
    enterSecondary: () => {
      if (!this.#state.secondaryIsActive) {
        this.#state.secondaryIsActive = true
        this.#state.secondaryDampedVertigo.copy(this.dampedVertigo)

        const helper = new VertigoHelper(this.vertigo, { color: 'red' })
        this.group.add(helper)
        this.#state.helper = helper

        // If this is the first time entering secondary, copy the vertigo state.
        if (this.#state.secondaryActivationCount === 0) {
          this.#state.secondaryVertigo.copy(this.vertigo)
          this.#state.secondaryDampedVertigo.copy(this.dampedVertigo)
        }
        this.#state.secondaryActivationCount++
      }
    },
    exitSecondary: () => {
      if (this.#state.secondaryIsActive) {
        this.#state.secondaryIsActive = false
        this.dampedVertigo.copy(this.#state.secondaryDampedVertigo)

        // Remove the helper if it exists.
        if (this.#state.helper) {
          // this.group.remove(this.#state.helper)
          // this.#state.helper = null
        }
      }
    },
    toggleSecondary: () => {
      if (this.#state.secondaryIsActive) {
        this.actions.exitSecondary()
      } else {
        this.actions.enterSecondary()
      }
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
    this.currentVertigo.set(props)
    this.currentDampedVertigo.set(props)
  }

  #destroyed = false
  get destroyed() { return this.#destroyed }
  destroy = () => {
    if (this.#destroyed)
      return
    this.#destroyed = true
    this.#state.startDestroyableInstance.destroy()
  }

  set(props: VertigoProps) {
    this.currentVertigo.set(props)
    this.currentDampedVertigo.set(props)
    return this
  }

  pan(x: number, y: number) {
    _updateVectorXYZ(this.currentVertigo.rotation)
    const z = 1 / this.currentVertigo.zoom
    this.currentVertigo.focus
      .addScaledVector(_vectorX, x * z)
      .addScaledVector(_vectorY, y * z)

    // If a focus plane, and only if the current vertigo is the main one,
    // (secondary vertigo is free) constrain the focus point to the plane.
    if (this.focusPlane && this.currentVertigo === this.vertigo) {
      fromPlaneDeclaration(this.focusPlane, _plane)
      _ray.origin.copy(this.currentVertigo.focus)
      _ray.direction.copy(_vectorZ)
      if (intersectLineWithPlane(_ray, _plane, _vectorZ)) {
        this.currentVertigo.focus.copy(_vectorZ)
      }
    }
  }

  dolly(delta: number) {
    _updateVectorXYZ(this.currentVertigo.rotation)
    const zoomFactor = 1 / this.currentVertigo.zoom
    this.currentVertigo.focus.addScaledVector(_vectorZ, delta * zoomFactor)
  }

  orbit(pitch: number, yaw: number) {
    this.currentVertigo.rotation.x += pitch
    this.currentVertigo.rotation.y += yaw
  }

  /**
   * @deprecated Use `orbit()` instead.
   */
  rotate(...args: Parameters<VertigoControls['orbit']>) {
    this.orbit(...args)
  }

  zoomAt(newZoom: number, ndc: Vector2Like) {
    this.currentVertigo.update(this.currentDampedVertigo.state.aspect)
    const currentWidth = this.currentVertigo.state.realSize.x
    const currentHeight = this.currentVertigo.state.realSize.y
    const newWidth = this.currentVertigo.state.realSize.x / (newZoom / this.currentVertigo.zoom)
    const newHeight = this.currentVertigo.state.realSize.y / (newZoom / this.currentVertigo.zoom)
    const diffWidth = newWidth - currentWidth
    const diffHeight = newHeight - currentHeight

    _updateVectorXYZ(this.currentVertigo.rotation)
    const { x, y } = ndc
    this.currentVertigo.focus
      .addScaledVector(_vectorX, .5 * diffWidth * -x)
      .addScaledVector(_vectorY, .5 * diffHeight * -y)

    this.currentVertigo.zoom = newZoom
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

    yield handleKeyboard([
      [{ code: 'Tab', modifiers: 'alt' }, (info) => {
        info.event.preventDefault()
        this.actions.toggleSecondary()
        console.log('Toggled secondary vertigo controls:', this.#state.secondaryIsActive)
      }]
    ])

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
        const scalar = info.altKey ? .2 : info.shiftKey ? 5 : 1
        const type = info.button === PointerButton.Left && info.touchCount <= 1
          ? 'orbit'
          : 'pan'
        switch (type) {
          case 'orbit': {
            if (matchControlInput(info, this.orbitInputs)) {
              this.orbit(info.delta.y * -.01 * scalar, info.delta.x * -.01 * scalar)
            }
            break
          }
          case 'pan': {
            if (matchControlInput(info, this.panInputs)) {
              this.pan(info.delta.x * -.025 * scalar, info.delta.y * .025 * scalar)
            }
            break
          }
        }
      },
      wheelPreventDefault: true,
      onWheel: info => {
        switch (this.inputConfig.wheel) {
          case 'zoom': {
            const newZoom = this.currentVertigo.zoom * (1 - info.delta.y * .001)
            if (info.event.altKey) {
              if (info.event.shiftKey) {
                this.currentVertigo.perspective *= 1 - info.delta.y * .001
              } else {
                this.zoomAt(newZoom, pointer)
              }
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
      this.#state.startDestroyableInstance.onDestroy(this.doStart(...args))
    }
    return this
  }

  stop() {
    if (this.started) {
      this.started = false
      // Destroy the start destroyable instance to clean up the event listeners
      // and recreate it for the next start.
      this.#state.startDestroyableInstance.destroy()
      this.#state.startDestroyableInstance = new DestroyableInstance()
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
    this.vertigo.update(aspect)
    this.currentDampedVertigo
      .lerp(this.currentVertigo, t)
      .apply(camera, aspect)
  }
}

export type {
  ControlInput as VertigoControlInput,
  ControlInputString as VertigoControlInputString
}
