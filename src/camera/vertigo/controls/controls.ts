
import { Camera, ColorRepresentation, Euler, Group, Object3D, Plane, Quaternion, Ray, Vector2, Vector2Like, Vector3 } from 'three'

import { handleHtmlElementEvent } from 'some-utils-dom/handle/element-event'
import { handlePointer, PointerButton } from 'some-utils-dom/handle/pointer'
import { clamp } from 'some-utils-ts/math/basic'
import { intersectLineWithPlane } from 'some-utils-ts/math/geom/geom3'
import { calculateExponentialDecayLerpRatio } from 'some-utils-ts/math/misc/exponential-decay'
import { DestroyableInstance } from 'some-utils-ts/misc/destroy'
import { DestroyableObject } from 'some-utils-ts/types'

import { fromPlaneDeclaration, PlaneDeclaration } from '../../../declaration'
import { VertigoHelper } from '../helper'
import { Vertigo, VertigoProps } from '../vertigo'
import { createActions } from './action'
import { ControlInput, ControlInputString, matchControlInput, parseInputs } from './input'
import { findIntersection } from './utils'

const _quaternion = new Quaternion()
const _vectorX = new Vector3()
const _vectorY = new Vector3()
const _vectorZ = new Vector3()
const _plane = new Plane()
const _ray = new Ray()
const _v0 = new Vector3()
const _v1 = new Vector3()

function _updateVectorXYZ(rotation: Euler) {
  _quaternion.setFromEuler(rotation)
  _vectorX.set(1, 0, 0).applyQuaternion(_quaternion)
  _vectorY.set(0, 1, 0).applyQuaternion(_quaternion)
  _vectorZ.crossVectors(_vectorX, _vectorY)
}

