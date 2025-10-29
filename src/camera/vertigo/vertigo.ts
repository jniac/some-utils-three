import { Camera, Euler, EulerOrder, Matrix4, OrthographicCamera, PerspectiveCamera, Plane, Quaternion, Vector2, Vector3 } from 'three'

import { deepFreeze } from 'some-utils-ts/object/deep'
import { Vector2Like } from 'some-utils-ts/types'

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
} from '../../declaration'

const defaultRotationOrder = <EulerOrder>'YXZ' // Default rotation order for Vertigo

const defaultProps = {
  /**
   * The base of the perspective (in degrees). If `perspective` is 1, this will 
   * be the field of view (horizontal or vertical depends on the aspect ratios of
   * the current focus size and the screen).
   * 
   * Note: The value is a "angle declaration" (e.g. '45deg', '1.5rad', etc.). Raw number is in radians.
   * 
   * @default '45deg' (45 degrees)
   */
  fov: <AngleDeclaration>'45deg',
  /**
   * The "perspectiveness" of the camera.
   * - 0: orthographic (if `allowOrthographic` is `true`, otherwise the fovEpislon is used)
   * - 1: perspective (0.8 radians (Vertical FOV) ≈ 45 degrees)
   * 
   * @default 1
   */
  perspective: <number>1,
  /**
   * The zoom of the camera.
   * 
   * @default 1
   */
  zoom: <number>1,
  /**
   * The position of the focus point (where the camera is looking at).
   * 
   * @default [0, 0, 0]
   */
  focus: <Vector3Declaration>[0, 0, 0],
  /**
   * The offset of the focus point from the camera position. When the subject is
   * not at the center...
   * 
   * @default [0, 0, 0]
   */
  screenOffset: <Vector3Declaration>[0, 0, 0],
  /**
   * The size of the focus area. Camera will fit this area into the screen (according to the `frame` property).
   * 
   * @default [4, 4]
   */
  size: <Vector2Declaration>[4, 4],
  /**
   * The distance before the focus point that will be visible.
   * 
   * Determines the `near` property of the camera.
   * 
   * @default 1000
   */
  before: <number>1000,
  /**
   * The distance between the focus point and the far plane.
   * 
   * Determines the `far` property of the camera.
   * 
   * @default 1000
   */
  after: <number>1000,
  /**
   * The rotation of the camera.
   * 
   * @default [0, 0, 0, 'YXZ'] (Euler declaration)
   */
  rotation: <EulerDeclaration>[0, 0, 0, defaultRotationOrder],
  /**
   * Controls how the size of camera is seen in the screen:
   * 
   * - 0: cover
   * - 1: contain
   * 
   * Intermediates are supported (linear interpolation).
   * 
   * @default 'contain' (1)
   */
  frame: <number | 'cover' | 'contain'>'contain',
  /**
   * Whether to allow orthographic camera (when the perspective is close to 0).
   * 
   * @default true
   */
  allowOrthographic: <boolean>true,
  /**
   * Whether to switch to orthographic (if allowed) when the perspective is close to 0.
   * 
   * @default '1.5deg' (1.5 degrees)
   */
  fovEpsilon: <AngleDeclaration>'1.5deg',
  /**
   * The minimum value for the `near` property of the camera.
   * 
   * This is used to prevent the camera from being too close to the focus point.
   * 
   * @default .1
   */
  nearMin: <number>.1,
}

type Props = Partial<typeof defaultProps>

export class Vertigo {
  static get defaultRotationOrder() { return defaultRotationOrder }
  static get default() { return defaultVertigo }
  static shared = {
    _matrix: new Matrix4(),
    _v0: new Vector3(),
    _v1: new Vector3(),
    _qa: new Quaternion(),
    _qb: new Quaternion(),
    _plane: new Plane(),
  }

