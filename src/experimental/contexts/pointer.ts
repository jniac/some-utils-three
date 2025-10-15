import { Camera, Intersection, Line3, Object3D, Plane, Ray, Raycaster, Vector2, Vector3 } from 'three'

import { allDescendantsOf } from 'some-utils-ts/iteration/tree'
import { Ticker } from 'some-utils-ts/ticker'

import { Duplicable } from 'some-utils-ts/misc/duplicable'
import { isMesh } from '../../is'

/**
 * https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
 */
export enum PointerButton {
  Left = 0,
  Middle = 1,
  Right = 2,
}

class PointerState {
  downEvent: PointerEvent | null = null
  /**
   * The state of the pointer buttons (bitmask).
   */
  buttons = 0
  /**
   * The position of the pointer in client space (pixels)
   * - min: (0, 0) top-left
   * - max: (width, height) bottom-right
   */
  clientPosition = new Vector2()
  /**
   * The position of the pointer in screen space (NDC)
   * - min: (-1, -1) bottom-left
   * - max: (1, 1) top-right
   */
  screenPosition = new Vector2()

  copy(state: PointerState): this {
    this.buttons = state.buttons
    this.clientPosition.copy(state.clientPosition)
    this.screenPosition.copy(state.screenPosition)
    return this
  }

  /**
   * Set the difference between two pointer states.
   */
  diff(a: PointerState, b: PointerState): this {
    this.buttons = a.buttons ^ b.buttons
    this.clientPosition.subVectors(a.clientPosition, b.clientPosition)
    this.screenPosition.subVectors(a.screenPosition, b.screenPosition)
    return this
  }
}

enum ThreePointerEventType {
  Tap,
}

export class ThreePointerEvent {
  static get Type() { return ThreePointerEventType }

  constructor(
    public readonly type: ThreePointerEventType,
    public readonly intersection: Intersection | null,
    private readonly state: PointerState,
  ) { }

  get downEvent() {
    return this.state.downEvent!
  }

  get downTarget() {
    return this.downEvent.target as HTMLElement
  }

  consumed = false

  consume() {
    this.consumed = true
  }
}

export class Pointer {
  #enabled = true

  get buttons() { return this.state.buttons }

  state = new PointerState()
  stateOld = new PointerState()
  diffState = new PointerState()
  downTimes = new Map<PointerButton, number>()
  upTimes = new Map<PointerButton, number>()

  domElement: HTMLElement | null = null
  scope: HTMLElement | null = null
  ticker: Ticker | null = null

  #eventIgnore = new Map<ThreePointerEventType, (event: ThreePointerEvent) => boolean>()
  /**
   * Set a function to ignore pointer events of a specific type.
   * 
   * This allows to filter out pointer events based on custom logic.
   * 
   * Eg. to ignore "tap" events because of the presence of UI elements, but still
   * allow pointer position update, or even dragging:
   * ```ts
   * three.pointer.setEventIgnore(ThreePointerEvent.Type.Tap, event => {
   *   const { downTarget } = event
   *   return canvasWrapper === downTarget || canvasWrapper.contains(downTarget)
   * })
   * ```
   */
  setEventIgnore(type: ThreePointerEventType, ignore: (event: ThreePointerEvent) => boolean) {
    this.#eventIgnore.set(type, ignore)
  }

  /**
   * @deprecated Highly deprecated, use `ThreePointerEvent` instead.
   */
  event = new class PointerEvent {
    consumed = false
    consume() {
      this.consumed = true
    }
    reset() {
      this.consumed = false
    }
  }

  camera: Camera | null = null

  /**
   * The current intersections of the pointer with the scene. Updated on each frame.
   */
  intersections: Intersection[] = []

  /**
   * Return true if the pointer button is currently pressed.
   */
  buttonDown(button = PointerButton.Left) {
    return (this.state.buttons & (1 << button)) !== 0
  }

  /**
   * Return true if the pointer button was pressed in the previous frame.
   */
  buttonDownOld(button = PointerButton.Left) {
    return (this.stateOld.buttons & (1 << button)) !== 0
  }

  /**
   * Return true if the pointer button was pressed in the current frame but not in the previous frame (enter).
   */
  buttonDownEnter(button = PointerButton.Left) {
    return this.buttonDown(button) && !this.buttonDownOld(button)
  }

