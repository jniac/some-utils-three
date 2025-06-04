import { Camera, Intersection, Line3, Object3D, Plane, Raycaster, Vector2, Vector3 } from 'three'

import { Ticker } from 'some-utils-ts/ticker'

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
  ) { }

  consumed = false

  consume() {
    this.consumed = true
  }
}

export class Pointer {
  get buttons() { return this.state.buttons }

  state = new PointerState()
  stateOld = new PointerState()
  diffState = new PointerState()
  downTimes = new Map<PointerButton, number>()
  upTimes = new Map<PointerButton, number>()

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
   * Returns the ray from the camera to the pointer.
   */
  get ray() { return this.raycaster.ray }

  #intersectPlane = {
    plane: new Plane(),
    point: new Vector3(),
    line: new Line3(),
    result: {
      intersected: false,
      point: new Vector3(),
    },
  }
  /**
   * Returns the intersection point of the ray from the camera to the pointer with the plane.
   * 
   * NOTE: The result point reference is reused, so it should be copied if needed for later use.
   */
  intersectPlane(plane: Plane | 'X' | 'Y' | 'Z', {
    distance = 1000,
    out = this.#intersectPlane.result.point,
  } = {}) {
    const { ray } = this.raycaster
    const { point, line, result, plane: plane2 } = this.#intersectPlane
    if (typeof plane === 'string') {
      plane2.constant = 0
      switch (plane) {
        case 'X':
          plane2.normal.set(1, 0, 0)
          break
        case 'Y':
          plane2.normal.set(0, 1, 0)
          break
        case 'Z':
          plane2.normal.set(0, 0, 1)
          break
      }
    } else {
      plane2.copy(plane)
    }
    line.set(ray.origin, point.copy(ray.origin).addScaledVector(ray.direction, distance))
    result.intersected = !!plane2.intersectLine(line, out)
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

    root.traverse(child => {
      if (child.userData.ignorePointer === true)
        return

      if ((child.visible === false || child.userData.helper === true) && child.userData.pointerArea !== true)
        return

      if (isMesh(child))
        this.raycaster.intersectObject(child, false, intersections)
    })

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
    // calculate the difference in pointer state
    this.diffState.diff(this.state, this.stateOld)
    this.intersections = this.raycast(scene)

    this.#updatePointerEvents(scene)
  }

  #updatePointerEvents(scene: Object3D) {
    const [first] = this.intersections
    if (this.buttonTap()) {
      const event = new ThreePointerEvent(ThreePointerEventType.Tap, first ?? null)
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
    // save the previous state
    this.stateOld.copy(this.state)
    this.event.reset()
  }

  initialize(domElement: HTMLElement, scope: HTMLElement, camera: Camera, ticker: Ticker) {
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

      this.state.buttons |= (1 << event.button)
      this.downTimes.set(event.button, ticker.time)
    }

    const onPointerUp = (event: PointerEvent) => {
      this.state.buttons &= ~(1 << event.button)
      this.upTimes.set(event.button, ticker.time)
    }

    scope.addEventListener('pointermove', onPointerMove)
    scope.addEventListener('pointerdown', onPointerDown)
    scope.addEventListener('pointerup', onPointerUp)

    const destroy = () => {
      scope.removeEventListener('pointermove', onPointerMove)
      scope.removeEventListener('pointerdown', onPointerDown)
      scope.removeEventListener('pointerup', onPointerUp)
    }

    return destroy
  }
}
