import { ColorRepresentation, DoubleSide, Group, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, Texture, Vector3 } from 'three'

import { DebugHelper } from '../../helpers/debug'
import { makeMatrix4 } from '../../utils/make'
import { setup } from '../../utils/tree'
import { Vertigo } from './vertigo'

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

export class VertigoHelper extends Group {
  static createParts(instance: VertigoHelper) {
    const planeWrapper = setup(new Group(), instance)
    const plane = setup(new Mesh(
      new PlaneGeometry(1, .25).translate(0.5, -0.125, 0),
      new MeshBasicMaterial({
        color: instance.color,
        alphaMap: texture(),
        transparent: true,
        side: DoubleSide,
      }),
    ), planeWrapper)

    const debugHelper = setup(new DebugHelper(), instance)
    debugHelper.onTop()

    return {
      plane,
      planeWrapper,
      debugHelper,
      matrix: new Matrix4(),
    }
  }

  parts: ReturnType<typeof VertigoHelper.createParts>

  color: ColorRepresentation
  vertigo: Vertigo

  constructor(vertigo: Vertigo, { color = <ColorRepresentation>'#ffff00' } = {}) {
    super()
    this.color = color
    this.vertigo = vertigo
    this.parts = VertigoHelper.createParts(this)
  }

  #onTick_private = {
    points: [
      new Vector3(),
      new Vector3(),
      new Vector3(),
      new Vector3(),
    ],
  }
  onTick() {
    const { vertigo, color } = this
    const { screenOffset, zoom } = vertigo
    const { x: sx, y: sy } = vertigo.size
    const { x: rsx, y: rsy } = vertigo.state.realSize
    const pointSize = .1666 / zoom

    const { points } = this.#onTick_private

    const { debugHelper, matrix, plane, planeWrapper } = this.parts

    planeWrapper.position.copy(vertigo.focus)
    planeWrapper.rotation.copy(vertigo.rotation)
    const padding = .1
    plane.position
      .set(-sx / 2 + padding, sy / 2 - padding, 0)
      .multiplyScalar(1 / vertigo.zoom)
      .addScaledVector(vertigo.screenOffset, -1 / vertigo.zoom)
    plane.scale.setScalar(1 / vertigo.zoom)

    makeMatrix4({
      position: vertigo.focus,
      rotation: vertigo.rotation,
    }, matrix)

    debugHelper.clear()

    debugHelper.setTransformMatrix(matrix)

    // The "size" rectangle
    points[0].set(+ sx / 2, + sy / 2, 0)
    points[1].set(- sx / 2, + sy / 2, 0)
    points[2].set(- sx / 2, - sy / 2, 0)
    points[3].set(+ sx / 2, - sy / 2, 0)
    for (const point of points)
      point.multiplyScalar(1 / zoom).addScaledVector(screenOffset, -1 / zoom)
    debugHelper.polygon(points, { color })
    debugHelper.setTransformMatrix(matrix)

    // The "unzoomed size" rectangle
    if (zoom !== 1) {
      points[0].set(+ sx / 2, + sy / 2, 0)
      points[1].set(- sx / 2, + sy / 2, 0)
      points[2].set(- sx / 2, - sy / 2, 0)
      points[3].set(+ sx / 2, - sy / 2, 0)
      for (const point of points)
        point.addScaledVector(screenOffset, -1 / zoom)
      debugHelper.polygon(points, { color, opacity: .5 })
    }

    // The "real size" rectangle
    if (vertigo.stateIsValid()) {
      points[0].set(+ rsx / 2, + rsy / 2, 0)
      points[1].set(- rsx / 2, + rsy / 2, 0)
      points[2].set(- rsx / 2, - rsy / 2, 0)
      points[3].set(+ rsx / 2, - rsy / 2, 0)
      for (const point of points)
        point.addScaledVector(screenOffset, -1 / zoom)
      debugHelper.polygon(points, { color })
      debugHelper.points(points, { color, size: pointSize })
    }

    // The focus
    const r = this.vertigo.size.length() * .01 / zoom
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
    debugHelper.point(vertigo.focus.clone().multiplyScalar(1 / zoom).negate(), { color, size: pointSize })

    debugHelper.resetTransformMatrix()

    // The frustum cone
    if (vertigo.stateIsValid()) {
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
