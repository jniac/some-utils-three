import { Camera, Euler, Matrix4, Quaternion, Vector2, Vector3 } from 'three'

import {
  AngleDeclaration,
  EulerDeclaration,
  fromAngleDeclaration,
  fromEulerDeclaration,
  fromVector2Declaration,
  fromVector3Declaration,
  toAngleDeclarationString,
  Vector2Declaration,
  Vector3Declaration
} from '../declaration'

const _matrix = new Matrix4()
const _vector = new Vector3()
const _qa = new Quaternion()
const _qb = new Quaternion()

const defaultProps = {
  /**
   * The base of the perspective (in degrees). If `perspective` is 1, this will 
   * be the field of view (horizontal or vertical depends on the aspect ratios of
   * the current focus size and the screen).
   * 
   * Defaults to 45 degrees.
   */
  fov: <AngleDeclaration>'45deg',
  /**
   * - 0: orthographic (if `allowOrthographic` is `true`, otherwise the fovEpislon is used)
   * - 1: perspective (0.8 radians (Vertical FOV) ≈ 45 degrees)
   */
  perspective: <number>1,
  /**
   * The zoom of the camera.
   */
  zoom: <number>1,
  /**
   * The position of the focus point (where the camera is looking at).
   */
  focus: <Vector3Declaration>[0, 0, 0],
  /**
   * The size of the focus area. Camera will fit this area into the screen (according to the `frame` property).
   */
  size: <Vector2Declaration>[4, 4],
  /**
   * The distance before the focus point that will be visible.
   * 
   * Determines the `near` property of the camera.
   */
  before: <number>100,
  /**
   * The distance between the focus point and the far plane.
   * 
   * Determines the `far` property of the camera.
   */
  after: <number>1000,
  /**
   * The rotation of the camera.
   */
  rotation: <EulerDeclaration>[0, 0, 0, 'YXZ'],
  /**
   * - 0: cover
   * - 1: contain
   * Intermediates are linearly interpolated.
   */
  frame: <number | 'cover' | 'contain'>'contain',
  /**
   * Whether to allow orthographic camera (when the perspective is close to 0).
   */
  allowOrthographic: <boolean>true,
  /**
   * Whether to switch to orthographic (if allowed) when the perspective is close to 0.
   */
  fovEpsilon: <AngleDeclaration>'1.5deg',
  /**
   * The minimum value for the `near` property of the camera.
   */
  nearMin: <number>.1,
}

type Props = Partial<typeof defaultProps>

export class Vertigo {
  // General settings:
  perspective!: number
  fov!: number // radians
  zoom!: number
  focus = new Vector3()
  size = new Vector2()
  before!: number
  after!: number
  rotation = new Euler()
  frame!: number

  // Deep settings:
  allowOrthographic!: boolean
  nearMin!: number
  fovEpsilon!: number // radians

  // Internal:
  /**
   * The scalar that can be applied to convert "screen" NDC coordinates to "camera" 
   * NDC coordinates.
   */
  computedNdcScalar = new Vector2()
  /**
   * The computed size of the focus area in the screen (once the `zoom` and the `frame` are applied).
   */
  computedSize = new Vector2()

  constructor(props?: Props) {
    this.set({ ...defaultProps, ...props })
  }

  set(props: Props): this {
    const {
      perspective,
      fov: perspectiveBase,
      zoom,
      focus,
      size,
      before,
      after,
      rotation,
      frame,
      allowOrthographic,
      fovEpsilon,
      nearMin,
    } = props

    if (perspective !== undefined)
      this.perspective = perspective

    if (perspectiveBase !== undefined)
      this.fov = fromAngleDeclaration(perspectiveBase)

    if (zoom !== undefined)
      this.zoom = zoom

    if (focus !== undefined)
      fromVector3Declaration(focus, this.focus)

    if (size !== undefined)
      fromVector2Declaration(size, this.size)

    if (before !== undefined)
      this.before = before

    if (after !== undefined)
      this.after = after

    if (rotation !== undefined)
      fromEulerDeclaration(rotation, this.rotation)

    if (frame !== undefined)
      this.frame = typeof frame === 'string' ? (frame === 'cover' ? 0 : 1) : frame

    if (allowOrthographic !== undefined)
      this.allowOrthographic = allowOrthographic

    if (fovEpsilon !== undefined)
      this.fovEpsilon = fromAngleDeclaration(fovEpsilon)

    if (nearMin !== undefined)
      this.nearMin = nearMin

    return this
  }

  copy(other: Vertigo): this {
    this.perspective = other.perspective
    this.fov = other.fov
    this.zoom = other.zoom
    this.focus.copy(other.focus)
    this.size.copy(other.size)
    this.before = other.before
    this.after = other.after
    this.rotation.copy(other.rotation)
    this.frame = other.frame
    this.allowOrthographic = other.allowOrthographic
    this.fovEpsilon = other.fovEpsilon
    this.nearMin = other.nearMin
    return this
  }

