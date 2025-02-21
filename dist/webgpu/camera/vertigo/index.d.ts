import { Camera, Euler, Vector2, Vector3 } from 'three/webgpu';
import { AngleDeclaration, EulerDeclaration, Vector2Declaration, Vector3Declaration } from '../../declaration';
declare const defaultProps: {
    /**
     * The base of the perspective (in degrees). If `perspective` is 1, this will
     * be the field of view (horizontal or vertical depends on the aspect ratios of
     * the current focus size and the screen).
     *
     * Defaults to 45 degrees.
     */
    fov: AngleDeclaration;
    /**
     * - 0: orthographic (if `allowOrthographic` is `true`, otherwise the fovEpislon is used)
     * - 1: perspective (0.8 radians (Vertical FOV) ≈ 45 degrees)
     */
    perspective: number;
    /**
     * The zoom of the camera.
     */
    zoom: number;
    /**
     * The position of the focus point (where the camera is looking at).
     */
    focus: Vector3Declaration;
    /**
     * The size of the focus area. Camera will fit this area into the screen (according to the `frame` property).
     */
    size: Vector2Declaration;
    /**
     * The distance before the focus point that will be visible.
     *
     * Determines the `near` property of the camera.
     */
    before: number;
    /**
     * The distance between the focus point and the far plane.
     *
     * Determines the `far` property of the camera.
     */
    after: number;
    /**
     * The rotation of the camera.
     */
    rotation: EulerDeclaration;
    /**
     * - 0: cover
     * - 1: contain
     * Intermediates are linearly interpolated.
     */
    frame: number | "cover" | "contain";
    /**
     * Whether to allow orthographic camera (when the perspective is close to 0).
     */
    allowOrthographic: boolean;
    /**
     * Whether to switch to orthographic (if allowed) when the perspective is close to 0.
     */
    fovEpsilon: AngleDeclaration;
    /**
     * The minimum value for the `near` property of the camera.
     */
    nearMin: number;
};
type Props = Partial<typeof defaultProps>;
export declare class Vertigo {
    static get default(): import("some-utils-ts/types").DeepReadonly<Vertigo>;
    perspective: number;
    fov: number;
    zoom: number;
    focus: Vector3;
    size: Vector2;
    before: number;
    after: number;
    rotation: Euler;
    frame: number;
    allowOrthographic: boolean;
    nearMin: number;
    fovEpsilon: number;
    /**
     * The scalar that can be applied to convert "screen" NDC coordinates to "camera"
     * NDC coordinates.
     */
    computedNdcScalar: Vector2;
    /**
     * The computed size of the focus area in the screen (once the `zoom` and the `frame` are applied).
     */
    computedSize: Vector2;
    constructor(props?: Props);
    set(props: Props): this;
    copy(other: Vertigo): this;
    clone(): Vertigo;
    lerpVertigos(a: Vertigo, b: Vertigo, t: number): this;
    lerp(other: Vertigo, t: number): this;
    apply(camera: Camera, aspect: number): this;
    /**
     * Return a declaration object that can be used to serialize the camera settings
     * in a concise way.
     */
    toDeclaration(): Props;
}
export type { Props as VertigoProps };
