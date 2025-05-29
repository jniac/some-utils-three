import { Camera, Vector2Like } from 'three';
import { DestroyableInstance } from 'some-utils-ts/misc/destroy';
import { Vector3Declaration } from '../../declaration';
import { Vertigo, VertigoProps } from '../vertigo';
declare const controlInputs: readonly ["shift", "alt", "control", "meta"];
type ControlInput = typeof controlInputs[number];
type ControlInputString = '' | `${ControlInput}` | `${ControlInput}+${ControlInput}` | `${ControlInput}+${ControlInput}+${ControlInput}` | `${ControlInput}+${ControlInput}+${ControlInput}+${ControlInput}`;
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
export declare class VertigoControls extends DestroyableInstance {
    /**
     * The decay factor for the vertigo controls (expresses the missing part after 1 second).
     *
     * Example:
     * - 0.123 means that 12.3% of the difference will be missing after 1 second.
     *
     * Defaults to `.01` (1% missing after 1 second).
     */
    dampingDecayFactor: number;
    /**
     * The "absolute" vertigo controls (used as a target for the damped vertigo controls).
     */
    vertigo: Vertigo;
    /**
     * The damped vertigo controls (used for smooth camera movement).
     */
    dampedVertigo: Vertigo;
    /**
     * The element to attach the pointer events to. Must be set through `initialize()`.
     */
    element: HTMLElement;
    inputConfig: {
        wheel: "zoom" | "dolly";
    };
    actions: {
        togglePerspective: () => void;
        focus: (focusPosition: Vector3Declaration) => void;
        rotate: (pitch: number, yaw: number, roll: number) => void;
        positiveXAlign: () => void;
        negativeXAlign: () => void;
        positiveYAlign: () => void;
        negativeYAlign: () => void;
        positiveZAlign: () => void;
        negativeZAlign: () => void;
    };
    panInputs: ControlInput[];
    parsePanInputs(inputs: string): void;
    orbitInputs: ControlInput[];
    parseOrbitInputs(inputs: string): void;
    constructor(props?: VertigoProps);
    pan(x: number, y: number): void;
    dolly(delta: number): void;
    orbit(pitch: number, yaw: number): void;
    /**
     * @deprecated Use `orbit()` instead.
     */
    rotate(...args: Parameters<VertigoControls['orbit']>): void;
    zoomAt(newZoom: number, vertigoRelativePointer: Vector2Like): void;
    initialize(element?: HTMLElement | string): this;
    /**
     * @param element The element to attach the pointer events to is the one provided by `initialize()` by default. But you can provide a different one here.
     */
    private doStart;
    started: boolean;
    start(...args: Parameters<typeof this.doStart>): this;
    stop(): void;
    toggle(start?: boolean): void;
    update(camera: Camera, aspect: number, deltaTime?: number): void;
}
export type { ControlInput as VertigoControlInput, ControlInputString as VertigoControlInputString };
//# sourceMappingURL=controls.d.ts.map