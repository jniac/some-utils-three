import { ColorRepresentation, DoubleSide, Group, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, Texture, Vector3 } from 'three'

import { DebugHelper } from '../../helpers/debug'
import { setup } from '../../utils/tree'
import { Vertigo } from '../vertigo'

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
    const plane = setup(new Mesh(
      new PlaneGeometry(1, .25),
      new MeshBasicMaterial({
        color: instance.color,
        alphaMap: texture(),
        transparent: true,
        side: DoubleSide,
      }),
    ), instance)

    return {
      plane,
      debugHelper: setup(new DebugHelper(), instance),
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

  onTick() {
    const { vertigo, color } = this
    const { x: sx, y: sy } = vertigo.size

    const { debugHelper, plane } = this.parts

    this.position.copy(vertigo.focus)
    this.rotation.copy(vertigo.rotation)

    const padding = .1
    plane.position.set(-sx / 2 + .5 + padding, sy / 2 - .125 - padding, 0)

    debugHelper.clear()

    // Draw the "ideal" point (not zoomed).
    debugHelper.rect([-sx / 2, -sy / 2, sx, sy], { color })

    // Draw the zoomed "ideal" rectangle if zoom is not 1.
    if (vertigo.zoom !== 1) {
      const sx2 = sx / vertigo.zoom
      const sy2 = sy / vertigo.zoom
      debugHelper.rect([-sx2 / 2, -sy2 / 2, sx2, sy2], { color })
    }

    // Draw the real size rectangle.
    const { realSize: rs } = this.vertigo.state
    debugHelper
      .rect([-rs.x / 2, -rs.y / 2, rs.x, rs.y], { color })

    const [A, B, C, D, E, F, G, H] = getFrustumCorners(vertigo.state.worldMatrixInverse, vertigo.state.projectionMatrix)
    debugHelper
      .line(A, B, { color })
      .line(B, C, { color })
      .line(C, D, { color })
      .line(D, A, { color })
      .line(E, F, { color })
      .line(F, G, { color })
      .line(G, H, { color })
      .line(H, E, { color })
      .line(A, E, { color })
      .line(B, F, { color })
      .line(C, G, { color })
      .line(D, H, { color })
  }
}
