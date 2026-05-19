import { ColorRepresentation, DoubleSide, Group, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, Texture, Vector3 } from 'three'

import { DashedGridHelper } from '../../helpers/dashed-grid'
import { DebugHelper } from '../../helpers/debug'
import { makeMatrix4 } from '../../utils/make'
import { setup } from '../../utils/tree'
import { Vertigo } from './vertigo'

const defaultOptions = {
  color: <ColorRepresentation>'#ffff00',
  /**
   * If a grid should be drawn, and if so, its step.
   */
  grid: <false | number>1,
  /**
   * Whether to draw the frustum cone.
   */
  frustum: <boolean | 'focus-as-far'>false,
  /**
   * Whether to use the focus plane as the far plane when drawing the frustum cone. 
   * This is useful since the far plane is often very far away, which makes the frustum cone too large to be useful.
   */
  frustumFocusAsFar: <undefined | boolean>undefined,
}

type Options = typeof defaultOptions

export class VertigoHelper extends Group {
  static createParts(instance: VertigoHelper) {
    const textPlaneWrapper = setup(new Group(), instance)
    const textPlane = setup(new Mesh(
      new PlaneGeometry(1, .25).translate(0.5, -0.125, 0),
      new MeshBasicMaterial({
        color: instance.options.color,
        alphaMap: texture(),
        transparent: true,
        side: DoubleSide,
      }),
    ), textPlaneWrapper)

    const debugHelper = setup(new DebugHelper(), instance)
    debugHelper.onTop()

    const dashedGrid = instance.options.grid
      ? setup(new DashedGridHelper(), instance)
      : null

    return {
      textPlane,
      textPlaneWrapper,
      debugHelper,
      dashedGrid,
      matrix: new Matrix4(),
    }
  }

  parts: ReturnType<typeof VertigoHelper.createParts>

  options: Options
  vertigo: Vertigo

  userData = {
    helper: true,
    ignoreRaycast: true,
  }

  constructor(vertigo: Vertigo, options?: Partial<Options>) {
    super()
    this.vertigo = vertigo
    this.options = { ...defaultOptions, ...options }
    this.parts = VertigoHelper.createParts(this)
  }

