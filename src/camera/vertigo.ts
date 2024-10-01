import { Euler, Matrix4, PerspectiveCamera, Vector2, Vector3 } from 'three'

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
   * The position of the focus point (where the camera is looking at).
   */
  focusPosition: Vector3Declaration
  /**
   * The size of the focus area. Camera will fit this area into the screen (according to the `frame` property).
   */
  focusSize: Vector2Declaration
  /**
   * The distance before the focus point that will be visible.
   * 
   * Determines the `near` property of the camera.
   */
  focusBefore: number
  /**
   * The distance between the focus point and the far plane.
   * 
   * Determines the `far` property of the camera.
   */
  focusAfter: number
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
  focusPosition = new Vector3()
  focusSize = new Vector2(4, 4)
  focusBefore = 100
  focusAfter = 1000
  rotation = new Euler()
  frame = 0

  // Deep settings:
  allowOrthographic = true
  orthographicNear = 0.1
  fovEpsilon = 1.5 // degree

  constructor(props?: Props) {
    this.set(props ?? {})
  }

  set(props: Props): this {
    const {
      focusPosition,
      focusSize,
      focusBefore,
      focusAfter,
      perspective,
      rotation,
      frame,
    } = props

    if (perspective !== undefined)
      this.perspective = perspective

    if (frame !== undefined)
      this.frame = typeof frame === 'string' ? (frame === 'cover' ? 0 : 1) : frame

    if (focusPosition !== undefined)
      fromVector3Declaration(focusPosition, this.focusPosition)

    if (focusSize !== undefined)
      fromVector2Declaration(focusSize, this.focusSize)

    if (focusBefore !== undefined)
      this.focusBefore = focusBefore

    if (focusAfter !== undefined)
      this.focusAfter = focusAfter

    if (rotation !== undefined)
      fromEulerDeclaration(rotation, this.rotation)

    return this
  }

  apply(camera: PerspectiveCamera, aspect: number): this {
    const sizeAspect = this.focusSize.x / this.focusSize.y
    const aspectAspect = sizeAspect / aspect

    const lerpT = aspectAspect > 1 ? this.frame : 1 - this.frame
    const heightScalar = 1 + lerpT * (aspectAspect - 1) // lerp(1, aspectAspect, lerpT)
    const height = this.focusSize.y * heightScalar

    const fovEpsilon = this.fovEpsilon * Math.PI / 180
    let fov = this.perspective * Vertigo.PERSPECTIVE_ONE * Math.PI / 180
    if (!this.allowOrthographic && fov < fovEpsilon) {
      fov = fovEpsilon
    }

    const distance = height / 2 / Math.tan(fov / 2)
    const isPerspective = fov >= fovEpsilon

    const backward = isPerspective ? distance : this.focusBefore + this.orthographicNear
    _matrix.makeRotationFromEuler(this.rotation)
    _vector
      .set(_matrix.elements[8], _matrix.elements[9], _matrix.elements[10])
      .multiplyScalar(backward)
      .add(this.focusPosition)

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
      const near = Math.max(0.1, distance - this.focusBefore)
      const far = distance + this.focusAfter

      const mHeight = height * near / distance / 2
      const mWidth = mHeight * aspect

      camera.fov = fov * 180 / Math.PI
      camera.projectionMatrix.makePerspective(-mWidth, mWidth, mHeight, -mHeight, near, far)
    }

    // Orthographic
    else {
      const near = this.orthographicNear
      const far = this.orthographicNear + this.focusBefore + this.focusAfter

      const mHeight = height / 2
      const mWidth = mHeight * aspect

      camera.fov = 0
      camera.projectionMatrix.makeOrthographic(-mWidth, mWidth, mHeight, -mHeight, near, far)
    }

    return this
  }
}