  // General settings:
  /**
   * The base of the perspective (in degrees). If `perspective` is 1, this will 
   * be the field of view (horizontal or vertical depends on the aspect ratios of
   * the current focus size and the screen).
   * 
   * Note:
   * - Value is in radians here, but can be set as an "angle declaration" (e.g. '45deg', '1.5rad', etc.). cf vertigo props.
   */
  fov!: number // radians
  /**
   * The "perspectiveness" of the camera.
   * - 0: orthographic (if `allowOrthographic` is `true`, otherwise the fovEpislon is used)
   * - 1: perspective (0.8 radians (Vertical FOV) ≈ 45 degrees)
   */
  perspective!: number
  /**
   * The zoom of the camera.
   */
  zoom!: number
  /**
   * The position of the focus point (where the camera is looking at).
   */
  focus = new Vector3()
  /**
   * The offset of the focus point from the camera position. When the subject is
   * not at the center...
   */
  screenOffset = new Vector3()
  /**
   * The size of the focus area. Camera will fit this area into the screen (according to the `frame` property).
   */
  size = new Vector2()
  /**
   * The distance before the focus point that will be visible.
   * 
   * Determines the `near` property of the camera.
   */
  before!: number
  /**
   * The distance between the focus point and the far plane.
   * 
   * Determines the `far` property of the camera.
   */
  after!: number
  /**
   * The rotation of the camera.
   */
  rotation = new Euler()
  /**
   * Controls how the size of camera is seen in the screen:
   * 
   * - 0: cover
   * - 1: contain
   * 
   * Intermediates are supported (linear interpolation).
   */
  frame!: number

  // Deep settings:
  allowOrthographic!: boolean
  nearMin!: number
  fovEpsilon!: number // radians

  /**
   * The state contains the computed values based on the current settings and the 
   * aspect ratio.
   * 
   * It is updated when the `update()` method is called.
   */
  state = {
    aspect: 0,
    isPerspective: true,
    /**
     * The distance from the camera to the focus point.
     */
    distance: 0,
    fov: 0,
    near: 0,
    far: 0,
    /**
     * The size of the focus area (in world units, takes into account the camera's zoom level).
     */
    realSize: new Vector2(),
    /**
     * The camera matrix that represents the position and rotation of the camera in the world.
     */
    worldMatrix: new Matrix4(),
    /**
     * The inverse of the camera matrix.
     */
    worldMatrixInverse: new Matrix4(),
    /**
     * The projection matrix of the camera.
     */
    projectionMatrix: new Matrix4(),
    /**
     * The inverse projection matrix of the camera.
     */
    projectionMatrixInverse: new Matrix4(),
  }

  constructor(props?: Props) {
    this.set({ ...defaultProps, ...props })
  }