  #update_private = {
    rectPoints: [
      new Vector3(),
      new Vector3(),
      new Vector3(),
      new Vector3(),
    ],
    cornerPoints: [
      new Vector3(),
      new Vector3(),
      new Vector3(),
      new Vector3(),
      new Vector3(),
      new Vector3(),
      new Vector3(),
      new Vector3(),
    ],
    mat4: new Matrix4(),
  }
  update() {
    const { vertigo, options } = this

    const {
      color,
      grid: drawGrid,
      frustum: drawFrustum,
      frustumFocusAsFar: drawFrustumFocusAsFar = drawFrustum === 'focus-as-far',
    } = options

    const { screenOffset, zoom } = vertigo
    const { x: sx, y: sy } = vertigo.size
    const { x: rsx, y: rsy } = vertigo.state.realSize

    const pointSize = .1666 / zoom
    const r = this.vertigo.size.length() * .01 / zoom

    const { rectPoints, cornerPoints, mat4 } = this.#update_private

    const { debugHelper, matrix, textPlane, textPlaneWrapper } = this.parts

    textPlaneWrapper.position.copy(vertigo.state.focusPlaneCenter)
    textPlaneWrapper.rotation.copy(vertigo.rotation)
    textPlane.position
      .set(-sx / 2 / vertigo.zoom + r * 1.5, sy / 2 / vertigo.zoom - r * 1.5, 0)
      .addScaledVector(vertigo.screenOffset, -1 / vertigo.zoom)
    textPlane.scale.setScalar(1 / vertigo.zoom)

    debugHelper.clear()

    debugHelper.setTransformMatrix(makeMatrix4({
      position: vertigo.state.focusPlaneCenter,
      rotation: vertigo.rotation,
    }, matrix))

    // The "size" rectangle
    rectPoints[0].set(+ sx / 2, + sy / 2, 0)
    rectPoints[1].set(- sx / 2, + sy / 2, 0)
    rectPoints[2].set(- sx / 2, - sy / 2, 0)
    rectPoints[3].set(+ sx / 2, - sy / 2, 0)
    for (const point of rectPoints)
      point.multiplyScalar(1 / zoom).addScaledVector(screenOffset, -1 / zoom)
    debugHelper.polygon(rectPoints, { color })

    {
      // The title
      // Disabled since text() do not support alignment yet, so it is not well positioned.
      // const p = new Vector3(-sx / 2 / zoom + r * 1.5, sy / 2 / zoom - r * 1.5, 0)
      //   .addScaledVector(screenOffset, -1 / zoom)
      // debugHelper.text(p, `Zoom`, { color, size: 1 / zoom })
    }

    // The corners of the "size" rectangle
    {
      const padding = r * .75
      const size = r * 3

      rectPoints[0].x += -padding
      rectPoints[0].y += -padding
      cornerPoints[0].copy(rectPoints[0])
      cornerPoints[1].copy(rectPoints[0])
      cornerPoints[0].x += -size
      cornerPoints[1].y += -size

      rectPoints[1].x += padding
      rectPoints[1].y += -padding
      cornerPoints[2].copy(rectPoints[1])
      cornerPoints[3].copy(rectPoints[1])
      cornerPoints[2].x += size
      cornerPoints[3].y += -size

      rectPoints[2].x += padding
      rectPoints[2].y += padding
      cornerPoints[4].copy(rectPoints[2])
      cornerPoints[5].copy(rectPoints[2])
      cornerPoints[4].x += size
      cornerPoints[5].y += size

      rectPoints[3].x += -padding
      rectPoints[3].y += padding
      cornerPoints[6].copy(rectPoints[3])
      cornerPoints[7].copy(rectPoints[3])
      cornerPoints[6].x += -size
      cornerPoints[7].y += size

      debugHelper.segments([
        cornerPoints[0], rectPoints[0], rectPoints[0], cornerPoints[1],
        cornerPoints[2], rectPoints[1], rectPoints[1], cornerPoints[3],
        cornerPoints[4], rectPoints[2], rectPoints[2], cornerPoints[5],
        cornerPoints[6], rectPoints[3], rectPoints[3], cornerPoints[7],
      ], { color })
    }

    // The "unzoomed size" rectangle
    if (zoom !== 1) {
      rectPoints[0].set(+ sx / 2, + sy / 2, 0)
      rectPoints[1].set(- sx / 2, + sy / 2, 0)
      rectPoints[2].set(- sx / 2, - sy / 2, 0)
      rectPoints[3].set(+ sx / 2, - sy / 2, 0)
      for (const point of rectPoints)
        point.addScaledVector(screenOffset, -1 / zoom)
      debugHelper.polygon(rectPoints, { color, opacity: .15 })
    }

    // The "real size" rectangle
    if (vertigo.isStateValid()) {
      rectPoints[0].set(+ rsx / 2, + rsy / 2, 0)
      rectPoints[1].set(- rsx / 2, + rsy / 2, 0)
      rectPoints[2].set(- rsx / 2, - rsy / 2, 0)
      rectPoints[3].set(+ rsx / 2, - rsy / 2, 0)
      for (const point of rectPoints)
        point.addScaledVector(screenOffset, -1 / zoom)
      debugHelper.polygon(rectPoints, { color })
      debugHelper.points(rectPoints, { color, size: pointSize })
    }

    if (drawGrid) {
      const { dashedGrid } = this.parts
      if (!dashedGrid)
        throw new Error('dashedGrid is not created, but grid option is truthy. What happened?')

      dashedGrid
        .setProps({
          color: options.color,
          size: vertigo.state.realSize,
          dashSize: 1,
          dashRatio: 1 / 8,
        })
        .update()
      dashedGrid.rotation.copy(vertigo.rotation)
      dashedGrid.position.copy(vertigo.state.focusPlaneCenter)
    }

    // The focus
    debugHelper.circle({ center: 0, radius: r }, { color })
    debugHelper.segments([
      [r, 0, 0],
      [r * 3, 0, 0],
      [-r, 0, 0],
      [-r * 3, 0, 0],
      [0, r, 0],
      [0, r * 3, 0],
      [0, -r, 0],
      [0, -r * 3, 0],
    ], { color })

    debugHelper.point(0, { color, size: pointSize })
    debugHelper.point(vertigo.focus.clone().negate(), { color, size: pointSize })

    debugHelper.resetTransformMatrix()

    // The frustum cone
    if (drawFrustum && vertigo.isStateValid()) {
      const { far: f, near: n, distance: d, projectionMatrix, worldMatrixInverse } = vertigo.state
      const clipSpaceFar =
        drawFrustumFocusAsFar
          ? (f + n) / (f - n) + 2 * f * n / (f - n) / -d
          : 1
      mat4
        .multiplyMatrices(projectionMatrix, worldMatrixInverse)
        .invert()
      const [A, B, C, D, E, F, G, H] = getFrustumCorners(mat4, -1, clipSpaceFar)
      debugHelper
        .segments([
          A, B, B, C, C, D, D, A,
          E, F, F, G, G, H, H, E,
          A, E, B, F, C, G, D, H,
        ], { color })

      // Draw extra lines from the focus plane pointing to the far corners
      if (drawFrustumFocusAsFar) {
        const zn = (f + n) / (f - n) + 2 * f * n / (f - n) / -d * 0.9
        const zf = (f + n) / (f - n) + 2 * f * n / (f - n) / -d * 0.7
        const [A, B, C, D, E, F, G, H] = getFrustumCorners(mat4, zn, zf)
        debugHelper
          .segments([
            A, E,
            B, F,
            C, G,
            D, H,
          ], { color })
      }
    }
  }

  onTick() {
    this.update()
  }
}

