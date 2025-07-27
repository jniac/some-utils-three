import { ColorRepresentation, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Texture } from 'three'
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
  }
}
