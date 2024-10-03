import { Camera, Euler, Matrix4, Vector2, Vector3 } from 'three'

import { EulerDeclaration, fromEulerDeclaration, fromVector2Declaration, fromVector3Declaration, Vector2Declaration, Vector3Declaration } from '../declaration'

const _matrix = new Matrix4()
const _vector = new Vector3()

type Props = Partial<{
  /**
   * - 0: orthographic (if `allowOrthographic` is `true`, otherwise the fovEpislon is used)
   * - 1: perspective (0.8 radians (Vertical FOV) ≈ 45 degrees)
   */
  perspective: number
  /**
   * The zoom of the camera.
   */
  zoom: number
  /**
   * The position of the focus point (where the camera is looking at).
   */
  focus: Vector3Declaration
  /**
   * The size of the focus area. Camera will fit this area into the screen (according to the `frame` property).
   */
  size: Vector2Declaration
  /**
   * The distance before the focus point that will be visible.
   * 
   * Determines the `near` property of the camera.
   */
  before: number
  /**
   * The distance between the focus point and the far plane.
   * 
   * Determines the `far` property of the camera.
   */
  after: number
  /**
   * The rotation of the camera.
   */
  rotation: EulerDeclaration
  /**
   * - 0: cover
   * - 1: contain
   * Intermediates are linearly interpolated.
   */
  frame: number | 'cover' | 'contain'
}>

export class Vertigo {
  static PERSPECTIVE_ONE = 45 // degree

  // General settings:
  perspective = 1
  zoom = 1
  focus = new Vector3()
  size = new Vector2(4, 4)
  before = 100
  after = 1000
  rotation = new Euler(0, 0, 0, 'ZYX')
  frame = 1

  // Deep settings:
  allowOrthographic = true
  nearMin = 0.1
  fovEpsilon = 1.5 // degree

  constructor(props?: Props) {
    this.set(props ?? {})
  }

  set(props: Props): this {
    const {
      perspective,
      zoom,
      focus,
      size,
      before,
      after,
      rotation,
      frame,
    } = props

    if (perspective !== undefined)
      this.perspective = perspective

    if (zoom !== undefined)
      this.zoom = zoom

    if (frame !== undefined)
      this.frame = typeof frame === 'string' ? (frame === 'cover' ? 0 : 1) : frame

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

    return this
  }

  apply(camera: Camera, aspect: number): this {
    const sizeAspect = this.size.x / this.size.y
    const aspectAspect = sizeAspect / aspect

    // Critical part of the algorithm (how to fit the focus area into the screen):
    const lerpT = aspectAspect > 1 ? this.frame : 1 - this.frame
    const heightScalar = 1 + lerpT * (aspectAspect - 1) // lerp(1, aspectAspect, lerpT)
    const height = this.size.y * heightScalar / this.zoom

    const fovEpsilon = this.fovEpsilon * Math.PI / 180
    let fov = this.perspective * Vertigo.PERSPECTIVE_ONE * Math.PI / 180
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
      const near = Math.max(this.nearMin, distance - this.before)
      const far = distance + this.after

      const mHeight = height * near / distance / 2
      const mWidth = mHeight * aspect

      // @ts-ignore
      camera.fov = fov * 180 / Math.PI
      camera.projectionMatrix.makePerspective(-mWidth, mWidth, mHeight, -mHeight, near, far)
    }

    // Orthographic
    else {
      const near = this.nearMin
      const far = this.nearMin + this.before + this.after

      const mHeight = height / 2
      const mWidth = mHeight * aspect

      // @ts-ignore
      camera.fov = 0
      camera.projectionMatrix.makeOrthographic(-mWidth, mWidth, mHeight, -mHeight, near, far)
    }

    return this
  }
}

export type { Props as VertigoProps }