function texture() {
  const create = () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = 1024
    canvas.height = 256
    ctx.fillStyle = 'white'
    ctx.font = '200px Fira Code'
    ctx.textBaseline = 'top'
    ctx.fillText('Vertigo', 20, 20)

    const texture = new Texture(canvas)
    texture.needsUpdate = true

    return texture
  }

  let texture: Texture | undefined
  return texture ??= create()
}

/**
 * Returns the corners of the frustum in world space.
 * 
 * Note:
 * - For performance reasons, the returned points are always the same instances, 
 *   so you should clone them if you want to keep them.
 */
const getFrustumCorners = (() => {
  const p0 = new Vector3()
  const p1 = new Vector3()
  const p2 = new Vector3()
  const p3 = new Vector3()
  const p4 = new Vector3()
  const p5 = new Vector3()
  const p6 = new Vector3()
  const p7 = new Vector3()

  const corners = [p0, p1, p2, p3, p4, p5, p6, p7]

  return function (
    viewProjectionMatrixInverse: Matrix4,
    clipSpaceNear = -1,
    clipSpaceFar = 1,
  ) {
    const m = viewProjectionMatrixInverse
    const zn = clipSpaceNear // The z value in clip space that corresponds to the near plane
    const zf = clipSpaceFar // The z value in clip space that corresponds to the far plane
    p0.set(-1, -1, zn).applyMatrix4(m) // near bottom-left
    p1.set(+1, -1, zn).applyMatrix4(m) // near bottom-right
    p2.set(+1, +1, zn).applyMatrix4(m) // near top-right
    p3.set(-1, +1, zn).applyMatrix4(m) // near top-left
    p4.set(-1, -1, zf).applyMatrix4(m) // far bottom-left
    p5.set(+1, -1, zf).applyMatrix4(m) // far bottom-right
    p6.set(+1, +1, zf).applyMatrix4(m) // far top-right
    p7.set(-1, +1, zf).applyMatrix4(m) // far top-left

    return corners
  }
})()
