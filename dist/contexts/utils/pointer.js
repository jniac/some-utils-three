import { Raycaster, Vector2 } from 'three';
export var PointerButton;
(function (PointerButton) {
    PointerButton[PointerButton["None"] = 0] = "None";
    PointerButton[PointerButton["LeftDown"] = 1] = "LeftDown";
    PointerButton[PointerButton["LeftDrag"] = 2] = "LeftDrag";
})(PointerButton || (PointerButton = {}));
export class Pointer {
    status = {
        button: PointerButton.None,
    };
    event = new class PointerEvent {
        consumed = false;
        consume() {
            this.consumed = true;
        }
        reset() {
            this.consumed = false;
        }
    };
    camera = null;
    /**
     * The position of the pointer in client space (pixels)
     * - min: (0, 0) top-left
     * - max: (width, height) bottom-right
     */
    clientPosition = new Vector2();
    /**
     * The position of the pointer in screen space (NDC)
     * - min: (-1, -1) bottom-left
     * - max: (1, 1) top-right
     */
    screenPosition = new Vector2();
    /**
     * The raycaster used to cast rays from the camera. Automatically updated.
     */
    raycaster = new Raycaster();
    /**
     * Returns the ray from the camera to the pointer.
     */
    get ray() { return this.raycaster.ray; }
    update(camera, clientPosition, canvasRect) {
        const { x: clientX, y: clientY } = clientPosition;
        const screenX = (clientX - canvasRect.x) / canvasRect.width * 2 - 1;
        const screenY = (clientY - canvasRect.y) / canvasRect.height * -2 + 1;
        this.camera = camera;
        this.clientPosition.set(clientX, clientY);
        this.screenPosition.set(screenX, screenY);
        this.raycaster.setFromCamera(this.screenPosition, camera);
    }
}
