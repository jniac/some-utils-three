import { Camera, Raycaster, Vector2 } from 'three';
export declare enum PointerButton {
    None = 0,
    LeftDown = 1,
    LeftDrag = 2
}
export declare class Pointer {
    status: {
        button: PointerButton;
    };
    event: {
        consumed: boolean;
        consume(): void;
        reset(): void;
    };
    camera: Camera | null;
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
    /**
     * The raycaster used to cast rays from the camera. Automatically updated.
     */
    raycaster: Raycaster;
    /**
     * Returns the ray from the camera to the pointer.
     */
    get ray(): import("three").Ray;
    update(camera: Camera, clientPosition: {
        x: number;
        y: number;
    }, canvasRect: {
        x: number;
        y: number;
        width: number;
        height: number;
    }): void;
}