  set(props: Props): this {
    const {
      perspective,
      fov,
      zoom,
      focus,
      screenOffset,
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

    if (fov !== undefined)
      this.fov = fromAngleDeclaration(fov)

    if (zoom !== undefined)
      this.zoom = zoom

    if (focus !== undefined)
      fromVector3Declaration(focus, this.focus)

    if (screenOffset !== undefined)
      fromVector3Declaration(screenOffset, this.screenOffset)

    if (size !== undefined)
      fromVector2Declaration(size, this.size)

    if (before !== undefined)
      this.before = before

    if (after !== undefined)
      this.after = after

    if (rotation !== undefined)
      fromEulerDeclaration(rotation, { defaultOrder: 'YXZ' }, this.rotation)

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
    this.screenOffset.copy(other.screenOffset)
    this.size.copy(other.size)
    this.before = other.before
    this.after = other.after
    this.rotation.copy(other.rotation)
    this.frame = other.frame
    this.allowOrthographic = other.allowOrthographic
    this.fovEpsilon = other.fovEpsilon
    this.nearMin = other.nearMin
    this.update()
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
    this.screenOffset.lerpVectors(a.screenOffset, b.screenOffset, t)
    this.size.lerpVectors(a.size, b.size, t)
    this.before = a.before + (b.before - a.before) * t
    this.after = a.after + (b.after - a.after) * t

    // Rotation interpolation:
    const { _qa, _qb } = Vertigo.shared
    _qa.setFromEuler(a.rotation)
    _qb.setFromEuler(b.rotation)
    this.rotation.setFromQuaternion(_qa.slerp(_qb, t))

    this.frame = a.frame + (b.frame - a.frame) * t
    this.allowOrthographic = t < .5 ? a.allowOrthographic : b.allowOrthographic
    this.fovEpsilon = a.fovEpsilon + (b.fovEpsilon - a.fovEpsilon) * t
    this.nearMin = a.nearMin + (b.nearMin - a.nearMin) * t

    this.update()

    return this
  }

  lerp(other: Vertigo, t: number): this {
    return this.lerpVertigos(this, other, t)
  }

  ndcToScreen<T extends Vector2Like>(ndc: Vector2Like, out: T = ndc as T): T {
    out.x = ndc.x * this.state.realSize.x * .5
    out.y = ndc.y * this.state.realSize.y * .5
    return out
  }

  /**
   * Computes the focus plane of the vertigo camera.
   * 
   * Notes:
   * - The plane is computed from the focus point and the camera rotation.
   * - ⚠️ The returned plane is a shared instance. If you need to keep it, clone it.
   */
  computeFocusPlane(out = Vertigo.shared._plane): Plane {
    const { focus, rotation } = this
    out.normal.set(0, 0, 1).applyEuler(rotation)
    out.setFromNormalAndCoplanarPoint(out.normal, focus)
    return out
  }

  update(newAspect = this.state.aspect): this {
    const sizeAspect = this.size.x / this.size.y
    const aspectAspect = sizeAspect / newAspect

    // Critical part of the algorithm (how to fit the focus area into the screen):
    const lerpT = aspectAspect > 1 ? this.frame : 1 - this.frame
    const heightScalar = 1 + lerpT * (aspectAspect - 1) // lerp(1, aspectAspect, lerpT)
    const desiredHeight = this.size.y / this.zoom // The desired height of the focus area (without taking the aspect into account)
    const realHeight = desiredHeight * heightScalar // The real height of the focus area (taking the aspect (and the frame choice) into account)

    const fovEpsilon = this.fovEpsilon
    let fov = this.perspective * this.fov
    if (!this.allowOrthographic && fov < fovEpsilon) {
      fov = fovEpsilon
    }

    const distance = desiredHeight / 2 / Math.tan(fov / 2) // Important! Distance should be computed from the desired height, not the real height
    const isPerspective = fov >= fovEpsilon

    // this.computedNdcScalar.set(heightScalar * aspect, heightScalar)
    // this.computedSize.set(realHeight * aspect, realHeight)

    const {
      worldMatrix,
      worldMatrixInverse,
      projectionMatrix,
      projectionMatrixInverse,
    } = this.state
    worldMatrix.makeRotationFromEuler(this.rotation)

    const me = worldMatrix.elements
    const backward = isPerspective ? distance : this.before + this.nearMin

    const { _v0, _v1 } = Vertigo.shared
    _v0
      .set(me[8], me[9], me[10]) // The forward vector
      .multiplyScalar(backward)
      .add(this.focus)

    // Apply the screen offset:
    _v0.addScaledVector(_v1.set(me[0], me[1], me[2]), -this.screenOffset.x / this.zoom)
    _v0.addScaledVector(_v1.set(me[4], me[5], me[6]), -this.screenOffset.y / this.zoom)
    _v0.addScaledVector(_v1.set(me[8], me[9], me[10]), -this.screenOffset.z / this.zoom)

    // Apply the position:
    me[12] = _v0.x
    me[13] = _v0.y
    me[14] = _v0.z

    // Make the world matrix inverse:
    worldMatrixInverse.copy(worldMatrix).invert()

    // Make the projection matrix:
    let near: number, far: number

    // Perspective
    if (isPerspective) {
      near = Math.max(this.nearMin / this.zoom, distance - this.before)
      far = distance + this.after

      const mHeight = realHeight * near / distance / 2
      const mWidth = mHeight * newAspect

      projectionMatrix.makePerspective(-mWidth, mWidth, mHeight, -mHeight, near, far)
    }

    // Orthographic
    else {
      // NOTE: "near" and "far" calculation are not correct. That kind of works, 
      // but it has to be fixed one day or another.
      // const near = this.nearMin / this.zoom
      // const far = near + this.before + this.after
      near = -this.before
      far = this.after + this.before

      const mHeight = realHeight / 2
      const mWidth = mHeight * newAspect

      projectionMatrix.makeOrthographic(-mWidth, mWidth, mHeight, -mHeight, near, far)
    }

    // Make the projection matrix inverse:
    projectionMatrixInverse.copy(projectionMatrix).invert()

    // State update:
    this.state.aspect = newAspect
    this.state.isPerspective = isPerspective
    this.state.distance = distance
    this.state.fov = fov
    this.state.realSize.set(realHeight * newAspect, realHeight)
    this.state.near = near
    this.state.far = far

    return this
  }

  /**
   * Apply the Vertigo settings to the camera.
   * 
   * Internally calls `update()` to compute the state based on the current settings and the aspect ratio.
   */
  apply(camera: Camera, aspect: number): this {
    this.update(aspect)

    const {
      isPerspective,
      fov,
      near,
      far,
      worldMatrix,
      projectionMatrix,
      projectionMatrixInverse,
    } = this.state

    camera.matrixAutoUpdate = false
    camera.matrix.copy(worldMatrix)
    camera.updateMatrixWorld(true)
    camera.matrixAutoUpdate = true // Re-enable auto-update because OrbitControls might need it (?).

    // Update camera properties (for coherence)
    camera.position.setFromMatrixPosition(worldMatrix)
    camera.quaternion.setFromRotationMatrix(worldMatrix)
    camera.rotation.setFromQuaternion(camera.quaternion, defaultRotationOrder)
    camera.scale.set(1, 1, 1)

    // Let's pretend we're a PerspectiveCamera or an OrthographicCamera
    // @ts-expect-error Javascript here! We add the properties to the camera.
    camera.isPerspectiveCamera = isPerspective
    // @ts-expect-error Javascript here! We add the properties to the camera.
    camera.isOrthographicCamera = !isPerspective

    if (isPerspective) {
      const pcam = camera as PerspectiveCamera
      pcam.fov = fov * 180 / Math.PI
      pcam.near = near
      pcam.far = far
      pcam.aspect = aspect
      pcam.projectionMatrix.copy(projectionMatrix)
    }

    // Orthographic
    else {
      const ocam = camera as OrthographicCamera
      // @ts-expect-error Javascript here! We create the "fov" property even if it doesn't exist on OrthographicCamera.
      ocam.fov = 0
      ocam.near = near
      ocam.far = far
      // @ts-expect-error Javascript here! We create the "aspect" property even if it doesn't exist on OrthographicCamera.
      ocam.aspect = aspect
      ocam.projectionMatrix.copy(projectionMatrix)
    }

    // Don't forget to update the inverse matrix (for raycasting) (i forgot it).
    camera.projectionMatrixInverse
      .copy(projectionMatrixInverse)

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

  /** @deprecated Deprecated. What's the usage? */
  get computedNdcScalar() {
    console.warn('Vertigo.computedNdcScalar is deprecated. Deprecated. What\'s the usage?')
    return new Vector2(this.state.realSize.x / this.size.x * this.zoom, this.state.realSize.y / this.size.y * this.zoom)
  }

  /** @deprecated Use `state.realSize` instead. */
  get computedSize() {
    console.warn('Vertigo.computedSize is deprecated, use state.realSize instead.')
    return this.state.realSize
  }
}

const defaultVertigo = deepFreeze(new Vertigo())

export type { Props as VertigoProps }

