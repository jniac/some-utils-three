import { Camera, Raycaster, Vector2 } from 'three/webgpu'

export enum PointerButton {
  None = 0,
  LeftDown = 1 << 0,
  LeftDrag = 1 << 1,
}

export class Pointer {
  get button() { return this.state.button }

  state = {
    button: PointerButton.None,
  }

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
}
