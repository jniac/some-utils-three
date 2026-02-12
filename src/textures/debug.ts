import { fromVector2Declaration } from 'some-utils-three/declaration'
import { Vector2Declaration } from 'some-utils-ts/declaration'
import { CanvasTexture, RepeatWrapping } from 'three'

const defaultParams = {
  // "canvas" parameters
  subdivisions: 8,
  size: 1024,
  lineSize: 2,
  lineColor: 'hsl(0, 0%, 80%)',
  checkerColorA: 'hsl(0, 0%, 100%)',
  checkerColorB: 'hsl(0, 0%, 95%)',
  textColor: 'hsla(0, 0%, 0%, 0.5)',

  // "texture" parameters
  generateMipmaps: true,
  repeat: <Vector2Declaration>1,
  offset: <Vector2Declaration>0,
  wrap: RepeatWrapping,
}

type Params = typeof defaultParams

const canvasCache = new Map<string, { canvas: HTMLCanvasElement; refCount: number }>()

/**
 * Produces an unique key for the given parameters, to be used for caching canvases.
 * 
 * Notes:
 * - Only the "canvas" parameters are considered for the key, not the "texture" parameters.
 */
function makeCanvasKey(p: Params) {
  return [
    p.subdivisions,
    p.size,
    p.lineSize,
    p.lineColor,
    p.checkerColorA,
    p.checkerColorB,
    p.textColor,
  ].join('|')
}

function createCanvas(p: Params): HTMLCanvasElement {
  const { subdivisions, size, lineSize } = p
  const cell = size / subdivisions

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get 2D context')

  // --- background checker (Y-up indexing)
  // canvas y grows downward, so map row(y-up) -> y-down
  for (let yUp = 0; yUp < subdivisions; yUp++) {
    const yDown = subdivisions - 1 - yUp
    for (let x = 0; x < subdivisions; x++) {
      const isA = (x + yUp) % 2 === 0
      ctx.fillStyle = isA ? p.checkerColorA : p.checkerColorB
      ctx.fillRect(x * cell, yDown * cell, cell, cell)
    }
  }

  // --- per-cell corner labels
  // small, subtle text; keep it readable on both checker colors
  const fontPx = Math.max(10, Math.floor(cell * .18))
  const pad = Math.max(4, Math.floor(cell * .08))

  ctx.font = `${fontPx * .8}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`
  ctx.textBaseline = 'top'
  ctx.fillStyle = p.textColor

  for (let yUp = 0; yUp < subdivisions; yUp++) {
    const yDown = subdivisions - 1 - yUp
    for (let x = 0; x < subdivisions; x++) {
      const x0 = x * cell
      const y0 = yDown * cell

      // Top-left corner (of the cell): corner coord = (x, yUp + 1) => write x component only
      const xText = String(x)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(xText, x0 + pad, y0 + pad)

      // Bottom-right corner (of the cell): corner coord = (x + 1, yUp) => write y component only
      const yText = String(yUp)
      ctx.textAlign = 'right'
      ctx.textBaseline = 'bottom'
      ctx.fillText(yText, x0 + cell - pad, y0 + cell - pad)
    }
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${fontPx * 1.25}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`
  ctx.fillText('0,0', cell * .5, cell * (subdivisions - .5))
  ctx.fillText(`0,1`, cell * .5, cell * .5)
  ctx.fillText(`1,0`, cell * (subdivisions - .5), cell * (subdivisions - .5))
  ctx.fillText(`1,1`, cell * (subdivisions - .5), cell * .5)

  // --- grid lines (half visible on edges)
  ctx.strokeStyle = p.lineColor
  ctx.lineWidth = lineSize
  ctx.lineCap = 'butt'

  // Lines should be centered on boundaries; edges get clipped => half visible
  // To avoid .5px wobble, don’t snap; just draw at exact multiples.
  ctx.beginPath()
  for (let i = 0; i <= subdivisions; i++) {
    const x = i * cell
    ctx.moveTo(x, 0)
    ctx.lineTo(x, size)

    const y = i * cell
    ctx.moveTo(0, y)
    ctx.lineTo(size, y)
  }
  ctx.stroke()


  return canvas
}

function requireCanvas(key: string, params: Params): HTMLCanvasElement {
  const cached = canvasCache.get(key)
  if (cached) {
    cached.refCount++
    return cached.canvas
  } else {
    const canvas = createCanvas(params)
    canvasCache.set(key, { canvas, refCount: 1 })
    return canvas
  }
}

/**
 * UV debug texture (checker + grid lines + corner coords)
 * 
 * Useful for verifying UVs on extrusions, especially with complex paths where UVs can get distorted.
 * 
 * Notes:
 * - By default the texture is deliberately low-contrast and subtle. This is done 
 *   in particular to allow the viewer to appreciate the modeling and the interaction 
 *   of light with the normals.
 */
class DebugTexture extends CanvasTexture {
  static defaultParams = defaultParams
  static get canvasCacheSize() { return canvasCache.size }

  readonly key: string
  readonly params: Params

  constructor(userParams?: Partial<Params>) {
    const params = { ...defaultParams, ...userParams }

    const key = makeCanvasKey(params)

    const canvas = requireCanvas(key, params)

    super(canvas)

    fromVector2Declaration(params.repeat, this.repeat)
    fromVector2Declaration(params.offset, this.offset)
    this.wrapS = this.wrapT = params.wrap
    this.generateMipmaps = params.generateMipmaps

    this.key = key
    this.params = params
  }

  override dispose() {
    super.dispose()
    const entry = canvasCache.get(this.key)
    if (!entry) {
      console.warn(`DebugTexture: dispose() called but no cache entry found for key ${this.key}`)
      return
    }
    entry.refCount--
    if (entry.refCount <= 0) {
      canvasCache.delete(this.key)
    }
  }
}

export { DebugTexture }
export type { Params as DebugTextureParams }