  /**
   * Return true if the pointer button was pressed in the previous frame but not in the current frame (exit).
   */
  buttonDownExit(button = PointerButton.Left) {
    return !this.buttonDown(button) && this.buttonDownOld(button)
  }

  /**
   * Return true if the pointer button was pressed then released within the specified duration.
   */
  buttonTap(button = PointerButton.Left, maxDuration = .25) {
    if (this.buttonDownExit(button) === false)
      return false

    const delta = this.upTimes.get(button)! - this.downTimes.get(button)!
    return delta < maxDuration
  }

  get enabled() { return this.#enabled }
  set enabled(value: boolean) { this.setEnabled(value) }

  /**
   * The position of the pointer in client space (pixels)
   * - min: (0, 0) top-left
   * - max: (width, height) bottom-right
   */
  get clientPosition() { return this.state.clientPosition }

  /**
   * The position of the pointer in screen space (NDC)
   * - min: (-1, -1) bottom-left
   * - max: (1, 1) top-right
   */
  get screenPosition() { return this.state.screenPosition }

  /**
   * The raycaster used to cast rays from the camera. Automatically updated.
   */
  raycaster = new Raycaster()

  /**
   * The ray from the camera to the pointer in the previous frame.
   * 
   * Useful for effects that require knowledge of the previous ray (eg: any swipe-based effect).
   */
  rayOld = new Ray()

  /**
   * Returns the ray from the camera to the pointer.
   */
  get ray() { return this.raycaster.ray }

  static defaultIntersectPlaneOptions = {
    /**
     * The interpolation factor between the current ray and the previous ray.
     * 
     * This can be used to create a smoother transition when the pointer moves quickly.
     * 
     * - 0: use the current ray only.
     * - 1: use the old ray only.
     * 
     * Default is 0.
     */
    oldFactor: 0,
    /**
     * The distance to extend the ray when intersecting with the plane.
     */
    distance: 1000,
  }

  static IntersectPlaneResult = class IntersectPlaneResult extends Duplicable {
    intersected = false
    point = new Vector3()
  }

  #intersectPlane = {
    plane: new Plane(),
    line: new Line3(),
    result: new Pointer.IntersectPlaneResult(),
  }

  /**
   * Returns the intersection point of the ray from the camera to the pointer with the plane.
   * 
   * Notes:
   * - The result is reused for performance reasons, so it should be cloned if needed.
   */
  intersectPlane(plane: Plane | 'yz' | 'xz' | 'xy', options?: Partial<typeof Pointer.defaultIntersectPlaneOptions>) {
    const { oldFactor, distance } = { ...Pointer.defaultIntersectPlaneOptions, ...options }
    const { rayOld, raycaster: { ray } } = this
    const { line, result, plane: plane2 } = this.#intersectPlane
    if (typeof plane === 'string') {
      plane2.constant = 0
      switch (plane as string) {
        case 'X': // backward compatibility
        case 'yz': {
          plane2.normal.set(1, 0, 0)
          break
        }
        case 'Y': // backward compatibility
        case 'xz': {
          plane2.normal.set(0, 1, 0)
          break
        }
        case 'Z': // backward compatibility
        case 'xy': {
          plane2.normal.set(0, 0, 1)
          break
        }
      }
    } else {
      plane2.copy(plane)
    }

    line.start.lerpVectors(ray.origin, rayOld.origin, oldFactor)
    line.end.lerpVectors(ray.direction, rayOld.direction, oldFactor)
      .normalize()
      .multiplyScalar(distance)
      .add(line.start)

    result.intersected = !!plane2.intersectLine(line, result.point)
    return result
  }

  updatePosition(camera: Camera, clientPosition: { x: number, y: number }, canvasRect: { x: number, y: number, width: number, height: number }) {
    const { x: clientX, y: clientY } = clientPosition
    const screenX = (clientX - canvasRect.x) / canvasRect.width * 2 - 1
    const screenY = (clientY - canvasRect.y) / canvasRect.height * -2 + 1

    this.camera = camera
    this.clientPosition.set(clientX, clientY)
    this.screenPosition.set(screenX, screenY)
    this.raycaster.setFromCamera(this.screenPosition, camera)
  }

