import { Camera, Object3D, Raycaster, Vector2 } from 'three/webgpu';
import { Ticker } from 'some-utils-ts/ticker';
/**
 * https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
 */
export declare enum PointerButton {
    Left = 0,
    Middle = 1,
    Right = 2
}
declare class PointerState {
    /**
     * The state of the pointer buttons (bitmask).
     */
    buttons: number;
    /**
     * The position of the pointer in client space (pixels)
     * - min: (0, 0) top-left
     * - max: (width, height) bottom-right
     */
    clientPosition: Vector2;
    /**
     * The position of the pointer in screen space (NDC)
     * - min: (-1, -1) bottom-left
     * - max: (1, 1) top-right
     */
    screenPosition: Vector2;
    copy(state: PointerState): this;
    /**
     * Set the difference between two pointer states.
     */
    diff(a: PointerState, b: PointerState): this;
}
export declare class Pointer {
    get buttons(): number;
    state: PointerState;
    stateOld: PointerState;
    diffState: PointerState;
    downTimes: Map<PointerButton, number>;
    upTimes: Map<PointerButton, number>;
    event: {
        consumed: boolean;
        consume(): void;
        reset(): void;
    };
    camera: Camera | null;
    /**
     * Return true if the pointer button is currently pressed.
     */
    buttonDown(button?: PointerButton): boolean;
    /**
     * Return true if the pointer button was pressed in the previous frame.
     */
    buttonDownOld(button?: PointerButton): boolean;
    /**
     * Return true if the pointer button was pressed in the current frame but not in the previous frame (enter).
     */
    buttonDownEnter(button?: PointerButton): boolean;
    /**
     * Return true if the pointer button was pressed in the previous frame but not in the current frame (exit).
     */
    buttonDownExit(button?: PointerButton): boolean;
    buttonTap(button?: PointerButton, maxDuration?: number): boolean;
    /**
     * The position of the pointer in client space (pixels)
     * - min: (0, 0) top-left
     * - max: (width, height) bottom-right
     */
    get clientPosition(): Vector2;
    /**
     * The position of the pointer in screen space (NDC)
     * - min: (-1, -1) bottom-left
     * - max: (1, 1) top-right
     */
    get screenPosition(): Vector2;
    /**
     * The raycaster used to cast rays from the camera. Automatically updated.
     */
    raycaster: Raycaster;
    /**
     * Returns the ray from the camera to the pointer.
     */
    get ray(): import("three").Ray;
    updatePosition(camera: Camera, clientPosition: {
        x: number;
        y: number;
    }, canvasRect: {
        x: number;
        y: number;
        width: number;
        height: number;
    }): void;
    /**
     * Traverse the scene and cast rays from the camera to the pointer, if the object
     * has geometry and matches the conditions (visibility, metadata, etc), any
     * associated "pointer" callback (userData) will be called.
     */
    raycastScene(scene: Object3D): void;
    update(scene: Object3D): void;
    updateEnd(): void;
    initialize(domElement: HTMLElement, scope: HTMLElement, camera: Camera, ticker: Ticker): () => void;
}
export {};
