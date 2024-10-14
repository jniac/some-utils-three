import { ColorRepresentation, DoubleSide, LineBasicMaterial, Mesh, MeshBasicMaterial, PlaneGeometry, Texture } from 'three'
import { LineHelper } from '../../helpers/line'
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

export class VertigoHelper extends LineHelper {
  constructor(vertigo: Vertigo, { color = <ColorRepresentation>'#ffff00' } = {}) {
    super(undefined, new LineBasicMaterial({ color }))

    this.position.copy(vertigo.focus)
    this.rotation.copy(vertigo.rotation)

    let { x: sx, y: sy } = vertigo.size

    if (vertigo.zoom !== 1) {
      this.rectangle([-sx / 2, -sy / 2, sx, sy])
    }

    sx /= vertigo.zoom
    sy /= vertigo.zoom

    this
      .rectangle([-sx / 2, -sy / 2, sx, sy])
      .plus([0, 0], .5)
      .draw()

    const plane = new Mesh(
      new PlaneGeometry(1, .25),
      new MeshBasicMaterial({
        color,
        alphaMap: texture(),
        transparent: true,
        side: DoubleSide,
      }),
    )
    const padding = .1
    plane.position.set(-sx / 2 + .5 + padding, sy / 2 - .125 - padding, 0)

    this.add(plane)
  }
}