  /**
   * Traverse the tree and cast rays from the camera to the pointer, if the object 
   * has geometry and matches the conditions (visibility, metadata, etc), any
   * associated "pointer" callback (userData) will be called.
   */
  raycast(root: Object3D): Intersection[] {
    const intersections: Intersection[] = []

    /**
     * Prune children that should be ignored by the pointer.
     */
    const prune = (child: Object3D) => child.userData.ignorePointer === true

    /**
     * Skip children that are not meshes or should be ignored by the pointer.
     */
    const skip = (child: Object3D) => isMesh(child) === false || ((child.userData.helper === true || child.visible === false) && child.userData.pointerArea !== true)

    for (const { node } of allDescendantsOf(root, { skip, prune })) {
      this.raycaster.intersectObject(node, false, intersections)
    }

    intersections.sort((a, b) => a.distance - b.distance)

    return intersections
  }

  /**
   * @deprecated Use `raycast()` instead.  
   */
  raycastScene(scene: Object3D) {
    return this.raycast(scene)
  }

  updateStart(scene: Object3D) {
    if (this.#enabled === false)
      return

    // calculate the difference in pointer state
    this.diffState.diff(this.state, this.stateOld)
    this.intersections = this.raycast(scene)

    // save the previous ray
    this.rayOld.copy(this.raycaster.ray)

    this.#updatePointerEvents(scene)
  }

  #updatePointerEvents(scene: Object3D) {
    const [first] = this.intersections

    if (this.buttonTap()) {
      const event = new ThreePointerEvent(ThreePointerEventType.Tap, first ?? null, this.state)

      const ignore = this.#eventIgnore.get(event.type)
      if (ignore?.(event))
        return

      const originalScope = first?.object ?? scene
      let scope: Object3D | null = originalScope
      type OnPointerTap = (event: ThreePointerEvent) => void
      while (scope && event.consumed === false) {
        if (scope.userData.onPointerTap) {
          const onPointerTap = scope.userData.onPointerTap as OnPointerTap
          onPointerTap(event)
          event.consume()
        }
        scope = scope.parent
      }
    }
  }

  updateEnd() {
    if (this.#enabled === false)
      return

    // save the previous state
    this.stateOld.copy(this.state)
    this.event.reset()
  }

  #enableListenersState = {
    disable: () => { },
  }
  #enableListeners() {
    const domElement = this.domElement!
    const scope = this.scope!
    const camera = this.camera!
    const ticker = this.ticker!

    const updatePointerPosition = (event: PointerEvent) => {
      const rect = domElement.getBoundingClientRect()
      const { clientX: x, clientY: y } = event
      this.updatePosition(camera, { x, y }, rect)
    }

    const onPointerMove = (event: PointerEvent) => {
      updatePointerPosition(event)
    }

    const onPointerDown = (event: PointerEvent) => {
      // NOTE: Update the pointer position on "down" too (because of touch events)
      updatePointerPosition(event)

      // Ignore events that are not from the canvas (but from other injected elements)
      if (event.target instanceof HTMLCanvasElement === false)
        return

      document.addEventListener('pointerup', onPointerUp)

      this.state.downEvent = event
      this.state.buttons |= (1 << event.button)
      this.downTimes.set(event.button, ticker.time)
    }

    const onPointerUp = (event: PointerEvent) => {
      document.removeEventListener('pointerup', onPointerUp)

      this.state.buttons &= ~(1 << event.button)
      this.upTimes.set(event.button, ticker.time)
    }

    document.addEventListener('pointermove', onPointerMove)
    scope.addEventListener('pointerdown', onPointerDown)

    this.#enableListenersState.disable = () => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
      scope.removeEventListener('pointerdown', onPointerDown)
    }
  }
  #disableListeners() {
    this.#enableListenersState.disable()
    this.#enableListenersState.disable = () => { }
  }

  setEnabled(value: boolean): this {
    if (this.#enabled === value)
      return this

    this.#enabled = value
    if (value) {
      this.#enableListeners()
    } else {
      this.#disableListeners()
    }

    return this
  }

  initialize(domElement: HTMLElement, scope: HTMLElement, camera: Camera, ticker: Ticker) {
    this.domElement = domElement
    this.scope = scope
    this.camera = camera
    this.ticker = ticker

    if (this.#enabled)
      this.#enableListeners()

    return this.#enableListenersState.disable
  }
}
