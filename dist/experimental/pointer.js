import { Raycaster, Vector2 } from 'three/webgpu';
import { isMesh } from 'xxx';
/**
 * https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
 */
export var PointerButton;
(function (PointerButton) {
    PointerButton[PointerButton["Left"] = 0] = "Left";
    PointerButton[PointerButton["Middle"] = 1] = "Middle";
    PointerButton[PointerButton["Right"] = 2] = "Right";
})(PointerButton || (PointerButton = {}));
class PointerState {
    /**
     * The state of the pointer buttons (bitmask).
     */
    buttons = 0;
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
    copy(state) {
        this.buttons = state.buttons;
        this.clientPosition.copy(state.clientPosition);
        this.screenPosition.copy(state.screenPosition);
        return this;
    }
    /**
     * Set the difference between two pointer states.
     */
    diff(a, b) {
        this.buttons = a.buttons ^ b.buttons;
        this.clientPosition.subVectors(a.clientPosition, b.clientPosition);
        this.screenPosition.subVectors(a.screenPosition, b.screenPosition);
        return this;
    }
}
export class Pointer {
    get buttons() { return this.state.buttons; }
    state = new PointerState();
    stateOld = new PointerState();
    diffState = new PointerState();
    downTimes = new Map();
    upTimes = new Map();
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
     * Return true if the pointer button is currently pressed.
     */
    buttonDown(button = PointerButton.Left) {
        return (this.state.buttons & (1 << button)) !== 0;
    }
    /**
     * Return true if the pointer button was pressed in the previous frame.
     */
    buttonDownOld(button = PointerButton.Left) {
        return (this.stateOld.buttons & (1 << button)) !== 0;
    }
    /**
     * Return true if the pointer button was pressed in the current frame but not in the previous frame (enter).
     */
    buttonDownEnter(button = PointerButton.Left) {
        return this.buttonDown(button) && !this.buttonDownOld(button);
    }
    /**
     * Return true if the pointer button was pressed in the previous frame but not in the current frame (exit).
     */
    buttonDownExit(button = PointerButton.Left) {
        return !this.buttonDown(button) && this.buttonDownOld(button);
    }
    buttonTap(button = PointerButton.Left, maxDuration = .25) {
        if (this.buttonDownExit(button) === false) {
            return false;
        }
        const delta = this.upTimes.get(button) - this.downTimes.get(button);
        return delta < maxDuration;
    }
    /**
     * The position of the pointer in client space (pixels)
     * - min: (0, 0) top-left
     * - max: (width, height) bottom-right
     */
    get clientPosition() { return this.state.clientPosition; }
    /**
     * The position of the pointer in screen space (NDC)
     * - min: (-1, -1) bottom-left
     * - max: (1, 1) top-right
     */
    get screenPosition() { return this.state.screenPosition; }
    /**
     * The raycaster used to cast rays from the camera. Automatically updated.
     */
    raycaster = new Raycaster();
    /**
     * Returns the ray from the camera to the pointer.
     */
    get ray() { return this.raycaster.ray; }
    updatePosition(camera, clientPosition, canvasRect) {
        const { x: clientX, y: clientY } = clientPosition;
        const screenX = (clientX - canvasRect.x) / canvasRect.width * 2 - 1;
        const screenY = (clientY - canvasRect.y) / canvasRect.height * -2 + 1;
        this.camera = camera;
        this.clientPosition.set(clientX, clientY);
        this.screenPosition.set(screenX, screenY);
        this.raycaster.setFromCamera(this.screenPosition, camera);
    }
    /**
     * Traverse the scene and cast rays from the camera to the pointer, if the object
     * has geometry and matches the conditions (visibility, metadata, etc), any
     * associated "pointer" callback (userData) will be called.
     */
    raycastScene(scene) {
        const intersections = [];
        scene.traverse(child => {
            if (child.userData.ignorePointer === true) {
                return;
            }
            if ((child.visible === false || child.userData.helper === true) && child.userData.pointerArea !== true) {
                return;
            }
            if (isMesh(child)) {
                this.raycaster.intersectObject(child, false, intersections);
            }
        });
        intersections.sort((a, b) => a.distance - b.distance);
        const [first] = intersections;
        if (first) {
            const onPointerTap = first.object.userData.onPointerTap
                ?? (first.object.userData.pointerArea && first.object.parent?.userData.onPointerTap);
            if (onPointerTap && this.buttonTap()) {
                onPointerTap();
            }
        }
    }
    initialize(domElement, scope, camera, ticker) {
        const updatePointerPosition = (event) => {
            const rect = domElement.getBoundingClientRect();
            const { clientX: x, clientY: y } = event;
            this.updatePosition(camera, { x, y }, rect);
        };
        const onPointerMove = (event) => {
            updatePointerPosition(event);
        };
        const onPointerDown = (event) => {
            // NOTE: Update the pointer position on "down" too (because of touch events)
            updatePointerPosition(event);
            this.state.buttons |= (1 << event.button);
            this.downTimes.set(event.button, ticker.time);
        };
        const onPointerUp = (event) => {
            this.state.buttons &= ~(1 << event.button);
            this.upTimes.set(event.button, ticker.time);
        };
        scope.addEventListener('pointermove', onPointerMove);
        scope.addEventListener('pointerdown', onPointerDown);
        scope.addEventListener('pointerup', onPointerUp);
        const destroy = () => {
            scope.removeEventListener('pointermove', onPointerMove);
            scope.removeEventListener('pointerdown', onPointerDown);
            scope.removeEventListener('pointerup', onPointerUp);
        };
        return destroy;
    }
}
