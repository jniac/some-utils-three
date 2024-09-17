import { Camera, Raycaster, Vector2 } from 'three'

export enum PointerButton {
  None = 0,
  LeftDown = 1 << 0,
  LeftDrag = 1 << 1,
}

export class Pointer {
  status = {
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

  clientPosition = new Vector2()
  screenPosition = new Vector2()
  raycaster = new Raycaster()

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