  clone(): Vertigo {
    return new Vertigo().copy(this)
  }

  lerpVertigos(a: Vertigo, b: Vertigo, t: number): this {
    this.perspective = a.perspective + (b.perspective - a.perspective) * t
    this.fov = a.fov + (b.fov - a.fov) * t

    // Zoom interpolation:
    // Using logarithmic interpolation to avoid the "zooming in" effect.
    const base = .001
    const za = Math.log(a.zoom) / Math.log(base)
    const zb = Math.log(b.zoom) / Math.log(base)
    const z = za + (zb - za) * t
    this.zoom = base ** z

    // const p = 1e9
    // const za = a.zoom ** (1 / p)
    // const zb = b.zoom ** (1 / p)
    // const z = za + (zb - za) * t
    // this.zoom = z ** p

    // this.zoom = a.zoom + (b.zoom - a.zoom) * t

    this.focus.lerpVectors(a.focus, b.focus, t)
    this.size.lerpVectors(a.size, b.size, t)
    this.before = a.before + (b.before - a.before) * t
    this.after = a.after + (b.after - a.after) * t

    // Rotation interpolation:
    _qa.setFromEuler(a.rotation)
    _qb.setFromEuler(b.rotation)
    this.rotation.setFromQuaternion(_qa.slerp(_qb, t))

    this.frame = a.frame + (b.frame - a.frame) * t
    this.allowOrthographic = t < .5 ? a.allowOrthographic : b.allowOrthographic
    this.fovEpsilon = a.fovEpsilon + (b.fovEpsilon - a.fovEpsilon) * t
    this.nearMin = a.nearMin + (b.nearMin - a.nearMin) * t

    return this
  }

  lerp(other: Vertigo, t: number): this {
    return this.lerpVertigos(this, other, t)
  }

  apply(camera: Camera, aspect: number): this {
    const sizeAspect = this.size.x / this.size.y
    const aspectAspect = sizeAspect / aspect

    // Critical part of the algorithm (how to fit the focus area into the screen):
    const lerpT = aspectAspect > 1 ? this.frame : 1 - this.frame
    const heightScalar = 1 + lerpT * (aspectAspect - 1) // lerp(1, aspectAspect, lerpT)
    const height = this.size.y * heightScalar / this.zoom

    const fovEpsilon = this.fovEpsilon
    let fov = this.perspective * this.fov
    if (!this.allowOrthographic && fov < fovEpsilon) {
      fov = fovEpsilon
    }

    const distance = height / 2 / Math.tan(fov / 2)
    const isPerspective = fov >= fovEpsilon

    const backward = isPerspective ? distance : this.before + this.nearMin
    _matrix.makeRotationFromEuler(this.rotation)
    _vector
      .set(_matrix.elements[8], _matrix.elements[9], _matrix.elements[10])
      .multiplyScalar(backward)
      .add(this.focus)

    // camera.matrixAutoUpdate = false // Not cancelled because of OrbitControls
    camera.position.copy(_vector)
    camera.rotation.copy(this.rotation)
    camera.updateMatrix()
    camera.updateMatrixWorld(true)

    // Let's pretend we're a PerspectiveCamera or an OrthographicCamera
    // @ts-ignore
    camera.isPerspectiveCamera = isPerspective
    // @ts-ignore
    camera.isOrthographicCamera = !isPerspective

    if (isPerspective) {
      const near = Math.max(this.nearMin / this.zoom, distance - this.before)
      const far = distance + this.after

      const mHeight = height * near / distance / 2
      const mWidth = mHeight * aspect

      // @ts-ignore
      camera.fov = fov * 180 / Math.PI
      camera.projectionMatrix.makePerspective(-mWidth, mWidth, mHeight, -mHeight, near, far)
    }

    // Orthographic
    else {
      const near = this.nearMin / this.zoom
      const far = near + this.before + this.after

      const mHeight = height / 2
      const mWidth = mHeight * aspect

      // @ts-ignore
      camera.fov = 0
      camera.projectionMatrix.makeOrthographic(-mWidth, mWidth, mHeight, -mHeight, near, far)
    }

    // Don't forget to update the inverse matrix (for raycasting) (i forgot it).
    camera.projectionMatrixInverse
      .copy(camera.projectionMatrix)
      .invert()

    this.computedNdcScalar.set(heightScalar * aspect, heightScalar)
    this.computedSize.set(height * aspect, height)

    return this
  }

  /**
   * Return a declaration object that can be used to serialize the camera settings
   * in a concise way.
   */
  toDeclaration(): Props {
    const rotation = <EulerDeclaration>[
      toAngleDeclarationString(this.rotation.x, 'deg'),
      toAngleDeclarationString(this.rotation.y, 'deg'),
      toAngleDeclarationString(this.rotation.z, 'deg'),
      this.rotation.order,
    ]
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
    }
  }
}

export type { Props as VertigoProps }