export const __private__ = Symbol('private')

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
  group = new Group();

  [__private__] = {
    state: {
      enabled: true,
      interactive: true,

      rootForRaycast: null as Object3D | null,
      cameraForRaycast: null as Camera | null,

      alternativeActivationCount: 0,
      alternativeIsActive: false,
      /**
       * Was the vertigo controls started when entering the alternative vertigo?
       */
      alternativeWasStarted: false,
      /**
       * The alternative vertigo controls is for exploring the scene without affecting
       * the main vertigo controls. The movement of the alternative vertigo controls
       * are free (eg: not constrained by the focus plane).
       */
      alternativeVertigo: new Vertigo(),
      alternativeDampedVertigo: new Vertigo(),
      /**
       * If true, we are currently in the alternative vertigo controls, but going back
       * to the primary vertigo controls.
       */
      alternativeExiting: false,
      alternativeHelperColor: 'red' as ColorRepresentation,
      alternativeHelper: null as VertigoHelper | null,

      startDestroyableInstance: new DestroyableInstance(),
    },

    /**
     * Is the alternative vertigo active and is it not exiting?
     */
    alternativeIsActiveAndNotExiting: (): boolean => {
      const { state } = this[__private__]
      return state.alternativeIsActive && state.alternativeExiting === false
    },

    doEnterAlternative: () => {
      const { state } = this[__private__]

      state.alternativeExiting = false

      if (!state.alternativeIsActive) {
        state.alternativeIsActive = true
        state.alternativeDampedVertigo.copy(this.dampedVertigo)

        const helper = new VertigoHelper(this.vertigo, { color: state.alternativeHelperColor })
        this.group.add(helper)
        state.alternativeHelper = helper

        // If this is the first time entering alternative, copy the vertigo state.
        if (state.alternativeActivationCount === 0) {
          state.alternativeVertigo.copy(this.vertigo)
          state.alternativeVertigo.after *= 2 // Make the alternative vertigo render a bit longer.
          state.alternativeDampedVertigo.copy(this.dampedVertigo)
        }
        state.alternativeActivationCount++
      }
    },

    doExitAlternative: () => {
      const { state } = this[__private__]
      state.alternativeIsActive = false
      state.alternativeExiting = false
      if (state.alternativeHelper) {
        this.group.remove(state.alternativeHelper)
        state.alternativeHelper = null
      }
    },
  }

  get currentVertigo() {
    const { state } = this[__private__]
    return state.alternativeIsActive
      ? state.alternativeVertigo
      : this.vertigo
  }

  get currentDampedVertigo() {
    const { state } = this[__private__]
    return state.alternativeIsActive
      ? state.alternativeDampedVertigo
      : this.dampedVertigo
  }

  get alternativeIsActive() {
    return this[__private__].alternativeIsActiveAndNotExiting()
  }

  set alternativeIsActive(value: boolean) {
    if (value) {
      this[__private__].doEnterAlternative()
    } else {
      this[__private__].doExitAlternative()
    }
  }

  get alternativeHelperColor() {
    return this[__private__].state.alternativeHelperColor
  }

  set alternativeHelperColor(color: ColorRepresentation) {
    this[__private__].state.alternativeHelperColor = color
  }

  inputConfig = {
    wheel: 'zoom' as 'zoom' | 'dolly',
  }

  actions = createActions(this)

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
    this.group.name = 'VertigoControls-Helper'
  }

  #destroyed = false
  get destroyed() { return this.#destroyed }
  destroy = () => {
    if (this.#destroyed)
      return
    this.#destroyed = true
    this[__private__].state.startDestroyableInstance.destroy()
  }

  set(props: VertigoProps) {
    this.currentVertigo.set(props)
    this.currentDampedVertigo.set(props)
    return this
  }

  /**
   * When disabled the controls does not update the camera anymore.
   * 
   * Useful to temporarily disable the controls and let other code manipulate the camera without interference from the controls.
   * 
   * For disabling only the interaction but keeping the vertigo active, use `interactive` instead.
   */
  get enabled() { return this[__private__].state.enabled }
  set enabled(value: boolean) { this.setEnabled(value) }
  setEnabled(enabled: boolean) {
    this[__private__].state.enabled = enabled
  }

  /**
   * If the controls should respond to user input. 
   * 
   * Can be used to temporarily disable interaction without stopping the controls 
   * (and thus keeping the damped vertigo active).
   * 
   * For completely disabling the controls, use `enabled` instead.
   */
  get interactive() { return this[__private__].state.interactive }
  set interactive(value: boolean) { this.setInteractive(value) }
  setInteractive(interactive: boolean) {
    this[__private__].state.interactive = interactive
  }

  pan(x: number, y: number) {
    _updateVectorXYZ(this.currentVertigo.rotation)
    const z = 1 / this.currentVertigo.zoom
    this.currentVertigo.focus
      .addScaledVector(_vectorX, x * z)
      .addScaledVector(_vectorY, y * z)

    // If a focus plane, and only if the current vertigo is the main one,
    // (alternative vertigo is free) constrain the focus point to the plane.
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

  initialize(
    element: HTMLElement | string = document.body,
    rootForRaycast: Object3D | null = null,
  ): this {
    if (typeof element === 'string')
      element = document.querySelector(element) as HTMLElement

    if (!(element instanceof HTMLElement))
      throw new Error(`Invalid element: ${element}`)

    this.element = element
    this[__private__].state.rootForRaycast = rootForRaycast
    return this
  }

  /**
   * @param element The element to attach the pointer events to is the one provided by `initialize()` by default. But you can provide a different one here.
   */
  *#doStart(element: HTMLElement = this.element ?? document.body) {
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
      onDown: info => {
        // WIIIIIPP
        if (info.modifiers.altKey) {
          const offset = new Vector3()
          this.vertigo.ndcToVertigoScreen(pointer, offset)
          this.vertigo.focus.copy(offset)
          this.vertigo.screenOffset.copy(offset).multiplyScalar(this.vertigo.zoom)

          const { rootForRaycast, cameraForRaycast } = this[__private__].state
          if (rootForRaycast && cameraForRaycast) {
            const intersection = findIntersection(pointer, cameraForRaycast, rootForRaycast)
            if (intersection) {
              console.log('intersection', intersection.object, ...intersection.point)
              const direction = new Vector3(0, 0, -1).applyEuler(this.vertigo.rotation)
              const delta = intersection.point.clone().sub(this.vertigo.focus).projectOnVector(direction).length()
              const scalar = (this.vertigo.state.distance + delta) / this.vertigo.state.distance
              this.vertigo.focus.addScaledVector(direction, delta)
              this.vertigo.size.multiplyScalar(scalar)
            }
          }
        }
      },
      onDrag: info => {
        if (this[__private__].state.enabled === false)
          return

        if (this[__private__].state.interactive === false)
          return

        const type = info.button === PointerButton.Left && info.touchCount <= 1
          ? 'orbit'
          : 'pan'
        switch (type) {
          case 'orbit': {
            const scalar = 1
            if (matchControlInput(info, this.orbitInputs)) {
              this.orbit(info.delta.y * -.01 * scalar, info.delta.x * -.01 * scalar)
            }
            break
          }
          case 'pan': {
            const scalar = info.altKey ? .2 : info.shiftKey ? 5 : 1
            if (matchControlInput(info, this.panInputs)) {
              this.pan(info.delta.x * -.025 * scalar, info.delta.y * .025 * scalar)
            }
            break
          }
        }
      },
      wheelPreventDefault: true,
      onWheel: info => {
        if (this[__private__].state.enabled === false)
          return

        if (this[__private__].state.interactive === false)
          return

        switch (this.inputConfig.wheel) {
          case 'zoom': {
            const newZoom = this.currentVertigo.zoom * (1 - info.delta.y * .001)
            if (info.event.altKey) {
              if (info.event.shiftKey) {
                const perspective = this.currentVertigo.perspective * (1 - info.delta.y * .001)
                this.currentVertigo.perspective = clamp(perspective, 0, 10)
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

  start(element: HTMLElement = this.element ?? document.body): this {
    if (this.started === false) {
      this.started = true
      this[__private__].state.startDestroyableInstance.onDestroy(this.#doStart(element))
    }
    return this
  }

  stop() {
    if (this.started) {
      this.started = false
      // Destroy the start destroyable instance to clean up the event listeners
      // and recreate it for the next start.
      this[__private__].state.startDestroyableInstance.destroy()
      this[__private__].state.startDestroyableInstance = new DestroyableInstance()
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
    const { state, doExitAlternative } = this[__private__]
    if (state.enabled === false)
      return

    const t = calculateExponentialDecayLerpRatio(this.dampingDecayFactor, deltaTime)
    this.vertigo.update(aspect)

    // Alternative update:
    if (state.alternativeExiting) {
      this.dampedVertigo
        .lerp(this.vertigo, t)

      state.alternativeDampedVertigo
        .lerp(this.vertigo, t)

      _v0.setFromMatrixPosition(state.alternativeDampedVertigo.state.worldMatrix)
      _v1.setFromMatrixPosition(this.dampedVertigo.state.worldMatrix)

      const sqDistance = _v0.distanceToSquared(_v1)
      // Lower threshold produces weird visual artifacts (line going aligning with the screen plane).
      if (sqDistance < .1)
        doExitAlternative()
    }

    // Normal update:
    else {
      this.currentDampedVertigo
        .lerp(this.currentVertigo, t)
    }

    this.currentDampedVertigo
      .apply(camera, aspect)

    this[__private__].state.cameraForRaycast = camera
  }

  /**
   * Reset the damped vertigo to the current vertigo state.
   */
  resetDamping(): this {
    this.dampedVertigo.copy(this.vertigo)
    return this
  }
}

export type {
  ControlInput as VertigoControlInput,
  ControlInputString as VertigoControlInputString
}
