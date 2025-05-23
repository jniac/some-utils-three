import { Euler, Matrix4, Quaternion, Vector2, Vector3 } from 'three';
import { deepFreeze } from 'some-utils-ts/object/deep';
import { fromAngleDeclaration, fromEulerDeclaration, fromVector2Declaration, fromVector3Declaration, toAngleDeclarationString } from '../declaration.js';
const _matrix = new Matrix4();
const _vector = new Vector3();
const _qa = new Quaternion();
const _qb = new Quaternion();
const defaultProps = {
    /**
     * The base of the perspective (in degrees). If `perspective` is 1, this will
     * be the field of view (horizontal or vertical depends on the aspect ratios of
     * the current focus size and the screen).
     *
     * Defaults to 45 degrees.
     */
    fov: '45deg',
    /**
     * - 0: orthographic (if `allowOrthographic` is `true`, otherwise the fovEpislon is used)
     * - 1: perspective (0.8 radians (Vertical FOV) ≈ 45 degrees)
     */
    perspective: 1,
    /**
     * The zoom of the camera.
     */
    zoom: 1,
    /**
     * The position of the focus point (where the camera is looking at).
     */
    focus: [0, 0, 0],
    /**
     * The size of the focus area. Camera will fit this area into the screen (according to the `frame` property).
     */
    size: [4, 4],
    /**
     * The distance before the focus point that will be visible.
     *
     * Determines the `near` property of the camera.
     */
    before: 1000,
    /**
     * The distance between the focus point and the far plane.
     *
     * Determines the `far` property of the camera.
     */
    after: 1000,
    /**
     * The rotation of the camera.
     */
    rotation: [0, 0, 0, 'YXZ'],
    /**
     * - 0: cover
     * - 1: contain
     * Intermediates are linearly interpolated.
     */
    frame: 'contain',
    /**
     * Whether to allow orthographic camera (when the perspective is close to 0).
     */
    allowOrthographic: true,
    /**
     * Whether to switch to orthographic (if allowed) when the perspective is close to 0.
     */
    fovEpsilon: '1.5deg',
    /**
     * The minimum value for the `near` property of the camera.
     */
    nearMin: .1,
};
export class Vertigo {
    static get default() {
        return defaultVertigo;
    }
    // General settings:
    perspective;
    fov; // radians
    zoom;
    focus = new Vector3();
    size = new Vector2();
    before;
    after;
    rotation = new Euler();
    frame;
    // Deep settings:
    allowOrthographic;
    nearMin;
    fovEpsilon; // radians
    // Internal:
    /**
     * The scalar that can be applied to convert "screen" NDC coordinates to "camera"
     * NDC coordinates.
     */
    computedNdcScalar = new Vector2();
    /**
     * The computed size of the focus area in the screen (once the `zoom` and the `frame` are applied).
     */
    computedSize = new Vector2();
    constructor(props) {
        this.set({ ...defaultProps, ...props });
    }
    set(props) {
        const { perspective, fov, zoom, focus, size, before, after, rotation, frame, allowOrthographic, fovEpsilon, nearMin, } = props;
        if (perspective !== undefined)
            this.perspective = perspective;
        if (fov !== undefined)
            this.fov = fromAngleDeclaration(fov);
        if (zoom !== undefined)
            this.zoom = zoom;
        if (focus !== undefined)
            fromVector3Declaration(focus, this.focus);
        if (size !== undefined)
            fromVector2Declaration(size, this.size);
        if (before !== undefined)
            this.before = before;
        if (after !== undefined)
            this.after = after;
        if (rotation !== undefined)
            fromEulerDeclaration(rotation, { defaultOrder: 'YXZ' }, this.rotation);
        if (frame !== undefined)
            this.frame = typeof frame === 'string' ? (frame === 'cover' ? 0 : 1) : frame;
        if (allowOrthographic !== undefined)
            this.allowOrthographic = allowOrthographic;
        if (fovEpsilon !== undefined)
            this.fovEpsilon = fromAngleDeclaration(fovEpsilon);
        if (nearMin !== undefined)
            this.nearMin = nearMin;
        return this;
    }
    copy(other) {
        this.perspective = other.perspective;
        this.fov = other.fov;
        this.zoom = other.zoom;
        this.focus.copy(other.focus);
        this.size.copy(other.size);
        this.before = other.before;
        this.after = other.after;
        this.rotation.copy(other.rotation);
        this.frame = other.frame;
        this.allowOrthographic = other.allowOrthographic;
        this.fovEpsilon = other.fovEpsilon;
        this.nearMin = other.nearMin;
        return this;
    }
    clone() {
        return new Vertigo().copy(this);
    }
    lerpVertigos(a, b, t) {
        this.perspective = a.perspective + (b.perspective - a.perspective) * t;
        this.fov = a.fov + (b.fov - a.fov) * t;
        // Zoom interpolation:
        // Using logarithmic interpolation to avoid the "zooming in" effect.
        const base = .001;
        const za = Math.log(a.zoom) / Math.log(base);
        const zb = Math.log(b.zoom) / Math.log(base);
        const z = za + (zb - za) * t;
        this.zoom = base ** z;
        // const p = 1e9
        // const za = a.zoom ** (1 / p)
        // const zb = b.zoom ** (1 / p)
        // const z = za + (zb - za) * t
        // this.zoom = z ** p
        // this.zoom = a.zoom + (b.zoom - a.zoom) * t
        this.focus.lerpVectors(a.focus, b.focus, t);
        this.size.lerpVectors(a.size, b.size, t);
        this.before = a.before + (b.before - a.before) * t;
        this.after = a.after + (b.after - a.after) * t;
        // Rotation interpolation:
        _qa.setFromEuler(a.rotation);
        _qb.setFromEuler(b.rotation);
        this.rotation.setFromQuaternion(_qa.slerp(_qb, t));
        this.frame = a.frame + (b.frame - a.frame) * t;
        this.allowOrthographic = t < .5 ? a.allowOrthographic : b.allowOrthographic;
        this.fovEpsilon = a.fovEpsilon + (b.fovEpsilon - a.fovEpsilon) * t;
        this.nearMin = a.nearMin + (b.nearMin - a.nearMin) * t;
        return this;
    }
    lerp(other, t) {
        return this.lerpVertigos(this, other, t);
    }
    apply(camera, aspect) {
        const sizeAspect = this.size.x / this.size.y;
        const aspectAspect = sizeAspect / aspect;
        // Critical part of the algorithm (how to fit the focus area into the screen):
        const lerpT = aspectAspect > 1 ? this.frame : 1 - this.frame;
        const heightScalar = 1 + lerpT * (aspectAspect - 1); // lerp(1, aspectAspect, lerpT)
        const desiredHeight = this.size.y / this.zoom; // The desired height of the focus area (without taking the aspect into account)
        const realHeight = desiredHeight * heightScalar; // The real height of the focus area (taking the aspect (and the frame choice) into account)
        const fovEpsilon = this.fovEpsilon;
        let fov = this.perspective * this.fov;
        if (!this.allowOrthographic && fov < fovEpsilon) {
            fov = fovEpsilon;
        }
        const distance = desiredHeight / 2 / Math.tan(fov / 2); // Important! Distance should be computed from the desired height, not the real height
        const isPerspective = fov >= fovEpsilon;
        const backward = isPerspective ? distance : this.before + this.nearMin;
        _matrix.makeRotationFromEuler(this.rotation);
        _vector
            .set(_matrix.elements[8], _matrix.elements[9], _matrix.elements[10])
            .multiplyScalar(backward)
            .add(this.focus);
        // camera.matrixAutoUpdate = false // Not cancelled because of OrbitControls
        camera.position.copy(_vector);
        camera.rotation.copy(this.rotation);
        camera.updateMatrix();
        camera.updateMatrixWorld(true);
        // Let's pretend we're a PerspectiveCamera or an OrthographicCamera
        // @ts-ignore
        camera.isPerspectiveCamera = isPerspective;
        // @ts-ignore
        camera.isOrthographicCamera = !isPerspective;
        if (isPerspective) {
            const near = Math.max(this.nearMin / this.zoom, distance - this.before);
            const far = distance + this.after;
            const mHeight = realHeight * near / distance / 2;
            const mWidth = mHeight * aspect;
            // @ts-ignore
            camera.fov = fov * 180 / Math.PI;
            camera.projectionMatrix.makePerspective(-mWidth, mWidth, mHeight, -mHeight, near, far);
        }
        // Orthographic
        else {
            // NOTE: "near" and "far" calculation are not correct. That kind of works, 
            // but it has to be fixed one day or another.
            // const near = this.nearMin / this.zoom
            // const far = near + this.before + this.after
            const near = -this.before;
            const far = this.after + this.before;
            const mHeight = realHeight / 2;
            const mWidth = mHeight * aspect;
            // @ts-ignore
            camera.fov = 0;
            camera.projectionMatrix.makeOrthographic(-mWidth, mWidth, mHeight, -mHeight, near, far);
        }
        // Don't forget to update the inverse matrix (for raycasting) (i forgot it).
        camera.projectionMatrixInverse
            .copy(camera.projectionMatrix)
            .invert();
        this.computedNdcScalar.set(heightScalar * aspect, heightScalar);
        this.computedSize.set(realHeight * aspect, realHeight);
        return this;
    }
    /**
     * Return a declaration object that can be used to serialize the camera settings
     * in a concise way.
     */
    toDeclaration() {
        const rotation = [
            toAngleDeclarationString(this.rotation.x, 'deg'),
            toAngleDeclarationString(this.rotation.y, 'deg'),
            toAngleDeclarationString(this.rotation.z, 'deg'),
            this.rotation.order,
        ];
        return {
            perspective: this.perspective,
            fov: toAngleDeclarationString(this.fov, 'deg'),
            zoom: this.zoom,
            focus: this.focus.toArray(),
            size: this.size.toArray(),
            before: this.before,
            after: this.after,
            rotation,
            frame: this.frame,
            allowOrthographic: this.allowOrthographic,
            fovEpsilon: toAngleDeclarationString(this.fovEpsilon, 'deg'),
            nearMin: this.nearMin,
        };
    }
}
const defaultVertigo = deepFreeze(new Vertigo());
//# sourceMappingURL=vertigo.js.map