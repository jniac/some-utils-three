import { ColorRepresentation, DoubleSide, Group, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, Texture, Vector3 } from 'three'

import { DashedGrid } from '../../helpers/dashed-grid'
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
}

type Options = typeof defaultOptions

export class VertigoHelper extends Group {
  static createParts(instance: VertigoHelper) {
    const planeWrapper = setup(new Group(), instance)
    const plane = setup(new Mesh(
      new PlaneGeometry(1, .25).translate(0.5, -0.125, 0),
      new MeshBasicMaterial({
        color: instance.options.color,
        alphaMap: texture(),
        transparent: true,
        side: DoubleSide,
      }),
    ), planeWrapper)

    const debugHelper = setup(new DebugHelper(), instance)
    debugHelper.onTop()

    const dashedGrid = instance.options.grid
      ? setup(new DashedGrid(), instance)
      : null

    return {
      plane,
      planeWrapper,
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

  #onTick_private = {
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
  }
  onTick() {
    const { vertigo, options } = this
    const { color, grid } = options
    const { screenOffset, zoom } = vertigo
    const { x: sx, y: sy } = vertigo.size
    const { x: rsx, y: rsy } = vertigo.state.realSize

    const pointSize = .1666 / zoom
    const r = this.vertigo.size.length() * .01 / zoom

    const { rectPoints, cornerPoints } = this.#onTick_private

    const { debugHelper, matrix, plane, planeWrapper } = this.parts

    planeWrapper.position.copy(vertigo.focus)
    planeWrapper.rotation.copy(vertigo.rotation)
    plane.position
      .set(-sx / 2 / vertigo.zoom + r * 1.5, sy / 2 / vertigo.zoom - r * 1.5, 0)
      .addScaledVector(vertigo.screenOffset, -1 / vertigo.zoom)
    plane.scale.setScalar(1 / vertigo.zoom)

    makeMatrix4({
      position: vertigo.focus,
      rotation: vertigo.rotation,
    }, matrix)

    debugHelper.clear()

    debugHelper.setTransformMatrix(matrix)

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

    if (grid) {
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
    if (vertigo.isStateValid()) {
      const [A, B, C, D, E, F, G, H] = getFrustumCorners(vertigo.state.worldMatrixInverse, vertigo.state.projectionMatrix)
      debugHelper
        .segments([
          A, B, B, C, C, D, D, A,
          E, F, F, G, G, H, H, E,
          A, E, B, F, C, G, D, H,
        ], { color })
    }
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
  const ndcCorners = [
    new Vector3(-1, -1, -1), // near bottom-left
    new Vector3(1, -1, -1), // near bottom-right
    new Vector3(1, 1, -1), // near top-right
    new Vector3(-1, 1, -1), // near top-left
    new Vector3(-1, -1, 1), // far bottom-left
    new Vector3(1, -1, 1), // far bottom-right
    new Vector3(1, 1, 1), // far top-right
    new Vector3(-1, 1, 1), // far top-left
  ]

  const corners = ndcCorners.map(v => v.clone())

  const viewProjectionMatrixInverse = new Matrix4()

  return function (matrixWorldInverse: Matrix4, projectionMatrix: Matrix4) {
    viewProjectionMatrixInverse
      .multiplyMatrices(projectionMatrix, matrixWorldInverse)
      .invert()

    for (let i = 0; i < ndcCorners.length; i++) {
      corners[i]
        .copy(ndcCorners[i])
        .applyMatrix4(viewProjectionMatrixInverse)
    }

    return corners
  }
})()
