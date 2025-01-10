import { Ticker } from 'some-utils-ts/ticker'
import { Camera, Raycaster, Vector2 } from 'three/webgpu'

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
   * Return true if the pointer button is currently pressed.
   */
  button(button = PointerButton.Left) {
    return (this.state.buttons & (1 << button)) !== 0
  }

  /**
   * Return true if the pointer button was pressed in the previous frame.
   */
  buttonOld(button = PointerButton.Left) {
    return (this.stateOld.buttons & (1 << button)) !== 0
  }

  buttonEnter(button = PointerButton.Left) {
    return this.button(button) && !this.buttonOld(button)
  }

  buttonExit(button = PointerButton.Left) {
    return !this.button(button) && this.buttonOld(button)
  }

  buttonTap(button = PointerButton.Left, maxDuration = .25) {
    return this.buttonExit(button) && this.upTimes.get(button)! - this.downTimes.get(button)! < maxDuration
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

  update(camera: Camera, clientPosition: { x: number, y: number }, canvasRect: { x: number, y: number, width: number, height: number }) {
    const { x: clientX, y: clientY } = clientPosition
    const screenX = (clientX - canvasRect.x) / canvasRect.width * 2 - 1
    const screenY = (clientY - canvasRect.y) / canvasRect.height * -2 + 1

    this.camera = camera
    this.clientPosition.set(clientX, clientY)
    this.screenPosition.set(screenX, screenY)
    this.raycaster.setFromCamera(this.screenPosition, camera)
  }

  initialize(domElement: HTMLElement, scope: HTMLElement, camera: Camera, ticker: Ticker) {
    const updatePointerPosition = (event: PointerEvent) => {
      const rect = domElement.getBoundingClientRect()
      const { clientX: x, clientY: y } = event
      this.update(camera, { x, y }, rect)
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
