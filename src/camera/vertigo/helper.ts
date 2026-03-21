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
      new PlaneGeometry(1, .25),
      new MeshBasicMaterial({
        color: instance.color,
        alphaMap: texture(),
        transparent: true,
        side: DoubleSide,
      }),
    ), planeWrapper)

    const debugHelper = setup(new DebugHelper(), instance)
    debugHelper.renderOrder = 1e9

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

  #rect_private = {
    points: [
      new Vector3(),
      new Vector3(),
      new Vector3(),
      new Vector3(),
    ],
  }
  #rect(width: number, height: number) {
    const { color } = this
    const { debugHelper, matrix } = this.parts
    const { screenOffset: off, zoom } = this.vertigo
    const { points } = this.#rect_private

    points[0].set(+ width / 2, + height / 2, 0).addScaledVector(off, -1 / zoom)
    points[1].set(- width / 2, + height / 2, 0).addScaledVector(off, -1 / zoom)
    points[2].set(- width / 2, - height / 2, 0).addScaledVector(off, -1 / zoom)
    points[3].set(+ width / 2, - height / 2, 0).addScaledVector(off, -1 / zoom)

    for (const point of points)
      point.applyMatrix4(matrix)

    debugHelper.polygon(points, { color })
  }

  onTick() {
    const { vertigo, color } = this
    const { x: sx, y: sy } = vertigo.size

    const { debugHelper, matrix, plane, planeWrapper } = this.parts

    planeWrapper.position.copy(vertigo.focus)
    planeWrapper.rotation.copy(vertigo.rotation)
    const padding = .1
    plane.position.set(-sx / 2 + .5 + padding, sy / 2 - .125 - padding, 0)

    makeMatrix4({
      position: vertigo.focus,
      rotation: vertigo.rotation,
    }, matrix)

    debugHelper.clear()

    this.#rect(sx, sy)

    // Draw the zoomed "ideal" rectangle if zoom is not 1.
    if (vertigo.zoom !== 1) {
      const sx2 = sx / vertigo.zoom
      const sy2 = sy / vertigo.zoom
      this.#rect(sx2, sy2)
    }

    if (vertigo.stateIsValid()) {
      // Draw the real size rectangle.
      const { realSize: rs } = this.vertigo.state
      this.#rect(rs.x, rs.y)

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
