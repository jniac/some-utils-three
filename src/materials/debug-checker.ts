import { Vector2Declaration } from 'some-utils-ts/declaration'
import { CanvasTexture, Color, LinearSRGBColorSpace, MeshBasicMaterial, MeshBasicMaterialParameters, SRGBColorSpace, Vector2 } from 'three'
import { fromVector2Declaration } from '../declaration'

class CellHandle {
  color = new Color()

  get r() { return this.color.r }
  set r(value: number) { this.color.r = value }
  get g() { return this.color.g }
  set g(value: number) { this.color.g = value }
  get b() { return this.color.b }
  set b(value: number) { this.color.b = value }

  divisions: Vector2

  cellX = 0
  cellY = 0

  get px() { return this.cellX / (this.divisions.x - 1) }
  get py() { return this.cellY / (this.divisions.y - 1) }

  constructor(divisions: Vector2) {
    this.divisions = divisions
  }
}

const defaultOptions = {
  /**
   * The resolution of each cell in the checkerboard pattern.
   */
  cellResolution: <Vector2Declaration>128,

  /**
   * The number of divisions in the checkerboard pattern.
   */
  divisions: <Vector2Declaration>8,

  /**
   * A "cell" delegate for Cell customization (color).
   */
  cell: (handle: CellHandle) => {
    const isA = (handle.cellX + handle.cellY) % 2 === 0
    if (isA) {
      handle.r = 0xff / 0xff
      handle.g = handle.px
      handle.b = 0x33 / 0xff
    } else {
      handle.r = 0x33 / 0xff
      handle.g = handle.py
      handle.b = 0xff / 0xff
    }
  }
}

/**
 * DebugCheckerMaterial is a material that displays a debug checkerboard pattern.
 */
export class DebugCheckerMaterial extends MeshBasicMaterial {
  constructor(userOptions: Partial<typeof defaultOptions> & MeshBasicMaterialParameters = {}) {
    const options = { ...defaultOptions, ...userOptions }

    const cellResolution = fromVector2Declaration(options.cellResolution)
    const divisions = fromVector2Declaration(options.divisions)
    const resolution = new Vector2(cellResolution.x, cellResolution.y).multiply(divisions)

    const canvas = document.createElement('canvas')
    canvas.width = resolution.x
    canvas.height = resolution.y

    const ctx = canvas.getContext('2d')
    if (!ctx)
      throw new Error('Failed to get canvas context')

    const handle = new CellHandle(divisions)
    const stepX = resolution.x / divisions.x
    const stepY = resolution.y / divisions.y
    const hsl = { h: 0, s: 0, l: 0 }
    for (let y = 0; y < divisions.y; y++) {
      handle.cellY = y
      for (let x = 0; x < divisions.x; x++) {
        handle.cellX = x
        options.cell(handle)

        ctx.fillStyle = `#${handle.color.getHexString(LinearSRGBColorSpace)}`
        ctx.fillRect(x * stepX, y * stepY, stepX, stepY)

        ctx.fillStyle = handle.color.getHSL(hsl).l < .5 ? '#ffffff' : '#000000'
        ctx.font = `24px monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${handle.cellX},${handle.cellY}`, (x + .5) * stepX, (y + .5) * stepY)
      }
    }

    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace

    const superProps = { map: texture } as MeshBasicMaterialParameters
    for (const [key, value] of Object.entries(userOptions)) {
      if (key in defaultOptions === false)
        superProps[key as keyof MeshBasicMaterialParameters] = value
    }
    super(superProps)
  }
}
